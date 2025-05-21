# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from slurmweb.apps.genjwt import SlurmwebAppGenJWT
from slurmweb.apps import SlurmwebAppSeed
from .agent import TestSlurmrestdClient


class TestGenJWTAppBase(TestSlurmrestdClient):
    def setup(
        self,
    ):
        self.setup_agent_conf()
        self.app = SlurmwebAppGenJWT(
            SlurmwebAppSeed.with_parameters(
                debug=False,
                log_flags=["ALL"],
                log_component=None,
                debug_flags=[],
                conf_defs=self.conf_defs,
                conf=self.conf.name,
                with_slurm=False,
            )
        )
        self.conf.close()
        self.key.close()
        self.slurmrestd_key.close()
