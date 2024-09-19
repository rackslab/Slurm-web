# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from typing import Union, Callable, List, Any, Dict
import logging

from flask import Response, current_app, jsonify, abort, request
import requests
from rfl.web.tokens import rbac_action, check_jwt

from ..version import get_version
from ..errors import SlurmwebCacheError, SlurmwebRestdError
from . import SlurmrestdUnixAdapter

# Tuple used for comparaison with Slurm version retrieved from slurmrestd and
# check for minimal supported version.
MINIMAL_SLURM_VERSION = (23, 2, 0)

logger = logging.getLogger(__name__)


def version():
    return Response(f"Slurm-web agent v{get_version()}\n", mimetype="text/plain")


def info():
    data = {"cluster": current_app.settings.service.cluster}
    return jsonify(data)


@check_jwt
def permissions():
    roles, actions = current_app.policy.roles_actions(request.user)
    return jsonify(
        {
            "roles": list(roles),
            "actions": list(actions),
        }
    )


def _validate_slurmrestd_response(response, ignore_notfound) -> None:
    """Validate slurmrestd response or abort agent resquest with error."""
    _validate_slurmrestd_status(response, ignore_notfound)
    _validate_slurmrestd_json(response)


def _validate_slurmrestd_status(response, ignore_notfound) -> None:
    """Check response status code is not HTTP/404 or abort"""
    if ignore_notfound:
        return
    if response.status_code != 404:
        return
    error = f"URL not found on slurmrestd: {response.url}"
    logger.error(error)
    abort(404, error)


def _validate_slurmrestd_json(response) -> None:
    """Check json reponse or abort with HTTP/500"""
    content_type = response.headers.get("content-type")
    if content_type != "application/json":
        error = (
            f"Unsupported Content-Type for slurmrestd response {response.url}: "
            f"{content_type}"
        )
        logger.error(error)
        logger.debug("slurmrestd query %s response: %s", response.url, response.text)
        abort(500, error)


def slurmrest(query, key, raise_errors=False, ignore_notfound=False):
    session = requests.Session()
    prefix = "http+unix://slurmrestd/"
    session.mount(prefix, SlurmrestdUnixAdapter(current_app.settings.slurmrestd.socket))
    try:
        response = session.get(f"{prefix}/{query}")
    except requests.exceptions.ConnectionError as err:
        logger.error("Unable to connect to slurmrestd: %s", err)
        abort(500, f"Unable to connect to slurmrestd: {err}")

    _validate_slurmrestd_response(response, ignore_notfound)

    result = response.json()
    if len(result["errors"]):
        if raise_errors:
            error = result["errors"][0]
            raise SlurmwebRestdError(
                error["error"],
                error["error_number"],
                error["description"],
                error["source"],
            )
        else:
            logger.error("slurmrestd query %s errors: %s", query, result["errors"])
            abort(500, f"slurmrestd errors: {str(result['errors'])}")
    if "warnings" not in result:
        logger.error(
            "Unable to extract warnings from slurmrestd response to %s, unsupported "
            "Slurm version?",
            query,
        )
    elif len(result["warnings"]):
        logger.warning("slurmrestd query %s warnings: %s", query, result["warnings"])
    return result[key]


def filter_item_fields(item: Dict, selection: Union[List[str]]):
    for key in list(item.keys()):
        if key not in selection:
            del item[key]


def filter_fields(selection: Union[List[str], None], func: Callable, *args: List[Any]):
    items = func(*args)
    if selection is not None:
        if isinstance(items, list):
            for item in items:
                filter_item_fields(item, selection)
        else:
            filter_item_fields(items, selection)
    return items


def _cached_data(cache_key: str, expiration: int, func: Callable, *args: List[Any]):
    if not current_app.settings.cache.enabled:
        return func(*args)
    try:
        data = current_app.cache.get(cache_key)
        if data is None:
            data = func(*args)
            current_app.cache.put(cache_key, data, expiration)
        return data
    except SlurmwebCacheError as err:
        logger.error("Cache error: %s", str(err))
        abort(500, f"Cache error: {str(err)}")


def _get_version():
    return slurmrest(f"/slurm/v{current_app.settings.slurmrestd.version}/ping", "meta")[
        "Slurm"
    ]


def _cached_version():
    return _cached_data(
        "version",
        current_app.settings.cache.version,
        _get_version,
    )


def _cached_jobs():
    return _cached_data(
        "jobs",
        current_app.settings.cache.jobs,
        filter_fields,
        current_app.settings.filters.jobs,
        slurmrest,
        f"/slurm/v{current_app.settings.slurmrestd.version}/jobs",
        "jobs",
    )


