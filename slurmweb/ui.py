# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

"""
Frontend UI assets management.

This module is responsible for copying the source frontend UI assets to a target
directory and replacing placeholder base paths placed in the UI assets files.

The target directory is created in the system's systemd runtime directory,
typically `/run/slurm-web-gateway/ui`, or in a temporary directory if the
RUNTIME_DIRECTORY environment variable is not set.

The placeholder base path, set at frontend application build time, is replaced with the
path configured in the public URL prefix. This makes the same build usable under any
path without rebuilding the frontend application.

This approach is not great, to say the least, but considering the limits of the frontend
application build process, it's the best we have found so far.
"""

import atexit
import os
import shutil
import tempfile
from pathlib import Path
import logging

from .errors import SlurmwebRuntimeError

logger = logging.getLogger(__name__)

BASE_PLACEHOLDER = b"/__SLURMWEB_BASE__"


def prepare_ui_assets(source: Path, prefix: str) -> Path:
    """Copy UI assets to a runtime directory and replace placeholder base paths."""

    if prefix != "" and not prefix.startswith("/"):
        raise SlurmwebRuntimeError(
            f"UI prefix '{prefix}' must start with a slash or be empty"
        )

    source = Path(source)
    if not source.exists():
        raise SlurmwebRuntimeError(f"UI path {source} does not exist")

    try:
        target_dir = _target_directory()
    except OSError as err:
        raise SlurmwebRuntimeError(
            f"Unable to create runtime UI directory: {err}"
        ) from err

    replacement = prefix.encode()
    try:
        _copy_ui_tree(source, target_dir, replacement)
    except OSError as err:
        shutil.rmtree(target_dir, ignore_errors=True)
        raise SlurmwebRuntimeError(f"Unable to copy UI assets: {err}") from err

    atexit.register(shutil.rmtree, target_dir, True)
    logger.info("Prepared UI assets in %s", target_dir)
    return target_dir


def _target_directory() -> Path:
    """Return the target directory for the runtime UI assets. If the RUNTIME_DIRECTORY
    environment variable is not set, create a temporary directory. Raise
    SlurmwebRuntimeError if the directory cannot be created."""
    runtime_dir_env = os.environ.get("RUNTIME_DIRECTORY")
    if not runtime_dir_env:
        try:
            target_dir = Path(tempfile.mkdtemp(prefix="slurmweb-ui-"))
            return target_dir
        except OSError as err:
            raise SlurmwebRuntimeError(
                "Unable to create temporary runtime UI directory in "
                f"{runtime_dir_env}: {err}"
            ) from err

    runtime_root = Path(runtime_dir_env)
    if not runtime_root.exists():
        raise SlurmwebRuntimeError(
            f"Systemd runtime directory {runtime_root} does not exist"
        )
    runtime_dir = runtime_root / "ui"
    if runtime_dir.exists():
        shutil.rmtree(runtime_dir, ignore_errors=True)
    try:
        runtime_dir.mkdir()
    except OSError as err:
        raise SlurmwebRuntimeError(
            f"Unable to create runtime UI directory {runtime_dir}: {err}"
        ) from err
    return runtime_dir


def _copy_ui_tree(source: Path, destination: Path, replacement: bytes):
    """
    Copy the source UI assets tree to the destination directory recursively, replacing
    placeholder base paths in files with the provided replacement.
    """
    for entry in source.iterdir():
        target = destination / entry.name
        if entry.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            _copy_ui_tree(entry, target, replacement)
        elif entry.is_symlink():
            target.symlink_to(os.readlink(entry))
        elif entry.is_file():
            _copy_ui_file(entry, target, replacement)
        else:
            logger.debug("Skipping unsupported UI entry %s", entry)


def _copy_ui_file(source: Path, target: Path, replacement: bytes):
    """Copy a file, replacing placeholder only in non-binary files."""
    # Skip placeholder replacement for known binary image files
    if source.suffix.lower() in (".png", ".ico"):
        logger.debug("Copying binary file %s without replacement", source)
        shutil.copy2(source, target)
        return

    # For other files, check if placeholder exists and replace if found
    data = source.read_bytes()
    if BASE_PLACEHOLDER in data:
        logger.debug("Copying and replacing placeholder in file %s", source)
        data = data.replace(BASE_PLACEHOLDER, replacement)
        target.write_bytes(data)
        shutil.copystat(source, target, follow_symlinks=False)
    else:
        logger.debug("Copying file %s without replacement", source)
        shutil.copy2(source, target)
