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
from pathlib import Path

from .lib import BaseAssetsManager, crawler_logger

if t.TYPE_CHECKING:
    from .lib import DevelopmentHostClient, DevelopmentHostCluster


from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier


logger = crawler_logger()


class SlurmrestdAssetsManager(BaseAssetsManager):
    def __init__(self, version):
        super().__init__(Path("slurmrestd") / version)


def crawl_slurmrestd(
    dev_host: DevelopmentHostClient,
    cluster: DevelopmentHostCluster,
    auth: SlurmrestdAuthentifier,
) -> None:
    """Crawl and save test assets from slurmrestd on the given socket."""

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
