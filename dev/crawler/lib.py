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

# Supported slurmrestd API versions to try during discovery, in descending order
# (newest first)
SUPPORTED_SLURMRESTD_API_VERSIONS = ["0.0.44", "0.0.43", "0.0.42", "0.0.41"]


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
        checked_patterns: list[str] = []
        missing_patterns: list[str] = []
        for output_file in asset.output_files:
            output_path = self.path / Path(output_file)
            base_dir = output_path.parent
            stem = output_path.stem
            pattern = f"{stem}.*"
            checked_patterns.append(str(base_dir / pattern))
            if not any(base_dir.glob(pattern)):
                missing_patterns.append(str(base_dir / pattern))
        if missing_patterns:
            logger.debug(
                "Missing asset outputs for %s: %s",
                asset.name,
                ", ".join(missing_patterns),
            )
            return False
        logger.debug(
            "All asset outputs exist for %s: %s",
            asset.name,
            ", ".join(checked_patterns),
        )
        return True

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
        settings: RuntimeSettings,
        auth: SlurmrestdAuthentifier,
    ):
        self.dev_host = dev_host
        self.name = name
        self.settings = settings
        self.auth = auth
        self.session = requests.Session()

        uri = settings.slurmrestd.uri
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

        # Discover and save the latest supported slurmrestd API version
        self.api = self._discover_latest_api_version()

    def query_slurmrestd(
        self, query: str, headers: dict[str, str] | None = None
    ) -> requests.Response:
        """Send GET HTTP request to slurmrestd and return Response object.

        Args:
            query: Query path to append to prefix.
            headers: Optional HTTP headers. If None, uses auth headers.

        Returns:
            requests.Response object.

        Raises:
            RuntimeError: In case of connection error.
        """
        if headers is None:
            headers = self.auth.headers()
        try:
            return self.session.get(f"{self.prefix}/{query}", headers=headers)
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}") from err

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

    def _discover_latest_api_version(self) -> str:
        """Discover the latest supported slurmrestd API version on the cluster.

        Uses discover_api_versions() to find all supported versions and returns the
        latest (first) one.

        Returns:
            The latest supported API version (e.g., "0.0.44")
        """
        discovered = self.discover_api_versions()
        _, api_version = discovered[0]
        logger.info("Discovered latest slurmrestd API version: %s", api_version)
        return api_version

    def discover_api_versions(self) -> list[tuple[str, str]]:
        """Discover slurmrestd API versions and Slurm versions.

        Tries each API version in the URL and extracts the Slurm version from
        the response.

        Returns:
            List of tuples (slurm_version, api_version) for each successfully discovered
            version. slurm_version is the major.minor version (e.g., "23.11").
        """

        discovered_versions = []

        for api_version in SUPPORTED_SLURMRESTD_API_VERSIONS:
            try:
                response = self.query_slurmrestd(
                    f"/slurm/v{api_version}/ping", self.auth.headers()
                )

                if (
                    response.status_code == 200
                    and response.headers.get("content-type") == "application/json"
                ):
                    try:
                        result = response.json()
                        if len(result.get("errors", [])):
                            continue

                        # Extract Slurm version
                        slurm_meta = result.get("meta", {}).get("slurm", {})
                        if slurm_meta:
                            release = slurm_meta.get("release", "")
                            # Extract major.minor version (e.g., "23.11" from "23.11.0")
                            slurm_version = release.rsplit(".", 1)[0] if release else ""

                            if slurm_version:
                                discovered_versions.append((slurm_version, api_version))
                                logger.info(
                                    "Discovered Slurm %s API version %s",
                                    slurm_version,
                                    api_version,
                                )
                    except (KeyError, ValueError, json.JSONDecodeError) as err:
                        logger.debug(
                            "Unable to parse version information from response "
                            "for version %s: %s",
                            api_version,
                            err,
                        )
                        continue
                elif response.status_code == 401:
                    logger.warning(
                        "Authentication error when trying API version %s, stopping",
                        api_version,
                    )
                    break
                elif response.status_code == 404:
                    logger.debug(
                        "API version %s not found (404), trying next", api_version
                    )
                    continue
            except Exception as err:
                logger.debug(
                    "Error trying API version %s: %s, continuing", api_version, err
                )
                continue

        return discovered_versions

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

    def find_gpu_nodes_with_model(self, partition: str | None = None) -> list[str]:
        """Find GPU nodes with model information (gres format: gpu:model:count).

        Args:
            partition: Optional partition name to filter nodes. If None,
                searches all partitions.

        Returns:
            List of node names with GPU model information.
        """
        nodes = self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")
        result = []
        for node in nodes["nodes"]:
            if partition and partition not in node["partitions"]:
                continue
            all_gres = node.get("gres", "").split(",")
            for gres_s in all_gres:
                if not gres_s.strip():
                    continue
                gres = gres_s.split(":")
                if gres[0] == "gpu" and len(gres) > 2:
                    result.append(node["name"])
                    break
        return result

    def find_gpu_nodes_without_model(self, partition: str | None = None) -> list[str]:
        """Find GPU nodes without model information (gres format: gpu:count).

        Args:
            partition: Optional partition name to filter nodes. If None,
                searches all partitions.

        Returns:
            List of node names without GPU model information.
        """
        nodes = self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")
        result = []
        for node in nodes["nodes"]:
            if partition and partition not in node["partitions"]:
                continue
            all_gres = node.get("gres", "").split(",")
            has_gpu = False
            has_model = False
            for gres_s in all_gres:
                if not gres_s.strip():
                    continue
                gres = gres_s.split(":")
                if gres[0] == "gpu":
                    has_gpu = True
                    if len(gres) > 2:
                        has_model = True
                        break
            if has_gpu and not has_model:
                result.append(node["name"])
        return result

    def _update_node(
        self, nodename: str, state: str | None = None, reason: str | None = None
    ) -> bool:
        """Update a node using REST API.

        Args:
            nodename: The node name to update.
            state: Optional new state for the node (e.g., "DOWN", "DRAIN", "RESUME").
            reason: Optional reason for the state change.

        Returns:
            True if node was successfully updated, False otherwise.
        """
        headers = self.auth.headers()
        headers["Content-Type"] = "application/json"

        # Build update request body
        update_data: dict[str, str] = {}
        if state:
            update_data["state"] = state
        if reason:
            update_data["reason"] = reason

        try:
            response = self.session.post(
                f"{self.prefix}/slurm/v{self.api}/node/{nodename}",
                headers=headers,
                json=update_data,
            )
            if response.status_code == 200:
                logger.debug("Updated node %s", nodename)
                return True
            else:
                logger.warning(
                    "Failed to update node %s: status code %s",
                    nodename,
                    response.status_code,
                )
                return False
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}") from err

    def node_update(self, nodename: str, state: str, reason: str) -> None:
        """Update a node state using REST API.

        Args:
            nodename: The node name to update.
            state: New state for the node (e.g., "DOWN", "DRAIN").
            reason: Reason for the state change.
        """
        self._update_node(nodename, state=state, reason=reason)

    def node_resume(self, nodename: str) -> None:
        """Resume a node using REST API.

        Args:
            nodename: The node name to resume.
        """
        self._update_node(nodename, state="RESUME")

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
        job_params: dict[str, t.Any],
        duration: int = 30,
        timelimit: int = 1,
        wait_running: bool = True,
        success: bool = True,
    ) -> int:
        """Submit a job using REST API.

        Args:
            user: User submitting the job (kept for compatibility, not used).
            job_params: Dictionary of job parameters for REST API (e.g.,
                {"partition": "gpu", "tres_per_job": "gres/gpu:2"}).
            duration: Job sleep duration in seconds.
            timelimit: Job time limit in minutes.
            wait_running: If True, wait for job to reach RUNNING state.
            success: If True, job exits successfully, otherwise fails.

        Returns:
            The submitted job ID.
        """

        # Build job script
        script = f"#!/bin/bash\nsleep {duration} && {'true' if success else 'false'}"

        # Create a copy of job_params to avoid modifying the original
        job_params_copy = job_params.copy()
        # job_params_copy["script"] = script
        job_params_copy["user_id"] = user
        job_params_copy["current_working_directory"] = f"/home/{user}"
        job_params_copy["environment"] = [
            f"USERNAME={user}",
        ]
        # Add time limit if not already specified
        if "time_limit" not in job_params_copy:
            job_params_copy["time_limit"] = timelimit * 60  # Convert minutes to seconds

        headers = self.auth.headers()
        headers["Content-Type"] = "application/json"

        try:
            logger.info(
                "Submitting job as %s with params: %s, script: %s",
                user,
                job_params_copy,
                script,
            )
            response = self.session.post(
                f"{self.prefix}/slurm/v{self.api}/job/submit",
                headers=headers,
                json={
                    "script": script,
                    "job": job_params_copy,
                },
            )

            if response.status_code != 200:
                error_text = response.text
                raise CrawlerError(
                    f"Unable to submit batch job: "
                    f"status code {response.status_code}, {error_text}"
                )

            result = response.json()

            # Check for errors in response
            if result.get("errors"):
                error = result["errors"][0]
                error_desc = error.get("description", "Unknown error")
                raise CrawlerError(f"Unable to submit batch job: {error_desc}")

            # Check for warnings in response
            if len(result.get("warnings", [])):
                for warning in result["warnings"]:
                    logger.warning("Batch job submission warning: %s", warning)

            # Extract job ID from response
            # Response format: {"job_id": 123, "step_id": null, "errors": [], ...}
            if "job_id" not in result:
                raise CrawlerError("Unable to extract job ID from submission response")

            job_id = result["job_id"]
            logger.debug("Submitted job %s", job_id)

            if wait_running:
                max_tries = 10
                for idx in range(max_tries):
                    job = self.query_slurmrestd_json(f"/slurm/v{self.api}/job/{job_id}")
                    if "RUNNING" in job["jobs"][0]["job_state"]:
                        break
                    if idx == max_tries - 1:
                        raise CrawlerError(
                            f"Unable to get job {job_id} in RUNNING state"
                        )
                    else:
                        time.sleep(1)
            return job_id

        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}") from err

    def _cancel(self, job_id: int) -> bool:
        """Cancel a single job using REST API.

        Args:
            job_id: The job ID to cancel.

        Returns:
            True if job was successfully cancelled, False otherwise.
        """
        headers = self.auth.headers()
        try:
            response = self.session.delete(
                f"{self.prefix}/slurm/v{self.api}/job/{job_id}",
                headers=headers,
            )
            if response.status_code == 200:
                logger.debug("Cancelled job %s", job_id)
                return True
            else:
                logger.warning(
                    "Failed to cancel job %s: status code %s",
                    job_id,
                    response.status_code,
                )
                return False
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}") from err

    def cancel(self, user: str, job_id: int) -> None:
        """Cancel a job using REST API.

        Args:
            user: User who owns the job (kept for compatibility, not used).
            job_id: The job ID to cancel.
        """
        self._cancel(job_id)

    def cancel_all(self) -> None:
        """Cancel all jobs using REST API."""
        # Get all jobs
        jobs = self.query_slurmrestd_json(f"/slurm/v{self.api}/jobs")

        # Cancel each job
        for job in jobs.get("jobs", []):
            job_id = job["job_id"]
            self._cancel(job_id)

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
        headers = self.auth.headers()
        headers["Content-Type"] = "application/json"

        reservation_payload: dict[str, object] = {
            "name": name,
            "partition": partition,
            "flags": ["ANY_NODES", "FLEX", "IGNORE_JOBS"],
            "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
        }

        if users:
            reservation_payload["users"] = users
        if accounts:
            reservation_payload["accounts"] = accounts

        try:
            response = self.session.post(
                f"{self.prefix}/slurm/v{self.api}/reservation",
                headers=headers,
                json=reservation_payload,
            )
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}") from err

        if response.headers.get("content-type") != "application/json":
            raise CrawlerError(
                "Unexpected content-type for reservation creation: "
                f"{response.headers.get('content-type')}"
            )

        if response.status_code != 200:
            raise CrawlerError(
                "Unable to create reservation "
                f"{name}: status code {response.status_code}, {response.text}"
            )

        result = response.json()
        if len(result.get("errors", [])):
            error = result["errors"][0]
            description = error.get("description", "slurmrestd undefined error")
            raise CrawlerError(f"Unable to create reservation {name}: {description}")

        for warning in result.get("warnings", []):
            logger.warning("Reservation %s creation warning: %s", name, warning)

        logger.debug("Created reservation %s via slurmrestd", name)

    def reservation_delete(self, name: str) -> None:
        headers = self.auth.headers()
        try:
            response = self.session.delete(
                f"{self.prefix}/slurm/v{self.api}/reservation/{name}",
                headers=headers,
            )
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}") from err

        if response.headers.get("content-type") != "application/json":
            raise CrawlerError(
                "Unexpected content-type for reservation deletion: "
                f"{response.headers.get('content-type')}"
            )

        if response.status_code != 200:
            raise CrawlerError(
                "Unable to delete reservation "
                f"{name}: status code {response.status_code}, {response.text}"
            )

        result = response.json()
        if len(result.get("errors", [])):
            error = result["errors"][0]
            description = error.get("description", "slurmrestd undefined error")
            raise CrawlerError(f"Unable to delete reservation {name}: {description}")

        logger.debug("Deleted reservation %s via slurmrestd", name)

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
            {"tasks": 1},
            duration=90,
            timelimit=1,
            wait_running=False,
        )
        cleanup_state["jobs"].append((user, job_id))
        # Submit completed job
        job_id = self.submit(
            user,
            {"tasks": 1},
            duration=1,
            wait_running=False,
        )
        cleanup_state["jobs"].append((user, job_id))
        # Submit failed job
        job_id = self.submit(
            user,
            {"tasks": 1},
            duration=1,
            wait_running=False,
            success=False,
        )
        cleanup_state["jobs"].append((user, job_id))
        # Submit 10 random running jobs
        for _ in range(10):
            job_id = self.submit(
                user,
                {"tasks": random.choice([1, 4, 16, 32, 64, 128])},
                duration=random.choice([30, 60, 90]),
                timelimit=2,
                wait_running=False,
            )
            cleanup_state["jobs"].append((user, job_id))
        # Submit pending job
        job_id = self.submit(
            user,
            {
                "tasks": random.choice([1, 4, 16, 32, 64, 128]),
                "begin_time": "now+1hour",
            },
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
        for _ in range(60):
            job_id = self.submit(
                user,
                {"tasks": 2},
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
                {"tasks": 1},
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
            {
                "partition": gpu_partition,
                "tres_per_job": f"gres/gpu:{gpu_per_node}",
            },
        )
        return job_id, user

    def setup_for_job_gpus_pending(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-pending asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            {
                "partition": gpu_partition,
                "tres_per_job": f"gres/gpu:{gpu_per_node}",
                "begin_time": "now+1hour",
            },
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
            {
                "partition": gpu_partition,
                "tres_per_job": f"gres/gpu:{gpu_per_node}",
            },
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
            {
                "partition": gpu_partition,
                "tres_per_job": f"gres/gpu:{gpu_per_node}",
            },
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
            {
                "partition": gpu_partition,
                "tres_per_job": f"gres/gpu:{gpu_per_node * 2}",
            },
        )
        return job_id, user

    def setup_for_job_gpus_type(
        self, gpu_partition: str, gpu_type: str
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-type asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            {
                "partition": gpu_partition,
                "tres_per_job": f"gres/gpu:{gpu_type}:1",
            },
        )
        return job_id, user

    def setup_for_job_gpus_per_node(self, gpu_partition: str) -> tuple[int, str]:
        """Setup cluster for job-gpus-per-node asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            {
                "partition": gpu_partition,
                "tres_per_node": "gres/gpu:1",
                "nodes": "2",
            },
        )
        return job_id, user

    def setup_for_job_gpus_multi_types(
        self, gpu_partition: str, gpu_types: list[str]
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-multi-types asset. Returns (job_id, user)."""
        user = self.pick_user()
        # Format: "gres/gpu:type1:1,gres/gpu:type2:1"
        tres_per_node = ",".join([f"gres/gpu:{gpu_type}:1" for gpu_type in gpu_types])
        job_id = self.submit(
            user,
            {
                "partition": gpu_partition,
                "tres_per_node": tres_per_node,
            },
        )
        return job_id, user

    def setup_for_job_gpus_per_socket(self, gpu_partition: str) -> tuple[int, str]:
        """Setup cluster for job-gpus-per-socket asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            {
                "partition": gpu_partition,
                "tres_per_socket": "gres/gpu:2",
                "sockets_per_node": 2,
            },
        )
        return job_id, user

    def setup_for_job_gpus_per_task(self, gpu_partition: str) -> tuple[int, str]:
        """Setup cluster for job-gpus-per-task asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            {
                "partition": gpu_partition,
                "tres_per_task": "gres/gpu:2",
                "tasks": 2,
            },
        )
        return job_id, user

    def setup_for_job_gpus_gres(
        self, gpu_partition: str, gpu_per_node: int
    ) -> tuple[int, str]:
        """Setup cluster for job-gpus-gres asset. Returns (job_id, user)."""
        user = self.pick_user()
        job_id = self.submit(
            user,
            {
                "partition": gpu_partition,
                "tres_per_job": f"gpu:{gpu_per_node}",
            },
        )
        return job_id, user

    def setup_for_node_gpus_allocated(
        self, gpu_partition: str, gpu_per_node: int, node_name: str | None = None
    ) -> tuple[int, str]:
        """Setup cluster for node-gpus-allocated asset. Returns (job_id, user).

        Args:
            gpu_partition: Partition name with GPU nodes.
            gpu_per_node: Number of GPUs per node.
            node_name: Optional specific node name to target. If None,
                any node in partition is used.
        """
        user = self.pick_user()
        job_params: dict[str, t.Any] = {
            "partition": gpu_partition,
            "tres_per_job": f"gres/gpu:{gpu_per_node}",
            "nodes": "1",
        }
        if node_name:
            job_params["required_nodes"] = [node_name]
        job_id = self.submit(user, job_params)
        return job_id, user

    def setup_for_node_gpus_mixed(
        self, gpu_partition: str, node_name: str | None = None
    ) -> tuple[int, str]:
        """Setup cluster for node-gpus-mixed asset. Returns (job_id, user).

        Args:
            gpu_partition: Partition name with GPU nodes.
            node_name: Optional specific node name to target. If None,
                any node in partition is used.
        """
        user = self.pick_user()
        job_params: dict[str, t.Any] = {
            "partition": gpu_partition,
            "tres_per_job": "gres/gpu:1",
        }
        if node_name:
            job_params["nodelist"] = node_name
        job_id = self.submit(user, job_params)
        return job_id, user

    def setup_for_node_gpus_idle(
        self, gpu_partition: str, node_name: str | None = None
    ) -> tuple[str, int, str]:
        """Setup cluster for node-gpus-idle asset. Returns (node_name, job_id, user).

        Args:
            gpu_partition: Partition name with GPU nodes.
            node_name: Optional specific node name to target. If None,
                any node in partition is used.
        """
        user = self.pick_user()
        job_params: dict[str, t.Any] = {
            "partition": gpu_partition,
            "tres_per_job": "gres/gpu:1",
        }
        if node_name:
            job_params["required_nodes"] = [node_name]
        job_id = self.submit(user, job_params)
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

    def get_component_response(
        self,
        query: str,
        headers: dict[str, str] | None = None,
        method: str = "GET",
        content: dict[str, t.Any] | None = None,
    ) -> requests.Response:
        """Get HTTP response from component. Must be implemented by subclasses.

        Args:
            query: Query path.
            headers: Optional HTTP headers.
            method: HTTP method ("GET" or "POST").
            content: Optional content for POST requests.

        Returns:
            requests.Response object.
        """
        raise NotImplementedError("Subclasses must implement get_component_response()")

    def dump_component_response(
        self,
        asset_name: dict[int, str] | str,
        response: requests.Response,
        shared_asset: bool = False,
        limit_dump: int = 0,
        limit_key: str | None = None,
        skip_exist: bool = True,
        prettify: bool = True,
    ) -> t.Any:
        """Save component response to asset file.

        Args:
            asset_name: Asset name (string) or dict mapping status codes to asset names.
            response: HTTP response object.
            shared_asset: If True, save to parent directory (for shared assets).
            limit_dump: Limit number of items to dump (for arrays or dict keys).
            limit_key: Optional key in dict to limit (for nested limiting).
            skip_exist: If True, skip if asset already exists.
            prettify: If True, format JSON with indentation.

        Returns:
            Parsed data (dict/list for JSON, string for text).
        """
        # Handle status-code-based asset names
        if isinstance(asset_name, dict):
            _asset_name = asset_name.get(response.status_code, asset_name.get(200, ""))
            if not _asset_name:
                raise CrawlerError(
                    f"No asset name found for status {response.status_code} "
                    f"in {asset_name}"
                )
        else:
            _asset_name = asset_name

        # Determine target directory
        target_dir = self.manager.path if not shared_asset else self.manager.path.parent

        # Save status information
        if not shared_asset:
            if _asset_name not in self.manager.statuses:
                self.manager.statuses[_asset_name] = {}
            self.manager.statuses[_asset_name]["content-type"] = response.headers.get(
                "content-type", ""
            )
            self.manager.statuses[_asset_name]["status"] = response.status_code

        # Determine file path and parse data
        content_type = response.headers.get("content-type", "")
        if content_type == "application/json":
            asset = target_dir / f"{_asset_name}.json"
            data = response.json()
        else:
            asset = target_dir / f"{_asset_name}.txt"
            data = response.text

        # Check if asset exists
        if asset.exists():
            if skip_exist:
                logger.warning("Asset %s already exists, skipping dump", asset)
                return data

        # Write asset file
        with open(asset, "w+") as fh:
            if content_type == "application/json":
                _data = data
                # Apply limit if specified
                if limit_dump:
                    if limit_key:
                        # Nested limiting: limit a specific key in dict
                        _data = data.copy()
                        _data[limit_key] = _data[limit_key][:limit_dump]
                    elif isinstance(data, list):
                        # Array limiting: limit the list itself
                        _data = data[:limit_dump]
                fh.write(json.dumps(_data, indent=2 if prettify else None))
                # FIXME: add newline
            else:
                fh.write(data)

        return data

    def dump_component_query(
        self,
        query: str,
        asset_name: dict[int, str] | str,
        headers: dict[str, str] | None = None,
        shared_asset: bool = False,
        limit_dump: int = 0,
        limit_key: str | None = None,
        skip_exist: bool = True,
        prettify: bool = True,
        method: str = "GET",
        content: dict[str, t.Any] | None = None,
    ) -> t.Any:
        """Send HTTP request and save result in assets directory.

        Args:
            query: Query path for the request.
            asset_name: Asset name (string) or dict mapping status codes to asset names.
            headers: Optional HTTP headers.
            shared_asset: If True, save to parent directory.
            limit_dump: Limit number of items to dump.
            limit_key: Optional key in dict to limit.
            skip_exist: If True, skip if asset already exists.
            prettify: If True, format JSON with indentation.
            method: HTTP method ("GET" or "POST").
            content: Optional content for POST requests.

        Returns:
            Parsed data (dict/list for JSON, string for text).
        """
        # Check if asset exists (for skip_exist optimization)
        if skip_exist:
            if isinstance(asset_name, dict):
                all_asset_exist = True
                target_dir = (
                    self.manager.path if not shared_asset else self.manager.path.parent
                )
                for _asset_name in asset_name.values():
                    if not len(list(target_dir.glob(f"{_asset_name}.*"))):
                        all_asset_exist = False
                        break
                if all_asset_exist:
                    return
            else:
                target_dir = (
                    self.manager.path if not shared_asset else self.manager.path.parent
                )
                if len(list(target_dir.glob(f"{asset_name}.*"))):
                    return

        # Make HTTP request
        response = self.get_component_response(
            query, headers=headers, method=method, content=content
        )

        # Dump response using base method
        return self.dump_component_response(
            asset_name=asset_name,
            response=response,
            shared_asset=shared_asset,
            limit_dump=limit_dump,
            limit_key=limit_key,
            skip_exist=skip_exist,
            prettify=prettify,
        )

    def count_assets_to_crawl(self, asset_filter: list[str] | None = None) -> int:
        """Count assets that need to be crawled (don't exist yet).

        Args:
            asset_filter: Optional list of asset names to filter. If provided,
                only count assets matching these names.
        """
        count = 0
        for asset in self.assets:
            if asset_filter and asset.name not in asset_filter:
                continue
            if not self.manager.exists(asset):
                count += 1
        return count

    def crawl_all_assets(
        self, progress_bar=None, asset_filter: list[str] | None = None
    ) -> None:
        """Crawl all assets, resetting cluster and handling cleanup for each.

        Args:
            progress_bar: Optional progress bar to update.
            asset_filter: Optional list of asset names to filter. If provided,
                only crawl assets matching these names.
        """
        for asset in self.assets:
            if asset_filter and asset.name not in asset_filter:
                continue
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
        self,
        query: str,
        headers: dict[str, str] | None = None,
        method: str = "GET",
        content: dict[str, t.Any] | None = None,
    ) -> requests.Response:
        """Get HTTP response from component using token authentication."""
        if headers is None:
            headers = {"Authorization": f"Bearer {self.token}"}
        if method == "GET":
            return requests.get(f"{self.url}{query}", headers=headers)
        elif method == "POST":
            kwargs = {}
            if content:
                kwargs["json"] = content
            return requests.post(f"{self.url}{query}", headers=headers, **kwargs)
        else:
            raise RuntimeError(f"Unsupported request method {method}")
