# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
import os
from pathlib import Path

from rfl.settings import RuntimeSettings

from .utils import mock_slurmrestd_responses
from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier


def basic_authentifier():
    return SlurmrestdAuthentifier(
        "local",
        "auto",
        "slurm",
        Path("/var/lib/slurm-web/slurmrestd.key"),
        3600,
        None,
    )


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
