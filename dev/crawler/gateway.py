#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
import os
import json
import shlex
import socket
import random
import getpass
from pathlib import Path

import paramiko
import requests

from .lib import ASSETS, crawler_logger, load_settings, dump_component_query, busy_node

ADMIN_PASSWORD_ENV_VAR = "SLURMWEB_DEV_ADMIN_PASSWORD"

logger = crawler_logger()


def gateway_url(dev_tmp_dir):
    """Return the gateway URL with service TCP port found in configuration."""
    # Load gateway configuration
    settings = load_settings("conf/vendor/gateway.yml", dev_tmp_dir, "gateway.ini")
    # Compose and return the URL to the gateway
    return f"http://localhost:{settings.service.port}"


def user_token(url: str, user: str):
    """Ask user password interactively, authenticate on gateway and return
    authentication JWT."""

    try:
        password = os.environ[ADMIN_PASSWORD_ENV_VAR]
    except KeyError:
        logger.info(
            "Unable to read admin password from environment, opening interactive "
            "prompt."
        )
        password = getpass.getpass(prompt=f"Password for {user} on gateway: ")

    response = requests.post(
        f"{url}/api/login", json={"user": user, "password": password}
    )
    if response.status_code != 200:
        logger.error(
            "Authentication failed on gateway: %s", response.json()["description"]
        )
        sys.exit(1)

    return response.json()["token"]


def admin_user(host: str, user: str, cluster: str):
    """Return name of a user in admin group for the given cluster."""
    ssh_client = paramiko.SSHClient()
    ssh_client.load_host_keys(Path("~/.ssh/known_hosts").expanduser())
    logger.info("Connecting to development host %s", host)
    try:
        ssh_client.connect(host, username=user)
    except socket.gaierror as err:
        logger.error("Unable to get address of %s: %s", host, str(err))
        sys.exit(1)
    except paramiko.ssh_exception.PasswordRequiredException as err:
        logger.error("Unable to connect on %s@%s: %s", user, host, str(err))
        sys.exit(1)

    _, stdout, _ = ssh_client.exec_command(
        shlex.join(["firehpc", "status", "--cluster", cluster, "--json"])
    )
    cluster_status = json.loads(stdout.read())

    for group in cluster_status["groups"]:
        if group["name"] == "admin":
            return group["members"][0]

    logger.error("Unable to find user in admin group on cluster %s", cluster)
    sys.exit(1)


