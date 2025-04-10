# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import typing as t

from rfl.authentication.jwt import jwt_validate_expiration
from rfl.authentication.errors import JWTDecodeError

from ..errors import SlurmwebConfigurationError


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
        # Check token validity (format and expiration).
        if self.jwt_token:
            try:
                jwt_validate_expiration(self.jwt_token)
            except JWTDecodeError as err:
                raise SlurmwebConfigurationError(
                    f"Invalid slurmrestd JWT: {err}"
                ) from err

    def headers(self):
        if self.method == "local":
            return {}
        return {
            "X-SLURM-USER-NAME": self.jwt_user,
            "X-SLURM-USER-TOKEN": self.jwt_token,
        }
