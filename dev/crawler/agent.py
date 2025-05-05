#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import json
import random

from slurmweb.version import get_version

from .lib import ASSETS, crawler_logger, dump_component_query, busy_node

logger = crawler_logger()


def crawl_agent(port: int, token: str, metrics: bool) -> None:
    """Crawl and save test assets from Slurm-web agent component."""
    # Compose and return the URL to the gateway
    url = f"http://localhost:{port}"

    # Check assets directory
    assets_path = ASSETS / "agent"
    if not assets_path.exists():
        assets_path.mkdir(parents=True)

    # Save requests status
    status_file = assets_path / "status.json"
    if status_file.exists():
        with open(status_file) as fh:
            requests_statuses = json.load(fh)
    else:
        requests_statuses = {}

    headers = {"Authorization": f"Bearer {token}"}

    dump_component_query(
        requests_statuses, url, f"/v{get_version()}/info", headers, assets_path, "info"
    )
    dump_component_query(
        requests_statuses,
        url,
        f"/v{get_version()}/permissions",
        headers,
        assets_path,
        "permissions",
    )
    dump_component_query(
        requests_statuses,
        url,
        f"/v{get_version()}/stats",
        headers,
        assets_path,
        "stats",
    )
    dump_component_query(
        requests_statuses,
        url,
        f"/v{get_version()}/jobs",
        headers,
        assets_path,
        "jobs",
        limit_dump=100,
    )
    nodes = dump_component_query(
        requests_statuses,
        url,
        f"/v{get_version()}/nodes",
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
            f"/v{get_version()}/jobs?node={random_busy_node}",
            headers,
            assets_path,
            "jobs-node",
        )
    except IndexError:
        logger.warning("Unable to find busy node on agent")

    dump_component_query(
        requests_statuses,
        url,
        f"/v{get_version()}/partitions",
        headers,
        assets_path,
        "partitions",
    )
    dump_component_query(
        requests_statuses, url, f"/v{get_version()}/qos", headers, assets_path, "qos"
    )
    dump_component_query(
        requests_statuses,
        url,
        f"/v{get_version()}/reservations",
        headers,
        assets_path,
        "reservations",
    )
    dump_component_query(
        requests_statuses,
        url,
        f"/v{get_version()}/accounts",
        headers,
        assets_path,
        "accounts",
    )

    # metrics
    if metrics:
        for metric in ["nodes", "cores", "jobs"]:
            for _range in ["hour"]:
                dump_component_query(
                    requests_statuses,
                    url,
                    f"/v{get_version()}/metrics/{metric}?range={_range}",
                    headers,
                    assets_path,
                    f"metrics-{metric}-{_range}",
                    prettify=False,
                )

    # FIXME: Download unknown job/node
    # Save resulting status file
    with open(status_file, "w+") as fh:
        json.dump(requests_statuses, fh, indent=2, sort_keys=True)
        fh.write("\n")
