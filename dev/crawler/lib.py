#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
import sys
import typing as t
import json
import socket
from pathlib import Path
import shlex
import urllib
import time
import random
import logging
from datetime import datetime, timedelta

import requests
import paramiko

from rfl.settings import RuntimeSettings
from rfl.settings.errors import (
    SettingsDefinitionError,
    SettingsOverrideError,
    SettingsSiteLoaderError,
)

from slurmweb.slurmrestd.unix import SlurmrestdUnixAdapter

if t.TYPE_CHECKING:
    from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier

logger = logging.getLogger(__name__)

ASSETS = Path(__file__).parent.resolve() / ".." / ".." / "tests" / "assets"


class BaseAssetsManager:
    def __init__(self, subdir: Path | str):
        # Check assets directory for this version
        self.path = ASSETS / subdir
        if not self.path.exists():
            self.path.mkdir(parents=True)

        # Save requests status
        self.status_file = self.path / "status.json"
        if self.status_file.exists():
            with open(self.status_file) as fh:
                self.statuses = json.load(fh)
        else:
            self.statuses = {}

    def exists(self, asset: Asset) -> bool:
        """Return True if asset already exists or False."""
        return all(
            len(list(self.path.glob(f"{Path(output_file).stem}.*"))) > 0
            for output_file in asset.output_files
        )

    def save(self):
        """Save resulting status file."""
        with open(self.status_file, "w+") as fh:
            json.dump(self.statuses, fh, indent=2, sort_keys=True)
            fh.write("\n")


def load_settings(definitions: str, dev_tmp_dir: Path, overrides: str):
    try:
        settings = RuntimeSettings.yaml_definition(definitions)
    except SettingsDefinitionError as err:
        logger.critical(err)
        sys.exit(1)
    try:
        settings.override_ini(dev_tmp_dir / overrides)
    except (SettingsSiteLoaderError, SettingsOverrideError) as err:
        logger.critical(err)
        sys.exit(1)
    return settings


def busy_node(node):
    """Return True if the given node is busy."""
    return "ALLOCATED" in node["state"] or "MIXED" in node["state"]


class DevelopmentHostConnectionError(Exception):
    pass


class DevelopmentHostClient:
    def __init__(self, host, user):
        self._client = None
        self.host = host
        self.user = user

    def connect(self):
        self._client = paramiko.SSHClient()
        self._client.load_host_keys(Path("~/.ssh/known_hosts").expanduser())
        logger.info("Connecting to development host %s", self.host)
        try:
            self._client.connect(self.host, username=self.user)
        except socket.gaierror as err:
            raise DevelopmentHostConnectionError(
                f"Unable to get address of {self.host}: {err}"
            ) from err
        except paramiko.ssh_exception.PasswordRequiredException as err:
            raise DevelopmentHostConnectionError(
                f"Unable to connect on {self.user}@{self.host}: {err}"
            ) from err

    def exec(self, cmd: list[str], retries: int = 3, reconnect: bool = False):
        if not retries:
            raise CrawlerError(
                f"Unable to execute command on development host: {shlex.join(cmd)}"
            )

        logger.debug("Running command on development host: %s", shlex.join(cmd))
        try:
            if reconnect:
                self.connect()
            return self._client.exec_command(shlex.join(cmd))
        except paramiko.ssh_exception.ChannelException:
            logger.warning("Channel exception occurred, reconnecting to %s", self.host)
            self.exec(cmd, retries - 1, reconnect=True)


