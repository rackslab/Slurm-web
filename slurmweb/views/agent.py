# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from typing import Callable, List, Any, Tuple
import logging

from flask import Response, current_app, jsonify, abort, request
from rfl.web.tokens import rbac_action, check_jwt

from ..version import get_version
from ..errors import SlurmwebCacheError

from ..slurmrestd.errors import (
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestConnectionError,
    SlurmrestdInternalError,
)

# Tuple used for comparaison with Slurm version retrieved from slurmrestd and
# check for minimal supported version.
MINIMAL_SLURM_VERSION = (23, 2, 0)

logger = logging.getLogger(__name__)


def version():
    return Response(f"Slurm-web agent v{get_version()}\n", mimetype="text/plain")


def info():
    data = {
        "cluster": current_app.settings.service.cluster,
        "infrastructure": current_app.settings.racksdb.infrastructure,
    }
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


def slurmrest(
    method: str, args: Tuple[Any] = (), raise_errors=False, ignore_notfound=False
):
    try:
        return getattr(current_app.slurmrestd, method)(
            *args, ignore_notfound=ignore_notfound
        )
    except SlurmrestdNotFoundError as err:
        msg = f"URL not found on slurmrestd: {err}"
        logger.error(msg)
        abort(404, msg)
    except SlurmrestdInvalidResponseError as err:
        msg = f"Invalid response from slurmrestd: {err}"
        logger.error(msg)
        abort(500, msg)
    except SlurmrestConnectionError as err:
        msg = f"Unable to connect to slurmrestd: {err}"
        logger.error(msg)
        abort(500, msg)
    except SlurmrestdInternalError as err:
        if raise_errors:
            raise err
        else:
            msg = f"slurmrestd error: {err.description} ({err.source})"
            if err.error != -1:
                msg += f" [{err.message}/{err.error}]"
            logger.error(msg)
            abort(500, msg)


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


def _cached_version():
    return _cached_data(
        "version",
        current_app.settings.cache.version,
        slurmrest,
        "version",
    )


def _cached_jobs():
    return _cached_data(
        "jobs",
        current_app.settings.cache.jobs,
        slurmrest,
        "jobs",
    )


def _get_job(job):
    try:
        result = slurmrest(
            "acctjob",
            (job,),
        )[0]
    except IndexError:
        abort(404, f"Job {job} not found")
    # try to enrich result with additional fields from slurmctld
    try:
        result.update(
            slurmrest(
                "ctldjob",
                (job,),
                True,
                True,
            )[0]
        )
    except SlurmrestdInternalError as err:
        if err.error != 2017:
            msg = f"slurmrestd error: {err.description} ({err.source})"
            if err.error != -1:
                msg += f" [{err.message}/{err.error}]"
            logger.error(msg)
            abort(500, msg)
        # pass the error, the job is just not available in ctld queue
    return result


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
        slurmrest,
        "nodes",
    )


def _cached_node(name):
    return _cached_data(
        f"node-{name}",
        current_app.settings.cache.node,
        slurmrest,
        "node",
        (name,),
    )


def _cached_partitions():
    return _cached_data(
        "partitions",
        current_app.settings.cache.partitions,
        slurmrest,
        "partitions",
    )


def _cached_qos():
    return _cached_data(
        "qos",
        current_app.settings.cache.qos,
        slurmrest,
        "qos",
    )


def _cached_reservations():
    return _cached_data(
        "reservations",
        current_app.settings.cache.reservations,
        slurmrest,
        "reservations",
    )


def _cached_accounts():
    return _cached_data(
        "accounts",
        current_app.settings.cache.accounts,
        slurmrest,
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
