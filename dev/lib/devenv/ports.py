# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from dataclasses import dataclass
import logging
import shlex
import subprocess
import sys

logger = logging.getLogger(__name__)


def runcmd(cmd: list[str]) -> subprocess.Popen:
    try:
        return subprocess.Popen(cmd)
    except FileNotFoundError:
        logger.error("Command not found: %s", shlex.join(cmd))
        sys.exit(1)


@dataclass
class PortForward:
    remote: int
    local: int


class PortAllocator:
    def __init__(self, initial=0):
        self.current = initial - 1
        self.forwards = {
            "ldap": PortForward(389, 3389),
            "slurmrestd": PortForward(6820, 6820),
            "redis": PortForward(6379, 6379),
            "prometheus": PortForward(9090, 9090),
        }

    def allocate(self):
        self.current += 1
        return {
            key: PortForward(value.remote, value.local + self.current)
            for key, value in self.forwards.items()
        }
