# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from dataclasses import dataclass
import logging
import shlex
import subprocess
from pathlib import Path

import jinja2

from paths import CONF_DIR, REPO_ROOT
from devenv.cluster import ClusterChannel
from devenv.constants import CLUSTERS, DEBUG_FLAGS
from devenv.ports import PortAllocator, PortForward, runcmd
from fhpc import cluster_state_dir, cluster_status, run_firehpc

logger = logging.getLogger(__name__)

VENDOR_AGENT_YML = REPO_ROOT / "conf" / "vendor" / "agent.yml"


def _parse_scontrol_token_output(output: str) -> str:
    output = output.strip()
    if not output:
        raise ValueError("command produced no output")
    if "=" not in output:
        raise ValueError(f"unexpected output format (expected SLURM_JWT=...): {output}")
    key, token = output.split("=", 1)
    if key != "SLURM_JWT":
        raise ValueError(f"unexpected variable name '{key}' (expected SLURM_JWT)")
    if not token:
        raise ValueError("empty token value")
    return token


@dataclass
class SlurmwebAgent:
    name: str
    ui_name: str
    channel: ClusterChannel
    forwards: dict[str, PortForward]
    service_port: int
    conf_path: Path = None
    policy_path: Path = None
    process: subprocess.Popen = None

    @classmethod
    def init(
        cls,
        port_allocator: PortAllocator,
        name: str,
        ui_name: str,
        cluster_id: int,
    ):
        forwards = port_allocator.allocate()
        channel = ClusterChannel.connect(forwards, name)
        return cls(name, ui_name, channel, forwards, 5013 + cluster_id)

    def render_policy(self, tmpdir: Path, anonymous: bool) -> None:
        environment = jinja2.Environment(loader=jinja2.FileSystemLoader(CONF_DIR))
        template = environment.get_template("policy.ini.j2")
        self.policy_path = tmpdir / f"policy-{self.name}.ini"
        try:
            self.cluster_status = cluster_status(self.name)
        except RuntimeError as err:
            logger.critical(err)
            raise
        with open(self.policy_path, "w+") as fh:
            fh.write(
                template.render(
                    cluster=self.name,
                    users=self.cluster_status["users"],
                    groups=self.cluster_status["groups"],
                    anonymous=anonymous,
                    policy_extra_user_group=CLUSTERS[self.name].get(
                        "policy_extra_user_group", False
                    ),
                )
            )

    def render_conf(
        self,
        tmpdir: Path,
        jwt_key_path: Path,
        cache_enabled: bool,
        racksdb_enabled: bool,
        metrics_enabled: bool,
    ) -> None:
        environment = jinja2.Environment(loader=jinja2.FileSystemLoader(CONF_DIR))
        template = environment.get_template("agent.ini.j2")
        state_dir = cluster_state_dir(self.name)
        logger.info("Reading redis password for cluster %s", self.name)
        redis_password = None
        if cache_enabled:
            try:
                redis_password = (state_dir / "redis" / "redis.password").read_text()
            except FileNotFoundError:
                logger.warning(
                    "Redis password not found in FireHPC state of cluster %s, force "
                    "disabling cache",
                    self.name,
                )
                cache_enabled = False

        slurmrestd_token = None
        slurmrestd_jwt_key = None
        if CLUSTERS[self.name]["auth"] == "jwt":
            if CLUSTERS[self.name].get("mode") == "static":
                logger.info("Generating static JWT for cluster %s", self.name)
                exit_code, stdout, stderr = run_firehpc(
                    "ssh",
                    f"admin.{self.name}",
                    "scontrol",
                    "token",
                    "lifespan=infinite",
                    "username=slurm",
                )
                try:
                    slurmrestd_token = _parse_scontrol_token_output(stdout)
                except ValueError as err:
                    details = []
                    if exit_code != 0:
                        details.append(f"exit code {exit_code}")
                    stderr = stderr.strip()
                    if stderr:
                        details.append(f"stderr: {stderr}")
                    stdout = stdout.strip()
                    if stdout:
                        details.append(f"stdout: {stdout}")
                    else:
                        details.append("stdout was empty")
                    message = (
                        f"Unable to get static JWT on cluster {self.name}: {err}. "
                        f"`scontrol token` failed ({'; '.join(details)}). "
                        f"Check that Slurm is running and JWT authentication is "
                        f"configured on admin.{self.name}."
                    )
                    logger.critical(message)
                    raise RuntimeError(message) from err
            else:
                logger.info("Reading Slurm JWT signing key for cluster %s", self.name)
                slurm_jwt_key = state_dir / "slurm" / "jwt_hs256.key"
                if slurm_jwt_key.exists():
                    slurmrestd_jwt_key = slurm_jwt_key
                else:
                    logger.warning(
                        "Slurm JWT signing key not found in FireHPC state of cluster "
                        "%s",
                        self.name,
                    )
        if CLUSTERS[self.name].get("scheme", "unix") == "unix":
            slurmrestd_uri = f"unix:///tmp/slurmrestd-{self.name}.socket"
        else:
            slurmrestd_uri = f"http://localhost:{self.forwards['slurmrestd'].local}"

        self.conf_path = tmpdir / f"agent-{self.name}.ini"
        with open(self.conf_path, "w+") as fh:
            fh.write(
                template.render(
                    cluster_name=self.ui_name,
                    service_port=self.service_port,
                    slurmrestd_auth=CLUSTERS[self.name]["auth"],
                    slurmrestd_uri=slurmrestd_uri,
                    slurmrestd_jwt_mode=CLUSTERS[self.name].get("mode"),
                    slurmrestd_jwt_key=slurmrestd_jwt_key,
                    slurmrestd_token=slurmrestd_token,
                    jwt_key=jwt_key_path,
                    cache_enabled=cache_enabled,
                    racksdb_enabled=racksdb_enabled,
                    policy_path=self.policy_path,
                    redis_port=self.forwards["redis"].local,
                    redis_password=redis_password,
                    prometheus_port=self.forwards["prometheus"].local,
                    infrastructure=self.name if self.ui_name != self.name else None,
                    metrics_enabled=metrics_enabled,
                )
            )

    def launch(self) -> None:
        cmd = (
            [
                "slurm-web",
                "agent",
                "--log-component",
                f"agent-{self.name}",
                "--debug",
                "--debug-flags",
            ]
            + DEBUG_FLAGS
            + [
                "--conf-defs",
                str(VENDOR_AGENT_YML),
                "--conf",
                str(self.conf_path),
            ]
        )
        logging.info("Launching Slurm-web agent %s: %s", self.name, shlex.join(cmd))
        self.process = runcmd(cmd)

    def stop(self) -> None:
        logging.info("Stopping slurm-web agent %s", self.name)
        self.process.kill()
        self.channel.stop()
