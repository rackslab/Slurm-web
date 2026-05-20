# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest


def oidc_available() -> bool:
    """Return whether RFL OIDC authentication (and its dependencies) is installed."""
    try:
        from rfl.authentication.oidc import OIDCClient  # noqa: F401
    except (ImportError, AttributeError):
        return False
    return True


OIDC_SKIP_REASON = "RFL.authentication OIDC support is not installed"

skip_unless_oidc = unittest.skipUnless(oidc_available(), OIDC_SKIP_REASON)
