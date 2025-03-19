# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

import unittest
import tempfile

from slurmweb.markdown import render_html


class TestMessage(unittest.TestCase):
    def test_service_message(self):
        with tempfile.NamedTemporaryFile(mode="w+") as fh:
            fh.write("Hello, *world*!")
            fh.seek(0)
            self.assertEqual(render_html(fh.name), "<p>Hello, <em>world</em>!</p>")

    def test_empty_service_message(self):
        self.assertEqual(render_html("/dev/null"), "")

    def test_not_existing_service_message(self):
        with self.assertRaisesRegex(
            FileNotFoundError,
            r"^\[Errno 2\] No such file or directory: '/dev/not/found'$",
        ):
            render_html("/dev/not/found")
