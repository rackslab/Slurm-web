# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
import urllib
import logging

import requests
import ClusterShell

from .unix import SlurmrestdUnixAdapter
from .auth import SlurmrestdAuthentifier
from ..cache import CacheKey
from .errors import (
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestConnectionError,
    SlurmrestdAuthenticationError,
    SlurmrestdInternalError,
)
from ..errors import SlurmwebConfigurationError

logger = logging.getLogger(__name__)

if t.TYPE_CHECKING:
    from rfl.settings import RuntimeSettings
    from ..cache import CachingService


class Slurmrestd:
    def __init__(
        self,
        uri: urllib.parse.ParseResult,
        auth: SlurmrestdAuthentifier,
        version: str,
    ):
        self.session = requests.Session()

        # When using local authenciation, ensure slurmrestd URI is a Unix socket. For
        # authentication on TCP/IP socket, JWT authentication is required.
        if auth.method == "local" and uri.scheme != "unix":
            raise SlurmwebConfigurationError(
                "slurmrestd local authentication is only supported with unix socket URI"
            )

        if uri.scheme == "unix":
            self.prefix = "http+unix://slurmrestd"
            self.session.mount(self.prefix, SlurmrestdUnixAdapter(uri.path))
        else:
            self.prefix = uri.geturl()
        self.api_version = version

        self.auth = auth

    def _validate_response(self, response, ignore_notfound: bool) -> None:
        """Validate slurmrestd response or abort agent resquest with error."""
        self._validate_status(response, ignore_notfound)
        self._validate_json(response)

    def _validate_status(self, response, ignore_notfound: bool) -> None:
        """Check response status code. When HTTP/401, raise
        SlurmrestdAuthenticationError. When HTTP/404 and ignore_notfound is False, raise
        SlurmrestdNotFoundError."""
        # FIXME: There is a regression in Slurm 25.11.0 which return HTTP/500 in this
        # case, see https://support.schedmd.com/show_bug.cgi?id=24052 for details.
        # This is a temporary workaround to accept both HTTP/401 and HTTP/500.
        if response.status_code == 401 or (
            response.status_code == 500
            and response.text.strip() == "Authentication does not apply to request"
        ):
            raise SlurmrestdAuthenticationError(response.url)
        if not ignore_notfound and response.status_code == 404:
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
            response = self.session.get(
                f"{self.prefix}{query}", headers=self.auth.headers()
            )
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
                "Unable to extract warnings from slurmrestd response to %s, "
                "unsupported Slurm version?",
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
            """Return True if job is allocated this node."""
            if job["nodes"] == "":
                return False
            return node in ClusterShell.NodeSet.NodeSet(job["nodes"])

        def terminated(job):
            """Return True if job is terminated."""
            for terminated_state in ["COMPLETED", "FAILED", "TIMEOUT"]:
                if terminated_state in job["job_state"]:
                    return True
            return False

        return [job for job in self.jobs() if on_node(job) and not terminated(job)]

    def jobs_states(self):
        # All Slurm jobs base states. Jobs can have only one of them.
        jobs = {
            "running": 0,
            "pending": 0,
            "completing": 0,
            "completed": 0,
            "cancelled": 0,
            "suspended": 0,
            "preempted": 0,
            "failed": 0,
            "timeout": 0,
            "node_fail": 0,
            "boot_fail": 0,
            "deadline": 0,
            "out_of_memory": 0,
            "unknown": 0,
        }
        total = 0
        for job in self.jobs():
            state_found = False
            for state in jobs.keys():
                if state.upper() in job["job_state"]:
                    jobs[state] += 1
                    state_found = True
                    break
            if not state_found:
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

    def resources_states(self):
        # All Slurm nodes base states and some interesting flags such as drain and fail.
        nodes_states = {
            "idle": 0,
            "mixed": 0,
            "allocated": 0,
            "drain": 0,
            "down": 0,
            "error": 0,
            "fail": 0,
            "unknown": 0,
        }
        cores_states = {
            "idle": 0,
            "mixed": 0,
            "allocated": 0,
            "drain": 0,
            "down": 0,
            "error": 0,
            "fail": 0,
            "unknown": 0,
        }
        gpus_states = {
            "idle": 0,
            "mixed": 0,
            "allocated": 0,
            "drain": 0,
            "down": 0,
            "error": 0,
            "fail": 0,
            "unknown": 0,
        }
        nodes_total = 0
        cores_total = 0
        gpus_total = 0
        for node in self.nodes():
            cores = node["cpus"]
            node_gpus = self.node_gres_extract_gpus(node["gres"])
            if "ERROR" in node["state"]:
                nodes_states["error"] += 1
                cores_states["error"] += cores
                gpus_states["error"] += node_gpus
            elif "FAIL" in node["state"]:
                nodes_states["fail"] += 1
                cores_states["fail"] += cores
                gpus_states["fail"] += node_gpus
            elif "MIXED" in node["state"]:
                nodes_states["mixed"] += 1
                # Look at number of actually allocated/idle cores
                cores_states["allocated"] += node["alloc_cpus"]
                cores_states["idle"] += node["alloc_idle_cpus"]
                allocated_gpus = self.node_gres_extract_gpus(node["gres_used"])
                gpus_states["allocated"] += allocated_gpus
                gpus_states["idle"] += node_gpus - allocated_gpus
            elif "ALLOCATED" in node["state"]:
                nodes_states["allocated"] += 1
                cores_states["allocated"] += cores
                allocated_gpus = self.node_gres_extract_gpus(node["gres_used"])
                gpus_states["allocated"] += allocated_gpus
                gpus_states["idle"] += node_gpus - allocated_gpus
            elif "DOWN" in node["state"]:
                nodes_states["down"] += 1
                cores_states["down"] += cores
                gpus_states["down"] += node_gpus
            elif "DRAIN" in node["state"]:
                nodes_states["drain"] += 1
                cores_states["drain"] += cores
                gpus_states["drain"] += node_gpus
            elif "IDLE" in node["state"]:
                nodes_states["idle"] += 1
                cores_states["idle"] += cores
                gpus_states["idle"] += node_gpus
            else:
                nodes_states["unknown"] += 1
                cores_states["unknown"] += cores
                gpus_states["unknown"] += node_gpus
            nodes_total += 1
            cores_total += cores
            gpus_total += node_gpus
        return (
            nodes_states,
            cores_states,
            gpus_states,
            nodes_total,
            cores_total,
            gpus_total,
        )

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

    @staticmethod
    def node_gres_extract_gpus(gres_full: str) -> int:
        """Return the number of GPU in gres string."""
        result = 0
        for gres_s in gres_full.split(","):
            if not len(gres_s):
                continue
            # Remove index if present
            gres_s = gres_s.split("(")[0]
            gres = gres_s.split(":")
            if gres[0] == "gpu":
                result += int(gres.pop())
        return result


