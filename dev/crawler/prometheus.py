#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import json

from .lib import ASSETS, dump_component_query

from slurmweb.metrics.db import SlurmwebMetricsDB


def crawl_prometheus(url: str, job: str) -> None:
    """Crawl and save test assets from Prometheus."""
    # Check assets directory
    assets_path = ASSETS / "prometheus"
    if not assets_path.exists():
        assets_path.mkdir(parents=True)

    # Save requests status
    status_file = assets_path / "status.json"
    if status_file.exists():
        with open(status_file) as fh:
            requests_statuses = json.load(fh)
    else:
        requests_statuses = {}

    headers = {}
    db = SlurmwebMetricsDB(url, job)

    for metric in ["nodes", "cores", "jobs"]:
        for _range in ["hour"]:
            dump_component_query(
                requests_statuses,
                url,
                f"{db.REQUEST_BASE_PATH}{db._query(metric, _range)}",
                headers,
                assets_path,
                f"{metric}-{_range}",
                prettify=False,
            )

    # query unexisting metric
    dump_component_query(
        requests_statuses,
        url,
        f"{db.REQUEST_BASE_PATH}{db._query('fail', 'hour')}",
        headers,
        assets_path,
        "unknown-metric",
    )

    # query unknown API path
    dump_component_query(
        requests_statuses,
        url,
        f"{db.REQUEST_BASE_PATH}/fail",
        headers,
        assets_path,
        "unknown-path",
    )

    # Save resulting status file
    with open(status_file, "w+") as fh:
        json.dump(requests_statuses, fh, indent=2)
        fh.write("\n")
