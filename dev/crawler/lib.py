#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

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
    from datetime import datetime
    from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier

logger = logging.getLogger(__name__)

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

    def exec(self, cmd: list[str]):
        logger.debug("Running command on development host: %s", shlex.join(cmd))
        return self._client.exec_command(shlex.join(cmd))


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
        self.api = "0.0.41"
        self.auth = auth
        self.session = requests.Session()

        if uri.scheme == "unix":
            self.prefix = "http+unix://slurmrestd"
            self.session.mount(self.prefix, SlurmrestdUnixAdapter(uri.path))
        else:
            self.prefix = uri.geturl()

        # check cluster has slurm emulator mode enabled
        _, stdout, _ = self.dev_host.exec(
            ["firehpc", "status", "--cluster", self.name, "--json"]
        )
        self.status = json.loads(stdout.read())

        self.emulator = self.status["settings"]["slurm_emulator"]
        self.users = [user["login"] for user in self.status["users"]]
        self.groups = self.status["groups"]
        stdout.close()

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

    def has_jobs(self):
        """Return True if cluster has jobs in queue or False."""
        jobs = self.query_slurmrestd_json(f"/slurm/v{self.api}/jobs")
        for job in jobs["jobs"]:
            if "RUNNING" in job["job_state"] or "PENDING" in job["job_state"]:
                logger.debug(
                    "job %s found with state: %s", job["job_id"], job["job_state"]
                )
                return True
        return False

    def nb_nodes(self):
        """Return number of nodes on cluster."""
        return len(self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")["nodes"])

    def nodes_partition(self, partition: str):
        nodes = self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")
        return [
            node["name"] for node in nodes["nodes"] if partition in node["partitions"]
        ]

    def node_update(self, nodename, state, reason):
        # FIXME: use REST API
        self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                self.name,
                "--",
                "scontrol",
                "update",
                f"nodename={nodename}",
                f"state={state}",
                f"reason='{reason}'",
            ]
        )

    def node_resume(self, nodename):
        # FIXME: use REST API
        self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                self.name,
                "--",
                "scontrol",
                "update",
                f"nodename={nodename}",
                "state=RESUME",
            ]
        )

    def nodes_resume(self):
        for node in self.query_slurmrestd_json(f"/slurm/v{self.api}/nodes")["nodes"]:
            if "DOWN" in node["state"] or "DRAIN" in node["state"]:
                self.node_resume(node["name"])

    def partitions(self):
        """Return list of partitions names."""
        return [
            partition["name"]
            for partition in self.query_slurmrestd_json(
                f"/slurm/v{self.api}/partitions"
            )["partitions"]
        ]

    def login_container(self):
        if self.emulator:
            return "admin"
        return "login"

    def submit(
        self,
        user: str,
        args: list[str],
        duration: int = 30,
        timelimit: int = 1,
        wait_running: bool = True,
        success: bool = True,
    ) -> int:
        # FIXME: use REST API
        logger.info("Submitting job as %s with args: %s", user, args)
        _, stdout, stderr = self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                f"{user}@{self.login_container()}.{self.name}",
                "--",
                "sbatch",
                "--time",
                str(timelimit),
                "--wrap",
                f"'sleep {duration} && {'true' if success else 'false'}'",
            ]
            + args
        )
        output = stdout.read().decode()
        stdout.close()
        errors = stderr.read().decode()
        stderr.close()
        if not output.startswith("Submitted batch job"):
            raise CrawlerError(
                "Unable to submit batch job on GPU: "
                f"[stdout: {output}][stderr: {errors}]"
            )
        job_id = int(output.split(" ")[3])
        if wait_running:
            max_tries = 10
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
        """Cancel a job."""
        # FIXME: use REST API
        self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                f"{user}@{self.login_container()}.{self.name}",
                "--",
                "scancel",
                str(job_id),
            ]
        )

    def cancel_all(self) -> None:
        """Cancel all jobs."""
        # FIXME: use REST API
        for partition in self.partitions():
            self.dev_host.exec(
                [
                    "firehpc",
                    "ssh",
                    f"root@{self.login_container()}.{self.name}",
                    "--",
                    "scancel",
                    "-p",
                    partition,
                ]
            )

    def job_nodes(self, job_id: int) -> list[str]:
        job = self.query_slurmrestd_json(f"/slurm/v{self.api}/job/{job_id}")
        return [
            allocated_node["name"]
            for allocated_node in job["jobs"][0]["job_resources"]["nodes"]["allocation"]
        ]

    def wait_idle(self, node_name: str) -> None:
        max_tries = 10
        for idx in range(max_tries):
            node = self.query_slurmrestd_json(f"/slurm/v{self.api}/node/{node_name}")
            logger.debug("node %s states: %s", node_name, node["nodes"][0]["state"])
            if not busy_node(node["nodes"][0]):
                break
            if idx == max_tries - 1:
                raise CrawlerError(f"Unable to get node {node_name} IDLE")
            else:
                time.sleep(1)

    def pick_user(self) -> str:
        return random.choice(self.users)

    def pick_account(self) -> str:
        return random.choice(
            [group["name"] for group in self.groups if group["parent"] != "root"]
        )

    def pick_account_users(self, account: str, number: int) -> list[str]:
        for group in self.groups:
            if group["name"] == account:
                return random.choices(group["members"], k=number)
        raise CrawlerError(f"Unable to find account {account} on cluster {self.name}")

    def reservation(
        self,
        name: str,
        partition: str,
        accounts: list[str] | None,
        users: list[str] | None,
        start: datetime,
        end: datetime,
    ) -> None:
        """Create reservation."""
        # FIXME: use REST API
        cmd = [
            "firehpc",
            "ssh",
            self.name,
            "--",
            "scontrol",
            "create",
            "reservation",
            f"Reservation={name}",
            f"StartTime={start.strftime('%Y-%m-%dT%H:%M:%S')}",
            f"EndTime={end.strftime('%Y-%m-%dT%H:%M:%S')}",
            f"Partition={partition}",
            "Flags=ANY_NODES,FLEX,IGNORE_JOBS",
        ]
        if users:
            cmd.append(f"Users={','.join(users)}")
        if accounts:
            cmd.append(f"Accounts={','.join(accounts)}")
        self.dev_host.exec(cmd)

    def reservation_delete(self, name: str) -> None:
        # FIXME: use REST API
        self.dev_host.exec(
            [
                "firehpc",
                "ssh",
                self.name,
                "--",
                "scontrol",
                "delete",
                "reservation",
                name,
            ]
        )


