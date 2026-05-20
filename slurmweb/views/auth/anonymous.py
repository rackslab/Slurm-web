# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import logging

from flask import abort, current_app, jsonify
from rfl.authentication.user import AnonymousUser

logger = logging.getLogger(__name__)


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
