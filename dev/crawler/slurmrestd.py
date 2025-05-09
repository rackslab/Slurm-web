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
                "job-gpus-running": self._crawl_job_gpus_running,
                "job-gpus-pending": self._crawl_job_gpus_pending,
                "job-gpus-completed": self._crawl_job_gpus_completed,
                "job-gpus-archived": self._crawl_job_gpus_archived,
                "job-gpus-multi-nodes": self._crawl_job_gpus_multi_nodes,
                "job-gpus-type": self._crawl_job_gpus_type,
                "job-gpus-per-node": self._crawl_job_gpus_per_node,
                "job-gpus-multi-types": self._crawl_job_gpus_multi_types,
                "job-gpus-per-socket": self._crawl_job_gpus_per_socket,
                "job-gpus-per-task": self._crawl_job_gpus_per_task,
                "job-gpus-gres": self._crawl_job_gpus_gres,
                "node-gpus-allocated": self._crawl_node_gpus_allocated,
                "node-gpus-mixed": self._crawl_node_gpus_mixed,
                "node-gpus-idle": self._crawl_node_gpus_idle,
                "node-without-gpu": self._crawl_node_without_gpu,
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
                    # FIXME: add new line
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

    def _crawl_job_gpus_running(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-running",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-running",
        )

    def _crawl_job_gpus_pending(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-pending",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-pending",
        )

    def _crawl_job_gpus_completed(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-completed",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-completed",
        )

    def _crawl_job_gpus_archived(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-archived",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-archived",
        )

    def _crawl_job_gpus_multi_nodes(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-multi-nodes",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-multi-nodes",
        )

    def _crawl_job_gpus_type(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-type",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-type",
        )

    def _crawl_job_gpus_per_node(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-per-node",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-per-node",
        )

    def _crawl_job_gpus_multi_types(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-multi-types",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-multi-types",
        )

    def _crawl_job_gpus_per_socket(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-per-socket",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-per-socket",
        )

    def _crawl_job_gpus_per_task(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-per-task",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-per-task",
        )

    def _crawl_job_gpus_gres(self, job_id):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-gres",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-gres",
        )

    def _crawl_node_gpus_allocated(self, node):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/node/{node}",
            "slurm-node-with-gpus-allocated",
        )

    def _crawl_node_gpus_mixed(self, node):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/node/{node}",
            "slurm-node-with-gpus-mixed",
        )

    def _crawl_node_gpus_idle(self, node):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/node/{node}",
            "slurm-node-with-gpus-idle",
        )

    def _crawl_node_without_gpu(self, node):
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/node/{node}",
            "slurm-node-without-gpu",
        )

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
