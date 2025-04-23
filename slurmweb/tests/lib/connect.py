# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from slurmweb.apps.connect import SlurmwebAppConnectCheck
from slurmweb.apps import SlurmwebConfSeed
from .agent import TestSlurmrestdClient, setup_agent_conf


class TestConnectCheckAppBase(TestSlurmrestdClient):
    def setup(self, additional_conf=None):
        key, conf, conf_defs = setup_agent_conf(additional_conf)
        self.app = SlurmwebAppConnectCheck(
            SlurmwebConfSeed(
                debug=False,
                log_flags=["ALL"],
                log_component=None,
                debug_flags=[],
                conf_defs=conf_defs,
                conf=conf.name,
            )
        )
        conf.close()
        key.close()
