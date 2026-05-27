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

from slurmweb.ui import SlurmwebFrontend, SlurmwebFrontendEnvSettings
from slurmweb.errors import SlurmwebConfigurationError, SlurmwebRuntimeError


class TestingUISettings:
    """Minimal stand-in for gateway [ui] RFL settings in unit tests."""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class TestSlurmwebFrontend(unittest.TestCase):
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

    def _frontend(self, **settings):
        """Return a SlurmwebFrontend bound to the test source tree."""
        return SlurmwebFrontend(TestingUISettings(path=self.source_dir, **settings))

    def test_prepare_assets(self):
        """Comprehensive test for prepare_assets covering multiple scenarios."""
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

        target_dir = self._frontend().prepare_assets("/gateway")

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

    def test_overlay_branding(self):
        """Test custom logos and favicon are copied into prepared UI assets."""
        (self.source_dir / "favicon.ico").write_bytes(b"default favicon")
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as logo_fh:
            custom_logo = Path(logo_fh.name)
        with tempfile.NamedTemporaryFile(suffix=".ico", delete=False) as favicon_fh:
            custom_favicon = Path(favicon_fh.name)
        self.addCleanup(lambda: custom_logo.unlink())
        self.addCleanup(lambda: custom_favicon.unlink())
        custom_logo.write_bytes(b"\x89PNG\r\n\x1a\ncustom logo")
        custom_favicon.write_bytes(b"custom favicon")

        frontend = self._frontend(logo_login=custom_logo, favicon=custom_favicon)
        target_dir = frontend.prepare_assets("/gateway")

        self.assertEqual(
            frontend.runtime_config("/gateway")["LOGO_LOGIN"],
            "/gateway/logo/brand_login.png",
        )
        self.assertEqual(
            (target_dir / "logo" / "brand_login.png").read_bytes(),
            b"\x89PNG\r\n\x1a\ncustom logo",
        )
        self.assertEqual(
            (target_dir / "favicon.ico").read_bytes(),
            b"custom favicon",
        )

    def test_overlay_branding_replaces_symlink_favicon(self):
        """Test custom favicon overwrites a symlink left by prepare_assets copy."""
        (self.source_dir / "default.ico").write_bytes(b"default favicon")
        (self.source_dir / "favicon.ico").symlink_to("default.ico")
        with tempfile.NamedTemporaryFile(suffix=".ico", delete=False) as favicon_fh:
            custom_favicon = Path(favicon_fh.name)
        self.addCleanup(lambda: custom_favicon.unlink())
        custom_favicon.write_bytes(b"custom favicon")

        target_dir = self._frontend(favicon=custom_favicon).prepare_assets("/")

        self.assertFalse((target_dir / "favicon.ico").is_symlink())
        self.assertEqual(
            (target_dir / "favicon.ico").read_bytes(),
            b"custom favicon",
        )

    def test_prepare_assets_skip_copy(self):
        """Test prepare_assets with SLURMWEB_DEV_UI_SKIP_COPY env set."""
        (self.source_dir / "config.json").write_text('{"base": "/"}')
        os.environ[SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_SKIP_COPY] = "1"
        self.addCleanup(
            os.environ.pop, SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_SKIP_COPY, None
        )

        frontend = self._frontend()
        target_dir = frontend.prepare_assets("/")

        self.assertEqual(target_dir, self.source_dir.resolve())
        self.assertNotIn("slurmweb-ui-", str(target_dir))
        self.assertEqual(frontend._logo_files, {})

    def test_prepare_assets_dev_ui_assets_dir(self):
        """Test SLURMWEB_DEV_UI_ASSETS_DIR copies public tree and overlays branding."""
        (self.source_dir / "config.json").write_text('{"base": "/"}')
        assets_dir = Path(tempfile.mkdtemp(prefix="slurmweb-test-ui-assets-"))
        self.addCleanup(lambda: shutil.rmtree(assets_dir, ignore_errors=True))
        os.environ[SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_ASSETS_DIR] = str(
            assets_dir
        )
        self.addCleanup(
            os.environ.pop,
            SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_ASSETS_DIR,
            None,
        )

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as logo_fh:
            custom_logo = Path(logo_fh.name)
        with tempfile.NamedTemporaryFile(suffix=".ico", delete=False) as favicon_fh:
            custom_favicon = Path(favicon_fh.name)
        self.addCleanup(lambda: custom_logo.exists() and custom_logo.unlink())
        self.addCleanup(lambda: custom_favicon.exists() and custom_favicon.unlink())
        custom_logo.write_bytes(b"\x89PNG\r\n\x1a\ncustom logo")
        custom_favicon.write_bytes(b"custom favicon")

        frontend = self._frontend(logo_login=custom_logo, favicon=custom_favicon)
        target_dir = frontend.prepare_assets("/gateway")

        self.assertEqual(target_dir, assets_dir.resolve())
        self.assertEqual(
            (target_dir / "logo" / "brand_login.png").read_bytes(),
            b"\x89PNG\r\n\x1a\ncustom logo",
        )
        self.assertEqual(
            (target_dir / "favicon.ico").read_bytes(),
            b"custom favicon",
        )
        self.assertEqual(
            frontend.runtime_config("/gateway")["LOGO_LOGIN"],
            "/gateway/logo/brand_login.png",
        )

    def test_prefix_without_leading_slash(self):
        """Test that prefixes without a leading slash raise an error."""
        (self.source_dir / "test.txt").write_text("/__SLURMWEB_BASE__/test")

        with self.assertRaisesRegex(
            SlurmwebRuntimeError,
            r"^UI prefix 'gateway' must start with a slash or be empty$",
        ):
            self._frontend().prepare_assets("gateway")

    def test_source_path_not_exists(self):
        """Test that non-existent source path raises SlurmwebRuntimeError."""
        non_existent = Path("/nonexistent/path/that/does/not/exist")
        with self.assertRaises(SlurmwebRuntimeError) as cm:
            SlurmwebFrontend(TestingUISettings(path=non_existent)).prepare_assets("/")
        self.assertIn("does not exist", str(cm.exception))

    def test_binary_files_skipped_from_replacement(self):
        """Test that PNG and ICO files are copied without replacement."""
        # Create binary files (simulated)
        logo_path = self.source_dir / "logo.png"
        favicon_path = self.source_dir / "favicon.ico"
        logo_path.write_bytes(b"\x89PNG\r\n\x1a\nfake png data")
        favicon_path.write_bytes(b"fake ico data")

        with self.assertLogs("slurmweb.ui", level="DEBUG") as cm:
            target_dir = self._frontend().prepare_assets("/gateway")

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
        """Test that symlinks are copied as regular files with resolved content."""
        (self.source_dir / "target.txt").write_text("target content")
        (self.source_dir / "link.txt").symlink_to("target.txt")

        target_dir = self._frontend().prepare_assets("/")

        self.assertTrue((target_dir / "link.txt").is_file())
        self.assertFalse((target_dir / "link.txt").is_symlink())
        self.assertEqual((target_dir / "link.txt").read_text(), "target content")

    def test_temporary_directory_creation(self):
        """Test that temporary directory is created when RUNTIME_DIRECTORY not set."""
        # Ensure RUNTIME_DIRECTORY is not set
        with mock.patch.dict(os.environ, {}, clear=False):
            if "RUNTIME_DIRECTORY" in os.environ:
                del os.environ["RUNTIME_DIRECTORY"]

            (self.source_dir / "test.txt").write_text("test")

            target_dir = self._frontend().prepare_assets("/")

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

            target_dir = self._frontend().prepare_assets("/")

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

            target_dir = self._frontend().prepare_assets("/")

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
                self._frontend().prepare_assets("/")

    def test_assets_path_before_prepare(self):
        """Test assets_path raises when assets have not been prepared."""
        frontend = self._frontend()
        with self.assertRaisesRegex(
            SlurmwebRuntimeError, "^UI assets have not been prepared yet$"
        ):
            frontend.assets_path

    def test_validate_rejects_missing_logo(self):
        """Test validate rejects logo paths that do not exist."""
        with self.assertRaises(SlurmwebConfigurationError):
            SlurmwebFrontend(
                TestingUISettings(logo_login=Path("/nonexistent/logo.png"))
            ).validate()

    def test_runtime_config(self):
        """Test runtime_config builds config.json branding entries."""
        frontend = SlurmwebFrontend(
            TestingUISettings(color_main="#112233", logo_alt="Portal")
        )
        frontend._logo_files = {"logo_login": "brand_login.png"}
        self.assertEqual(
            frontend.runtime_config("/gateway"),
            {
                "COLOR_MAIN": "#112233",
                "LOGO_LOGIN": "/gateway/logo/brand_login.png",
                "LOGO_ALT": "Portal",
            },
        )
