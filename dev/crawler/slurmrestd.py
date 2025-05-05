#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import typing as t
import json
import socket
import urllib
from pathlib import Path

import requests

from .lib import ASSETS, crawler_logger

from slurmweb.slurmrestd.unix import SlurmrestdUnixAdapter
from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier


logger = crawler_logger()


def query_slurmrestd(
    session: requests.Session, headers: t.Dict[str, str], prefix: str, query: str
) -> t.Any:
    """Send GET HTTP request to slurmrestd and return JSON result. Raise RuntimeError in
    case of connection error or not JSON result."""
    try:
        response = session.get(f"{prefix}/{query}", headers=headers)
    except requests.exceptions.ConnectionError as err:
        raise RuntimeError(f"Unable to connect to slurmrestd: {err}")

    return response.text, response.headers.get("content-type"), response.status_code


def _dump_slurmrestd_query(
    session: requests.Session,
    headers: t.Dict[str, str],
    requests_statuses,
    prefix: str,
    query: str,
    assets_path: Path,
    asset_name: str,
    skip_exist=True,
    limit_dump=0,
    limit_key=None,
) -> t.Any:
    """Send GET HTTP request to slurmrestd and save JSON result in assets directory."""

    if len(list(assets_path.glob(f"{asset_name}.*"))) and skip_exist:
        return

    text, content_type, status = query_slurmrestd(session, headers, prefix, query)

    if asset_name not in requests_statuses:
        requests_statuses[asset_name] = {}
    requests_statuses[asset_name]["content-type"] = content_type
    requests_statuses[asset_name]["status"] = status

    if content_type == "application/json":
        asset = assets_path / f"{asset_name}.json"
        data = json.loads(text)
    else:
        asset = assets_path / f"{asset_name}.txt"
        data = text

    if asset.exists():
        logger.warning("Asset %s already exists, skipping dump", asset)
    else:
        with open(asset, "w+") as fh:
            if content_type == "application/json":
                _data = data
                if limit_dump and limit_key:
                    _data = data.copy()
                    _data[limit_key] = _data[limit_key][:limit_dump]
                json.dump(_data, fh, indent=2)
            else:
                fh.write(data)
    return data