def get_component_response(
    url: str,
    query: str,
    headers: str,
    method: str = "GET",
    content: t.Optional[t.Dict] = None,
):
    if method == "GET":
        response = requests.get(f"{url}{query}", headers=headers)
    elif method == "POST":
        kwargs = {}
        if content:
            kwargs["json"] = content
        response = requests.post(f"{url}{query}", headers=headers, **kwargs)
    else:
        raise RuntimeError(f"Unsupport request method {method}")
    return response


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
    return dump_component_response(
        requests_statuses, assets_path, asset_name, response, prettify, limit_dump
    )


def dump_component_response(
    requests_statuses,
    assets_path: Path,
    asset_name: dict[int, str] | str,
    response,
    prettify: bool = True,
    limit_dump=0,
):
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
                # FIXME: add newline
            else:
                fh.write(data)
    return data


class CrawlerError(Exception):
    pass


class ComponentCrawler:
    def __init__(
        self, component: str, _map: dict[str, t.Callable], assets: BaseAssetsManager
    ):
        self.component = component
        self.map = _map
        self.assets = assets

    def crawl(self, assets: list[str], *args) -> None:
        for asset in assets:
            logger.info("Crawling asset %s on component %s", asset, self.component)
            self.map[asset](*args)

        self.assets.save()


class TokenizedComponentCrawler(ComponentCrawler):
    def __init__(
        self,
        component: str,
        _map: dict[str, t.Callable],
        assets: BaseAssetsManager,
        url: str,
        token: str,
    ):
        super().__init__(component, _map, assets)
        self.url = url
        self.token = token

    def get_component_response(
        self, query: str, headers: dict[str, str] | None = None, **kwargs
    ):
        if headers is None:
            headers = {"Authorization": f"Bearer {self.token}"}
        return get_component_response(self.url, query, headers, **kwargs)

    def dump_component_query(
        self,
        query: str,
        asset_name: dict[int, str] | str,
        headers: dict[str, str] | None = None,
        **kwargs,
    ):
        if headers is None:
            headers = {"Authorization": f"Bearer {self.token}"}
        return dump_component_query(
            self.assets.statuses,
            self.url,
            query,
            headers,
            self.assets.path,
            asset_name,
            **kwargs,
        )

    def dump_component_response(
        self, asset_name: dict[int, str] | str, response, **kwargs
    ):
        return dump_component_response(
            self.assets.statuses, self.assets.path, asset_name, response, **kwargs
        )
