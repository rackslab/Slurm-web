# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
import os

from rfl.settings import RuntimeSettings

from .utils import mock_slurmrestd_responses


class TestSlurmrestdBase(unittest.TestCase):

    def mock_slurmrestd_responses(self, slurm_version, assets):
        return mock_slurmrestd_responses(self.slurmrestd, slurm_version, assets)

    def load_agent_settings_definition(self):
        return RuntimeSettings.yaml_definition(
            os.path.join(
                os.path.dirname(__file__),
                "..",
                "..",
                "..",
                "conf",
                "vendor",
                "agent.yml",
            )
        )