def crawl_slurmrestd(
    uri: urllib.parse.ParseResult, auth: SlurmrestdAuthentifier
) -> None:
    """Crawl and save test assets from slurmrestd on the given socket."""

    session = requests.Session()

    if uri.scheme == "unix":
        prefix = "http+unix://slurmrestd"
        session.mount(prefix, SlurmrestdUnixAdapter(uri.path))
    else:
        prefix = uri.geturl()

    api = "0.0.40"

    # Get Slurm version
    text, _, _ = query_slurmrestd(
        session, auth.headers(), prefix, f"/slurm/v{api}/ping"
    )
    ping = json.loads(text)
    release = ping["meta"]["slurm"]["release"]
    version = release.rsplit(".", 1)[0]
    logger.info("Slurm version: %s release: %s", version, release)

    # Check assets directory for this version
    assets_path = ASSETS / "slurmrestd" / version
    if not assets_path.exists():
        assets_path.mkdir(parents=True)

    # Save requests status
    status_file = assets_path / "status.json"
    if status_file.exists():
        with open(status_file) as fh:
            requests_statuses = json.load(fh)
    else:
        requests_statuses = {}

    def dump_slurmrestd_query(
        request_path: str,
        asset_name: str,
        auth_headers: dict[str, str] = auth.headers(),
        **kwargs,
    ):
        _dump_slurmrestd_query(
            session,
            auth_headers,
            requests_statuses,
            prefix,
            request_path,
            assets_path,
            asset_name,
            **kwargs,
        )

    # Download ping
    dump_slurmrestd_query(
        f"/slurm/v{api}/ping",
        "slurm-ping",
    )

    # Download URL not found for both slurm and slurmdb
    dump_slurmrestd_query(
        f"/slurm/v{api}/not-found",
        "slurm-not-found",
    )

    dump_slurmrestd_query(
        f"/slurmdb/v{api}/not-found",
        "slurmdb-not-found",
    )

    if auth.method == "jwt":
        # if JWT auth, test missing headers
        dump_slurmrestd_query(f"/slurm/v{api}/jobs", "slurm-jwt-missing-headers", {})
        # if JWT auth, test invalid headers
        dump_slurmrestd_query(
            f"/slurm/v{api}/jobs",
            "slurm-jwt-invalid-headers",
            {"X-SLURM-USER-FAIL": "tail"},
        )
        # if JWT auth, test invalid token
        dump_slurmrestd_query(
            f"/slurm/v{api}/jobs",
            "slurm-jwt-invalid-token",
            {"X-SLURM-USER-NAME": auth.jwt_user, "X-SLURM-USER-TOKEN": "fail"},
        )
        # if JWT auth and ability to generate token, test expired token
        if auth.jwt_mode == "auto":
            dump_slurmrestd_query(
                f"/slurm/v{api}/jobs",
                "slurm-jwt-expired-token",
                {
                    "X-SLURM-USER-NAME": auth.jwt_user,
                    "X-SLURM-USER-TOKEN": auth.jwt_manager.generate(
                        duration=-1, claimset={"sun": auth.jwt_user}
                    ),
                },
            )

    # Download jobs
    jobs = dump_slurmrestd_query(
        f"/slurm/v{api}/jobs",
        "slurm-jobs",
        skip_exist=False,
        limit_dump=30,
        limit_key="jobs",
    )

    def dump_job_state(state: str):
        if state in _job["job_state"]:
            dump_slurmrestd_query(
                f"/slurm/v{api}/job/{_job['job_id']}",
                f"slurm-job-{state.lower()}",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{api}/job/{_job['job_id']}",
                f"slurmdb-job-{state.lower()}",
            )

    # Download specific jobs
    if not (len(jobs["jobs"])):
        logger.warning(
            "No jobs found in queue on socket %s, unable to crawl jobs data", socket
        )
    else:
        min_job_id = max_job_id = jobs["jobs"][0]["job_id"]

        for _job in jobs["jobs"]:
            if _job["job_id"] < min_job_id:
                min_job_id = _job["job_id"]
            if _job["job_id"] > max_job_id:
                max_job_id = _job["job_id"]

            for state in ["RUNNING", "PENDING", "COMPLETED", "FAILED", "TIMEOUT"]:
                dump_job_state(state)

        dump_slurmrestd_query(
            f"/slurm/v{api}/job/{min_job_id - 1}",
            "slurm-job-archived",
        )
        dump_slurmrestd_query(
            f"/slurmdb/v{api}/job/{min_job_id - 1}",
            "slurmdb-job-archived",
        )

        dump_slurmrestd_query(
            f"/slurm/v{api}/job/{max_job_id * 2}",
            "slurm-job-unfound",
        )
        dump_slurmrestd_query(
            f"/slurmdb/v{api}/job/{max_job_id * 2}",
            "slurmdb-job-unfound",
        )

    # Download nodes
    nodes = dump_slurmrestd_query(
        f"/slurm/v{api}/nodes",
        "slurm-nodes",
        skip_exist=False,
        limit_dump=100,
        limit_key="nodes",
    )

    def dump_node_state():
        if state in _node["state"]:
            dump_slurmrestd_query(
                f"/slurm/v{api}/node/{_node['name']}",
                f"slurm-node-{state.lower()}",
            )

    # Download specific node
    for _node in nodes["nodes"]:
        for state in ["IDLE", "MIXED", "ALLOCATED", "DOWN", "DRAINING", "DRAIN"]:
            dump_node_state()

    # Request node not found
    dump_slurmrestd_query(
        f"/slurm/v{api}/node/unexisting-node",
        "slurm-node-unfound",
    )

    # Download partitions
    dump_slurmrestd_query(
        f"/slurm/v{api}/partitions",
        "slurm-partitions",
    )

    # Download qos
    dump_slurmrestd_query(
        f"/slurmdb/v{api}/qos",
        "slurm-qos",
    )

    # Download accounts
    dump_slurmrestd_query(
        f"/slurmdb/v{api}/accounts",
        "slurm-accounts",
    )

    # Download reservations
    dump_slurmrestd_query(
        f"/slurm/v{api}/reservations",
        "slurm-reservations",
    )

    # Save resulting status file
    with open(status_file, "w+") as fh:
        json.dump(requests_statuses, fh, indent=2, sort_keys=True)
        fh.write("\n")
