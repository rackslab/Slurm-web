# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from dataclasses import dataclass
import json
import logging
import shlex
import subprocess
from pathlib import Path

import jinja2
import paramiko

from paths import CONF_DIR, REPO_ROOT
from devenv.cluster import ClusterChannel
from devenv.constants import CLUSTERS, DEBUG_FLAGS
from devenv.ports import PortAllocator, PortForward, runcmd

logger = logging.getLogger(__name__)

VENDOR_AGENT_YML = REPO_ROOT / "conf" / "vendor" / "agent.yml"


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
        host: str,
        port_allocator: PortAllocator,
        ssh_client: paramiko.client.SSHClient,
        name: str,
        ui_name: str,
        cluster_id: int,
    ):
        forwards = port_allocator.allocate()
        channel = ClusterChannel.connect(host, ssh_client, forwards, name, cluster_id)
        return cls(name, ui_name, channel, forwards, 5013 + cluster_id)

    def render_policy(self, tmpdir: Path, anonymous: bool) -> None:
        environment = jinja2.Environment(loader=jinja2.FileSystemLoader(CONF_DIR))
        template = environment.get_template("policy.ini.j2")
        self.policy_path = tmpdir / f"policy-{self.name}.ini"
        _, stdout, _ = self.channel.connection.exec_command(
            shlex.join(["firehpc", "status", "--cluster", self.name, "--json"])
        )
        try:
            self.cluster_status = json.loads(stdout.read())
        except json.decoder.JSONDecodeError:
            logger.critical("Unable to load %s cluster status", self.name)
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
        sftp = self.channel.connection.open_sftp()
        logger.info("Reading remote redis password for cluster %s", self.name)
        redis_password = None
        if cache_enabled:
            try:
                with sftp.open(
                    f".local/state/firehpc/clusters/{self.name}/redis/redis.password"
                ) as fh:
                    redis_password = fh.read().decode()
            except FileNotFoundError:
                logger.warning(
                    "Remote Redis password file not found for cluster %s, force "
                    "disabling cache",
                    self.name,
                )
                cache_enabled = False

        slurmrestd_token = None
        slurmrestd_jwt_key = None
        if CLUSTERS[self.name]["auth"] == "jwt":
            if CLUSTERS[self.name].get("mode") == "static":
                logger.info("Generating static JWT for cluster %s", self.name)
                cmd = shlex.join(
                    [
                        "firehpc",
                        "ssh",
                        f"admin.{self.name}",
                        "scontrol",
                        "token",
                        "lifespan=infinite",
                        "username=slurm",
                    ]
                )
                _, stdout, _ = self.channel.connection.exec_command(cmd)
                try:
                    slurmrestd_token = stdout.read().decode().split("=")[1]
                except IndexError:
                    logger.critical("Unable to get static JWT on cluster %s", self.name)
                    raise
            else:
                logger.info(
                    "Downloading remote Slurm JWT signing key for cluster %s",
                    self.name,
                )
                try:
                    with sftp.open(
                        f".local/state/firehpc/clusters/{self.name}/slurm/jwt_hs256.key"
                    ) as fh:
                        slurm_jwt_key = fh.read()
                    slurmrestd_jwt_key = tmpdir / f"{self.name}_jwt_hs256.key"
                    with open(slurmrestd_jwt_key, "wb+") as fh:
                        fh.write(slurm_jwt_key)
                except FileNotFoundError:
                    logger.warning(
                        "Remote Slurm JWT signature key not found for cluster %s",
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
