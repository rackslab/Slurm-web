# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


class SlurmwebRuntimeError(Exception):
    pass


class SlurmwebConfigurationError(Exception):
    pass


class SlurmwebAgentError(Exception):
    pass


class SlurmwebAuthenticationError(Exception):
    pass


class SlurmwebCacheError(Exception):
    pass


class SlurmwebMetricsDBError(Exception):
    pass
