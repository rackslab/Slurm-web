# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest
import os
from pathlib import Path

from rfl.settings import RuntimeSettings

from .utils import mock_slurmrestd_responses, SlurmwebAssetUnavailable
from slurmweb.slurmrestd.auth import SlurmrestdAuthentifier


SUPPORTED_SLURMRESTD_API_VERSIONS = ["0.0.45", "0.0.44", "0.0.43", "0.0.42", "0.0.41"]
LATEST_SUPPORTED_SLURMRESTD_API_VERSION = SUPPORTED_SLURMRESTD_API_VERSIONS[0]
SECOND_SUPPORTED_SLURMRESTD_API_VERSION = SUPPORTED_SLURMRESTD_API_VERSIONS[1]
LATEST_SUPPORTED_SLURM_VERSION = "26.05"


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
    def mock_slurmrestd_responses(self, slurm_version, api_version, assets):
        try:
            return mock_slurmrestd_responses(
                self.slurmrestd, slurm_version, api_version, assets
            )
        except SlurmwebAssetUnavailable as err:
            self.skipTest(str(err))

    def setup_slurmrestd(self, slurm_version, api_version):
        """Set slurmrestd cluster name, Slurm version and API version for the test."""
        self.slurmrestd.cluster_name = "foo"
        self.slurmrestd.slurm_version = slurm_version
        self.slurmrestd.api_version = api_version

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
