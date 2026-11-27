# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

# Dict of clusters settings to control cluster names in UI, slurmrestd access
# (TCP/IP or Unix socket), authentication and jobs metrics exported by CEEMS.
CLUSTERS = {
    "nova": {
        "auth": "jwt",
        "scheme": "http",
        "policy_extra_user_group": True,
        "ceems": True,
    },
    "zenith": {"auth": "jwt", "scheme": "http", "ceems": True},
    "pulsar": {"auth": "jwt", "ceems": True},
    "comet": {"auth": "local", "racksdb": False, "metrics": False},
    "titan": {"auth": "jwt", "mode": "static"},
}

DEBUG_FLAGS = ["slurmweb", "rfl", "werkzeug", "urllib3"]

GATEWAY_SERVICE_PORT = 5012
FRONTEND_PORT = 5173
