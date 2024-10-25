# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
import tempfile
import os
import shutil

from slurmweb.version import get_version
from slurmweb.apps import SlurmwebConfSeed
from slurmweb.apps.gateway import SlurmwebAppGateway

CONF = """
[agents]
url=http://localhost

[jwt]
key={key}
"""


class TestGateway(unittest.TestCase):
    def setUp(self):
        # Generate JWT signing key
        key = tempfile.NamedTemporaryFile(mode="w+")
        key.write("hey")
        key.seek(0)

        self.vendor_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "conf", "vendor"
        )

        # Generate configuration file
        conf = tempfile.NamedTemporaryFile(mode="w+")
        conf.write(CONF.format(key=key.name))
        conf.seek(0)

        # Configuration definition path
        conf_defs = os.path.join(self.vendor_path, "gateway.yml")

        self.app = SlurmwebAppGateway(
            SlurmwebConfSeed(
                debug=False,
                log_flags=["ALL"],
                debug_flags=[],
                conf_defs=conf_defs,
                conf=conf.name,
            )
        )
        conf.close()
        key.close()
        self.app.config.update(
            {
                "TESTING": True,
            }
        )
        self.client = self.app.test_client()

    def test_version(self):
        response = self.client.get("/api/version")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, f"Slurm-web gateway v{get_version()}\n")

    def test_message(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # copy templates from vendor path
            tmpdir_templates = os.path.join(tmpdir, "templates")
            shutil.copytree(
                os.path.join(self.vendor_path, "templates"), tmpdir_templates
            )
            self.app.set_templates_folder(tmpdir_templates)

            # generate test markdown file
            self.app.settings.ui.message_login = os.path.join(tmpdir, "login.md")
            with open(self.app.settings.ui.message_login, "w+") as fh:
                fh.write("Hello, *world*!")

            # check rendered html
            response = self.client.get("/api/messages/login")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "text/html")
            self.assertIn("Hello, <em>world</em>!", response.text)

    def test_message_not_found(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # set not existing markdown message
            self.app.settings.ui.message_login = os.path.join(tmpdir, "not-found.md")
            with self.assertLogs("slurmweb", level="DEBUG") as cm:
                response = self.client.get("/api/messages/login")
            self.assertEqual(response.status_code, 404)
            self.assertEqual(
                response.json["description"], "login service message not found"
            )
            self.assertEqual(
                cm.output,
                [
                    f"DEBUG:slurmweb.views.gateway:Login service markdown file {tmpdir}/not-found.md not found"
                ],
            )

    def test_message_template_not_found(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # set not existing templates folder
            tmpdir_templates = os.path.join(tmpdir, "templates")
            self.app.set_templates_folder(tmpdir_templates)

            self.app.settings.ui.message_login = os.path.join(tmpdir, "message.md")
            with open(self.app.settings.ui.message_login, "w+") as fh:
                fh.write("Hello, *world*!")

            response = self.client.get("/api/messages/login")
            self.assertEqual(response.status_code, 500)
            self.assertEqual(
                response.json["description"],
                "message template message.html.j2 not found",
            )