class DevelopmentHostCluster:
    def __init__(
        self,
        dev_host: DevelopmentHostClient,
        name: str,
        uri: urllib.parse.ParseResult,
        auth: SlurmrestdAuthentifier,
    ):
        self.dev_host = dev_host
        self.name = name
        self.api = "0.0.41"
        self.auth = auth
        self.session = requests.Session()

        if uri.scheme == "unix":
            self.prefix = "http+unix://slurmrestd"
            self.session.mount(self.prefix, SlurmrestdUnixAdapter(uri.path))
        else:
            self.prefix = uri.geturl()

        # check cluster has slurm emulator mode enabled
        _, stdout, _ = self.dev_host.exec(
            ["firehpc", "status", "--cluster", self.name, "--json"]
        )
        self.status = json.loads(stdout.read())

        self.emulator = self.status["settings"]["slurm_emulator"]
        self.users = [user["login"] for user in self.status["users"]]
        self.groups = self.status["groups"]
        stdout.close()
        self._gpu_info = None

    def query_slurmrestd(self, query: str, headers: dict[str, str] | None = None):
        """Send GET HTTP request to slurmrestd and return JSON result. Raise
        RuntimeError in case of connection error or not JSON result."""
        if headers is None:
            headers = self.auth.headers()
        try:
            response = self.session.get(f"{self.prefix}/{query}", headers=headers)
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}")

        return response.text, response.headers.get("content-type"), response.status_code

    def query_slurmrestd_json(self, query: str, headers: dict[str, str] | None = None):
        """Send GET HTTP request to slurmrestd and return JSON result. Raise
        RuntimeError in case of connection error or not JSON result."""
        if headers is None:
            headers = self.auth.headers()
        try:
            response = self.session.get(f"{self.prefix}/{query}", headers=headers)
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}")

        if response.headers.get("content-type") != "application/json":
            raise CrawlerError(
                f"Unexpected content-type for slurmrestd query {query}: "
                f"{response.headers.get('content-type')}"
            )

        if response.status_code != 200:
            raise CrawlerError(
                f"Unexpected status code for slurmrestd query {query}: "
                f"{response.status_code}"
            )

        return response.json()

    def has_jobs(self):
        """Return True if cluster has jobs in queue or False."""
        jobs = self.query_slurmrestd_json(f"/slurm/v{self.api}/jobs")
        for job in jobs["jobs"]:
            if "RUNNING" in job["job_state"] or "PENDING" in job["job_state"]:
                logger.debug(
                    "job %s found with state: %s", job["job_id"], job["job_state"]
                )
                return True
        return False

    def nb_nodes(self):
        """Return number of nodes on cluster."""
        return len(self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")["nodes"])

    def nodes_partition(self, partition: str):
        nodes = self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")
        return [
            node["name"] for node in nodes["nodes"] if partition in node["partitions"]
        ]

    def node_update(self, nodename, state, reason):
        # FIXME: use REST API
        self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                self.name,
                "--",
                "scontrol",
                "update",
                f"nodename={nodename}",
                f"state={state}",
                f"reason='{reason}'",
            ]
        )

    def node_resume(self, nodename):
        # FIXME: use REST API
        self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                self.name,
                "--",
                "scontrol",
                "update",
                f"nodename={nodename}",
                "state=RESUME",
            ]
        )

    def nodes_resume(self):
        for node in self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")["nodes"]:
            if "DOWN" in node["state"] or "DRAIN" in node["state"]:
                self.node_resume(node["name"])

    def partitions(self):
        """Return list of partitions names."""
        return [
            partition["name"]
            for partition in self.query_slurmrestd_json(
                f"/slurm/v{self.api}/partitions"
            )["partitions"]
        ]

    def login_container(self):
        if self.emulator:
            return "admin"
        return "login"

    def submit(
        self,
        user: str,
        args: list[str],
        duration: int = 30,
        timelimit: int = 1,
        wait_running: bool = True,
        success: bool = True,
    ) -> int:
        # FIXME: use REST API
        logger.info("Submitting job as %s with args: %s", user, args)
        _, stdout, stderr = self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                f"{user}@{self.login_container()}.{self.name}",
                "--",
                "sbatch",
                "--time",
                str(timelimit),
                "--wrap",
                f"'sleep {duration} && {'true' if success else 'false'}'",
            ]
            + args
        )
        output = stdout.read().decode()
        stdout.close()
        errors = stderr.read().decode()
        stderr.close()
        if not output.startswith("Submitted batch job"):
            raise CrawlerError(
                "Unable to submit batch job on GPU: "
                f"[stdout: {output}][stderr: {errors}]"
            )
        job_id = int(output.split(" ")[3])
        if wait_running:
            max_tries = 10
            for idx in range(max_tries):
                job = self.query_slurmrestd_json(f"/slurm/v{self.api}/job/{job_id}")
                if "RUNNING" in job["jobs"][0]["job_state"]:
                    break
                if idx == max_tries - 1:
                    raise CrawlerError(f"Unable to get job {job_id} in RUNNING state")
                else:
                    time.sleep(1)
        return job_id

    def cancel(self, user: str, job_id: int) -> None:
        """Cancel a job."""
        # FIXME: use REST API
        self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                f"{user}@{self.login_container()}.{self.name}",
                "--",
                "scancel",
                str(job_id),
            ]
        )

    def cancel_all(self) -> None:
        """Cancel all jobs."""
        # FIXME: use REST API
        for partition in self.partitions():
            self.dev_host.exec(
                [
                    "firehpc",
                    "ssh",
                    f"root@{self.login_container()}.{self.name}",
                    "--",
                    "scancel",
                    "-p",
                    partition,
                ]
            )

    def job_nodes(self, job_id: int) -> list[str]:
        job = self.query_slurmrestd_json(f"/slurm/v{self.api}/job/{job_id}")
        return [
            allocated_node["name"]
            for allocated_node in job["jobs"][0]["job_resources"]["nodes"]["allocation"]
        ]

    def wait_idle(self, node_name: str) -> None:
        max_tries = 10
        for idx in range(max_tries):
            node = self.query_slurmrestd_json(f"/slurm/v{self.api}/node/{node_name}")
            logger.debug("node %s states: %s", node_name, node["nodes"][0]["state"])
            if not busy_node(node["nodes"][0]):
                break
            if idx == max_tries - 1:
                raise CrawlerError(f"Unable to get node {node_name} IDLE")
            else:
                time.sleep(1)

    def pick_user(self) -> str:
        return random.choice(self.users)

    def pick_account(self) -> str:
        return random.choice(
            [group["name"] for group in self.groups if group["parent"] != "root"]
        )

    def pick_account_users(self, account: str, number: int) -> list[str]:
        for group in self.groups:
            if group["name"] == account:
                return random.choices(group["members"], k=number)
        raise CrawlerError(f"Unable to find account {account} on cluster {self.name}")

    def reservation(
        self,
        name: str,
        partition: str,
        accounts: list[str] | None,
        users: list[str] | None,
        start: datetime,
        end: datetime,
    ) -> None:
        """Create reservation."""
        # FIXME: use REST API
        cmd = [
            "firehpc",
            "ssh",
            self.name,
            "--",
            "scontrol",
            "create",
            "reservation",
            f"Reservation={name}",
            f"StartTime={start.strftime('%Y-%m-%dT%H:%M:%S')}",
            f"EndTime={end.strftime('%Y-%m-%dT%H:%M:%S')}",
            f"Partition={partition}",
            "Flags=ANY_NODES,FLEX,IGNORE_JOBS",
        ]
        if users:
            cmd.append(f"Users={','.join(users)}")
        if accounts:
            cmd.append(f"Accounts={','.join(accounts)}")
        self.dev_host.exec(cmd)

    def reservation_delete(self, name: str) -> None:
        # FIXME: use REST API
        self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                self.name,
                "--",
                "scontrol",
                "delete",
                "reservation",
                name,
            ]
        )

    def setup_for_reservations(self) -> dict:
        """Setup cluster for reservations asset. Returns cleanup state."""
        account = self.pick_account()
        self.reservation(
            "training",
            self.partitions()[0],
            accounts=[account],
            users=self.pick_account_users(account, 2),
            start=datetime.now() + timedelta(days=5),
            end=datetime.now() + timedelta(days=6),
        )
        return {"reservation": "training"}

    def setup_for_jobs(self) -> dict:
        """Setup cluster for jobs asset. Returns cleanup state."""
        cleanup_state = {"jobs": []}
        user = self.pick_user()
        # Submit timeout job
        job_id = self.submit(
            user,
            ["--ntasks", str(1)],
            duration=90,
            timelimit=1,
            wait_running=False,
        )
        cleanup_state["jobs"].append((user, job_id))
        # Submit completed job
        job_id = self.submit(
            user,
            ["--ntasks", str(1)],
            duration=1,
            wait_running=False,
        )
        cleanup_state["jobs"].append((user, job_id))
        # Submit failed job
        job_id = self.submit(
            user,
            ["--ntasks", str(1)],
            duration=1,
            wait_running=False,
            success=False,
        )
        cleanup_state["jobs"].append((user, job_id))
        # Submit 10 random running jobs
        for _ in range(10):
            job_id = self.submit(
                user,
                ["--ntasks", str(random.choice([1, 4, 16, 32, 64, 128]))],
                duration=random.choice([30, 60, 90]),
                timelimit=2,
                wait_running=False,
            )
            cleanup_state["jobs"].append((user, job_id))
        # Submit pending job
        job_id = self.submit(
            user,
            [
                "--ntasks",
                str(random.choice([1, 4, 16, 32, 64, 128])),
                "--begin",
                "now+1hour",
            ],
            duration=30,
            wait_running=False,
        )
        cleanup_state["jobs"].append((user, job_id))
        # Wait for job to timeout
        logger.info("Waiting for timeout job…")
        time.sleep(70)
        return cleanup_state

    def setup_for_nodes(self) -> dict:
        """Setup cluster for nodes asset. Returns cleanup state."""
        cleanup_state = {
            "nodes_down": [],
            "nodes_drain": [],
            "jobs": [],
        }
        # Set one node DOWN, one DRAIN, ensure some nodes have jobs (MIXED/ALLOCATED)
        nodes = self.nodes_partition(self.partitions()[0])
        if len(nodes) >= 2:
            node_down = random.choice(nodes)
            node_drain = random.choice([node for node in nodes if node != node_down])
            self.node_update(node_down, "DOWN", "CPU dead")
            self.node_update(node_drain, "DRAIN", "ECC memory error")
            cleanup_state["nodes_down"] = [node_down]
            cleanup_state["nodes_drain"] = [node_drain]
        # Submit some jobs to create MIXED/ALLOCATED states
        user = self.pick_user()
        for _ in range(3):
            job_id = self.submit(
                user,
                ["--ntasks", str(1)],
                duration=30,
                timelimit=2,
                wait_running=False,
            )
            cleanup_state["jobs"].append((user, job_id))
        return cleanup_state

    def setup_for_stats(self) -> dict:
        """Setup cluster for stats asset. Returns cleanup state."""
        cleanup_state = {"jobs": []}
        user = self.pick_user()
        for _ in range(3):
            job_id = self.submit(
                user,
                ["--ntasks", str(1)],
                duration=30,
                timelimit=2,
                wait_running=False,
            )
            cleanup_state["jobs"].append((user, job_id))
        return cleanup_state

    def setup_for_job_gpus_running(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-running asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            ["--partition", gpu_partition, "--gpus", str(gpu_per_node)],
        )
        return job_id, user

    def setup_for_job_gpus_pending(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-pending asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            [
                "--partition",
                gpu_partition,
                "--gpus",
                str(gpu_per_node),
                "--begin",
                "now+1hour",
            ],
            wait_running=False,
        )
        return job_id, user

    def setup_for_job_gpus_completed(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-completed asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            ["--partition", gpu_partition, "--gpus", str(gpu_per_node)],
            duration=30,
        )
        time.sleep(30)
        return job_id, user

    def setup_for_job_gpus_archived(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-archived asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            ["--partition", gpu_partition, "--gpus", str(gpu_per_node)],
            duration=30,
        )
        time.sleep(30)
        # Wait additional time for archival
        time.sleep(600)
        return job_id, user

    def setup_for_job_gpus_multi_nodes(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-multi-nodes asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            ["--partition", gpu_partition, "--gpus", str(gpu_per_node * 2)],
        )
        return job_id, user

    def setup_for_job_gpus_type(
        self, gpu_partition: str, gpu_type: str
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-type asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            ["--partition", gpu_partition, "--gpus", f"{gpu_type}:1"],
        )
        return job_id, user

    def setup_for_job_gpus_per_node(self, gpu_partition: str) -> tuple[int, str]:
        """Setup cluster for job-gpus-per-node asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            [
                "--partition",
                gpu_partition,
                "--gpus-per-node",
                str(1),
                "--nodes",
                str(2),
            ],
        )
        return job_id, user

    def setup_for_job_gpus_multi_types(
        self, gpu_partition: str, gpu_types: list[str]
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-multi-types asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            [
                "--partition",
                gpu_partition,
                "--gpus-per-node",
                ",".join([f"{gpu_type}:1" for gpu_type in gpu_types]),
            ],
        )
        return job_id, user

    def setup_for_job_gpus_per_socket(self, gpu_partition: str) -> tuple[int, str]:
        """Setup cluster for job-gpus-per-socket asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            [
                "--partition",
                gpu_partition,
                "--gpus-per-socket",
                str(2),
                "--sockets-per-node",
                str(2),
            ],
        )
        return job_id, user

    def setup_for_job_gpus_per_task(self, gpu_partition: str) -> tuple[int, str]:
        """Setup cluster for job-gpus-per-task asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            [
                "--partition",
                gpu_partition,
                "--gpus-per-task",
                str(2),
                "--ntasks",
                str(2),
            ],
        )
        return job_id, user

    def setup_for_job_gpus_gres(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-gres asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            ["--partition", gpu_partition, "--gres", f"gpu:{gpu_per_node}"],
        )
        return job_id, user

    def setup_for_node_gpus_allocated(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for node-gpus-allocated asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            [
                "--partition",
                gpu_partition,
                "--gpus",
                str(gpu_per_node),
                "--nodes",
                str(1),
            ],
        )
        return job_id, user

    def setup_for_node_gpus_mixed(self, gpu_partition: str) -> tuple[int, str]:
        """Setup cluster for node-gpus-mixed asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            ["--partition", gpu_partition, "--gpus", str(1)],
        )
        return job_id, user

    def setup_for_node_gpus_idle(self, gpu_partition: str) -> tuple[str, int, str]:
        """Setup cluster for node-gpus-idle asset. Returns (node_name, job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            ["--partition", gpu_partition, "--gpus", str(1)],
        )
        # Get node before canceling
        node = self.job_nodes(job_id)[0]
        # Cancel job and wait for idle
        self.cancel(user, job_id)
        self.wait_idle(node)
        return node, job_id, user

    def cleanup_after_asset(self, cleanup_state: dict) -> None:
        """Cleanup cluster state after asset crawl."""
        # Cancel all jobs
        for user, job_id in cleanup_state.get("jobs", []):
            try:
                self.cancel(user, job_id)
            except Exception:
                pass  # Job may already be completed/cancelled

        # Resume nodes
        for node in cleanup_state.get("nodes_down", []):
            try:
                self.node_resume(node)
            except Exception:
                pass
        for node in cleanup_state.get("nodes_drain", []):
            try:
                self.node_resume(node)
            except Exception:
                pass

        # Delete reservation
        if cleanup_state.get("reservation"):
            try:
                self.reservation_delete(cleanup_state["reservation"])
            except Exception:
                pass

    @property
    def gpu_info(self) -> dict:
        """Get GPU information from cluster. Cached after first access."""
        if self._gpu_info is None:
            nodes = self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")
            has_gpu = False
            gpu_per_node = 0
            gpu_types = []
            gpu_partition = None

            for node in nodes["nodes"]:
                all_gres = node["gres"].split(",")
                if len(all_gres) and any(
                    [gres_s.startswith("gpu") for gres_s in all_gres]
                ):
                    has_gpu = True
                    for gres_s in all_gres:
                        gres = gres_s.split(":")
                        # skip non-gpu gres
                        if gres[0] != "gpu":
                            continue
                        if len(gres) > 2:
                            gpu_types.append(gres[1])
                            gpu_per_node += int(gres[2])
                        else:
                            gpu_types.append("n/a")
                            gpu_per_node += int(gres[1])
                        gpu_partition = node["partitions"][0]
                    break

            self._gpu_info = {
                "has_gpu": has_gpu,
                "gpu_per_node": gpu_per_node,
                "gpu_types": gpu_types,
                "gpu_partition": gpu_partition,
            }
        return self._gpu_info

    def has_gpu(self) -> bool:
        """Check if cluster has GPU support."""
        return self.gpu_info["has_gpu"]

    def reset_minimal(self) -> None:
        """Reset cluster to minimal baseline state."""
        logger.info("Resetting cluster to minimal state")
        self.cancel_all()
        self.nodes_resume()


def get_component_response(
    url: str,
    query: str,
    headers: str,
    method: str = "GET",
    content: t.Optional[t.Dict] = None,
):
    if method == "GET":
        response = requests.get(f"{url}{query}", headers=headers)
    elif method == "POST":
        kwargs = {}
        if content:
            kwargs["json"] = content
        response = requests.post(f"{url}{query}", headers=headers, **kwargs)
    else:
        raise RuntimeError(f"Unsupport request method {method}")
    return response


def dump_component_query(
    requests_statuses,
    url: str,
    query: str,
    headers: str,
    assets_path: Path,
    asset_name: dict[int, str] | str,
    skip_exist: bool = True,
    prettify: bool = True,
    limit_dump=0,
    method: str = "GET",
    content: t.Optional[t.Dict] = None,
) -> t.Any:
    """Send GET HTTP request to Slurm-web component pointed by URL and save JSON result
    in assets directory."""
    if skip_exist:
        if isinstance(asset_name, dict):
            all_asset_exist = True
            for _asset_name in asset_name.values():
                if not len(list(assets_path.glob(f"{_asset_name}.*"))):
                    all_asset_exist = False
                    break
            if all_asset_exist:
                return
        else:
            assert isinstance(asset_name, str)
            if len(list(assets_path.glob(f"{asset_name}.*"))):
                return
    if method == "GET":
        response = requests.get(f"{url}{query}", headers=headers)
    elif method == "POST":
        kwargs = {}
        if content:
            kwargs["json"] = content
        response = requests.post(f"{url}{query}", headers=headers, **kwargs)
    else:
        raise RuntimeError(f"Unsupport request method {method}")
    return dump_component_response(
        requests_statuses, assets_path, asset_name, response, prettify, limit_dump
    )


def dump_component_response(
    requests_statuses,
    assets_path: Path,
    asset_name: dict[int, str] | str,
    response,
    prettify: bool = True,
    limit_dump=0,
):
    if isinstance(asset_name, dict):
        _asset_name = asset_name[response.status_code]
    else:
        _asset_name = asset_name
    content_type = response.headers.get("content-type")
    if _asset_name not in requests_statuses:
        requests_statuses[_asset_name] = {}
    requests_statuses[_asset_name]["content-type"] = content_type
    requests_statuses[_asset_name]["status"] = response.status_code
    if content_type == "application/json":
        asset = assets_path / f"{_asset_name}.json"
        data = json.loads(response.text)
    else:
        asset = assets_path / f"{_asset_name}.txt"
        data = response.text

    if asset.exists():
        logger.warning("Asset %s already exists, skipping dump", asset)
    else:
        with open(asset, "w+") as fh:
            if asset.suffix == ".json":
                _data = data
                if limit_dump:
                    _data = _data[:limit_dump]
                fh.write(json.dumps(_data, indent=2 if prettify else None))
                # FIXME: add newline
            else:
                fh.write(data)
    return data


class CrawlerError(Exception):
    pass


class Asset:
    """Represents an asset to be crawled, with its name, output files, and method."""

    def __init__(
        self,
        name: str,
        output_files: str | list[str] | dict[int, str],
        method: t.Callable,
    ):
        self.name = name
        if isinstance(output_files, dict):
            # For status-code-based assets, check all possible output files
            self.output_files = list(output_files.values())
        elif isinstance(output_files, list):
            self.output_files = output_files
        else:
            self.output_files = [output_files]
        self.method = method


class ComponentCrawler:
    def __init__(
        self,
        component: str,
        assets: set[Asset],
        manager: BaseAssetsManager,
        cluster: DevelopmentHostCluster,
    ):
        self.component = component
        self.assets = assets
        self.manager = manager
        # Create a lookup dict by name for efficient access
        self.assets_map: dict[str, Asset] = {asset.name: asset for asset in assets}
        self.cluster = cluster

    def count_assets_to_crawl(self) -> int:
        """Count assets that need to be crawled (don't exist yet)."""
        count = 0
        for asset in self.assets:
            if not self.manager.exists(asset):
                count += 1
        return count

    def crawl_all_assets(self, progress_bar=None) -> None:
        """Crawl all assets, resetting cluster and handling cleanup for each."""
        for asset in self.assets:
            # Track if asset was actually crawled (not skipped)
            asset_exists_before = self.manager.exists(asset)
            self.crawl(asset, progress_bar=progress_bar)
            # Only update progress if asset was actually crawled
            if progress_bar and not asset_exists_before:
                progress_bar.update(1)
            if hasattr(self, "_cleanup_state") and self._cleanup_state:
                self.cluster.cleanup_after_asset(self._cleanup_state)
                self._cleanup_state = None

    def crawl(self, asset: Asset, *args, progress_bar=None) -> None:
        if self.manager.exists(asset):
            logger.info(
                "Skipping %s/%s: asset already exists",
                self.component,
                asset.name,
            )
            return

        self.cluster.reset_minimal()

        logger.info("Crawling asset %s on component %s", asset.name, self.component)
        try:
            asset.method(*args)
            self.manager.save()
        except CrawlerError as err:
            logger.error(
                "Error crawling asset %s on component %s: %s",
                asset.name,
                self.component,
                err,
            )


class TokenizedComponentCrawler(ComponentCrawler):
    def __init__(
        self,
        component: str,
        assets: set[Asset],
        manager: BaseAssetsManager,
        cluster: DevelopmentHostCluster,
        url: str,
        token: str,
    ):
        super().__init__(component, assets, manager, cluster)
        self.url = url
        self.token = token

    def get_component_response(
        self, query: str, headers: dict[str, str] | None = None, **kwargs
    ):
        if headers is None:
            headers = {"Authorization": f"Bearer {self.token}"}
        return get_component_response(self.url, query, headers, **kwargs)

    def dump_component_query(
        self,
        query: str,
        asset_name: dict[int, str] | str,
        headers: dict[str, str] | None = None,
        **kwargs,
    ):
        if headers is None:
            headers = {"Authorization": f"Bearer {self.token}"}
        return dump_component_query(
            self.manager.statuses,
            self.url,
            query,
            headers,
            self.manager.path,
            asset_name,
            **kwargs,
        )

    def dump_component_response(
        self, asset_name: dict[int, str] | str, response, **kwargs
    ):
        return dump_component_response(
            self.manager.statuses, self.manager.path, asset_name, response, **kwargs
        )
