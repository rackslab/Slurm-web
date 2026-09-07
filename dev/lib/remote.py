# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import paramiko


def exec_remote_command(
    connection: paramiko.client.SSHClient, cmd: str
) -> tuple[int, str, str]:
    _, stdout, stderr = connection.exec_command(cmd)
    exit_code = stdout.channel.recv_exit_status()
    return exit_code, stdout.read().decode(), stderr.read().decode()
