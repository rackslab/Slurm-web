# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import typing as t
from .base import BaseAdapter


class AdapterV0_0_41(BaseAdapter):
    """Adapter from API version 0.0.41 to 0.0.42.

    Based on asset comparison:
    - ping endpoint: adds 'responding' and 'primary' fields
    """

    def adapt_pings(self, data: t.Any) -> t.Any:
        """Adapt pings data from v0.0.41 to v0.0.42.

        Adds missing fields:
        - 'responding': boolean, defaults to True if pinged is "UP"
        - 'primary': boolean, derived from mode field
        """
        if not isinstance(data, list):
            return data

        for ping in data:
            if not isinstance(ping, dict):
                continue

            # Add 'responding' field (defaults to True if pinged is "UP")
            if "responding" not in ping:
                ping["responding"] = ping.get("pinged") == "UP"

            # Add 'primary' field based on mode
            if "primary" not in ping:
                ping["primary"] = ping.get("mode") == "primary"

        return data
