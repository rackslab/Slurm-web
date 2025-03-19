# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


class SlurmrestConnectionError(Exception):
    pass


class SlurmrestdNotFoundError(Exception):
    pass


class SlurmrestdInvalidResponseError(Exception):
    pass


class SlurmrestdInternalError(Exception):
    def __init__(self, message, error, description, source):
        super().__init__(message)
        self.message = message
        self.error = error
        self.description = description
        self.source = source

    def __str__(self):
        return (
            f"SlurwebRestdError({self.message}, {self.error}, {self.description}, "
            f"{self.source})"
        )
