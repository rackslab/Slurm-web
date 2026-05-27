# Copyright (c) 2025-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

"""
Frontend UI assets management and branding.

This module is responsible for copying the source frontend UI assets to a target
directory and replacing placeholder base paths placed in the UI assets files.
It also validates and applies custom branding (colors, logos, favicon) defined in the
gateway [ui] configuration section.

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
import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from .conf import validate_existing_path, validate_hex_color
from .errors import SlurmwebConfigurationError, SlurmwebRuntimeError

logger = logging.getLogger(__name__)

BASE_PLACEHOLDER = b"/__SLURMWEB_BASE__"


class SlurmwebFrontendEnvSettings(object):
    """Development UI asset options read from the process environment."""

    # Environment variable names
    SLURMWEB_DEV_UI_SKIP_COPY = "SLURMWEB_DEV_UI_SKIP_COPY"
    SLURMWEB_DEV_UI_ASSETS_DIR = "SLURMWEB_DEV_UI_ASSETS_DIR"

    __slots__ = ("skip_copy", "assets_dir")

    def __init__(self, skip_copy: bool, assets_dir: Optional[Path] = None) -> None:
        self.skip_copy = skip_copy
        self.assets_dir = assets_dir

    @staticmethod
    def _env_truthy(name: str) -> bool:
        value = os.environ.get(name, "")
        return value.lower() in ("1", "true", "yes")

    @classmethod
    def from_env(cls) -> "SlurmwebFrontendEnvSettings":
        """Build development UI asset options from environment variables."""
        assets_dir = os.environ.get(cls.SLURMWEB_DEV_UI_ASSETS_DIR)
        return cls(
            skip_copy=cls._env_truthy(cls.SLURMWEB_DEV_UI_SKIP_COPY),
            assets_dir=Path(assets_dir) if assets_dir else None,
        )


def _prefixed_asset_path(prefix: str, asset_path: str) -> str:
    """Build a public URL path for a static asset under the UI prefix."""
    if prefix in ("", "/"):
        return f"/{asset_path}"
    return f"{prefix.rstrip('/')}/{asset_path}"


def _copy_ui_tree(source: Path, destination: Path, replacement: bytes) -> None:
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
            resolved = entry.resolve()
            if resolved.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                _copy_ui_tree(resolved, target, replacement)
            elif resolved.is_file():
                _copy_ui_file(resolved, target, replacement)
            else:
                logger.debug("Skipping unsupported symlink target %s", entry)
        elif entry.is_file():
            _copy_ui_file(entry, target, replacement)
        else:
            logger.debug("Skipping unsupported UI entry %s", entry)


def _copy_ui_file(source: Path, target: Path, replacement: bytes) -> None:
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


class SlurmwebFrontend:
    """Manage frontend UI assets and branding for the gateway.

    An instance is created by SlurmwebAppGateway when the [ui] enabled parameter
    is true. It is exposed on the gateway application as app.frontend, while
    app.settings.ui remains the RFL configuration namespace for the [ui] section.
    """

    COLOR_PARAMETERS = (
        ("color_light", "COLOR_LIGHT"),
        ("color_main", "COLOR_MAIN"),
        ("color_darker", "COLOR_DARKER"),
        ("color_dark", "COLOR_DARK"),
        ("color_verydark", "COLOR_VERYDARK"),
        ("color_font_disabled", "COLOR_FONT_DISABLED"),
    )

    LOGO_PARAMETERS = (
        ("logo_login", "LOGO_LOGIN", "brand_login"),
        ("logo_login_dark", "LOGO_LOGIN_DARK", "brand_login_dark"),
        ("logo_horizontal", "LOGO_HORIZONTAL", "brand_horizontal"),
        ("logo_horizontal_dark", "LOGO_HORIZONTAL_DARK", "brand_horizontal_dark"),
    )

    def __init__(self, settings: Any) -> None:
        """Initialize the frontend manager with gateway [ui] settings."""
        self._settings = settings
        self._env_settings = SlurmwebFrontendEnvSettings.from_env()
        self._logo_files: Dict[str, str] = {}
        self._assets_path: Optional[Path] = None

    def validate(self) -> None:
        """Validate optional UI branding settings at gateway startup.

        Checks hexadecimal color values and ensures configured logo and favicon
        paths exist and use supported formats.
        """
        for parameter, _ in self.COLOR_PARAMETERS:
            value = getattr(self._settings, parameter, None)
            if value is not None:
                validate_hex_color(value, f"ui.{parameter}")

        for parameter, _, _ in self.LOGO_PARAMETERS:
            path = getattr(self._settings, parameter, None)
            if path is not None:
                validate_existing_path(path, f"ui.{parameter}")

        favicon = getattr(self._settings, "favicon", None)
        if favicon is not None:
            validate_existing_path(favicon, "ui.favicon")
            if Path(favicon).suffix.lower() != ".ico":
                raise SlurmwebConfigurationError(
                    f"ui.favicon must be a .ico file, got: {favicon}"
                )

    def prepare_assets(self, prefix: str) -> Path:
        """Copy UI assets to a runtime directory and apply custom branding.

        The source tree is read from settings.path. Placeholder base paths in
        text assets are replaced with the given prefix. Custom logo and favicon
        files are copied into the prepared tree when configured.

        When SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_SKIP_COPY is set, the
        source path is used as-is without copying. When
        SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_ASSETS_DIR is set, assets are copied
        into that directory instead of a temporary runtime directory.

        Returns the path to the prepared assets directory. Also populates internal
        state used by runtime_config.
        """
        if prefix != "" and not prefix.startswith("/"):
            raise SlurmwebRuntimeError(
                f"UI prefix '{prefix}' must start with a slash or be empty"
            )

        source = Path(self._settings.path)
        if not source.exists():
            raise SlurmwebRuntimeError(f"UI path {source} does not exist")

        if self._env_settings.skip_copy:
            self._assets_path = source.resolve()
            self._logo_files = {}
            logger.debug(
                "Using UI assets from %s (%s)",
                self._assets_path,
                SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_SKIP_COPY,
            )
            return self._assets_path

        try:
            target_dir = self._target_directory()
        except OSError as err:
            raise SlurmwebRuntimeError(
                f"Unable to create runtime UI directory: {err}"
            ) from err

        replacement = prefix.encode()
        try:
            _copy_ui_tree(source, target_dir, replacement)
            self._logo_files = self._overlay_branding(target_dir)
        except OSError as err:
            shutil.rmtree(target_dir, ignore_errors=True)
            raise SlurmwebRuntimeError(f"Unable to copy UI assets: {err}") from err

        if self._env_settings.assets_dir is None:
            atexit.register(shutil.rmtree, target_dir, True)
        logger.info("Prepared UI assets in %s", target_dir)
        self._assets_path = target_dir
        return target_dir

    def runtime_config(self, prefix: str) -> Dict[str, str]:
        """Build branding entries for the frontend runtime config.json.

        Only parameters that are defined in the gateway configuration and logos
        that were copied during prepare_assets are included.
        """
        config: Dict[str, str] = {}
        for parameter, json_key in self.COLOR_PARAMETERS:
            value = getattr(self._settings, parameter, None)
            if value is not None:
                config[json_key] = value
        for parameter, json_key, _ in self.LOGO_PARAMETERS:
            if parameter not in self._logo_files:
                continue
            config[json_key] = _prefixed_asset_path(
                prefix, f"logo/{self._logo_files[parameter]}"
            )
        logo_alt = getattr(self._settings, "logo_alt", None)
        if logo_alt is not None:
            config["LOGO_ALT"] = logo_alt
        return config

    @property
    def assets_path(self) -> Path:
        """Return the path to prepared UI assets.

        Raise SlurmwebRuntimeError if prepare_assets has not been called yet.
        """
        if self._assets_path is None:
            raise SlurmwebRuntimeError("UI assets have not been prepared yet")
        return self._assets_path

    def _target_directory(self) -> Path:
        """Return the target directory for the runtime UI assets.

        If SLURMWEB_DEV_UI_ASSETS_DIR is set, use it as the copy target. Otherwise,
        if RUNTIME_DIRECTORY is set, use its ui subdirectory. If neither applies,
        create a temporary directory.
        """
        dev_ui_assets_dir = self._env_settings.assets_dir
        if dev_ui_assets_dir is not None:
            target_dir = Path(dev_ui_assets_dir)
            if target_dir.exists():
                shutil.rmtree(target_dir, ignore_errors=True)
            target_dir.mkdir(parents=True, exist_ok=True)
            return target_dir

        runtime_dir_env = os.environ.get("RUNTIME_DIRECTORY")
        if not runtime_dir_env:
            try:
                return Path(tempfile.mkdtemp(prefix="slurmweb-ui-"))
            except OSError as err:
                raise SlurmwebRuntimeError(
                    f"Unable to create temporary runtime UI directory: {err}"
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

    def _overlay_branding(self, target_dir: Path) -> Dict[str, str]:
        """Copy custom logo and favicon files into the prepared UI assets tree.

        Returns a mapping of logo parameter names to destination filenames under
        logo/.
        """
        logo_files: Dict[str, str] = {}
        logo_dir = target_dir / "logo"
        logo_dir.mkdir(parents=True, exist_ok=True)

        for parameter, _, dest_base in self.LOGO_PARAMETERS:
            source = getattr(self._settings, parameter, None)
            if source is None:
                continue
            dest_name = f"{dest_base}{Path(source).suffix.lower()}"
            dest = logo_dir / dest_name
            logger.debug("Copying custom logo %s to %s", source, dest)
            if dest.exists() or dest.is_symlink():
                dest.unlink()
            shutil.copy2(source, dest)
            logo_files[parameter] = dest_name

        favicon = getattr(self._settings, "favicon", None)
        if favicon is not None:
            dest = target_dir / "favicon.ico"
            logger.debug("Copying custom favicon %s to %s", favicon, dest)
            if dest.exists() or dest.is_symlink():
                dest.unlink()
            shutil.copy2(favicon, dest)

        return logo_files
