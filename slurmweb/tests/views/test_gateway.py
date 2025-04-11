# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from unittest import mock
import tempfile
import os
import shutil

import werkzeug

from slurmweb.version import get_version

from ..lib.gateway import TestGatewayBase
from ..lib.utils import SlurmwebCustomTestResponse, flask_version


class TestGatewayViews(TestGatewayBase):
    def setUp(self):
        self.setup_app()
        # werkzeug.test.TestResponse class does not have text and json
        # properties in werkzeug <= 0.15. When such version is installed, use
        # custom test response class to backport these text and json properties.
        try:
            getattr(werkzeug.test.TestResponse, "text")
            getattr(werkzeug.test.TestResponse, "json")
        except AttributeError:
            self.app.response_class = SlurmwebCustomTestResponse
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
                    "DEBUG:slurmweb.views.gateway:Login service markdown file "
                    f"{self.app.settings.ui.message_login} not found"
                ],
            )

    def test_message_permission_error(self):
        if os.geteuid() == 0:
            self.skipTest("Cannot test permission error as root")
        with tempfile.TemporaryDirectory() as tmpdir:
            # copy templates from vendor path
            tmpdir_templates = os.path.join(tmpdir, "templates")
            shutil.copytree(
                os.path.join(self.vendor_path, "templates"), tmpdir_templates
            )
            self.app.set_templates_folder(tmpdir_templates)

            # generate test markdown file w/o read permission
            self.app.settings.ui.message_login = os.path.join(tmpdir, "message.md")
            with open(self.app.settings.ui.message_login, "w+") as fh:
                fh.write("Hello, *world*!")
            os.chmod(self.app.settings.ui.message_login, 0o200)

            response = self.client.get("/api/messages/login")
            self.assertEqual(response.status_code, 500)
            self.assertEqual(
                response.json["description"],
                "Permission error on login service markdown file "
                f"{self.app.settings.ui.message_login}",
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

    def test_ui_config(self):
        response = self.client.get("/config.json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json,
            {
                "API_SERVER": "http://localhost:5011",
                "AUTHENTICATION": False,
                "RACKSDB_RACKS_LABELS": False,
                "RACKSDB_ROWS_LABELS": False,
            },
        )

    @mock.patch("slurmweb.views.gateway.get_version")
    def test_unexpected_generic_exception(self, mock_version):
        # By default in development and testing mode, Flask propagate exceptions
        # occuring in views. Disable this behavior temporarily despite testing
        # mode in order to emulate production mode.
        self.app.config["PROPAGATE_EXCEPTIONS"] = False
        # Arbitrary generate KeyError in version view, to emulate generic
        # exception catched by Flask exception handler.
        mock_version.side_effect = KeyError("fake key error")
        response = self.client.get("/api/version")
        self.assertEqual(response.status_code, 500)
        # When unexpected exceptions occur ,Flask < v1.1.0 provides the original
        # exception to HTTP/500 error handler. Newer versions of Flask provides
        # InternalServerError HTTPException generated by Flask. The processing
        # path of the error is different and leads to slightly different error
        # message eventually.
        if flask_version() < (1, 1, 0):
            self.assertEqual(
                response.json,
                {"code": 500, "description": "'fake key error'", "name": "KeyError"},
            )
        else:
            self.assertEqual(
                response.json,
                {
                    "code": 500,
                    "description": (
                        "The server encountered an internal error and was unable to "
                        "complete your request. Either the server is overloaded or "
                        "there is an error in the application."
                    ),
                    "name": "Internal Server Error",
                },
            )
        # Restore default exceptions propagation mode.
        self.app.config["PROPAGATE_EXCEPTIONS"] = None
