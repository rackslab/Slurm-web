# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import logging

from flask import abort, current_app, jsonify, redirect, session
from rfl.authentication.errors import OIDCAuthenticationError

logger = logging.getLogger(__name__)

OIDC_SESSION_LOGIN = "oidc_login"


def _oidc_callback_frontend_url() -> str:
    return f"{current_app.oidc_ui_prefix}/auth/oidc/callback"


def oidc_login():
    if not current_app.settings.authentication.enabled:
        abort(500, "Unable to authenticate with OIDC, authentication is disabled")
    if current_app.settings.authentication.method != "oidc":
        abort(501, "OIDC authentication is not enabled")

    try:
        return current_app.authentifier.redirect()
    except OIDCAuthenticationError as err:
        logger.warning("OIDC authentication error: %s", str(err))
        abort(401, str(err))


def oidc_callback():
    if not current_app.settings.authentication.enabled:
        abort(500, "Unable to authenticate with OIDC, authentication is disabled")
    if current_app.settings.authentication.method != "oidc":
        abort(501, "OIDC authentication is not enabled")

    try:
        user = current_app.authentifier.authenticate()
    except OIDCAuthenticationError as err:
        logger.warning("OIDC authentication error: %s", str(err))
        abort(401, str(err))

    logger.info("User %s authenticated successfully with OIDC", user.login)
    token = current_app.jwt.generate(
        user=user,
        duration=current_app.settings.jwt.duration,
    )
    session[OIDC_SESSION_LOGIN] = {
        "token": token,
        "login": user.login,
        "fullname": user.fullname,
        "groups": user.groups,
    }
    return redirect(_oidc_callback_frontend_url())


def oidc_session():
    if not current_app.settings.authentication.enabled:
        abort(500, "Unable to authenticate with OIDC, authentication is disabled")
    if current_app.settings.authentication.method != "oidc":
        abort(501, "OIDC authentication is not enabled")

    login_data = session.pop(OIDC_SESSION_LOGIN, None)
    if login_data is None:
        logger.warning("OIDC session login data not found")
        abort(401, "OIDC login session not found")

    return jsonify(
        result="Authentication successful",
        token=login_data["token"],
        fullname=login_data.get("fullname"),
        groups=login_data.get("groups", []),
        login=login_data["login"],
    )
