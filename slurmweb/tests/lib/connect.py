# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from slurmweb.apps.connect import SlurmwebAppConnectCheck
from slurmweb.apps import SlurmwebAppSeed
from .agent import TestSlurmrestdClient


class TestConnectCheckAppBase(TestSlurmrestdClient):
    def setup(self, slurmrestd_parameters=None, racksdb=True, metrics=False):
        self.setup_agent_conf(
            slurmrestd_parameters=slurmrestd_parameters,
            racksdb=racksdb,
            metrics=metrics,
        )
        self.app = SlurmwebAppConnectCheck(
            SlurmwebAppSeed.with_parameters(
                debug=False,
                log_flags=["ALL"],
                log_component=None,
                debug_flags=[],
                conf_defs=self.conf_defs,
                conf=self.conf.name,
            )
        )
        self.conf.close()
        self.key.close()
        self.slurmrestd_key.close()