class SlurmrestdFiltered(Slurmrestd):
    def __init__(
        self,
        uri: urllib.parse.ParseResult,
        auth: SlurmrestdAuthentifier,
        version: str,
        filters: "RuntimeSettings",
    ):
        super().__init__(uri, auth, version)
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
        uri: urllib.parse.ParseResult,
        auth: SlurmrestdAuthentifier,
        version: str,
        filters: "RuntimeSettings",
        cache: "RuntimeSettings",
        service: "CachingService",
    ):
        super().__init__(uri, auth, version, filters)
        self.cache = cache
        self.service = service

    def _cached(
        self,
        key: "CacheKey",
        expiration: int,
        func: t.Callable,
        *args: t.Tuple[t.Any, ...],
        **kwargs: t.Dict[str, t.Any],
    ) -> t.Any:
        if not self.cache.enabled:
            return func(*args, **kwargs)
        data = self.service.get(key)
        if data is None:
            data = func(*args, **kwargs)
            self.service.put(key, data, expiration)
            self.service.count_miss(key)
        else:
            self.service.count_hit(key)
        return data

    def jobs(self):
        return self._cached(CacheKey("jobs"), self.cache.jobs, super().jobs)

    def job(self, job_id: int):
        return self._cached(
            CacheKey(f"job-{job_id}", "individual-job"),
            self.cache.job,
            super().job,
            job_id,
        )

    def nodes(self):
        return self._cached(CacheKey("nodes"), self.cache.nodes, super().nodes)

    def node(self, node_name: str):
        return self._cached(
            CacheKey(f"node-{node_name}", "individual-node"),
            self.cache.node,
            super().node,
            node_name,
        )

    def partitions(self):
        return self._cached(
            CacheKey("partitions"), self.cache.partitions, super().partitions
        )

    def accounts(self):
        return self._cached(CacheKey("accounts"), self.cache.accounts, super().accounts)

    def reservations(self: str):
        return self._cached(
            CacheKey("reservations"), self.cache.reservations, super().reservations
        )

    def qos(self: str):
        return self._cached(CacheKey("qos"), self.cache.qos, super().qos)
