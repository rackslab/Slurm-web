# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import typing as t
from pathlib import Path
import logging

import requests
import ClusterShell

from .unix import SlurmrestdUnixAdapter
from .errors import (
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestConnectionError,
    SlurmrestdInternalError,
)

logger = logging.getLogger(__name__)

if t.TYPE_CHECKING:
    from rfl.settings import RuntimeSettings
    from ..cache import CachingService


class Slurmrestd:

    def __init__(self, socket: Path, version: str):
        self.session = requests.Session()
        self.prefix = "http+unix://slurmrestd/"
        self.session.mount(self.prefix, SlurmrestdUnixAdapter(socket))
        self.api_version = version

    def _validate_response(self, response, ignore_notfound) -> None:
        """Validate slurmrestd response or abort agent resquest with error."""
        self._validate_status(response, ignore_notfound)
        self._validate_json(response)

    def _validate_status(self, response, ignore_notfound) -> None:
        """Check response status code is not HTTP/404 or abort"""
        if ignore_notfound:
            return
        if response.status_code != 404:
            return
        raise SlurmrestdNotFoundError(response.url)

    def _validate_json(self, response) -> None:
        """Check json reponse or abort with HTTP/500"""
        content_type = response.headers.get("content-type")
        if content_type != "application/json":
            logger.debug(
                "slurmrestd query %s response: %s", response.url, response.text
            )
            raise SlurmrestdInvalidResponseError(
                f"Unsupported Content-Type for slurmrestd response {response.url}: "
                f"{content_type}"
            )

    def _request(self, query, key, ignore_notfound=False):
        try:
            response = self.session.get(f"{self.prefix}/{query}")
        except requests.exceptions.ConnectionError as err:
            raise SlurmrestConnectionError(str(err))

        self._validate_response(response, ignore_notfound)

        result = response.json()
        if len(result["errors"]):
            error = result["errors"][0]
            raise SlurmrestdInternalError(
                error.get("error", "slurmrestd undefined error"),
                error.get("error_number", -1),
                error["description"],
                error["source"],
            )
        if "warnings" not in result:
            logger.error(
                "Unable to extract warnings from slurmrestd response to %s, unsupported "
                "Slurm version?",
                query,
            )
        elif len(result["warnings"]):
            logger.warning(
                "slurmrestd query %s warnings: %s", query, result["warnings"]
            )
        return result[key]

    def version(self, **kwargs):
        return self._request(f"/slurm/v{self.api_version}/ping", "meta", **kwargs)[
            "slurm"
        ]

    def jobs(self, **kwargs):
        return self._request(f"/slurm/v{self.api_version}/jobs", "jobs", **kwargs)

    def jobs_by_node(self, node: str):
        """Select jobs not completed which are allocated the given node."""

        def on_node(job):
            if job["nodes"] == "":
                return False
            return node in ClusterShell.NodeSet.NodeSet(job["nodes"])

        return [
            job
            for job in self.jobs()
            if on_node(job) and "COMPLETED" not in job["job_state"]
        ]

    def jobs_states(self):
        jobs = {
            "running": 0,
            "completed": 0,
            "completing": 0,
            "cancelled": 0,
            "pending": 0,
            "unknown": 0,
        }
        total = 0
        for job in self.jobs():
            if "RUNNING" in job["job_state"]:
                jobs["running"] += 1
            elif "COMPLETED" in job["job_state"]:
                jobs["completed"] += 1
            elif "COMPLETING" in job["job_state"]:
                jobs["completing"] += 1
            elif "CANCELLED" in job["job_state"]:
                jobs["cancelled"] += 1
            elif "PENDING" in job["job_state"]:
                jobs["pending"] += 1
            else:
                jobs["unknown"] += 1
            total += 1
        return jobs, total

    def _ctldjob(self, job_id: int, **kwargs):
        return self._request(
            f"/slurm/v{self.api_version}/job/{job_id}", "jobs", **kwargs
        )[0]

    def _acctjob(self, job_id: int, **kwargs):
        return self._request(
            f"/slurmdb/v{self.api_version}/job/{job_id}", "jobs", **kwargs
        )[0]

    def nodes(self, **kwargs):
        return self._request(f"/slurm/v{self.api_version}/nodes", "nodes", **kwargs)

    def nodes_cores_states(self):
        nodes_states = {
            "idle": 0,
            "mixed": 0,
            "allocated": 0,
            "down": 0,
            "drain": 0,
            "unknown": 0,
        }
        cores_states = {
            "idle": 0,
            "allocated": 0,
            "down": 0,
            "drain": 0,
            "unknown": 0,
        }
        nodes_total = 0
        cores_total = 0
        for node in self.nodes():
            cores = node["cpus"]
            if "MIXED" in node["state"]:
                nodes_states["mixed"] += 1
                # Look at number of actually allocated/idle cores
                cores_states["allocated"] += node["alloc_cpus"]
                cores_states["idle"] += node["alloc_idle_cpus"]
            elif "ALLOCATED" in node["state"]:
                nodes_states["allocated"] += 1
                cores_states["allocated"] += cores
            elif "DOWN" in node["state"]:
                nodes_states["down"] += 1
                cores_states["down"] += cores
            elif "DRAIN" in node["state"]:
                nodes_states["drain"] += 1
                cores_states["drain"] += cores
            elif "IDLE" in node["state"]:
                nodes_states["idle"] += 1
                cores_states["idle"] += cores
            else:
                nodes_states["unknown"] += 1
                cores_states["unknown"] += cores
            nodes_total += 1
            cores_total += cores
        return nodes_states, cores_states, nodes_total, cores_total

    def node(self, node_name: str, **kwargs):
        try:
            return self._request(
                f"/slurm/v{self.api_version}/node/{node_name}", "nodes", **kwargs
            )[0]
        except SlurmrestdInternalError as err:
            if err.description.startswith("Failure to query node "):
                raise SlurmrestdNotFoundError(f"Node {node_name} not found")
            raise err

    def partitions(self, **kwargs):
        return self._request(
            f"/slurm/v{self.api_version}/partitions", "partitions", **kwargs
        )

    def accounts(self, **kwargs):
        return self._request(
            f"/slurmdb/v{self.api_version}/accounts", "accounts", **kwargs
        )

    def reservations(self: str, **kwargs):
        return self._request(
            f"/slurm/v{self.api_version}/reservations", "reservations", **kwargs
        )

    def qos(self: str, **kwargs):
        return self._request(f"/slurmdb/v{self.api_version}/qos", "qos", **kwargs)


