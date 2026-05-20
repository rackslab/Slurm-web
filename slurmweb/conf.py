# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import logging
from pathlib import Path
from typing import Optional

from .errors import SlurmwebConfigurationError

logger = logging.getLogger(__name__)


def load_secret_from_file(
    secret_file: Optional[Path],
    parameter_name: str,
) -> Optional[str]:
    """Read a secret from a file path.

    Return None when secret_file is None. Otherwise, read the file as text and
    return its contents. Raise SlurmwebConfigurationError when the path is not
    a file, cannot be read, is not valid UTF-8, or is empty. The parameter_name
    is used in error messages to identify the setting.
    """
    if secret_file is None:
        return None

    logger.debug("Loading %s from the specified file", parameter_name)

    if not secret_file.is_file():
        raise SlurmwebConfigurationError(
            f"{parameter_name} file path {secret_file} is not a file"
        )
    try:
        secret = secret_file.read_text()
    except PermissionError as err:
        raise SlurmwebConfigurationError(
            f"Permission error to access {parameter_name} file {secret_file}"
        ) from err
    except UnicodeDecodeError as err:
        raise SlurmwebConfigurationError(
            f"Unable to decode {parameter_name} file {secret_file}: {err}"
        ) from err
    if not len(secret):
        raise SlurmwebConfigurationError(
            f"{parameter_name} loaded from file {secret_file} is empty"
        )

    return secret
