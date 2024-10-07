# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

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

    def ctldjob(self, job_id: int, **kwargs):
        return self._request(
            f"/slurm/v{self.api_version}/job/{job_id}", "jobs", **kwargs
        )

    def acctjob(self, job_id: int, **kwargs):
        return self._request(
            f"/slurmdb/v{self.api_version}/job/{job_id}", "jobs", **kwargs
        )

    def nodes(self, **kwargs):
        return self._request(f"/slurm/v{self.api_version}/nodes", "nodes", **kwargs)

    def node(self, node_name: str, **kwargs):
        return self._request(
            f"/slurm/v{self.api_version}/node/{node_name}", "nodes", **kwargs
        )

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