class SlurmrestdFiltered(Slurmrestd):

    def __init__(self, socket: Path, version: str, filters: "RuntimeSettings"):
        super().__init__(socket, version)
        self.filters = filters

    @staticmethod
    def filter_item_fields(item: t.Dict, selection: t.Optional[t.List[str]]):
        for key in list(item.keys()):
            if key not in selection:
                del item[key]

    @staticmethod
    def filter_fields(
        items: t.Union[t.List, t.Dict],
        selection: t.Optional[t.List[str]],
    ):
        if selection is not None:
            if isinstance(items, list):
                for item in items:
                    SlurmrestdFiltered.filter_item_fields(item, selection)
            else:
                SlurmrestdFiltered.filter_item_fields(items, selection)
        return items

    def jobs(self):
        return SlurmrestdFiltered.filter_fields(super().jobs(), self.filters.jobs)

    def _ctldjob(self, job_id: int, **kwargs):
        return SlurmrestdFiltered.filter_fields(
            super()._ctldjob(job_id, **kwargs), self.filters.ctldjob
        )

    def _acctjob(self, job_id: int, **kwargs):
        return SlurmrestdFiltered.filter_fields(
            super()._acctjob(job_id, **kwargs), self.filters.acctjob
        )

    def job(self, job_id: int):
        try:
            result = self._acctjob(job_id)
        except IndexError:
            raise SlurmrestdNotFoundError(f"Job {job_id} not found")
        # try to enrich result with additional fields from slurmctld
        try:
            result.update(self._ctldjob(job_id, ignore_notfound=True))
        except SlurmrestdInternalError as err:
            if err.error != 2017:
                raise err
            # pass the error, the job is just not available in ctld queue
        return result

    def nodes(self):
        return SlurmrestdFiltered.filter_fields(super().nodes(), self.filters.nodes)

    def node(self, node_name: str):
        return SlurmrestdFiltered.filter_fields(
            super().node(node_name), self.filters.node
        )

    def partitions(self):
        return SlurmrestdFiltered.filter_fields(
            super().partitions(), self.filters.partitions
        )

    def accounts(self):
        return SlurmrestdFiltered.filter_fields(
            super().accounts(), self.filters.accounts
        )

    def reservations(self: str):
        return SlurmrestdFiltered.filter_fields(
            super().reservations(), self.filters.reservations
        )

    def qos(self: str):
        return SlurmrestdFiltered.filter_fields(super().qos(), self.filters.qos)


class SlurmrestdFilteredCached(SlurmrestdFiltered):

    def __init__(
        self,
        socket: Path,
        version: str,
        filters: "RuntimeSettings",
        cache: "RuntimeSettings",
        service: "CachingService",
    ):
        super().__init__(socket, version, filters)
        self.cache = cache
        self.service = service

    def _cached(
        self,
        cache_key: str,
        expiration: int,
        func: t.Callable,
        *args: t.Tuple[t.Any, ...],
        **kwargs: t.Dict[str, t.Any],
    ) -> t.Any:
        if not self.cache.enabled:
            return func(*args, **kwargs)
        data = self.service.get(cache_key)
        if data is None:
            data = func(*args, **kwargs)
            self.service.put(cache_key, data, expiration)
        return data

    def jobs(self):
        return self._cached("jobs", self.cache.jobs, super().jobs)

    def job(self, job_id: int):
        return self._cached(f"job-{job_id}", self.cache.job, super().job, job_id)

    def nodes(self):
        return self._cached("nodes", self.cache.nodes, super().nodes)

    def node(self, node_name: str):
        return self._cached(
            f"node-{node_name}", self.cache.node, super().node, node_name
        )

    def partitions(self):
        return self._cached("partitions", self.cache.partitions, super().partitions)

    def accounts(self):
        return self._cached("accounts", self.cache.accounts, super().accounts)

    def reservations(self: str):
        return self._cached(
            "reservations", self.cache.reservations, super().reservations
        )

    def qos(self: str):
        return self._cached("qos", self.cache.qos, super().qos)
