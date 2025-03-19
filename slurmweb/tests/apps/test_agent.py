# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import sys
from ..lib.agent import TestAgentBase


class TestAgentApp(TestAgentBase):
    def test_app_loaded(self):
        # No error log must be emitted in this case. Note that assertNoLogs is available
        # starting from Python 3.10. For versions below, absence of logs is not checked.
        if sys.version_info < (3, 10):
            self.setup_client()
        else:
            with self.assertNoLogs("slurmweb", level="ERROR"):
                self.setup_client()

    def test_app_racksdb_format_error(self):
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            self.setup_client(racksdb_format_error=True)
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.agent:Unable to load RacksDB database: fake db "
                "format error"
            ],
        )

    def test_app_racksdb_schema_error(self):
        with self.assertLogs("slurmweb", level="ERROR") as cm:
            self.setup_client(racksdb_schema_error=True)
        self.assertEqual(
            cm.output,
            [
                "ERROR:slurmweb.apps.agent:Unable to load RacksDB schema: fake db "
                "schema error"
            ],
        )
