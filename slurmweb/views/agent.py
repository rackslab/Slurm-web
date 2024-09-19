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
from peewee import IntegrityError

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

    try:
        new_template = Templates.create(
            name=template_data["name"],
            description=template_data["description"],
            batchScript=template_data["batchScript"],
            author=template_data["author"],
        )

        for userAccount in range(len(template_data["userAccounts"])):
            Template_users_accounts.create(
                name=template_data["userAccounts"][userAccount],
                template=new_template.id,
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
                        default_value=template_data["inputs"][input]["defaultValue"],
                        minVal=template_data["inputs"][input]["minVal"],
                        maxVal=template_data["inputs"][input]["maxVal"],
                        regex=template_data["inputs"][input]["regex"],
                        template=new_template.id,
                        type=type.id,
                    )
                    break
    except IntegrityError as e:
        print(f"IntegrityError : {e}")
        return jsonify({"error": f"{e}"})

    return jsonify({"result": "success"})


@rbac_action("manage-templates")
def template(id: int):
    if request.method == "GET":
        return template_get(id)
    if request.method == "POST":
        template_data = json.loads(request.data)
        return template_post(template_data)
    if request.method == "DELETE":
        return template_delete(id)


def template_get(id: int):
    template = list(Templates.select().where(Templates.id == id).dicts())
    inputs = list(Inputs.select().where(Inputs.template == id).dicts())
    user_accounts = []
    user_logins = []
    developer_accounts = []
    developer_logins = []

    for user_account in list(
        Template_users_accounts.select(Template_users_accounts.name)
        .where(Template_users_accounts.template == id)
        .dicts()
    ):
        user_accounts.append(user_account["name"])

    for user_login in list(
        Template_users_logins.select(Template_users_logins.name)
        .where(Template_users_logins.template == id)
        .dicts()
    ):
        user_logins.append(user_login["name"])

    for developer_account in list(
        Template_developers_accounts.select(Template_developers_accounts.name)
        .where(Template_developers_accounts.template == id)
        .dicts()
    ):
        developer_accounts.append(developer_account["name"])

    for developer_login in list(
        Template_developers_logins.select(Template_developers_logins.name)
        .where(Template_developers_logins.template == id)
        .dicts()
    ):
        developer_logins.append(developer_login["name"])

    return jsonify(
        {
            "template": template[0],
            "inputs": inputs,
            "userAccounts": user_accounts,
            "userLogins": user_logins,
            "developerAccounts": developer_accounts,
            "developerLogins": developer_logins,
        }
    )


def template_post(template_data):
    template = Templates.get(Templates.id == template_data["idTemplate"])
    template.name = template_data["name"]
    template.description = template_data["description"]
    template.batchScript = template_data["batchScript"]
    template.save()

    # Récupération des comptes utilisateurs de la base de données
    db_user_accounts = set(
        Template_users_accounts.select(Template_users_accounts.name)
        .where(Template_users_accounts.template == template_data["idTemplate"])
        .dicts()
        .execute()
    )
    db_user_account_names = {user["name"] for user in db_user_accounts}

    # Convertir les comptes utilisateurs fournis dans le formulaire en set pour des comparaisons plus simples
    form_user_accounts = set(template_data["userAccounts"])

    # Créer les comptes manquants
    new_accounts = form_user_accounts - db_user_account_names
    for account in new_accounts:
        Template_users_accounts.create(
            name=account, template=template_data["idTemplate"]
        )

    # Supprimer les comptes en trop
    removed_accounts = db_user_account_names - form_user_accounts
    Template_users_accounts.delete().where(
        (Template_users_accounts.name.in_(removed_accounts))
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
                    & (
                        Template_developers_accounts.template
                        == template_data["idTemplate"]
                    )
                ).execute()

        db_developer_logins = list(
            Template_developers_logins.select(Template_developers_logins.name)
            .where(Template_developers_logins.template == template_data["idTemplate"])
            .dicts()
        )
        db_developer_login_names = [
            developer["name"] for developer in db_developer_logins
        ]

        for form_login in range(len(template_data["developerLogins"])):
            if (
                template_data["developerLogins"][form_login]
                not in db_developer_login_names
            ):
                Template_developers_logins.create(
                    name=template_data["developerLogins"][form_login],
                    template=template_data["idTemplate"],
                )

        for db_login in range(len(db_developer_login_names)):
            if (
                db_developer_login_names[db_login]
                not in template_data["developerLogins"]
            ):
                Template_developers_logins.delete().where(
                    (
                        Template_developers_logins.name
                        == db_developer_login_names[db_login]
                    )
                    & (
                        Template_developers_logins.template
                        == template_data["idTemplate"]
                    )
                ).execute()

        for input in range(len(template_data["inputs"])):
            print(template_data["inputs"][input])
            for type in Input_types.select():
                if type.name == template_data["inputs"][input]["type"]:
                    if template_data["inputs"][input] not in list(
                        Inputs.select()
                        .where(Inputs.template == template_data["idTemplate"])
                        .dicts()
                    ):
                        Inputs.create(
                            name=template_data["inputs"][input]["name"],
                            description=template_data["inputs"][input]["description"],
                            default_value=template_data["inputs"][input][
                                "defaultValue"
                            ],
                            minVal=template_data["inputs"][input]["minVal"],
                            maxVal=template_data["inputs"][input]["maxVal"],
                            regex=template_data["inputs"][input]["regex"],
                            template=template_data["idTemplate"],
                            type=type.id,
                        )
                        break
                    else:
                        print(
                            f'{template_data["inputs"][input]["name"]} est dans la liste'
                        )

                        inputTest = Inputs.select().where(
                            Inputs.id == template_data["inputs"][input]["id"]
                        )
                        inputTest.name = (template_data["inputs"][input]["name"],)
                        inputTest.description = (
                            template_data["inputs"][input]["description"],
                        )
                        inputTest.default_value = (
                            template_data["inputs"][input]["defaultValue"],
                        )
                        inputTest.minVal = (template_data["inputs"][input]["minVal"],)
                        inputTest.maxVal = (template_data["inputs"][input]["maxVal"],)
                        inputTest.regex = template_data["inputs"][input]["regex"]
                        inputTest.type = type.id

        return jsonify({"result": "success"})


def template_delete(id: int):
    Inputs.delete().where(Inputs.template == id).execute()
    Template_users_accounts.delete().where(
        Template_users_accounts.template == id
    ).execute()
    Template_users_logins.delete().where(Template_users_logins.template == id).execute()
    Template_developers_accounts.delete().where(
        Template_developers_accounts.template == id
    ).execute()
    Template_developers_logins.delete().where(
        Template_developers_logins.template == id
    ).execute()
    Templates.delete().where(Templates.id == id).execute()

    return jsonify({"result": "template deleted"})
