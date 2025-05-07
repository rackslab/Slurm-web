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
import logging

from .lib import ComponentCrawler, BaseAssetsManager

if t.TYPE_CHECKING:
    from .lib import DevelopmentHostCluster


from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier


logger = logging.getLogger(__name__)


class SlurmrestdAssetsManager(BaseAssetsManager):
    def __init__(self, version):
        super().__init__(Path("slurmrestd") / version)


class SlurmrestdCrawler(ComponentCrawler):
    def __init__(self, cluster: DevelopmentHostCluster, auth: SlurmrestdAuthentifier):
        self.cluster = cluster
        # Get Slurm version
        ping = self.cluster.query_slurmrestd_json(f"/slurm/v{cluster.api}/ping")
        release = ping["meta"]["slurm"]["release"]
        version = release.rsplit(".", 1)[0]
        logger.info("Slurm version: %s release: %s", version, release)

        super().__init__(
            "slurmrestd",
            {
                "ping": self._crawl_ping,
                "errors": self._crawl_errors,
                "jobs": self._crawl_jobs,
                "nodes": self._crawl_nodes,
                "jobs-gpus": self._crawl_jobs_gpus,
                "nodes-gpus": self._crawl_nodes_gpus,
                "partitions": self._crawl_partitions,
                "qos": self._crawl_qos,
                "accounts": self._crawl_accounts,
                "reservations": self._crawl_reservations,
            },
            SlurmrestdAssetsManager(version),
        )
        self.auth = auth

    def dump_slurmrestd_query(
        self,
        query: str,
        asset_name: str,
        headers: dict[str, str] | None = None,
        skip_exist=True,
        limit_dump=0,
        limit_key=None,
    ) -> t.Any:
        """Send GET HTTP request to slurmrestd and save JSON result in assets
        directory."""

        if self.assets.exists(asset_name) and skip_exist:
            return

        text, content_type, status = self.cluster.query_slurmrestd(query, headers)

        if asset_name not in self.assets.statuses:
            self.assets.statuses[asset_name] = {}
        self.assets.statuses[asset_name]["content-type"] = content_type
        self.assets.statuses[asset_name]["status"] = status

        if content_type == "application/json":
            asset = self.assets.path / f"{asset_name}.json"
            data = json.loads(text)
        else:
            asset = self.assets.path / f"{asset_name}.txt"
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

    def _crawl_ping(self):
        # Download ping
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/ping",
            "slurm-ping",
        )

    def _crawl_errors(self):
        # Download URL not found for both slurm and slurmdb
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/not-found",
            "slurm-not-found",
        )

        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/not-found",
            "slurmdb-not-found",
        )

        if self.auth.method == "jwt":
            # if JWT auth, test missing headers
            self.dump_slurmrestd_query(
                f"/slurm/v{self.cluster.api}/jobs", "slurm-jwt-missing-headers", {}
            )
            # if JWT auth, test invalid headers
            self.dump_slurmrestd_query(
                f"/slurm/v{self.cluster.api}/jobs",
                "slurm-jwt-invalid-headers",
                {"X-SLURM-USER-FAIL": "tail"},
            )
            # if JWT auth, test invalid token
            self.dump_slurmrestd_query(
                f"/slurm/v{self.cluster.api}/jobs",
                "slurm-jwt-invalid-token",
                {"X-SLURM-USER-NAME": self.auth.jwt_user, "X-SLURM-USER-TOKEN": "fail"},
            )
            # if JWT auth and ability to generate token, test expired token
            if self.auth.jwt_mode == "auto":
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/jobs",
                    "slurm-jwt-expired-token",
                    {
                        "X-SLURM-USER-NAME": self.auth.jwt_user,
                        "X-SLURM-USER-TOKEN": self.auth.jwt_manager.generate(
                            duration=-1, claimset={"sun": self.auth.jwt_user}
                        ),
                    },
                )

    def _crawl_jobs(self):
        # Download jobs
        jobs = self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/jobs",
            "slurm-jobs",
            skip_exist=False,
            limit_dump=30,
            limit_key="jobs",
        )

        def dump_job_state(state: str):
            if state in _job["job_state"]:
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{_job['job_id']}",
                    f"slurm-job-{state.lower()}",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{_job['job_id']}",
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

            self.dump_slurmrestd_query(
                f"/slurm/v{self.cluster.api}/job/{min_job_id - 1}",
                "slurm-job-archived",
            )
            self.dump_slurmrestd_query(
                f"/slurmdb/v{self.cluster.api}/job/{min_job_id - 1}",
                "slurmdb-job-archived",
            )

            self.dump_slurmrestd_query(
                f"/slurm/v{self.cluster.api}/job/{max_job_id * 2}",
                "slurm-job-unfound",
            )
            self.dump_slurmrestd_query(
                f"/slurmdb/v{self.cluster.api}/job/{max_job_id * 2}",
                "slurmdb-job-unfound",
            )

    def _crawl_nodes(self):
        # Download nodes
        nodes = self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/nodes",
            "slurm-nodes",
            skip_exist=False,
            limit_dump=100,
            limit_key="nodes",
        )

        def dump_node_state():
            if state in _node["state"]:
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                    f"slurm-node-{state.lower()}",
                )

        # Download specific node
        for _node in nodes["nodes"]:
            for state in ["IDLE", "MIXED", "ALLOCATED", "DOWN", "DRAINING", "DRAIN"]:
                dump_node_state()

        # Request node not found
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/node/unexisting-node",
            "slurm-node-unfound",
        )

    def _crawl_jobs_gpus(self):
        nodes = self.cluster.query_slurmrestd_json(f"/slurm/v{self.cluster.api}/nodes")
        # Look at GPU declared on cluster. Logic expects all nodes with GPUs share the
        # same GPUs setup.
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
            user = self.cluster.pick_user()

            if not self.assets.exists(
                "slurm-job-gpus-running"
            ) or not self.assets.exists("slurmdb-job-gpus-running"):
                # sbatch --gpus <n> mono-node running
                job_id = self.cluster.submit(
                    user, ["--partition", gpu_partition, "--gpus", str(gpu_per_node)]
                )
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-running",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-running",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists(
                "slurm-job-gpus-pending"
            ) or not self.assets.exists("slurmdb-job-gpus-pending"):
                # sbatch --gpus <n> mono-node pending
                job_id = self.cluster.submit(
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
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-pending",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-pending",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists(
                "slurm-job-gpus-multi-nodes"
            ) or not self.assets.exists("slurmdb-job-gpus-multi-nodes"):
                # sbatch --gpus <n> multi-nodes
                job_id = self.cluster.submit(
                    user,
                    ["--partition", gpu_partition, "--gpus", str(gpu_per_node * 2)],
                )
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-multi-nodes",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-multi-nodes",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists("slurm-job-gpus-type") or not self.assets.exists(
                "slurmdb-job-gpus-type"
            ):
                # sbatch --gpus type:<n>
                job_id = self.cluster.submit(
                    user, ["--partition", gpu_partition, "--gpus", f"{gpu_types[0]}:1"]
                )
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-type",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-type",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists(
                "slurm-job-gpus-per-node"
            ) or not self.assets.exists("slurmdb-job-gpus-per-node"):
                # sbatch --gpus-per-node <m> --nodes <n>
                job_id = self.cluster.submit(
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
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-per-node",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-per-node",
                )
                self.cluster.cancel(user, job_id)

            # sbatch --gpus-per-node type1:<n>,type2:<m>
            if len(gpu_types) > 1 and (
                not self.assets.exists("slurm-job-gpus-multiple-types")
                or not self.assets.exists("slurmdb-job-gpus-multiple-types")
            ):
                job_id = self.cluster.submit(
                    user,
                    [
                        "--partition",
                        gpu_partition,
                        "--gpus-per-node",
                        ",".join([f"{gpu_type}:1" for gpu_type in gpu_types]),
                    ],
                )
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-multiple-types",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-multiple-types",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists(
                "slurm-job-gpus-per-socket"
            ) or not self.assets.exists("slurmdb-job-gpus-per-socket"):
                # sbatch --gpus-per-socket --sockets-per-node
                job_id = self.cluster.submit(
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
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-per-socket",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-per-socket",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists(
                "slurm-job-gpus-per-task"
            ) or not self.assets.exists("slurmdb-job-gpus-per-task"):
                # sbatch --gpus-per-task <m> --ntasks <n>
                job_id = self.cluster.submit(
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
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-per-task",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-per-task",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists("slurm-job-gpus-gres") or not self.assets.exists(
                "slurmdb-job-gpus-gres"
            ):
                # sbatch --gres gpu:<n>
                job_id = self.cluster.submit(
                    user,
                    ["--partition", gpu_partition, "--gres ", f"gpu:{gpu_per_node}"],
                )
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/job/{job_id}",
                    "slurm-job-gpus-gres",
                )
                self.dump_slurmrestd_query(
                    f"/slurmdb/v{self.cluster.api}/job/{job_id}",
                    "slurmdb-job-gpus-gres",
                )
                self.cluster.cancel(user, job_id)
        else:
            logger.warning("Unable to find GPU on cluster %s", self.cluster.name)

    def _crawl_nodes_gpus(self):
        nodes = self.cluster.query_slurmrestd_json(f"/slurm/v{self.cluster.api}/nodes")
        # Look at GPU declared on cluster. Logic expects all nodes with GPUs share the
        # same GPUs setup.
        has_gpu = False
        gpu_per_node = 0
        gpu_types = []
        gpu_partition = None
        for _node in nodes["nodes"]:
            all_gres = _node["gres"].split(",")
            if len(all_gres) and any([gres_s.startswith("gpu") for gres_s in all_gres]):
                has_gpu = True
                for gres_s in all_gres:
                    gres = gres_s.split(":")
                    # skip non-gpu gres
                    if gres[0] != "gpu":
                        continue
                    gpu_types.append(gres[1])
                    gpu_per_node += int(gres[2])
                    gpu_partition = _node["partitions"][0]
                break

        node = None
        # Submit jobs and allocate GPUs
        if has_gpu:
            user = self.cluster.pick_user()
            if not self.assets.exists("slurm-node-with-gpus-allocated"):
                # Allocate all GPUs on a node
                job_id = self.cluster.submit(
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
                node = self.cluster.job_nodes(job_id)[0]
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/node/{node}",
                    "slurm-node-with-gpus-allocated",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists("slurm-node-with-gpus-mixed"):
                # Allocate some GPUs on a node
                job_id = self.cluster.submit(
                    user, ["--partition", gpu_partition, "--gpus", str(1)]
                )
                node = self.cluster.job_nodes(job_id)[0]
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/node/{node}",
                    "slurm-node-with-gpus-mixed",
                )
                self.cluster.cancel(user, job_id)

            if not self.assets.exists("slurm-node-with-gpus-idle"):
                if node:
                    self.cluster.wait_idle(node)
                else:
                    # find random gpu node
                    for _node in nodes["nodes"]:
                        if len(_node["gres"]):
                            node = _node["name"]
                            break
                # All GPUs idle
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/node/{node}",
                    "slurm-node-with-gpus-idle",
                )

            for _node in nodes["nodes"]:
                # Get node without GPU
                if not len(_node["gres"]):
                    self.dump_slurmrestd_query(
                        f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                        "slurm-node-without-gpu",
                    )
                    break

    def _crawl_partitions(self):
        # Download partitions
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/partitions",
            "slurm-partitions",
        )

    def _crawl_qos(self):
        # Download qos
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/qos",
            "slurm-qos",
        )

    def _crawl_accounts(self):
        # Download accounts
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/accounts",
            "slurm-accounts",
        )

    def _crawl_reservations(self):
        # Download reservations
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/reservations",
            "slurm-reservations",
        )
