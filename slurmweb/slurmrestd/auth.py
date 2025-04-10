# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import typing as t


class SlurmrestdAuthentifier:
    def __init__(
        self,
        method: str,
        jwt_user: str,
        jwt_token: t.Optional[str],
    ):
        self.method = method
        self.jwt_user = jwt_user
        self.jwt_token = jwt_token

    def headers(self):
        if self.method == "local":
            return {}
        return {
            "X-SLURM-USER-NAME": self.jwt_user,
            "X-SLURM-USER-TOKEN": self.jwt_token,
        }