def _get_job(job):
    try:
        result = filter_fields(
            current_app.settings.filters.acctjob,
            slurmrest,
            f"/slurmdb/v{current_app.settings.slurmrestd.version}/job/{job}",
            "jobs",
        )[0]
    except IndexError:
        abort(404, f"Job {job} not found")
    # try to enrich result with additional fields from slurmctld
    query = f"/slurm/v{current_app.settings.slurmrestd.version}/job/{job}"
    try:
        result.update(
            filter_fields(
                current_app.settings.filters.ctldjob,
                slurmrest,
                query,
                "jobs",
                True,
                True,
            )[0]
        )
    except SlurmwebRestdError as err:
        if err.error != 2017:
            logger.error("slurmrestd query %s errors: %s", query, err)
            abort(500, f"slurmrestd errors: {str(err)}")
        # pass the error, the job is just not available in ctld queue
    return result


def _get_node(name):
    try:
        return filter_fields(
            current_app.settings.filters.node,
            slurmrest,
            f"/slurm/v{current_app.settings.slurmrestd.version}/node/{name}",
            "nodes",
        )[0]
    except IndexError:
        abort(404, f"Node {name} not found")


def _cached_job(job):
    return _cached_data(
        f"job-{job}",
        current_app.settings.cache.job,
        _get_job,
        job,
    )


def _cached_nodes():
    return _cached_data(
        "nodes",
        current_app.settings.cache.nodes,
        filter_fields,
        current_app.settings.filters.nodes,
        slurmrest,
        f"/slurm/v{current_app.settings.slurmrestd.version}/nodes",
        "nodes",
    )


def _cached_node(name):
    return _cached_data(
        f"node-{name}",
        current_app.settings.cache.node,
        _get_node,
        name,
    )


def _cached_partitions():
    return _cached_data(
        "partitions",
        current_app.settings.cache.partitions,
        filter_fields,
        current_app.settings.filters.partitions,
        slurmrest,
        f"/slurm/v{current_app.settings.slurmrestd.version}/partitions",
        "partitions",
    )


def _cached_qos():
    return _cached_data(
        "qos",
        current_app.settings.cache.qos,
        filter_fields,
        current_app.settings.filters.qos,
        slurmrest,
        f"/slurmdb/v{current_app.settings.slurmrestd.version}/qos",
        "qos",
    )


def _cached_reservations():
    return _cached_data(
        "reservations",
        current_app.settings.cache.reservations,
        filter_fields,
        current_app.settings.filters.reservations,
        slurmrest,
        f"/slurm/v{current_app.settings.slurmrestd.version}/reservations",
        "reservations",
    )


def _cached_accounts():
    return _cached_data(
        "accounts",
        current_app.settings.cache.accounts,
        filter_fields,
        current_app.settings.filters.accounts,
        slurmrest,
        f"/slurmdb/v{current_app.settings.slurmrestd.version}/accounts",
        "accounts",
    )


@rbac_action("view-stats")
def stats():
    total = 0
    running = 0

    version = _cached_version()

    # Check Slurm version is supported or fail with HTTP/500
    if (
        not (
            version["version"]["major"],
            version["version"]["minor"],
            version["version"]["micro"],
        )
        >= MINIMAL_SLURM_VERSION
    ):
        error = f"Unsupported Slurm version {version['release']}"
        logger.error(error)
        abort(500, error)

    for job in _cached_jobs():
        total += 1
        if "RUNNING" in job["job_state"]:
            running += 1

    nodes = 0
    cores = 0
    for node in _cached_nodes():
        nodes += 1
        cores += node["cpus"]
    return jsonify(
        {
            "version": version["release"],
            "resources": {"nodes": nodes, "cores": cores},
            "jobs": {"running": running, "total": total},
        }
    )


@rbac_action("view-jobs")
def jobs():
    return jsonify(_cached_jobs())


@rbac_action("view-jobs")
def job(job: int):
    return jsonify(_cached_job(job))


@rbac_action("view-nodes")
def nodes():
    return jsonify(_cached_nodes())


@rbac_action("view-nodes")
def node(name: str):
    return jsonify(_cached_node(name))


@rbac_action("view-partitions")
def partitions():
    return jsonify(_cached_partitions())


@rbac_action("view-qos")
def qos():
    return jsonify(_cached_qos())


@rbac_action("view-reservations")
def reservations():
    return jsonify(_cached_reservations())


@rbac_action("view-accounts")
def accounts():
    return jsonify(_cached_accounts())
