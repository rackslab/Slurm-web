# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
from .base import BaseAdapter


class AdapterV0_0_42(BaseAdapter):
    """Adapter from API version 0.0.42 to 0.0.43.

    Based on asset comparison:
    - nodes endpoint: adds 'tls_cert_last_renewal' and 'cert_flags' fields
    """

    def adapt_nodes(self, data: t.Any) -> t.Any:
        """Adapt nodes data from v0.0.42 to v0.0.43.

        Adds missing fields:
        - 'tls_cert_last_renewal': timestamp object with set/infinite/number
        - 'cert_flags': list of certificate flags
        """
        if not isinstance(data, list):
            return data

        for node in data:
            if not isinstance(node, dict):
                continue

            # Add 'tls_cert_last_renewal' field with default structure
            if "tls_cert_last_renewal" not in node:
                node["tls_cert_last_renewal"] = {
                    "set": True,
                    "infinite": False,
                    "number": 0,
                }

            # Add 'cert_flags' field as empty list
            if "cert_flags" not in node:
                node["cert_flags"] = []

        return data
