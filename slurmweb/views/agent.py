# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from typing import Any, Tuple
import logging

from flask import Response, current_app, jsonify, abort, request
from rfl.web.tokens import rbac_action, check_jwt

try:
    from racksdb.version import get_version as racksdb_get_version
except ModuleNotFoundError:
    # RacksDB is optional, provide fallback if not installed
    def racksdb_get_version():
        return "N/A (not installed)"


from ..version import get_version
from ..errors import SlurmwebCacheError, SlurmwebMetricsDBError

from ..slurmrestd.errors import (
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestConnectionError,
    SlurmrestdAuthenticationError,
    SlurmrestdInternalError,
)


logger = logging.getLogger(__name__)


def version():
    return Response(f"Slurm-web agent v{get_version()}\n", mimetype="text/plain")


def info():
    data = {
        "cluster": current_app.settings.service.cluster,
        "metrics": current_app.settings.metrics.enabled,
        "cache": current_app.settings.cache.enabled,
        "racksdb": {
            "enabled": current_app.settings.racksdb.enabled,
            "infrastructure": current_app.settings.racksdb.infrastructure,
            "version": racksdb_get_version(),
        },
        "version": get_version(),
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


def handle_slurmrestd_errors(func):
    """Wrapper function to handle slurmrestd-related exceptions consistently.

    Handles all slurmrestd exceptions and converts them to appropriate HTTP
    error responses. Also handles SlurmwebCacheError for cache-related issues.
    """

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
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
        except SlurmrestdAuthenticationError as err:
            msg = f"Authentication error on slurmrestd: {err}"
            logger.error(msg)
            abort(401, msg)
        except SlurmrestdInternalError as err:
            msg = f"slurmrestd error: {err.description} ({err.source})"
            if err.error != -1:
                msg += f" [{err.message}/{err.error}]"
            logger.error(msg)
            abort(500, msg)
        except SlurmwebCacheError as err:
            msg = f"Cache error: {str(err)}"
            logger.error(msg)
            abort(500, msg)

    return wrapper


@handle_slurmrestd_errors
def ping():
    """Ping endpoint that discovers slurmrestd API version and returns it along with
    Slurm version information."""
    # Discover and save both API version and Slurm version
    _, slurm_version, api_version = current_app.slurmrestd.discover()

    return jsonify(
        {
            "versions": {
                "slurm": slurm_version,
                "api": api_version,
            },
        }
    )


@handle_slurmrestd_errors
def slurmrest(method: str, *args: Tuple[Any, ...]):
    return getattr(current_app.slurmrestd, method)(*args)


@rbac_action("view-stats")
def stats():
    total = 0
    running = 0

    for job in slurmrest("jobs"):
        total += 1
        if "RUNNING" in job["job_state"]:
            running += 1

    nodes = 0
    cores = 0
    memory = 0
    gpus = 0
    for node in slurmrest("nodes"):
        nodes += 1
        cores += node["cpus"]
        memory += node["real_memory"]
        gpus += current_app.slurmrestd.node_gres_extract_gpus(node["gres"])
    return jsonify(
        {
            "resources": {
                "nodes": nodes,
                "cores": cores,
                "memory": memory,
                "gpus": gpus,
            },
            "jobs": {"running": running, "total": total},
        }
    )


@rbac_action("view-jobs")
def jobs():
    node = request.args.get("node")
    if node:
        return jsonify(slurmrest("jobs_by_node", node))
    else:
        return jsonify(slurmrest("jobs"))


@rbac_action("view-jobs")
def job(job: int):
    return jsonify(slurmrest("job", job))


@rbac_action("view-nodes")
def nodes():
    return jsonify(slurmrest("nodes"))


@rbac_action("view-nodes")
def node(name: str):
    return jsonify(slurmrest("node", name))


@rbac_action("view-partitions")
def partitions():
    return jsonify(slurmrest("partitions"))


@rbac_action("view-qos")
def qos():
    return jsonify(slurmrest("qos"))


@rbac_action("view-reservations")
def reservations():
    return jsonify(slurmrest("reservations"))


@rbac_action("view-accounts")
def accounts():
    return jsonify(slurmrest("accounts"))


@rbac_action("associations-view")
def associations():
    return jsonify(slurmrest("associations"))


@rbac_action("cache-view")
def cache_stats():
    if current_app.cache is None:
        error = "Cache service is disabled, unable to query cache statistics"
        logger.warning(error)
        abort(501, error)
    (cache_hits, cache_misses, total_hits, total_misses) = current_app.cache.metrics()
    return jsonify(
        {
            "hit": {"keys": cache_hits, "total": total_hits},
            "miss": {"keys": cache_misses, "total": total_misses},
        }
    )


@rbac_action("cache-reset")
def cache_reset():
    if current_app.cache is None:
        error = "Cache service is disabled, unable to reset cache"
        logger.warning(error)
        abort(501, error)

    # Reset values in caching service
    current_app.cache.reset()

    # Return fresh values right after reset
    (cache_hits, cache_misses, total_hits, total_misses) = current_app.cache.metrics()
    return jsonify(
        {
            "hit": {"keys": cache_hits, "total": total_hits},
            "miss": {"keys": cache_misses, "total": total_misses},
        }
    )


@check_jwt
def metrics(metric):
    if current_app.metrics_db is None:
        error = "Metrics are disabled, unable to query values"
        logger.warning(error)
        abort(501, error)

    # Dictionnary of metrics and required policy actions associations
    metrics_policy_actions = {
        "nodes": "view-nodes",
        "cores": "view-nodes",
        "gpus": "view-nodes",
        "jobs": "view-jobs",
        "cache": "cache-view",
    }

    # Check metric is supported or send HTTP/404
    if metric not in metrics_policy_actions.keys():
        abort(404, f"Metric {metric} not found")

    # Check permission to request metric or send HTTP/403
    action = metrics_policy_actions[metric]
    if not current_app.policy.allowed_user_action(request.user, action):
        logger.warning(
            "Unauthorized access from user %s to %s metric (missing permission on %s)",
            request.user,
            metric,
            action,
        )
        abort(403, f"Access to {metric} metric not permitted")

    # Send metrics from DB

    try:
        return jsonify(
            current_app.metrics_db.request(metric, request.args.get("range", "hour"))
        )
    except SlurmwebMetricsDBError as err:
        logger.warning(str(err))
        abort(500, str(err))
