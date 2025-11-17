#!/usr/bin/env python3
#
# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from __future__ import annotations
import typing as t
import socket
from pathlib import Path
import logging

import requests

from .lib import Asset, ComponentCrawler, BaseAssetsManager

if t.TYPE_CHECKING:
    from .lib import DevelopmentHostCluster


from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier


logger = logging.getLogger(__name__)


class SlurmrestdAssetsManager(BaseAssetsManager):
    def __init__(self, slurm_version: str, api_version: str):
        """Initialize assets manager with slurm_version and api_version.

        Args:
            slurm_version: Slurm version (e.g., "23.11")
            api_version: slurmrestd API version (e.g., "0.0.44")
        """
        super().__init__(Path("slurmrestd") / slurm_version / api_version)


class SlurmrestdCrawler(ComponentCrawler):
    def __init__(
        self,
        cluster: DevelopmentHostCluster,
        auth: SlurmrestdAuthentifier,
        slurm_version: str,
        api_version: str,
    ):
        # Build asset set with explicit output file names for special cases
        asset_set = {
            Asset("ping", "slurm-ping", self._crawl_ping),
            Asset(
                "openapi",
                "../openapi-v3",
                self._crawl_openapi,
            ),
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
                "node-gpus-allocated-with-model",
                "slurm-node-with-gpus-model-allocated",
                self._crawl_node_gpus_allocated_with_model,
            ),
            Asset(
                "node-gpus-allocated-without-model",
                "slurm-node-with-gpus-allocated",
                self._crawl_node_gpus_allocated_without_model,
            ),
            Asset(
                "node-gpus-mixed-with-model",
                "slurm-node-with-gpus-model-mixed",
                self._crawl_node_gpus_mixed_with_model,
            ),
            Asset(
                "node-gpus-mixed-without-model",
                "slurm-node-with-gpus-mixed",
                self._crawl_node_gpus_mixed_without_model,
            ),
            Asset(
                "node-gpus-idle-with-model",
                "slurm-node-with-gpus-model-idle",
                self._crawl_node_gpus_idle_with_model,
            ),
            Asset(
                "node-gpus-idle-without-model",
                "slurm-node-with-gpus-idle",
                self._crawl_node_gpus_idle_without_model,
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
            SlurmrestdAssetsManager(slurm_version, api_version),
            cluster,
        )
        self.auth = auth
        self.api_version = api_version
        self._cleanup_state = None

    def get_component_response(
        self,
        query: str,
        headers: dict[str, str] | None = None,
        method: str = "GET",
        content: dict[str, t.Any] | None = None,
    ) -> requests.Response:
        """Get HTTP response from slurmrestd using cluster authentication."""
        if headers is None:
            headers = self.auth.headers()
        if method != "GET":
            raise RuntimeError(f"Unsupported request method {method} for slurmrestd")
        return self.cluster.query_slurmrestd(query, headers)

    def _crawl_ping(self):
        # Download ping
        self.dump_component_query(
            f"/slurm/v{self.api_version}/ping",
            "slurm-ping",
        )

    def _crawl_errors(self):
        # Download URL not found for both slurm and slurmdb
        self.dump_component_query(
            f"/slurm/v{self.api_version}/not-found",
            "slurm-not-found",
        )

        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/not-found",
            "slurmdb-not-found",
        )

        if self.auth.method == "jwt":
            # if JWT auth, test missing headers
            self.dump_component_query(
                f"/slurm/v{self.api_version}/jobs", "slurm-jwt-missing-headers", {}
            )
            # if JWT auth, test invalid headers
            self.dump_component_query(
                f"/slurm/v{self.api_version}/jobs",
                "slurm-jwt-invalid-headers",
                {"X-SLURM-USER-FAIL": "tail"},
            )
            # if JWT auth, test invalid token
            self.dump_component_query(
                f"/slurm/v{self.api_version}/jobs",
                "slurm-jwt-invalid-token",
                {"X-SLURM-USER-NAME": self.auth.jwt_user, "X-SLURM-USER-TOKEN": "fail"},
            )
            # if JWT auth and ability to generate token, test expired token
            if self.auth.jwt_mode == "auto":
                self.dump_component_query(
                    f"/slurm/v{self.api_version}/jobs",
                    "slurm-jwt-expired-token",
                    {
                        "X-SLURM-USER-NAME": self.auth.jwt_user,
                        "X-SLURM-USER-TOKEN": self.auth.jwt_manager.generate(
                            duration=-1, claimset={"sun": self.auth.jwt_user}
                        ),
                    },
                )

    def _crawl_openapi(self):
        self.dump_component_query(
            "/openapi/v3",
            "openapi-v3",
            shared_asset=True,
        )

    def _crawl_jobs(self):
        self._cleanup_state = self.cluster.setup_for_jobs()
        # Download jobs
        jobs = self.dump_component_query(
            f"/slurm/v{self.api_version}/jobs",
            "slurm-jobs",
            skip_exist=False,
            limit_dump=30,
            limit_key="jobs",
        )

        def dump_job_state(state: str):
            if state in _job["job_state"]:
                self.dump_component_query(
                    f"/slurm/v{self.api_version}/job/{_job['job_id']}",
                    f"slurm-job-{state.lower()}",
                )
                self.dump_component_query(
                    f"/slurmdb/v{self.api_version}/job/{_job['job_id']}",
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

            self.dump_component_query(
                f"/slurm/v{self.api_version}/job/{min_job_id - 1}",
                "slurm-job-archived",
            )
            self.dump_component_query(
                f"/slurmdb/v{self.api_version}/job/{min_job_id - 1}",
                "slurmdb-job-archived",
            )

            self.dump_component_query(
                f"/slurm/v{self.api_version}/job/{max_job_id * 2}",
                "slurm-job-unfound",
            )
            self.dump_component_query(
                f"/slurmdb/v{self.api_version}/job/{max_job_id * 2}",
                "slurmdb-job-unfound",
            )

    def _crawl_nodes(self):
        self._cleanup_state = self.cluster.setup_for_nodes()
        # Download nodes
        nodes = self.dump_component_query(
            f"/slurm/v{self.api_version}/nodes",
            "slurm-nodes",
            skip_exist=False,
            limit_dump=100,
            limit_key="nodes",
        )

        # Download specific node
        for _node in nodes["nodes"]:
            if "IDLE" in _node["state"]:
                if "PLANNED" in _node["state"]:
                    self.dump_component_query(
                        f"/slurm/v{self.api_version}/node/{_node['name']}",
                        "slurm-node-planned",
                    )
                elif "DRAIN" in _node["state"]:
                    self.dump_component_query(
                        f"/slurm/v{self.api_version}/node/{_node['name']}",
                        "slurm-node-drain",
                    )
                else:
                    self.dump_component_query(
                        f"/slurm/v{self.api_version}/node/{_node['name']}",
                        "slurm-node-idle",
                    )
            elif "DRAIN" in _node["state"]:
                self.dump_component_query(
                    f"/slurm/v{self.api_version}/node/{_node['name']}",
                    "slurm-node-draining",
                )
            if "MIXED" in _node["state"]:
                self.dump_component_query(
                    f"/slurm/v{self.api_version}/node/{_node['name']}",
                    "slurm-node-mixed",
                )
            if "ALLOCATED" in _node["state"]:
                self.dump_component_query(
                    f"/slurm/v{self.api_version}/node/{_node['name']}",
                    "slurm-node-allocated",
                )
            if "DOWN" in _node["state"]:
                self.dump_component_query(
                    f"/slurm/v{self.api_version}/node/{_node['name']}",
                    "slurm-node-down",
                )

        # Request node not found
        self.dump_component_query(
            f"/slurm/v{self.api_version}/node/unexisting-node",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-running",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-pending",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-completed",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-archived",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-multi-nodes",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-type",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-per-node",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-multi-types",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-per-socket",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-per-task",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
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
        self.dump_component_query(
            f"/slurm/v{self.api_version}/job/{job_id}",
            "slurm-job-gpus-gres",
        )
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/job/{job_id}",
            "slurmdb-job-gpus-gres",
        )

    def _crawl_node_gpus_allocated_with_model(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-allocated-with-model",
                self.cluster.name,
            )
            return
        nodes_with_model = self.cluster.find_gpu_nodes_with_model(
            self.cluster.gpu_info["gpu_partition"]
        )
        if not nodes_with_model:
            logger.warning(
                "Cluster %s has no GPU nodes with model, "
                "skipping node-gpus-allocated-with-model",
                self.cluster.name,
            )
            return
        node_name = nodes_with_model[0]
        job_id, user = self.cluster.setup_for_node_gpus_allocated(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
            node_name=node_name,
        )
        node = self.cluster.job_nodes(job_id)[0]
        self._cleanup_state = {"jobs": [(user, job_id)]}
        response = self.get_component_response(
            f"/slurm/v{self.api_version}/node/{node}"
        )
        self.dump_component_response("slurm-node-with-gpus-model-allocated", response)

    def _crawl_node_gpus_allocated_without_model(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-allocated-without-model",
                self.cluster.name,
            )
            return
        nodes_without_model = self.cluster.find_gpu_nodes_without_model(
            self.cluster.gpu_info["gpu_partition"]
        )
        if not nodes_without_model:
            logger.warning(
                "Cluster %s has no GPU nodes without model, "
                "skipping node-gpus-allocated-without-model",
                self.cluster.name,
            )
            return
        node_name = nodes_without_model[0]
        job_id, user = self.cluster.setup_for_node_gpus_allocated(
            self.cluster.gpu_info["gpu_partition"],
            self.cluster.gpu_info["gpu_per_node"],
            node_name=node_name,
        )
        node = self.cluster.job_nodes(job_id)[0]
        self._cleanup_state = {"jobs": [(user, job_id)]}
        response = self.get_component_response(
            f"/slurm/v{self.api_version}/node/{node}"
        )
        self.dump_component_response("slurm-node-with-gpus-allocated", response)

    def _crawl_node_gpus_mixed_with_model(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-mixed-with-model",
                self.cluster.name,
            )
            return
        nodes_with_model = self.cluster.find_gpu_nodes_with_model(
            self.cluster.gpu_info["gpu_partition"]
        )
        if not nodes_with_model:
            logger.warning(
                "Cluster %s has no GPU nodes with model, "
                "skipping node-gpus-mixed-with-model",
                self.cluster.name,
            )
            return
        node_name = nodes_with_model[0]
        job_id, user = self.cluster.setup_for_node_gpus_mixed(
            self.cluster.gpu_info["gpu_partition"],
            node_name=node_name,
        )
        node = self.cluster.job_nodes(job_id)[0]
        self._cleanup_state = {"jobs": [(user, job_id)]}
        response = self.get_component_response(
            f"/slurm/v{self.api_version}/node/{node}"
        )
        # Ensure mixed state is set
        if "MIXED" not in response.json()["nodes"][0]["state"]:
            logger.warning(
                "Node %s is not in mixed state, skipping node-gpus-mixed-with-model",
                node,
            )
            return
        self.dump_component_response("slurm-node-with-gpus-model-mixed", response)

    def _crawl_node_gpus_mixed_without_model(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-mixed-without-model",
                self.cluster.name,
            )
            return
        nodes_without_model = self.cluster.find_gpu_nodes_without_model(
            self.cluster.gpu_info["gpu_partition"]
        )
        if not nodes_without_model:
            logger.warning(
                "Cluster %s has no GPU nodes without model, "
                "skipping node-gpus-mixed-without-model",
                self.cluster.name,
            )
            return
        node_name = nodes_without_model[0]
        job_id, user = self.cluster.setup_for_node_gpus_mixed(
            self.cluster.gpu_info["gpu_partition"],
            node_name=node_name,
        )
        node = self.cluster.job_nodes(job_id)[0]
        self._cleanup_state = {"jobs": [(user, job_id)]}
        response = self.get_component_response(
            f"/slurm/v{self.api_version}/node/{node}"
        )
        # Ensure mixed state is set
        if "MIXED" not in response.json()["nodes"][0]["state"]:
            logger.warning(
                "Node %s is not in mixed state, skipping node-gpus-mixed-without-model",
                node,
            )
            return
        self.dump_component_response("slurm-node-with-gpus-mixed", response)

    def _crawl_node_gpus_idle_with_model(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-idle-with-model",
                self.cluster.name,
            )
            return
        nodes_with_model = self.cluster.find_gpu_nodes_with_model(
            self.cluster.gpu_info["gpu_partition"]
        )
        if not nodes_with_model:
            logger.warning(
                "Cluster %s has no GPU nodes with model, "
                "skipping node-gpus-idle-with-model",
                self.cluster.name,
            )
            return
        node_name = nodes_with_model[0]
        node, job_id, user = self.cluster.setup_for_node_gpus_idle(
            self.cluster.gpu_info["gpu_partition"],
            node_name=node_name,
        )
        self._cleanup_state = {"jobs": [(user, job_id)], "gpu_node": node}
        response = self.get_component_response(
            f"/slurm/v{self.api_version}/node/{node}"
        )
        self.dump_component_response("slurm-node-with-gpus-model-idle", response)

    def _crawl_node_gpus_idle_without_model(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-gpus-idle-without-model",
                self.cluster.name,
            )
            return
        nodes_without_model = self.cluster.find_gpu_nodes_without_model(
            self.cluster.gpu_info["gpu_partition"]
        )
        if not nodes_without_model:
            logger.warning(
                "Cluster %s has no GPU nodes without model, "
                "skipping node-gpus-idle-without-model",
                self.cluster.name,
            )
            return
        node_name = nodes_without_model[0]
        node, job_id, user = self.cluster.setup_for_node_gpus_idle(
            self.cluster.gpu_info["gpu_partition"],
            node_name=node_name,
        )
        self._cleanup_state = {"jobs": [(user, job_id)], "gpu_node": node}
        response = self.get_component_response(
            f"/slurm/v{self.api_version}/node/{node}"
        )
        self.dump_component_response("slurm-node-with-gpus-idle", response)

    def _crawl_node_without_gpu(self):
        if not self.cluster.has_gpu():
            logger.warning(
                "Cluster %s has no GPU, skipping node-without-gpu", self.cluster.name
            )
            return
        nodes_json = self.cluster.query_slurmrestd_json(
            f"/slurm/v{self.api_version}/nodes"
        )
        for _node in nodes_json["nodes"]:
            if not len(_node.get("gres", "")):
                node = _node["name"]
                break

        self.dump_component_query(
            f"/slurm/v{self.api_version}/node/{node}",
            "slurm-node-without-gpu",
        )

    def _crawl_partitions(self):
        # Download partitions
        self.dump_component_query(
            f"/slurm/v{self.api_version}/partitions",
            "slurm-partitions",
        )

    def _crawl_qos(self):
        # Download qos
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/qos",
            "slurm-qos",
        )

    def _crawl_accounts(self):
        # Download accounts
        self.dump_component_query(
            f"/slurmdb/v{self.api_version}/accounts",
            "slurm-accounts",
        )

    def _crawl_reservations(self):
        self._cleanup_state = self.cluster.setup_for_reservations()
        # Download reservations
        self.dump_component_query(
            f"/slurm/v{self.api_version}/reservations",
            "slurm-reservations",
        )
