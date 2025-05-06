#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from __future__ import annotations
import typing as t
import json
import socket
import urllib
import shlex
import random
import time
from pathlib import Path

import requests

from .lib import BaseAssetsManager, crawler_logger, CrawlerError, busy_node

if t.TYPE_CHECKING:
    from .lib import DevelopmentHostClient

from slurmweb.slurmrestd.unix import SlurmrestdUnixAdapter
from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier


logger = crawler_logger()


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


class SlurmrestdAssetsManager(BaseAssetsManager):
    def __init__(self, version):
        super().__init__(Path("slurmrestd") / version)


def crawl_slurmrestd(
    dev_host: DevelopmentHostClient,
    cluster_name: str,
    uri: urllib.parse.ParseResult,
    auth: SlurmrestdAuthentifier,
) -> None:
    """Crawl and save test assets from slurmrestd on the given socket."""

    cluster = DevelopmentHostCluster(dev_host, cluster_name, uri, auth)

    # Get Slurm version
    ping = cluster.query_slurmrestd_json(f"/slurm/v{cluster.api}/ping")
    release = ping["meta"]["slurm"]["release"]
    version = release.rsplit(".", 1)[0]
    logger.info("Slurm version: %s release: %s", version, release)

    assets = SlurmrestdAssetsManager(version)

    def dump_slurmrestd_query(
        query: str,
        asset_name: str,
        headers: dict[str, str] | None = None,
        skip_exist=True,
        limit_dump=0,
        limit_key=None,
    ) -> t.Any:
        """Send GET HTTP request to slurmrestd and save JSON result in assets
        directory."""

        if assets.exists(asset_name) and skip_exist:
            return

        text, content_type, status = cluster.query_slurmrestd(query, headers)

        if asset_name not in assets.statuses:
            assets.statuses[asset_name] = {}
        assets.statuses[asset_name]["content-type"] = content_type
        assets.statuses[asset_name]["status"] = status

        if content_type == "application/json":
            asset = assets.path / f"{asset_name}.json"
            data = json.loads(text)
        else:
            asset = assets.path / f"{asset_name}.txt"
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

    # Download ping
    dump_slurmrestd_query(
        f"/slurm/v{cluster.api}/ping",
        "slurm-ping",
    )

    # Download URL not found for both slurm and slurmdb
    dump_slurmrestd_query(
        f"/slurm/v{cluster.api}/not-found",
        "slurm-not-found",
    )

    dump_slurmrestd_query(
        f"/slurmdb/v{cluster.api}/not-found",
        "slurmdb-not-found",
    )

    if auth.method == "jwt":
        # if JWT auth, test missing headers
        dump_slurmrestd_query(
            f"/slurm/v{cluster.api}/jobs", "slurm-jwt-missing-headers", {}
        )
        # if JWT auth, test invalid headers
        dump_slurmrestd_query(
            f"/slurm/v{cluster.api}/jobs",
            "slurm-jwt-invalid-headers",
            {"X-SLURM-USER-FAIL": "tail"},
        )
        # if JWT auth, test invalid token
        dump_slurmrestd_query(
            f"/slurm/v{cluster.api}/jobs",
            "slurm-jwt-invalid-token",
            {"X-SLURM-USER-NAME": auth.jwt_user, "X-SLURM-USER-TOKEN": "fail"},
        )
        # if JWT auth and ability to generate token, test expired token
        if auth.jwt_mode == "auto":
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/jobs",
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
        f"/slurm/v{cluster.api}/jobs",
        "slurm-jobs",
        skip_exist=False,
        limit_dump=30,
        limit_key="jobs",
    )

    def dump_job_state(state: str):
        if state in _job["job_state"]:
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{_job['job_id']}",
                f"slurm-job-{state.lower()}",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{_job['job_id']}",
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
            f"/slurm/v{cluster.api}/job/{min_job_id - 1}",
            "slurm-job-archived",
        )
        dump_slurmrestd_query(
            f"/slurmdb/v{cluster.api}/job/{min_job_id - 1}",
            "slurmdb-job-archived",
        )

        dump_slurmrestd_query(
            f"/slurm/v{cluster.api}/job/{max_job_id * 2}",
            "slurm-job-unfound",
        )
        dump_slurmrestd_query(
            f"/slurmdb/v{cluster.api}/job/{max_job_id * 2}",
            "slurmdb-job-unfound",
        )

    # Download nodes
    nodes = dump_slurmrestd_query(
        f"/slurm/v{cluster.api}/nodes",
        "slurm-nodes",
        skip_exist=False,
        limit_dump=100,
        limit_key="nodes",
    )

    # Look at GPU declared on cluster. Logic expects all nodes with GPUs share the same
    # GPUs setup.
    has_gpu = False
    gpu_per_node = 0
    gpu_types = []
    gpu_partition = None
    for node in nodes["nodes"]:
        all_gres = node["gres"].split(",")
        if len(all_gres) and any([gres_s.startswith("gpu") for gres_s in all_gres]):
            has_gpu = True
            for gres_s in all_gres:
                gres = gres_s.split(":")
                # skip non-gpu gres
                if gres[0] != "gpu":
                    continue
                gpu_types.append(gres[1])
                gpu_per_node += int(gres[2])
                gpu_partition = node["partitions"][0]
            break

    # Submit jobs and allocate GPUs
    if has_gpu:
        user = cluster.pick_user()

        if not assets.exists("slurm-job-gpus-running") or not assets.exists(
            "slurmdb-job-gpus-running"
        ):
            # sbatch --gpus <n> mono-node running
            job_id = cluster.submit(
                user, ["--partition", gpu_partition, "--gpus", str(gpu_per_node)]
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-running",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-running",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-job-gpus-pending") or not assets.exists(
            "slurmdb-job-gpus-pending"
        ):
            # sbatch --gpus <n> mono-node pending
            job_id = cluster.submit(
                user,
                [
                    "--partition",
                    gpu_partition,
                    "--gpus",
                    str(gpu_per_node),
                    "--begin",
                    "now+1hour",
                ],
                wait_running=False,
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-pending",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-pending",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-job-gpus-multi-nodes") or not assets.exists(
            "slurmdb-job-gpus-multi-nodes"
        ):
            # sbatch --gpus <n> multi-nodes
            job_id = cluster.submit(
                user, ["--partition", gpu_partition, "--gpus", str(gpu_per_node * 2)]
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-multi-nodes",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-multi-nodes",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-job-gpus-type") or not assets.exists(
            "slurmdb-job-gpus-type"
        ):
            # sbatch --gpus type:<n>
            job_id = cluster.submit(
                user, ["--partition", gpu_partition, "--gpus", f"{gpu_types[0]}:1"]
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-type",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-type",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-job-gpus-per-node") or not assets.exists(
            "slurmdb-job-gpus-per-node"
        ):
            # sbatch --gpus-per-node <m> --nodes <n>
            job_id = cluster.submit(
                user,
                [
                    "--partition",
                    gpu_partition,
                    "--gpus-per-node",
                    str(1),
                    "--nodes",
                    str(2),
                ],
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-per-node",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-per-node",
            )
            cluster.cancel(user, job_id)

        # sbatch --gpus-per-node type1:<n>,type2:<m>
        if len(gpu_types) > 1 and (
            not assets.exists("slurm-job-gpus-multiple-types")
            or not assets.exists("slurmdb-job-gpus-multiple-types")
        ):
            job_id = cluster.submit(
                user,
                [
                    "--partition",
                    gpu_partition,
                    "--gpus-per-node",
                    ",".join([f"{gpu_type}:1" for gpu_type in gpu_types]),
                ],
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-multiple-types",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-multiple-types",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-job-gpus-per-socket") or not assets.exists(
            "slurmdb-job-gpus-per-socket"
        ):
            # sbatch --gpus-per-socket --sockets-per-node
            job_id = cluster.submit(
                user,
                [
                    "--partition",
                    gpu_partition,
                    "--gpus-per-socket",
                    str(2),
                    "--sockets-per-node",
                    str(2),
                ],
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-per-socket",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-per-socket",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-job-gpus-per-task") or not assets.exists(
            "slurmdb-job-gpus-per-task"
        ):
            # sbatch --gpus-per-task <m> --ntasks <n>
            job_id = cluster.submit(
                user,
                [
                    "--partition",
                    gpu_partition,
                    "--gpus-per-task",
                    str(2),
                    "--ntasks",
                    str(2),
                ],
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-per-task",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-per-task",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-job-gpus-gres") or not assets.exists(
            "slurmdb-job-gpus-gres"
        ):
            # sbatch --gres gpu:<n>
            job_id = cluster.submit(
                user, ["--partition", gpu_partition, "--gres ", f"gpu:{gpu_per_node}"]
            )
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/job/{job_id}",
                "slurm-job-gpus-gres",
            )
            dump_slurmrestd_query(
                f"/slurmdb/v{cluster.api}/job/{job_id}",
                "slurmdb-job-gpus-gres",
            )
            cluster.cancel(user, job_id)
    else:
        logger.warning("Unable to find GPU on cluster %s", cluster.name)

    def dump_node_state():
        if state in _node["state"]:
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/node/{_node['name']}",
                f"slurm-node-{state.lower()}",
            )

    # Download specific node
    for _node in nodes["nodes"]:
        for state in ["IDLE", "MIXED", "ALLOCATED", "DOWN", "DRAINING", "DRAIN"]:
            dump_node_state()

    if has_gpu:
        user = cluster.pick_user()

        if not assets.exists("slurm-node-with-gpus-allocated"):
            # Allocate all GPUs on a node
            job_id = cluster.submit(
                user,
                [
                    "--partition",
                    gpu_partition,
                    "--gpus",
                    str(gpu_per_node),
                    "--nodes",
                    str(1),
                ],
            )
            node = cluster.job_nodes(job_id)[0]
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/node/{node}",
                "slurm-node-with-gpus-allocated",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-node-with-gpus-mixed"):
            # Allocate some GPUs on a node
            job_id = cluster.submit(
                user, ["--partition", gpu_partition, "--gpus", str(1)]
            )
            node = cluster.job_nodes(job_id)[0]
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/node/{node}",
                "slurm-node-with-gpus-mixed",
            )
            cluster.cancel(user, job_id)

        if not assets.exists("slurm-node-with-gpus-idle"):
            cluster.wait_idle(node)
            # All GPUs idle
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/node/{node}",
                "slurm-node-with-gpus-idle",
            )

    for _node in nodes["nodes"]:
        # Get node without GPU
        if not len(_node["gres"]):
            dump_slurmrestd_query(
                f"/slurm/v{cluster.api}/node/{_node['name']}",
                "slurm-node-without-gpu",
            )
            break

    # Request node not found
    dump_slurmrestd_query(
        f"/slurm/v{cluster.api}/node/unexisting-node",
        "slurm-node-unfound",
    )

    # Download partitions
    dump_slurmrestd_query(
        f"/slurm/v{cluster.api}/partitions",
        "slurm-partitions",
    )

    # Download qos
    dump_slurmrestd_query(
        f"/slurmdb/v{cluster.api}/qos",
        "slurm-qos",
    )

    # Download accounts
    dump_slurmrestd_query(
        f"/slurmdb/v{cluster.api}/accounts",
        "slurm-accounts",
    )

    # Download reservations
    dump_slurmrestd_query(
        f"/slurm/v{cluster.api}/reservations",
        "slurm-reservations",
    )

    assets.save()
