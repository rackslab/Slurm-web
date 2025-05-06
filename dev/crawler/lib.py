#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
import typing as t
import json
import socket
from pathlib import Path
import logging

import requests
import paramiko

from rfl.settings import RuntimeSettings
from rfl.settings.errors import (
    SettingsDefinitionError,
    SettingsOverrideError,
    SettingsSiteLoaderError,
)

ASSETS = Path(__file__).parent.resolve() / ".." / ".." / "tests" / "assets"


def crawler_logger():
    return logging.getLogger("crawl-tests-assets")


logger = crawler_logger()


def load_settings(definitions: str, dev_tmp_dir: Path, overrides: str):
    try:
        settings = RuntimeSettings.yaml_definition(definitions)
    except SettingsDefinitionError as err:
        logger.critical(err)
        sys.exit(1)
    try:
        settings.override_ini(dev_tmp_dir / overrides)
    except (SettingsSiteLoaderError, SettingsOverrideError) as err:
        logger.critical(err)
        sys.exit(1)
    return settings


def busy_node(node):
    """Return True if the given node is busy."""
    return "ALLOCATED" in node["state"] or "MIXED" in node["state"]


class DevelopmentHostConnectionError(Exception):
    pass


class DevelopmentHostClient:
    def __init__(self, host, user):
        self._client = None
        self.host = host
        self.user = user

    def connect(self):
        self._client = paramiko.SSHClient()
        self._client.load_host_keys(Path("~/.ssh/known_hosts").expanduser())
        logger.info("Connecting to development host %s", self.host)
        try:
            self._client.connect(self.host, username=self.user)
        except socket.gaierror as err:
            raise DevelopmentHostConnectionError(
                f"Unable to get address of {self.host}: {err}"
            ) from err
        except paramiko.ssh_exception.PasswordRequiredException as err:
            raise DevelopmentHostConnectionError(
                f"Unable to connect on {self.user}@{self.host}: {err}"
            ) from err

    def exec(self, cmd: str):
        return self._client.exec_command(cmd)


class CrawlerError(Exception):
    pass


def dump_component_query(
    requests_statuses,
    url: str,
    query: str,
    headers: str,
    assets_path: Path,
    asset_name: dict[int, str] | str,
    skip_exist: bool = True,
    prettify: bool = True,
    limit_dump=0,
    method: str = "GET",
    content: t.Optional[t.Dict] = None,
) -> t.Any:
    """Send GET HTTP request to Slurm-web component pointed by URL and save JSON result
    in assets directory."""
    if skip_exist:
        if isinstance(asset_name, dict):
            all_asset_exist = True
            for _asset_name in asset_name.values():
                if not len(list(assets_path.glob(f"{_asset_name}.*"))):
                    all_asset_exist = False
                    break
            if all_asset_exist:
                return
        else:
            assert isinstance(asset_name, str)
            if len(list(assets_path.glob(f"{asset_name}.*"))):
                return
    if method == "GET":
        response = requests.get(f"{url}{query}", headers=headers)
    elif method == "POST":
        kwargs = {}
        if content:
            kwargs["json"] = content
        response = requests.post(f"{url}{query}", headers=headers, **kwargs)
    else:
        raise RuntimeError(f"Unsupport request method {method}")
    if isinstance(asset_name, dict):
        _asset_name = asset_name[response.status_code]
    else:
        _asset_name = asset_name
    content_type = response.headers.get("content-type")
    if _asset_name not in requests_statuses:
        requests_statuses[_asset_name] = {}
    requests_statuses[_asset_name]["content-type"] = content_type
    requests_statuses[_asset_name]["status"] = response.status_code
    if content_type == "application/json":
        asset = assets_path / f"{_asset_name}.json"
        data = json.loads(response.text)
    else:
        asset = assets_path / f"{_asset_name}.txt"
        data = response.text

    if asset.exists():
        logger.warning("Asset %s already exists, skipping dump", asset)
    else:
        with open(asset, "w+") as fh:
            if asset.suffix == ".json":
                _data = data
                if limit_dump:
                    _data = _data[:limit_dump]
                fh.write(json.dumps(_data, indent=2 if prettify else None))
            else:
                fh.write(data)
    return data
