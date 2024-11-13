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


class SlurmwebRestdError(Exception):
    def __init__(self, message, error, description, source):
        super().__init__(message)
        self.message = message
        self.error = error
        self.description = description
        self.source = source

    def __str__(self):
        return f"SlurwebRestdError({self.message}, {self.error}, {self.description}, {self.source})"


# Alias JSONDecodeError from simplejson external library and json standard library
# module to catch generically the error raised with Requests < 2.27 on old systems in
# presence of unexepected non-JSON responses.
#
# This is not needed with Requests >= 2.27 where the same logic is implemented with
# requests.exceptions.JSONDecodeError wildcard exception. For reference, see:
# https://github.com/psf/requests/pull/5856

try:
    from simplejson import JSONDecodeError
except ImportError:
    from json import JSONDecodeError

SlurmwebCompatJSONDecodeError = JSONDecodeError
