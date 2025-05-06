#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from __future__ import annotations
import sys
import typing as t
import json
import socket
from pathlib import Path
import shlex
import urllib
import time
import random
import logging

import requests
import paramiko

from rfl.settings import RuntimeSettings
from rfl.settings.errors import (
    SettingsDefinitionError,
    SettingsOverrideError,
    SettingsSiteLoaderError,
)

from slurmweb.slurmrestd.unix import SlurmrestdUnixAdapter

if t.TYPE_CHECKING:
    from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier

ASSETS = Path(__file__).parent.resolve() / ".." / ".." / "tests" / "assets"


class BaseAssetsManager:
    def __init__(self, subdir: Path | str):
        # Check assets directory for this version
        self.path = ASSETS / subdir
        if not self.path.exists():
            self.path.mkdir(parents=True)

        # Save requests status
        self.status_file = self.path / "status.json"
        if self.status_file.exists():
            with open(self.status_file) as fh:
                self.statuses = json.load(fh)
        else:
            self.statuses = {}

    def exists(self, asset_name: str) -> bool:
        """Return True if asset already exists or False."""
        return len(list(self.path.glob(f"{asset_name}.*"))) > 0

    def save(self):
        """Save resulting status file."""
        with open(self.status_file, "w+") as fh:
            json.dump(self.statuses, fh, indent=2, sort_keys=True)
            fh.write("\n")


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


class DevelopmentHostCluster:
    def __init__(
        self,
        dev_host: DevelopmentHostClient,
        name: str,
        uri: urllib.parse.ParseResult,
        auth: SlurmrestdAuthentifier,
    ):
        self.dev_host = dev_host
        self.name = name
        self.api = "0.0.40"
        self.auth = auth
        self.session = requests.Session()

        if uri.scheme == "unix":
            self.prefix = "http+unix://slurmrestd"
            self.session.mount(self.prefix, SlurmrestdUnixAdapter(uri.path))
        else:
            self.prefix = uri.geturl()

    def query_slurmrestd(self, query: str, headers: dict[str, str] | None = None):
        """Send GET HTTP request to slurmrestd and return JSON result. Raise
        RuntimeError in case of connection error or not JSON result."""
        if headers is None:
            headers = self.auth.headers()
        try:
            response = self.session.get(f"{self.prefix}/{query}", headers=headers)
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}")

        return response.text, response.headers.get("content-type"), response.status_code

    def query_slurmrestd_json(self, query: str, headers: dict[str, str] | None = None):
        """Send GET HTTP request to slurmrestd and return JSON result. Raise
        RuntimeError in case of connection error or not JSON result."""
        if headers is None:
            headers = self.auth.headers()
        try:
            response = self.session.get(f"{self.prefix}/{query}", headers=headers)
        except requests.exceptions.ConnectionError as err:
            raise RuntimeError(f"Unable to connect to slurmrestd: {err}")

        if response.headers.get("content-type") != "application/json":
            raise CrawlerError(
                f"Unexpected content-type for slurmrestd query {query}: "
                f"{response.headers.get('content-type')}"
            )

        if response.status_code != 200:
            raise CrawlerError(
                f"Unexpected status code for slurmrestd query {query}: "
                f"{response.status_code}"
            )

        return response.json()

    def submit(self, user: str, args: list[str], wait_running: bool = True) -> int:
        _, stdout, stderr = self.dev_host.exec(
            shlex.join(
                [
                    "firehpc",
                    "ssh",
                    f"{user}@login.{self.name}",
                    "--",
                    "sbatch",
                    "--wrap",
                    "'sleep 30'",
                ]
                + args
            )
        )
        output = stdout.read().decode()
        errors = stderr.read().decode()
        if not output.startswith("Submitted batch job"):
            raise CrawlerError(f"Unable to submit batch job on GPU: {output}/{errors}")
        job_id = int(output.split(" ")[3])
        if wait_running:
            max_tries = 3
            for idx in range(max_tries):
                job = self.query_slurmrestd_json(f"/slurm/v{self.api}/job/{job_id}")
                if "RUNNING" in job["jobs"][0]["job_state"]:
                    break
                if idx == max_tries - 1:
                    raise CrawlerError(f"Unable to get job {job_id} in RUNNING state")
                else:
                    time.sleep(1)
        return job_id

    def cancel(self, user: str, job_id: int) -> None:
        self.dev_host.exec(
            shlex.join(
                [
                    "firehpc",
                    "ssh",
                    f"{user}@login.{self.name}",
                    "--",
                    "scancel",
                    str(job_id),
                ]
            )
        )

    def job_nodes(self, job_id: int) -> list[str]:
        job = self.query_slurmrestd_json(f"/slurm/v{self.api}/job/{job_id}")
        return [
            allocated_node["nodename"]
            for allocated_node in job["jobs"][0]["job_resources"]["allocated_nodes"]
        ]

    def wait_idle(self, node_name: str) -> None:
        max_tries = 3
        for idx in range(max_tries):
            node = self.query_slurmrestd_json(f"/slurm/v{self.api}/node/{node_name}")
            if not busy_node(node["nodes"][0]):
                break
            if idx == max_tries - 1:
                raise CrawlerError(f"Unable to get job {node} IDLE")
            else:
                time.sleep(1)

    def pick_user(self):
        """Return name of a user in admin group for the given cluster."""

        _, stdout, _ = self.dev_host.exec(
            shlex.join(["firehpc", "status", "--cluster", self.name, "--json"])
        )
        cluster_status = json.loads(stdout.read())

        return random.choice(cluster_status["users"])["login"]


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