def crawl_gateway(
    host: str, user: str, cluster: str, infrastructure: str, dev_tmp_dir: Path
) -> str:
    """Crawl and save test assets from Slurm-web gateway component and return
    authentication JWT."""
    # Retrieve admin user account to connect
    user = admin_user(host, user, infrastructure)
    logger.info("Found user %s in group admin on cluster %s", user, cluster)

    # Get gateway HTTP base URL from configuration
    url = gateway_url(dev_tmp_dir)

    # Authenticate on gateway and get token
    token = user_token(url, user)
    headers = {"Authorization": f"Bearer {token}"}

    # Check assets directory
    assets_path = ASSETS / "gateway"
    if not assets_path.exists():
        assets_path.mkdir(parents=True)

    # Save requests status
    status_file = assets_path / "status.json"
    if status_file.exists():
        with open(status_file) as fh:
            requests_statuses = json.load(fh)
    else:
        requests_statuses = {}

    dump_component_query(
        requests_statuses, url, "/api/clusters", headers, assets_path, "clusters"
    )
    dump_component_query(
        requests_statuses, url, "/api/users", headers, assets_path, "users"
    )
    dump_component_query(
        requests_statuses,
        url,
        "/api/messages/login",
        headers,
        assets_path,
        {
            200: "message_login",
            404: "message_login_not_found",
            500: "message_login_error",
        },
    )

    dump_component_query(
        requests_statuses,
        url,
        f"/api/agents/{cluster}/stats",
        headers,
        assets_path,
        "stats",
    )

    jobs = dump_component_query(
        requests_statuses,
        url,
        f"/api/agents/{cluster}/jobs",
        headers,
        assets_path,
        "jobs",
        skip_exist=False,
        limit_dump=100,
    )

    if not (len(jobs)):
        logger.warning(
            "No jobs found in queue of cluster %s, unable to crawl jobs data", cluster
        )
    else:
        min_job_id = jobs[0]["job_id"]

        def dump_job_state() -> None:
            if state in _job["job_state"]:
                dump_component_query(
                    requests_statuses,
                    url,
                    f"/api/agents/{cluster}/job/{_job['job_id']}",
                    headers,
                    assets_path,
                    f"job-{state.lower()}",
                )

        for _job in jobs:
            if _job["job_id"] < min_job_id:
                min_job_id = _job["job_id"]
            for state in ["PENDING", "RUNNING", "COMPLETED", "FAILED", "TIMEOUT"]:
                dump_job_state()

        dump_component_query(
            requests_statuses,
            url,
            f"/api/agents/{cluster}/job/{min_job_id - 1}",
            headers,
            assets_path,
            "job-archived",
        )

    # FIXME: Download unknown job

    nodes = dump_component_query(
        requests_statuses,
        url,
        f"/api/agents/{cluster}/nodes",
        headers,
        assets_path,
        "nodes",
        skip_exist=False,
    )

    # Get jobs which have resources on any of the busy nodes
    try:
        random_busy_node = random.choice(list(filter(busy_node, nodes)))["name"]

        dump_component_query(
            requests_statuses,
            url,
            f"/api/agents/{cluster}/jobs?node={random_busy_node}",
            headers,
            assets_path,
            "jobs-node",
        )
    except IndexError:
        logger.warning("Unable to find busy node on gateway for cluster %s", cluster)

    def dump_node_state() -> None:
        if state in _node["state"]:
            dump_component_query(
                requests_statuses,
                url,
                f"/api/agents/{cluster}/node/{_node['name']}",
                headers,
                assets_path,
                f"node-{state.lower()}",
            )

    # Download specific node
    for _node in nodes:
        for state in ["IDLE", "MIXED", "ALLOCATED", "DOWN", "DRAINING", "DRAINED"]:
            dump_node_state()

    # FIXME: download unknown node

    dump_component_query(
        requests_statuses,
        url,
        f"/api/agents/{cluster}/partitions",
        headers,
        assets_path,
        "partitions",
    )
    dump_component_query(
        requests_statuses,
        url,
        f"/api/agents/{cluster}/qos",
        headers,
        assets_path,
        "qos",
    )
    dump_component_query(
        requests_statuses,
        url,
        f"/api/agents/{cluster}/reservations",
        headers,
        assets_path,
        "reservations",
    )
    dump_component_query(
        requests_statuses,
        url,
        f"/api/agents/{cluster}/accounts",
        headers,
        assets_path,
        "accounts",
    )

    # RacksDB infrastructure diagram
    dump_component_query(
        requests_statuses,
        url,
        f"/api/agents/{cluster}/racksdb/draw/infrastructure/{infrastructure}.png?coordinates",
        headers,
        assets_path,
        "racksdb-draw-coordinates",
        method="POST",
        content={
            # FIXME: Retrieve these RacksDB request parameters from Slurm-web code base
            # to avoid duplication.
            "general": {"pixel_perfect": True},
            "dimensions": {"width": 1000, "height": 300},
            "infrastructure": {"equipment_labels": False, "ghost_unselected": True},
        },
    )
    # metrics
    for metric in ["nodes", "cores", "jobs"]:
        for _range in ["hour"]:
            dump_component_query(
                requests_statuses,
                url,
                f"/api/agents/{cluster}/metrics/{metric}?range={_range}",
                headers,
                assets_path,
                f"metrics-{metric}-{_range}",
                prettify=False,
            )

    # Save resulting status file
    with open(status_file, "w+") as fh:
        json.dump(requests_statuses, fh, indent=2, sort_keys=True)
        fh.write("\n")

    return token
