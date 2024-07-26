# Copyright (c) 2023 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from typing import Any, Tuple
import logging

import json
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


def slurmrest(method: str, *args: Tuple[Any, ...]):
    try:
        return getattr(current_app.slurmrestd, method)(*args)
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
        msg = f"slurmrestd error: {err.description} ({err.source})"
        if err.error != -1:
            msg += f" [{err.message}/{err.error}]"
        logger.error(msg)
        abort(500, msg)
    except SlurmwebCacheError as err:
        msg = f"Cache error: {str(err)}"
        logger.error(msg)
        abort(500, msg)


@rbac_action("view-stats")
def stats():
    total = 0
    running = 0

    version = slurmrest("version")

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

    for job in slurmrest("jobs"):
        total += 1
        if "RUNNING" in job["job_state"]:
            running += 1

    nodes = 0
    cores = 0
    for node in slurmrest("nodes"):
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
