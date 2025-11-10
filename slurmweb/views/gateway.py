# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import json
import logging
from functools import wraps
import asyncio

import jinja2
from flask import Response, current_app, jsonify, request, abort, render_template
import aiohttp
from rfl.web.tokens import check_jwt
from rfl.authentication.user import AnonymousUser
from rfl.authentication.errors import LDAPAuthenticationError
from rfl.core.asyncio import asyncio_run

from ..markdown import render_html
from ..version import get_version


logger = logging.getLogger(__name__)


def validate_cluster(view):
    """Decorator for Flask views functions check for valid cluster path parameter."""

    @wraps(view)
    def wrapped(*args, **kwargs):
        cluster = kwargs["cluster"]
        if cluster not in current_app.agents.keys():
            abort(
                404,
                f"Unable to retrieve {view.__name__} from cluster {cluster}, cluster "
                "not found",
            )
        return view(*args, **kwargs)

    return wrapped


def version():
    return Response(f"Slurm-web gateway v{get_version()}\n", mimetype="text/plain")


def login():
    idents = json.loads(request.data)
    # Check authentication is enabled or fail with 500
    if not current_app.settings.authentication.enabled:
        logger.warning(
            "Authentication attempt from user %s but authentication is disabled",
            idents["user"],
        )
        abort(500, "Unable to authenticate")
    try:
        user = current_app.authentifier.login(
            user=idents["user"], password=idents["password"]
        )
    except LDAPAuthenticationError as err:
        logger.warning(
            "LDAP authentication error for user %s: %s", idents["user"], str(err)
        )
        abort(401, str(err))
    logger.info("User %s authenticated successfully", user)
    # generate token
    token = current_app.jwt.generate(
        user=user, duration=current_app.settings.jwt.duration
    )
    return jsonify(
        result="Authentication successful",
        token=token,
        fullname=user.fullname,
        groups=user.groups,
    )


def anonymous():
    # Check authentication is disabled or fail with 401
    if current_app.settings.authentication.enabled:
        logger.warning(
            "Anonymous access attempt but authentication is enabled",
        )
        abort(401, "Unauthorized anonymous access")
    # Generate token
    token = current_app.jwt.generate(
        user=AnonymousUser(),
        duration=current_app.settings.jwt.duration,
    )
    return jsonify(
        result="Successful anonymous access",
        token=token,
    )


def message_login():
    """Return markdown login service message rendered as HTML page. Return HTTP/404 if
    markdown file is not found, and HTTP/500 if template is not found."""
    try:
        message = render_html(current_app.settings.ui.message_login)
    except FileNotFoundError:
        logger.debug(
            "Login service markdown file %s not found",
            current_app.settings.ui.message_login,
        )
        abort(404, "login service message not found")
    except PermissionError:
        msg = (
            "Permission error on login service markdown file "
            f"{current_app.settings.ui.message_login}"
        )
        logger.error(msg)
        abort(500, msg)
    try:
        return render_template(
            str(current_app.settings.ui.message_template), message=message
        )
    except jinja2.exceptions.TemplateNotFound:
        msg = f"message template {current_app.settings.ui.message_template} not found"
        logger.error(msg)
        abort(500, msg)


async def get_cluster(agent):
    """Return dict with cluster information, for the cluster managed by the given agent.
    The dict contains permissions on the cluster for the request token. Return None if
    request to get permissions failed."""
    async with aiohttp.ClientSession() as session:
        async with request_agent(
            session, agent.cluster, "permissions", request.token
        ) as response:
            if response.status != 200:
                logger.error(
                    "Unable to retrieve permissions from cluster %s: %d",
                    agent.cluster,
                    response.status,
                )
                return None

            permissions = await response.json()

        # Hide the cluster if the actions list is empty and ui.hide_denied is enabled.
        if not len(permissions["actions"]) and current_app.settings.ui.hide_denied:
            return None

        cluster = {
            "name": agent.cluster,
            "racksdb": agent.racksdb.enabled,
            "infrastructure": agent.racksdb.infrastructure,
            "metrics": agent.metrics,
            "cache": agent.cache,
            "permissions": permissions,
        }

    return cluster


async def get_clusters(agents):
    """Return the list of available clusters with permissions. Clusters on which
    request to get permissions failed are filtered out."""
    return [
        cluster
        for cluster in await asyncio.gather(*[get_cluster(agent) for agent in agents])
        if cluster is not None
    ]


@check_jwt
def clusters():
    return jsonify(asyncio_run(get_clusters(current_app.agents.values())))


@check_jwt
def users():
    # If authentication is disabled, the list of users cannot be retrieved. Respond with
    # HTTP/501 (not implemented) with a descriptive JSON error.
    if current_app.authentifier is None:
        err = "Unable to retrieve users when authentication is disabled"
        logger.warning(err)
        abort(501, err)
    return jsonify(
        [
            {"login": user.login, "fullname": user.fullname}
            for user in current_app.authentifier.users()
        ]
    )


