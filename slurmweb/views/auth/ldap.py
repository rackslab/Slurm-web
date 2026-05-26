# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import json
import logging

from flask import abort, current_app, jsonify, request
from rfl.authentication.errors import LDAPAuthenticationError

logger = logging.getLogger(__name__)


def login():
    idents = json.loads(request.data)
    # Check authentication is enabled or fail with 500
    if not current_app.settings.authentication.enabled:
        logger.warning(
            "Authentication attempt from user %s but authentication is disabled",
            idents["user"],
        )
        abort(500, "Unable to authenticate")
    if current_app.settings.authentication.method != "ldap":
        abort(501, "LDAP authentication is not enabled")
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
        login=user.login,
        fullname=user.fullname,
        groups=user.groups,
    )
