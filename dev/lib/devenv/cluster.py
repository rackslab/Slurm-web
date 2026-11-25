# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from dataclasses import dataclass
import logging
import shlex
import subprocess

import sshtunnel

from devenv.constants import CLUSTERS
from devenv.ports import PortForward, runcmd
from fhpc import cluster_remote, firehpc_cmd, run_firehpc

logger = logging.getLogger(__name__)


@dataclass
class ClusterChannel:
    name: str
    forwarder: sshtunnel.SSHTunnelForwarder
    remote_process: subprocess.Popen
    process: subprocess.Popen

    @classmethod
    def connect(
        cls,
        forwards: dict[str, PortForward],
        cluster: str,
    ):
        remote = cluster_remote(cluster)
        logger.info(
            "Opening tunnels to cluster %s through %s@%s:%d",
            cluster,
            remote.user,
            remote.host,
            remote.port,
        )
        remote_bind_addresses = []
        local_bind_addresses = []

        for forward in forwards.values():
            remote_bind_addresses.append(
                (
                    # Containers names are suffixed by remote user namespace.
                    f"admin.{cluster}.{remote.user}",
                    forward.remote,
                )
            )
            local_bind_addresses.append(("localhost", forward.local))
        forwarder = sshtunnel.SSHTunnelForwarder(
            (remote.host, remote.port),
            ssh_username=remote.user,
            allow_agent=True,
            remote_bind_addresses=remote_bind_addresses,
            local_bind_addresses=local_bind_addresses,
        )
        forwarder.start()

        remote_process = None
        process = None
        if CLUSTERS[cluster].get("scheme", "unix") == "unix":
            # Expose slurmrestd Unix socket on TCP port in cluster admin node.
            cmd = firehpc_cmd(
                "ssh",
                f"admin.{cluster}",
                "socat",
                f"TCP-LISTEN:{forwards['slurmrestd'].remote},fork,reuseaddr",
                "UNIX-CONNECT:/run/slurmrestd/slurmrestd.socket",
            )
            logger.info("Running command locally: %s", shlex.join(cmd))
            remote_process = runcmd(cmd)

            cmd = [
                "socat",
                f"UNIX-LISTEN:/tmp/slurmrestd-{cluster}.socket,fork",
                f"TCP-CONNECT:localhost:{forwards['slurmrestd'].local}",
            ]
            logger.info("Running command locally: %s", shlex.join(cmd))
            process = runcmd(cmd)

        return cls(cluster, forwarder, remote_process, process)

    def stop(self) -> None:
        if self.remote_process:
            logger.info("Stopping %s remote socat command", self.name)
            run_firehpc("ssh", f"admin.{self.name}", "killall", "socat")
            self.remote_process.kill()
        logger.info("Stopping %s forwarder", self.name)
        self.forwarder.stop()
        if self.process:
            logger.info("Stopping %s socat process", self.name)
            self.process.kill()
