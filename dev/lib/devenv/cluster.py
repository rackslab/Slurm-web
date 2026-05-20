# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from dataclasses import dataclass
import logging
import shlex
import subprocess

import paramiko
import sshtunnel

from devenv.constants import CLUSTERS, USER
from devenv.ports import PortForward, runcmd

logger = logging.getLogger(__name__)


@dataclass
class ClusterChannel:
    name: str
    connection: paramiko.client.SSHClient
    forwarder: sshtunnel.SSHTunnelForwarder
    process: subprocess.Popen

    @classmethod
    def connect(
        cls,
        host: str,
        ssh_client: paramiko.client.SSHClient,
        forwards: dict[str, PortForward],
        cluster: str,
        cluster_id: int,
    ):
        remote_bind_addresses = []
        local_bind_addresses = []

        for forward in forwards.values():
            remote_bind_addresses.append(
                (
                    f"admin.{cluster}.{ssh_client.get_transport().get_username()}",
                    forward.remote,
                )
            )
            local_bind_addresses.append(("localhost", forward.local))
        forwarder = sshtunnel.SSHTunnelForwarder(
            host,
            ssh_username=USER,
            allow_agent=True,
            remote_bind_addresses=remote_bind_addresses,
            local_bind_addresses=local_bind_addresses,
        )
        forwarder.start()

        process = None
        if CLUSTERS[cluster].get("scheme", "unix") == "unix":
            cmd = shlex.join(
                [
                    "firehpc",
                    "ssh",
                    f"admin.{cluster}",
                    "socat",
                    f"TCP-LISTEN:{forwards['slurmrestd'].remote},fork",
                    "UNIX-CONNECT:/run/slurmrestd/slurmrestd.socket",
                ]
            )
            logger.info("Running command on development server: %s", cmd)
            ssh_client.exec_command(cmd)

            cmd = [
                "socat",
                f"UNIX-LISTEN:/tmp/slurmrestd-{cluster}.socket,fork",
                f"TCP-CONNECT:localhost:{forwards['slurmrestd'].local}",
            ]
            logger.info("Running command locally: %s", shlex.join(cmd))
            process = runcmd(cmd)

        return cls(cluster, ssh_client, forwarder, process)

    def stop(self) -> None:
        logger.info("Stopping %s remote socat command", self.name)
        cmd = shlex.join(["firehpc", "ssh", f"admin.{self.name}", "killall", "socat"])
        self.connection.exec_command(cmd)
        logger.info("Stopping %s forwarder", self.name)
        self.forwarder.stop()
        if self.process:
            logger.info("Stopping %s socat process", self.name)
            self.process.kill()
