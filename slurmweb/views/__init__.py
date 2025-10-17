# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT


class SlurmwebAppRoute:
    def __init__(self, endpoint: str, func, methods=None):
        self.endpoint = endpoint
        self.func = func
        self.methods = methods
