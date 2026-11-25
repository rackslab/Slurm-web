# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

"""Helpers to interact with FireHPC clusters.

FireHPC runs on the local host and deploys the containers of the emulated
clusters on the development host (remote mode). The cluster state directory
(secrets, keys, etc) is then available locally.
"""

from dataclasses import dataclass
import getpass
import json
import logging
import os
import shlex
import subprocess
from pathlib import Path
from typing import Any

import paramiko
import yaml

logger = logging.getLogger(__name__)


def cluster_state_dir(cluster: str) -> Path:
    """Return path to local FireHPC state directory of the given cluster."""
    return (
        Path(os.getenv("XDG_STATE_HOME", "~/.local/state")).expanduser()
        / "firehpc"
        / "clusters"
        / cluster
    )


def firehpc_cmd(*args: str) -> list[str]:
    return ["firehpc", *args]


def run_firehpc(*args: str) -> tuple[int, str, str]:
    """Run FireHPC command locally until completion, return its exit code, standard
    output and standard error."""
    cmd = firehpc_cmd(*args)
    logger.debug("Running command locally: %s", shlex.join(cmd))
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
    except FileNotFoundError as err:
        raise RuntimeError(f"Command not found: {cmd[0]}") from err
    return result.returncode, result.stdout, result.stderr


def cluster_status(cluster: str) -> dict[str, Any]:
    """Return FireHPC status of the given cluster."""
    exit_code, stdout, stderr = run_firehpc("status", "--cluster", cluster, "--json")
    try:
        return json.loads(stdout)
    except json.decoder.JSONDecodeError as err:
        details = []
        if exit_code != 0:
            details.append(f"exit code {exit_code}")
        if stderr.strip():
            details.append(f"stderr: {stderr.strip()}")
        if stdout.strip():
            details.append(f"stdout: {stdout.strip()}")
        else:
            details.append("stdout was empty")
        raise RuntimeError(
            f"Unable to load {cluster} cluster status: invalid JSON ({err}). "
            f"`firehpc status` failed ({'; '.join(details)})."
        ) from err


@dataclass
class ClusterRemote:
    """SSH destination of the host running the containers of a cluster."""

    host: str
    port: int
    user: str


def cluster_remote(cluster: str) -> ClusterRemote:
    """Return SSH destination of the remote host running the containers of the
    given cluster, as saved by FireHPC in cluster settings. Like FireHPC, the
    destination is resolved with SSH client configuration file."""
    settings_path = cluster_state_dir(cluster) / "settings.yml"
    try:
        with open(settings_path) as fh:
            settings = yaml.safe_load(fh)
    except FileNotFoundError as err:
        raise RuntimeError(
            f"FireHPC settings of cluster {cluster} not found ({settings_path}), "
            "check the cluster is deployed"
        ) from err
    remote = settings.get("remote")
    if not remote:
        raise RuntimeError(
            f"Cluster {cluster} is not deployed on a FireHPC remote host"
        )

    # Parse [USER@]HOST[:PORT]
    user = None
    port = None
    if "@" in remote:
        user, remote = remote.split("@", 1)
    if ":" in remote:
        remote, _port = remote.rsplit(":", 1)
        port = int(_port)

    ssh_config_path = Path("~/.ssh/config").expanduser()
    ssh_config = {}
    if ssh_config_path.exists():
        ssh_config = paramiko.SSHConfig.from_path(ssh_config_path).lookup(remote)

    return ClusterRemote(
        host=ssh_config.get("hostname", remote),
        port=port or int(ssh_config.get("port", 22)),
        user=user or ssh_config.get("user", getpass.getuser()),
    )
