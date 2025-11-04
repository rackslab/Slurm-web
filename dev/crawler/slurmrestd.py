#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
import typing as t
import json
import socket
from pathlib import Path
import logging

from .lib import Asset, ComponentCrawler, BaseAssetsManager

if t.TYPE_CHECKING:
    from .lib import DevelopmentHostCluster


from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier


logger = logging.getLogger(__name__)


class SlurmrestdAssetsManager(BaseAssetsManager):
    def __init__(self, version):
        super().__init__(Path("slurmrestd") / version)


class SlurmrestdCrawler(ComponentCrawler):
    def __init__(
        self,
        cluster: DevelopmentHostCluster,
        auth: SlurmrestdAuthentifier,
    ):
        # Get Slurm version
        ping = cluster.query_slurmrestd_json(f"/slurm/v{cluster.api}/ping")
        release = ping["meta"]["slurm"]["release"]
        version = release.rsplit(".", 1)[0]
        logger.info("Slurm version: %s release: %s", version, release)

        # Build asset set with explicit output file names for special cases
        asset_set = {
            Asset("ping", "slurm-ping", self._crawl_ping),
            Asset(
                "errors",
                [
                    "slurm-not-found",
                    "slurmdb-not-found",
                    "slurm-jwt-missing-headers",
                    "slurm-jwt-invalid-headers",
                    "slurm-jwt-invalid-token",
                    "slurm-jwt-expired-token",
                ],
                self._crawl_errors,
            ),
            Asset(
                "jobs",
                [
                    "slurm-jobs",
                    "slurm-job-pending",
                    "slurm-job-running",
                    "slurm-job-completed",
                    "slurm-job-failed",
                    "slurm-job-timeout",
                    "slurm-job-archived",
                    "slurm-job-unfound",
                ],
                self._crawl_jobs,
            ),
            Asset(
                "nodes",
                [
                    "slurm-nodes",
                    "slurm-node-planned",
                    "slurm-node-drain",
                    "slurm-node-draining",
                    "slurm-node-mixed",
                    "slurm-node-allocated",
                    "slurm-node-down",
                    "slurm-node-unfound",
                ],
                self._crawl_nodes,
            ),
            Asset(
                "job-gpus-running",
                ["slurm-job-gpus-running", "slurmdb-job-gpus-running"],
                self._crawl_job_gpus_running,
            ),
            Asset(
                "job-gpus-pending",
                ["slurm-job-gpus-pending", "slurmdb-job-gpus-pending"],
                self._crawl_job_gpus_pending,
            ),
            Asset(
                "job-gpus-completed",
                ["slurm-job-gpus-completed", "slurmdb-job-gpus-completed"],
                self._crawl_job_gpus_completed,
            ),
            Asset(
                "job-gpus-archived",
                ["slurm-job-gpus-archived", "slurmdb-job-gpus-archived"],
                self._crawl_job_gpus_archived,
            ),
            Asset(
                "job-gpus-multi-nodes",
                ["slurm-job-gpus-multi-nodes", "slurmdb-job-gpus-multi-nodes"],
                self._crawl_job_gpus_multi_nodes,
            ),
            Asset(
                "job-gpus-type",
                ["slurm-job-gpus-type", "slurmdb-job-gpus-type"],
                self._crawl_job_gpus_type,
            ),
            Asset(
                "job-gpus-per-node",
                ["slurm-job-gpus-per-node", "slurmdb-job-gpus-per-node"],
                self._crawl_job_gpus_per_node,
            ),
            Asset(
                "job-gpus-multi-types",
                ["slurm-job-gpus-multi-types", "slurmdb-job-gpus-multi-types"],
                self._crawl_job_gpus_multi_types,
            ),
            Asset(
                "job-gpus-per-socket",
                ["slurm-job-gpus-per-socket", "slurmdb-job-gpus-per-socket"],
                self._crawl_job_gpus_per_socket,
            ),
            Asset(
                "job-gpus-per-task",
                ["slurm-job-gpus-per-task", "slurmdb-job-gpus-per-task"],
                self._crawl_job_gpus_per_task,
            ),
            Asset(
                "job-gpus-gres",
                ["slurm-job-gpus-gres", "slurmdb-job-gpus-gres"],
                self._crawl_job_gpus_gres,
            ),
            Asset(
                "node-gpus-allocated",
                [
                    "slurm-node-with-gpus-model-allocated",
                    "slurm-node-with-gpus-allocated",
                ],
                self._crawl_node_gpus_allocated,
            ),
            Asset(
                "node-gpus-mixed",
                [
                    "slurm-node-with-gpus-model-mixed",
                    "slurm-node-with-gpus-mixed",
                ],
                self._crawl_node_gpus_mixed,
            ),
            Asset(
                "node-gpus-idle",
                [
                    "slurm-node-with-gpus-model-idle",
                    "slurm-node-with-gpus-idle",
                ],
                self._crawl_node_gpus_idle,
            ),
            Asset(
                "node-without-gpu",
                "slurm-node-without-gpu",
                self._crawl_node_without_gpu,
            ),
            Asset("partitions", "slurm-partitions", self._crawl_partitions),
            Asset("qos", "slurm-qos", self._crawl_qos),
            Asset("accounts", "slurm-accounts", self._crawl_accounts),
            Asset("reservations", "slurm-reservations", self._crawl_reservations),
        }

        super().__init__(
            "slurmrestd",
            asset_set,
            SlurmrestdAssetsManager(version),
            cluster,
        )
        self.auth = auth
        self._cleanup_state = None

    def get_slurmrestd_json_response(
        self, query: str, headers: dict[str, str] | None = None
    ):
        """Send GET HTTP request to slurmrestd and get JSON result, raw text
        response, content type and status."""
        text, content_type, status = self.cluster.query_slurmrestd(query, headers)
        return json.loads(text), text, content_type, status

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

        text, content_type, status = self.cluster.query_slurmrestd(query, headers)
        return self.dump_slurmrestd_response(
            asset_name, text, content_type, status, limit_dump, limit_key
        )

    def dump_slurmrestd_response(
        self, asset_name, text, content_type, status, limit_dump=0, limit_key=None
    ):
        """Save slurmrestd response asset."""
        if asset_name not in self.manager.statuses:
            self.manager.statuses[asset_name] = {}
        self.manager.statuses[asset_name]["content-type"] = content_type
        self.manager.statuses[asset_name]["status"] = status

        if content_type == "application/json":
            asset = self.manager.path / f"{asset_name}.json"
            data = json.loads(text)
        else:
            asset = self.manager.path / f"{asset_name}.txt"
            data = text

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
        self._cleanup_state = self.cluster.setup_for_jobs()
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
        self._cleanup_state = self.cluster.setup_for_nodes()
        # Download nodes
        nodes = self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/nodes",
            "slurm-nodes",
            skip_exist=False,
            limit_dump=100,
            limit_key="nodes",
        )

        # Download specific node
        for _node in nodes["nodes"]:
            if "IDLE" in _node["state"]:
                if "PLANNED" in _node["state"]:
                    self.dump_slurmrestd_query(
                        f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                        "slurm-node-planned",
                    )
                elif "DRAIN" in _node["state"]:
                    self.dump_slurmrestd_query(
                        f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                        "slurm-node-drain",
                    )
                else:
                    self.dump_slurmrestd_query(
                        f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                        "slurm-node-idle",
                    )
            elif "DRAIN" in _node["state"]:
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                    "slurm-node-draining",
                )
            if "MIXED" in _node["state"]:
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                    "slurm-node-mixed",
                )
            if "ALLOCATED" in _node["state"]:
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                    "slurm-node-allocated",
                )
            if "DOWN" in _node["state"]:
                self.dump_slurmrestd_query(
                    f"/slurm/v{self.cluster.api}/node/{_node['name']}",
                    "slurm-node-down",
                )

        # Request node not found
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/node/unexisting-node",
            "slurm-node-unfound",
        )

    def _crawl_job_gpus_running(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-running", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_running(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-running",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-running",
        )

    def _crawl_job_gpus_pending(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-pending", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_pending(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-pending",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-pending",
        )

    def _crawl_job_gpus_completed(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-completed", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_completed(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-completed",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-completed",
        )

    def _crawl_job_gpus_archived(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-archived", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_archived(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-archived",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-archived",
        )

    def _crawl_job_gpus_multi_nodes(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-multi-nodes",
                self.cluster.name,
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_multi_nodes(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-multi-nodes",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-multi-nodes",
        )

    def _crawl_job_gpus_type(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-type", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_type(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_types"][0],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-type",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-type",
        )

    def _crawl_job_gpus_per_node(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-per-node", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_per_node(
            self.cluster.gpu_info["gpu_partition"]
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-per-node",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-per-node",
        )

    def _crawl_job_gpus_multi_types(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-multi-types",
                self.cluster.name,
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_multi_types(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_types"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-multi-types",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-multi-types",
        )

    def _crawl_job_gpus_per_socket(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-per-socket", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_per_socket(
            self.cluster.gpu_info["gpu_partition"]
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-per-socket",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-per-socket",
        )

    def _crawl_job_gpus_per_task(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-per-task", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_per_task(
            self.cluster.gpu_info["gpu_partition"]
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-per-task",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-per-task",
        )

    def _crawl_job_gpus_gres(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping job-gpus-gres", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_job_gpus_gres(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        self._cleanup_state = {"jobs": [(user, job_id)]}
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/job/{job_id}",
            "slurm-job-gpus-gres",
        )
        self.dump_slurmrestd_query(
            f"/slurmdb/v{self.cluster.api}/job/{job_id}",
            "slurmdb-job-gpus-gres",
        )

    def _crawl_node_gpus_allocated(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-allocated", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_node_gpus_allocated(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
        )
        node = self.cluster.job_nodes(job_id)[0]
        self._cleanup_state = {"jobs": [(user, job_id)]}
        _json, text, content_type, status = self.get_slurmrestd_json_response(
            f"/slurm/v{self.cluster.api}/node/{node}"
        )
        has_model = any(
            [len(gres.split(":")) > 2 for gres in _json["nodes"][0]["gres"].split(",")]
        )
        if has_model:
            asset = "slurm-node-with-gpus-model-allocated"
        else:
            asset = "slurm-node-with-gpus-allocated"
        self.dump_slurmrestd_response(asset, text, content_type, status)

    def _crawl_node_gpus_mixed(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-mixed", self.cluster.name
            )
            return
        job_id, user = self.cluster.setup_for_node_gpus_mixed(
            self.cluster.gpu_info["gpu_partition"]
        )
        node = self.cluster.job_nodes(job_id)[0]
        self._cleanup_state = {"jobs": [(user, job_id)]}
        _json, text, content_type, status = self.get_slurmrestd_json_response(
            f"/slurm/v{self.cluster.api}/node/{node}"
        )
        has_model = any(
            [len(gres.split(":")) > 2 for gres in _json["nodes"][0]["gres"].split(",")]
        )
        if has_model:
            asset = "slurm-node-with-gpus-model-mixed"
        else:
            asset = "slurm-node-with-gpus-mixed"
        self.dump_slurmrestd_response(asset, text, content_type, status)

    def _crawl_node_gpus_idle(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-idle", self.cluster.name
            )
            return
        node, job_id, user = self.cluster.setup_for_node_gpus_idle(
            self.cluster.gpu_info["gpu_partition"]
        )
        self._cleanup_state = {"jobs": [(user, job_id)], "gpu_node": node}
        _json, text, content_type, status = self.get_slurmrestd_json_response(
            f"/slurm/v{self.cluster.api}/node/{node}"
        )
        has_model = any(
            [len(gres.split(":")) > 2 for gres in _json["nodes"][0]["gres"].split(",")]
        )
        if has_model:
            asset = "slurm-node-with-gpus-model-idle"
        else:
            asset = "slurm-node-with-gpus-idle"
        self.dump_slurmrestd_response(asset, text, content_type, status)

    def _crawl_node_without_gpu(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-without-gpu", self.cluster.name
            )
            return
        nodes_json = self.cluster.query_slurmrestd_json(
            f"/slurm/v{self.cluster.api}/nodes"
        )
        for _node in nodes_json["nodes"]:
            if not len(_node.get("gres", "")):
                node = _node["name"]
                break

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
        self._cleanup_state = self.cluster.setup_for_reservations()
        # Download reservations
        self.dump_slurmrestd_query(
            f"/slurm/v{self.cluster.api}/reservations",
            "slurm-reservations",
        )
