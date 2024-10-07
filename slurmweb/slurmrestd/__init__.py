# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import typing as t
from pathlib import Path
import logging

import requests

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
            "Slurm"
        ]

    def jobs(self, **kwargs):
        return self._request(f"/slurm/v{self.api_version}/jobs", "jobs", **kwargs)

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
