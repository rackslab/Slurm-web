# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import unittest
from unittest import mock
import tempfile
import os
import shutil
from pathlib import Path

from slurmweb.ui import prepare_ui_assets
from slurmweb.errors import SlurmwebRuntimeError


class TestPrepareUIAssets(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures."""
        self.source_dir = Path(tempfile.mkdtemp(prefix="slurmweb-test-source-"))
        self.addCleanup(shutil.rmtree, self.source_dir)

    def tearDown(self):
        """Clean up after tests."""
        # Clean up any created target directories
        if "RUNTIME_DIRECTORY" in os.environ:
            runtime_dir = Path(os.environ["RUNTIME_DIRECTORY"])
            if runtime_dir.exists():
                ui_dir = runtime_dir / "ui"
                if ui_dir.exists():
                    shutil.rmtree(ui_dir, ignore_errors=True)

    def test_prepare_ui_assets(self):
        """Comprehensive test for prepare_ui_assets covering multiple scenarios."""
        # Create a complex directory structure with various file types
        # Root level files with placeholder
        (self.source_dir / "index.html").write_text(
            '<script src="/__SLURMWEB_BASE__/assets/app.js"></script>'
            '<link href="/__SLURMWEB_BASE__/style.css">'
            '<img src="/__SLURMWEB_BASE__/logo.png">'
        )
        (self.source_dir / "app.js").write_bytes(
            b'import("/__SLURMWEB_BASE__/assets/vendor.js")'
        )

        # Root level files without placeholder
        (self.source_dir / "readme.txt").write_text("Readme content")
        (self.source_dir / "style.css").write_text("body { color: red; }")

        # Binary files (should be skipped from replacement)
        (self.source_dir / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\nfake png data")
        (self.source_dir / "favicon.ico").write_bytes(b"fake ico data")
        (self.source_dir / "image.png").write_bytes(b"fake png")
        (self.source_dir / "icon.ico").write_bytes(b"fake ico")

        # JSON file with placeholder
        (self.source_dir / "config.json").write_text(
            '{"api": "/__SLURMWEB_BASE__/api", "base": "/__SLURMWEB_BASE__"}'
        )

        # Nested directory structure
        (self.source_dir / "assets").mkdir()
        (self.source_dir / "assets" / "app.js").write_text(
            'import("/__SLURMWEB_BASE__/vendor.js")'
        )
        (self.source_dir / "assets" / "css").mkdir()
        (self.source_dir / "assets" / "css" / "style.css").write_text(
            "body { background: url(/__SLURMWEB_BASE__/bg.png); }"
        )

        target_dir = prepare_ui_assets(self.source_dir, "/gateway")

        # Verify all files and directories were copied
        self.assertTrue((target_dir / "index.html").exists())
        self.assertTrue((target_dir / "app.js").exists())
        self.assertTrue((target_dir / "readme.txt").exists())
        self.assertTrue((target_dir / "style.css").exists())
        self.assertTrue((target_dir / "logo.png").exists())
        self.assertTrue((target_dir / "favicon.ico").exists())
        self.assertTrue((target_dir / "image.png").exists())
        self.assertTrue((target_dir / "icon.ico").exists())
        self.assertTrue((target_dir / "config.json").exists())
        self.assertTrue((target_dir / "assets").is_dir())
        self.assertTrue((target_dir / "assets" / "app.js").exists())
        self.assertTrue((target_dir / "assets" / "css").is_dir())
        self.assertTrue((target_dir / "assets" / "css" / "style.css").exists())

        # Verify placeholder replacement in root level files with placeholder
        index_content = (target_dir / "index.html").read_text()
        self.assertIn("/gateway/assets/app.js", index_content)
        self.assertIn("/gateway/style.css", index_content)
        self.assertIn("/gateway/logo.png", index_content)
        self.assertEqual(index_content.count("/gateway"), 3)
        self.assertNotIn("/__SLURMWEB_BASE__", index_content)

        app_content = (target_dir / "app.js").read_bytes()
        self.assertIn(b"/gateway/assets/vendor.js", app_content)
        self.assertNotIn(b"/__SLURMWEB_BASE__", app_content)

        config_content = (target_dir / "config.json").read_text()
        self.assertIn("/gateway/api", config_content)
        self.assertIn("/gateway", config_content)
        self.assertNotIn("/__SLURMWEB_BASE__", config_content)

        # Verify placeholder replacement in nested files
        nested_app_content = (target_dir / "assets" / "app.js").read_text()
        self.assertIn("/gateway/vendor.js", nested_app_content)
        self.assertNotIn("/__SLURMWEB_BASE__", nested_app_content)

        nested_css_content = (target_dir / "assets" / "css" / "style.css").read_text()
        self.assertIn("/gateway/bg.png", nested_css_content)
        self.assertNotIn("/__SLURMWEB_BASE__", nested_css_content)

        # Verify files without placeholder are unchanged
        self.assertEqual((target_dir / "readme.txt").read_text(), "Readme content")
        self.assertEqual((target_dir / "style.css").read_text(), "body { color: red; }")

        # Verify binary files are unchanged (skipped from replacement)
        self.assertEqual(
            (target_dir / "logo.png").read_bytes(),
            b"\x89PNG\r\n\x1a\nfake png data",
        )
        self.assertEqual((target_dir / "favicon.ico").read_bytes(), b"fake ico data")
        self.assertEqual((target_dir / "image.png").read_bytes(), b"fake png")
        self.assertEqual((target_dir / "icon.ico").read_bytes(), b"fake ico")

    def test_prefix_without_leading_slash(self):
        """Test that prefixes without a leading slash raise an error."""
        (self.source_dir / "test.txt").write_text("/__SLURMWEB_BASE__/test")

        with self.assertRaisesRegex(
            SlurmwebRuntimeError,
            r"^UI prefix 'gateway' must start with a slash or be empty$",
        ):
            prepare_ui_assets(self.source_dir, "gateway")

    def test_source_path_not_exists(self):
        """Test that non-existent source path raises SlurmwebRuntimeError."""
        non_existent = Path("/nonexistent/path/that/does/not/exist")
        with self.assertRaises(SlurmwebRuntimeError) as cm:
            prepare_ui_assets(non_existent, "/")
        self.assertIn("does not exist", str(cm.exception))

    def test_binary_files_skipped_from_replacement(self):
        """Test that PNG and ICO files are copied without replacement."""
        # Create binary files (simulated)
        logo_path = self.source_dir / "logo.png"
        favicon_path = self.source_dir / "favicon.ico"
        logo_path.write_bytes(b"\x89PNG\r\n\x1a\nfake png data")
        favicon_path.write_bytes(b"fake ico data")

        with self.assertLogs("slurmweb.ui", level="DEBUG") as cm:
            target_dir = prepare_ui_assets(self.source_dir, "/gateway")

        # Verify debug logs for binary files
        self.assertIn(
            f"DEBUG:slurmweb.ui:Copying binary file {logo_path} without replacement",
            cm.output,
        )
        self.assertIn(
            f"DEBUG:slurmweb.ui:Copying binary file {favicon_path} without replacement",
            cm.output,
        )
        # Verify info log for successful preparation
        self.assertTrue(
            any("INFO:slurmweb.ui:Prepared UI assets" in log for log in cm.output)
        )

        # Verify files were copied
        self.assertTrue((target_dir / "logo.png").exists())
        self.assertTrue((target_dir / "favicon.ico").exists())

        # Verify content unchanged (even if placeholder-like bytes exist)
        self.assertEqual(
            (target_dir / "logo.png").read_bytes(),
            b"\x89PNG\r\n\x1a\nfake png data",
        )
        self.assertEqual((target_dir / "favicon.ico").read_bytes(), b"fake ico data")

    def test_symlinks(self):
        """Test that symlinks are preserved."""
        # Create a file and a symlink to it
        (self.source_dir / "target.txt").write_text("target content")
        (self.source_dir / "link.txt").symlink_to("target.txt")

        target_dir = prepare_ui_assets(self.source_dir, "/")

        # Verify symlink exists and points to correct target
        self.assertTrue((target_dir / "link.txt").is_symlink())
        self.assertEqual(os.readlink(target_dir / "link.txt"), "target.txt")

    def test_temporary_directory_creation(self):
        """Test that temporary directory is created when RUNTIME_DIRECTORY not set."""
        # Ensure RUNTIME_DIRECTORY is not set
        with mock.patch.dict(os.environ, {}, clear=False):
            if "RUNTIME_DIRECTORY" in os.environ:
                del os.environ["RUNTIME_DIRECTORY"]

            (self.source_dir / "test.txt").write_text("test")

            target_dir = prepare_ui_assets(self.source_dir, "/")

            # Verify target directory exists and is a temporary directory
            self.assertTrue(target_dir.exists())
            self.assertTrue(target_dir.is_dir())
            # Temporary directories typically have a specific prefix
            self.assertIn("slurmweb-ui-", str(target_dir))

    def test_systemd_runtime_directory(self):
        """Test using systemd RUNTIME_DIRECTORY when set."""
        runtime_root = Path(tempfile.mkdtemp(prefix="slurmweb-test-runtime-"))
        self.addCleanup(shutil.rmtree, runtime_root)

        with mock.patch.dict(os.environ, {"RUNTIME_DIRECTORY": str(runtime_root)}):
            (self.source_dir / "test.txt").write_text("test")

            target_dir = prepare_ui_assets(self.source_dir, "/")

            # Verify target directory is in runtime directory
            self.assertEqual(target_dir, runtime_root / "ui")
            self.assertTrue(target_dir.exists())
            self.assertTrue((target_dir / "test.txt").exists())

    def test_systemd_runtime_directory_cleanup_existing(self):
        """Test that existing ui directory in runtime directory is cleaned up."""
        runtime_root = Path(tempfile.mkdtemp(prefix="slurmweb-test-runtime-"))
        self.addCleanup(shutil.rmtree, runtime_root)

        # Create existing ui directory with old content
        ui_dir = runtime_root / "ui"
        ui_dir.mkdir()
        (ui_dir / "old.txt").write_text("old content")

        with mock.patch.dict(os.environ, {"RUNTIME_DIRECTORY": str(runtime_root)}):
            (self.source_dir / "new.txt").write_text("new content")

            target_dir = prepare_ui_assets(self.source_dir, "/")

            # Verify old content is gone and new content exists
            self.assertFalse((target_dir / "old.txt").exists())
            self.assertTrue((target_dir / "new.txt").exists())

    def test_systemd_runtime_directory_not_exists(self):
        """Test error when systemd runtime directory doesn't exist."""

        with mock.patch.dict(
            os.environ, {"RUNTIME_DIRECTORY": "/nonexistent/runtime/dir"}
        ):
            (self.source_dir / "test.txt").write_text("test")

            with self.assertRaisesRegex(
                SlurmwebRuntimeError, "^Systemd runtime directory .* does not exist$"
            ):
                prepare_ui_assets(self.source_dir, "/")