def request_agent(
    session: aiohttp.ClientSession,
    cluster: str,
    query: str,
    token: str = None,
    with_version: bool = True,
):
    """Return the aiohttp request context manager on the given session for the given
    query."""
    headers = {}
    if token is not None:
        headers = {"Authorization": f"Bearer {token}"}
    try:
        if with_version:
            url = (
                f"{current_app.agents[cluster].url}/"
                f"v{current_app.agents[cluster].version}/{query}"
            )
        else:
            url = f"{current_app.agents[cluster].url}/{query}"
        if len(request.query_string):
            url += f"?{request.query_string.decode()}"
        if request.method == "GET":
            return session.get(url, headers=headers)
        elif request.method == "POST":
            return session.post(
                url,
                headers=headers,
                json=request.json,
            )
        else:
            abort(500, f"Unsupported request method {request.method}")
    except aiohttp.ClientConnectionError as err:
        logger.error("Connection error with agent %s: %s", cluster, str(err))
        abort(500, f"Connection error: {str(err)}")


async def async_proxy_agent(
    cluster: str,
    query: str,
    token: str = None,
    json: bool = True,
    with_version: bool = True,
):
    """Initialize an asynchronous client session, send the request to the agent and
    return Flask response."""
    async with aiohttp.ClientSession() as session:
        async with request_agent(
            session, cluster, query, token, with_version
        ) as response:
            if json:
                try:
                    return jsonify(await response.json()), response.status
                except aiohttp.client_exceptions.ContentTypeError as err:
                    msg = (
                        f"Unsupported Content-Type for agent {cluster} URL "
                        f"{err.request_info.url}: {err}"
                    )
                    logger.error(msg)
                    abort(500, msg)
            else:
                return Response(
                    await response.read(),
                    status=response.status,
                    mimetype=response.headers.get("content-type"),
                )


def proxy_agent(*args, **kwargs):
    """Launch asynchronous coroutine to request the agent."""
    return asyncio_run(async_proxy_agent(*args, **kwargs))


@check_jwt
@validate_cluster
def ping(cluster: str):
    return proxy_agent(cluster, "ping", request.token)


@check_jwt
@validate_cluster
def stats(cluster: str):
    return proxy_agent(cluster, "stats", request.token)


@check_jwt
@validate_cluster
def cache_stats(cluster: str):
    return proxy_agent(cluster, "cache/stats", request.token)


@check_jwt
@validate_cluster
def cache_reset(cluster: str):
    return proxy_agent(cluster, "cache/reset", request.token)


@check_jwt
@validate_cluster
def jobs(cluster: str):
    return proxy_agent(cluster, "jobs", request.token)


@check_jwt
@validate_cluster
def job(cluster: str, job: int):
    return proxy_agent(cluster, f"job/{job}", request.token)


@check_jwt
@validate_cluster
def nodes(cluster: str):
    return proxy_agent(cluster, "nodes", request.token)


@check_jwt
@validate_cluster
def node(cluster: str, name: str):
    return proxy_agent(cluster, f"node/{name}", request.token)


@check_jwt
@validate_cluster
def partitions(cluster: str):
    return proxy_agent(cluster, "partitions", request.token)


@check_jwt
@validate_cluster
def qos(cluster: str):
    return proxy_agent(cluster, "qos", request.token)


@check_jwt
@validate_cluster
def reservations(cluster: str):
    return proxy_agent(cluster, "reservations", request.token)


@check_jwt
@validate_cluster
def accounts(cluster: str):
    return proxy_agent(cluster, "accounts", request.token)


@check_jwt
@validate_cluster
def metrics(cluster: str, metric: str):
    return proxy_agent(cluster, f"metrics/{metric}", request.token)


@check_jwt
@validate_cluster
def racksdb(cluster: str, query: str):
    return proxy_agent(
        cluster,
        f"racksdb/v{current_app.agents[cluster].racksdb.version}/{query}",
        request.token,
        json=False,
        with_version=False,
    )


def ui_config():
    return jsonify(
        {
            "API_SERVER": (
                current_app.settings.ui.host.geturl()
                if current_app.settings.ui.host is not None
                else f"http://localhost:{current_app.settings.service.port}"
            ),
            "AUTHENTICATION": current_app.settings.authentication.enabled,
            "RACKSDB_ROWS_LABELS": current_app.settings.ui.racksdb_rows_labels,
            "RACKSDB_RACKS_LABELS": current_app.settings.ui.racksdb_racks_labels,
            "VERSION": get_version(),
        }
    )


def ui_files(name="index.html"):
    if (
        name in ["favicon.ico", "config.json"]
        or name.startswith("assets/")
        or name.startswith("logo/")
    ):
        return current_app.send_static_file(name)
    else:
        return current_app.send_static_file("index.html")
