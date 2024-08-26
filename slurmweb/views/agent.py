# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from typing import Union, Callable, List, Any, Dict
import logging

import json
from flask import Response, current_app, jsonify, abort, request
import requests
from rfl.web.tokens import rbac_action, check_jwt

from ..version import get_version
from ..errors import SlurmwebCacheError, SlurmwebRestdError
from . import SlurmrestdUnixAdapter
from ..db.models import (
    Templates,
    Inputs,
    Input_types,
    Template_users_accounts,
    Template_users_logins,
    Template_developers_accounts,
    Template_developers_logins,
)

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


def _validate_slurmrestd_response(response) -> None:
    """Validate slurmrestd response or abort agent resquest with error."""
    _validate_slurmrestd_status(response)
    _validate_slurmrestd_json(response)


def _validate_slurmrestd_status(response) -> None:
    """Check response status code is not HTTP/404 or abort"""
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


def slurmrest(query, key, handle_errors=True):
    session = requests.Session()
    prefix = "http+unix://slurmrestd/"
    session.mount(prefix, SlurmrestdUnixAdapter(current_app.settings.slurmrestd.socket))
    try:
        response = session.get(f"{prefix}/{query}")
    except requests.exceptions.ConnectionError as err:
        logger.error("Unable to connect to slurmrestd: %s", err)
        abort(500, f"Unable to connect to slurmrestd: {err}")

    _validate_slurmrestd_response(response)

    result = response.json()
    if len(result["errors"]):
        if handle_errors:
            logger.error("slurmrestd query %s errors: %s", query, result["errors"])
            abort(500, f"slurmrestd errors: {str(result['errors'])}")
        else:
            error = result["errors"][0]
            raise SlurmwebRestdError(
                error["error"],
                error["error_number"],
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
                False,
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


def templates():
    lstTemplates = list(Templates.select().dicts())
    return jsonify(lstTemplates)


def inputs():
    lstInputs = list(Inputs.select().dicts())
    return jsonify(lstInputs)


def input_types():
    lstInputTypes = list(Input_types.select().dicts())
    return jsonify(lstInputTypes)


def user_accounts():
    lstUserAccounts = list(Template_users_accounts.select().dicts())
    return jsonify(lstUserAccounts)


def user_logins():
    lstUserLogins = list(Template_users_logins.select().dicts())
    return jsonify(lstUserLogins)


def developer_accounts():
    lstDeveloperAccounts = list(Template_developers_accounts.select().dicts())
    return jsonify(lstDeveloperAccounts)


def developer_logins():
    lstDeveloperLogins = list(Template_developers_logins.select().dicts())
    return jsonify(lstDeveloperLogins)


@rbac_action("manage-templates")
def create_template():
    template_data = json.loads(request.data)

    new_template = Templates.create(
        name=template_data["name"],
        description=template_data["description"],
        batchScript=template_data["batchScript"],
    )

    for userAccount in range(len(template_data["userAccounts"])):
        Template_users_accounts.create(
            name=template_data["userAccounts"][userAccount], template=new_template.id
        )

    for userLogin in range(len(template_data["userLogins"])):
        Template_users_logins.create(
            name=template_data["userLogins"][userLogin], template=new_template.id
        )

    for developerAccount in range(len(template_data["developerAccounts"])):
        Template_developers_accounts.create(
            name=template_data["developerAccounts"][developerAccount],
            template=new_template.id,
        )

    for developerLogin in range(len(template_data["developerLogins"])):
        Template_developers_logins.create(
            name=template_data["developerLogins"][developerLogin],
            template=new_template.id,
        )

    for input in range(len(template_data["inputs"])):
        for type in Input_types.select():
            if type.name == template_data["inputs"][input]["type"]:
                Inputs.create(
                    name=template_data["inputs"][input]["name"],
                    description=template_data["inputs"][input]["description"],
                    default=template_data["inputs"][input]["default"],
                    minVal=template_data["inputs"][input]["minVal"],
                    maxVal=template_data["inputs"][input]["maxVal"],
                    regex=template_data["inputs"][input]["regex"],
                    template=new_template.id,
                    type=type.id,
                )
                break

    return jsonify({"result": "success"})


@rbac_action("manage-templates")
def edit_template():
    template_data = json.loads(request.data)

    template = Templates.get(Templates.id == template_data["idTemplate"])
    template.name = template_data["name"]
    template.description = template_data["description"]
    template.batchScript = template_data["batchScript"]
    template.save()

    db_user_accounts = list(
        Template_users_accounts.select(Template_users_accounts.name)
        .where(Template_users_accounts.template == template_data["idTemplate"])
        .dicts()
    )
    db_user_account_names = [user["name"] for user in db_user_accounts]

    for form_account in range(len(template_data["userAccounts"])):
        if template_data["userAccounts"][form_account] not in db_user_account_names:
            Template_users_accounts.create(
                name=template_data["userAccounts"][form_account],
                template=template_data["idTemplate"],
            )

    for db_account in range(len(db_user_account_names)):
        if db_user_account_names[db_account] not in template_data["userAccounts"]:
            Template_users_accounts.delete().where(
                (Template_users_accounts.name == db_user_account_names[db_account])
                & (Template_users_accounts.template == template_data["idTemplate"])
            ).execute()

    db_user_logins = list(
        Template_users_logins.select(Template_users_logins.name)
        .where(Template_users_logins.template == template_data["idTemplate"])
        .dicts()
    )
    db_user_login_names = [user["name"] for user in db_user_logins]

    for form_login in range(len(template_data["userLogins"])):
        if template_data["userLogins"][form_login] not in db_user_login_names:
            Template_users_logins.create(
                name=template_data["userLogins"][form_login],
                template=template_data["idTemplate"],
            )

    for db_login in range(len(db_user_login_names)):
        if db_user_login_names[db_login] not in template_data["userLogins"]:
            Template_users_logins.delete().where(
                (Template_users_logins.name == db_user_login_names[db_login])
                & (Template_users_logins.template == template_data["idTemplate"])
            ).execute()

    db_developer_accounts = list(
        Template_developers_accounts.select(Template_developers_accounts.name)
        .where(Template_developers_accounts.template == template_data["idTemplate"])
        .dicts()
    )
    db_developer_account_names = [
        developer["name"] for developer in db_developer_accounts
    ]

    for form_account in range(len(template_data["developerAccounts"])):
        if (
            template_data["developerAccounts"][form_account]
            not in db_developer_account_names
        ):
            Template_developers_accounts.create(
                name=template_data["developerAccounts"][form_account],
                template=template_data["idTemplate"],
            )

    for db_account in range(len(db_developer_account_names)):
        if (
            db_developer_account_names[db_account]
            not in template_data["developerAccounts"]
        ):
            Template_developers_accounts.delete().where(
                (
                    Template_developers_accounts.name
                    == db_developer_account_names[db_account]
                )
                & (Template_developers_accounts.template == template_data["idTemplate"])
            ).execute()

    db_developer_logins = list(
        Template_developers_logins.select(Template_developers_logins.name)
        .where(Template_developers_logins.template == template_data["idTemplate"])
        .dicts()
    )
    db_developer_login_names = [developer["name"] for developer in db_developer_logins]

    for form_login in range(len(template_data["developerLogins"])):
        if template_data["developerLogins"][form_login] not in db_developer_login_names:
            Template_developers_logins.create(
                name=template_data["developerLogins"][form_login],
                template=template_data["idTemplate"],
            )

    for db_login in range(len(db_developer_login_names)):
        if db_developer_login_names[db_login] not in template_data["developerLogins"]:
            Template_developers_logins.delete().where(
                (Template_developers_logins.name == db_developer_login_names[db_login])
                & (Template_developers_logins.template == template_data["idTemplate"])
            ).execute()

    return jsonify({"result": "success"})


@rbac_action("manage-templates")
def delete_template():
    return jsonify({"result": "template deleted"})
