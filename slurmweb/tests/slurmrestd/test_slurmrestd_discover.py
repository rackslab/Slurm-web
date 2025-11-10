# Copyright (c) 2025 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from unittest import mock
import urllib

from slurmweb.slurmrestd import Slurmrestd
from slurmweb.slurmrestd.errors import (
    SlurmrestConnectionError,
    SlurmrestdAuthenticationError,
    SlurmrestdNotFoundError,
    SlurmrestdInvalidResponseError,
    SlurmrestdInternalError,
)
from ..lib.utils import all_slurm_versions, load_json_asset, ASSETS
from ..lib.slurmrestd import TestSlurmrestdBase, basic_authentifier


class TestSlurmrestdDiscover(TestSlurmrestdBase):
    def setUp(self):
        self.slurmrestd = Slurmrestd(
            urllib.parse.urlparse("unix:///dev/null"),
            basic_authentifier(),
            ["0.0.44", "0.0.43", "0.0.42", "0.0.41"],
        )

    def setup_execute_request_mock(
        self,
        slurm_version: str,
        responses: list[Exception | str],
    ) -> tuple[dict | None, ...]:
        """Set up mock for _execute_request() method.

        Args:
            slurm_version: Slurm version to load assets from.
            responses: List of responses/exceptions/asset names to return. Each item
                can be:
                - An Exception (to raise)
                - A str (asset name to load from slurm_version)

        Returns:
            Tuple of loaded asset dicts (None for exceptions) in the same order as
            responses. Assets are returned so tests don't need to reload them.
        """
        # Process responses: load assets if they're strings
        processed_responses = []
        returned_assets = []
        for response in responses:
            if isinstance(response, str):
                asset = load_json_asset(
                    ASSETS / "slurmrestd" / slurm_version / f"{response}.json"
                )
                processed_responses.append(asset)
                returned_assets.append(asset)
            elif isinstance(response, Exception):
                processed_responses.append(response)
                returned_assets.append(None)

        # Use provided responses
        if len(processed_responses) == 1:
            if isinstance(processed_responses[0], Exception):
                self.slurmrestd._execute_request = mock.Mock(
                    side_effect=processed_responses[0]
                )
            else:
                self.slurmrestd._execute_request = mock.Mock(
                    return_value=processed_responses[0]
                )
        else:
            self.slurmrestd._execute_request = mock.Mock(
                side_effect=processed_responses
            )
        return tuple(returned_assets)

    @all_slurm_versions
    def test_discover_success_first_version(self, slurm_version):
        """Test successful discovery on first API version."""
        (ping_asset,) = self.setup_execute_request_mock(slurm_version, ["slurm-ping"])

        with self.assertLogs("slurmweb.slurmrestd", level="INFO") as cm:
            cluster_name, discovered_slurm_version, api_version = (
                self.slurmrestd.discover()
            )

        self.assertEqual(cluster_name, ping_asset["meta"]["slurm"]["cluster"])
        self.assertEqual(
            discovered_slurm_version, ping_asset["meta"]["slurm"]["release"]
        )
        self.assertEqual(api_version, "0.0.44")
        # Verify values are cached
        self.assertEqual(self.slurmrestd.cluster_name, cluster_name)
        self.assertEqual(self.slurmrestd.slurm_version, discovered_slurm_version)
        self.assertEqual(self.slurmrestd.api_version, api_version)
        # Verify _execute_request was called with correct parameters
        self.slurmrestd._execute_request.assert_called_once_with(
            "slurm", "0.0.44", "ping", ignore_notfound=True
        )
        # Verify INFO log was emitted
        self.assertIn(
            f"INFO:slurmweb.slurmrestd:Discovered slurmrestd Slurm version: "
            f"{discovered_slurm_version} and API version: {api_version}",
            cm.output,
        )

    @all_slurm_versions
    def test_discover_success_second_version(self, slurm_version):
        """Test successful discovery on second API version (first returns 404)."""
        # Mock _execute_request: first call raises NotFound, second succeeds
        _, ping_asset = self.setup_execute_request_mock(
            slurm_version,
            [
                SlurmrestdNotFoundError("/slurm/v0.0.44/ping"),
                "slurm-ping",
            ],
        )

        with self.assertLogs("slurmweb.slurmrestd", level="DEBUG") as cm:
            cluster_name, discovered_slurm_version, api_version = (
                self.slurmrestd.discover()
            )

        self.assertEqual(cluster_name, ping_asset["meta"]["slurm"]["cluster"])
        self.assertEqual(
            discovered_slurm_version, ping_asset["meta"]["slurm"]["release"]
        )
        self.assertEqual(api_version, "0.0.43")
        # Verify _execute_request was called twice
        self.assertEqual(self.slurmrestd._execute_request.call_count, 2)
        # Verify calls were made with correct versions
        calls = self.slurmrestd._execute_request.call_args_list
        self.assertEqual(calls[0][0], ("slurm", "0.0.44", "ping"))
        self.assertEqual(calls[1][0], ("slurm", "0.0.43", "ping"))
        # Verify DEBUG log for first version and INFO log for second
        self.assertIn(
            "DEBUG:slurmweb.slurmrestd:Slurmrestd API version 0.0.44 not supported, "
            "trying next",
            cm.output,
        )
        self.assertIn(
            f"INFO:slurmweb.slurmrestd:Discovered slurmrestd Slurm version: "
            f"{discovered_slurm_version} and API version: {api_version}",
            cm.output,
        )

    def test_discover_already_discovered(self):
        """Test that discover() returns cached values if already discovered."""
        # Mock _execute_request to verify it's not called
        self.slurmrestd._execute_request = mock.Mock()
        self.slurmrestd.cluster_name = "foo"
        self.slurmrestd.slurm_version = "25.11.0"
        self.slurmrestd.api_version = "0.0.44"

        result = self.slurmrestd.discover()

        self.assertEqual(result, ("foo", "25.11.0", "0.0.44"))
        # Verify _execute_request was not called
        self.slurmrestd._execute_request.assert_not_called()

    def test_discover_connection_error(self):
        """Test that connection error breaks the loop and raises."""
        self.setup_execute_request_mock(
            "25.11", [SlurmrestConnectionError("connection failed")]
        )

        with self.assertRaisesRegex(SlurmrestConnectionError, "^connection failed$"):
            self.slurmrestd.discover()

        # Should only try first version before breaking
        self.slurmrestd._execute_request.assert_called_once_with(
            "slurm", "0.0.44", "ping", ignore_notfound=True
        )

    def test_discover_authentication_error(self):
        """Test that authentication error breaks the loop and raises."""
        self.setup_execute_request_mock(
            "25.11", [SlurmrestdAuthenticationError("/slurm/v0.0.44/ping")]
        )

        with self.assertRaises(SlurmrestdAuthenticationError):
            self.slurmrestd.discover()

        # Should only try first version before breaking
        self.slurmrestd._execute_request.assert_called_once_with(
            "slurm", "0.0.44", "ping", ignore_notfound=True
        )

    def test_discover_all_versions_fail_404(self):
        """Test that all versions returning 404 raises connection error."""
        self.setup_execute_request_mock(
            "25.11", [SlurmrestdNotFoundError("/slurm/v0.0.44/ping")]
        )

        with self.assertLogs("slurmweb.slurmrestd", level="DEBUG") as cm:
            with self.assertRaisesRegex(
                SlurmrestConnectionError,
                "^Unable to discover slurmrestd API version\\. "
                f"Tried versions: {', '.join(self.slurmrestd.supported_versions)}$",
            ):
                self.slurmrestd.discover()

        # Should try all 4 versions
        self.assertEqual(self.slurmrestd._execute_request.call_count, 4)
        # Verify all versions were tried
        calls = [call[0] for call in self.slurmrestd._execute_request.call_args_list]
        self.assertEqual(calls[0], ("slurm", "0.0.44", "ping"))
        self.assertEqual(calls[1], ("slurm", "0.0.43", "ping"))
        self.assertEqual(calls[2], ("slurm", "0.0.42", "ping"))
        self.assertEqual(calls[3], ("slurm", "0.0.41", "ping"))
        # Verify DEBUG logs for all versions
        self.assertEqual(len(cm.output), 4)
        for version in self.slurmrestd.supported_versions:
            self.assertIn(
                f"DEBUG:slurmweb.slurmrestd:Slurmrestd API version {version} not "
                "supported, trying next",
                cm.output,
            )

    def test_discover_invalid_response_continues(self):
        """Test that invalid response error continues to next version."""
        # Mock _execute_request: first call raises InvalidResponse, second succeeds
        _, ping_asset = self.setup_execute_request_mock(
            "25.11",
            [
                SlurmrestdInvalidResponseError(
                    "Unsupported Content-Type for slurmrestd response: text/plain"
                ),
                "slurm-ping",
            ],
        )

        with self.assertLogs("slurmweb.slurmrestd", level="INFO") as cm:
            cluster_name, discovered_slurm_version, api_version = (
                self.slurmrestd.discover()
            )

        self.assertEqual(api_version, "0.0.43")
        # Should try first version (fails), then second version (succeeds)
        self.assertEqual(self.slurmrestd._execute_request.call_count, 2)
        # Verify WARNING log for first version and INFO log for second
        self.assertIn(
            "WARNING:slurmweb.slurmrestd:Unable to parse Slurmrestd API ping response "
            "for version 0.0.44: Unsupported Content-Type for slurmrestd response: "
            "text/plain",
            cm.output,
        )
        self.assertIn(
            f"INFO:slurmweb.slurmrestd:Discovered slurmrestd Slurm version: "
            f"{discovered_slurm_version} and API version: {api_version}",
            cm.output,
        )

    def test_discover_internal_error_continues(self):
        """Test that internal error continues to next version."""
        # Mock _execute_request: first call raises InternalError, second succeeds
        _, ping_asset = self.setup_execute_request_mock(
            "25.11",
            [
                SlurmrestdInternalError("test", -1, "test description", "test source"),
                "slurm-ping",
            ],
        )

        with self.assertLogs("slurmweb.slurmrestd", level="INFO") as cm:
            cluster_name, discovered_slurm_version, api_version = (
                self.slurmrestd.discover()
            )

        self.assertEqual(api_version, "0.0.43")
        # Should try first version (fails), then second version (succeeds)
        self.assertEqual(self.slurmrestd._execute_request.call_count, 2)
        # Verify WARNING log for first version and INFO log for second
        self.assertIn(
            "WARNING:slurmweb.slurmrestd:Unable to parse Slurmrestd API ping response "
            "for version 0.0.44: SlurwebRestdError(test, -1, test description, "
            "test source)",
            cm.output,
        )
        self.assertIn(
            f"INFO:slurmweb.slurmrestd:Discovered slurmrestd Slurm version: "
            f"{discovered_slurm_version} and API version: {api_version}",
            cm.output,
        )

    def test_discover_missing_keys_continues(self):
        """Test that missing keys in response continues to next version."""
        # Mock _execute_request: first call raises KeyError (missing "meta" key),
        # second succeeds
        _, ping_asset = self.setup_execute_request_mock(
            "25.11",
            [
                KeyError("meta"),  # Simulates missing "meta" key in response
                "slurm-ping",
            ],
        )

        with self.assertLogs("slurmweb.slurmrestd", level="INFO") as cm:
            cluster_name, discovered_slurm_version, api_version = (
                self.slurmrestd.discover()
            )

        self.assertEqual(api_version, "0.0.43")
        # Should try first version (fails), then second version (succeeds)
        self.assertEqual(self.slurmrestd._execute_request.call_count, 2)
        # Verify WARNING log for first version and INFO log for second
        self.assertIn(
            "WARNING:slurmweb.slurmrestd:Unable to parse Slurmrestd API ping response "
            "for version 0.0.44: 'meta'",
            cm.output,
        )
        self.assertIn(
            f"INFO:slurmweb.slurmrestd:Discovered slurmrestd Slurm version: "
            f"{discovered_slurm_version} and API version: {api_version}",
            cm.output,
        )

    @all_slurm_versions
    def test_discover_called_by_request(self, slurm_version):
        """Test that _request() calls discover() if api_version is None."""
        [ping_asset, jobs_asset] = self.mock_slurmrestd_responses(
            slurm_version,
            [("slurm-ping", "meta"), ("slurm-jobs", "jobs")],
        )

        # Reset api_version to None to trigger discover
        self.slurmrestd.api_version = None
        self.slurmrestd.cluster_name = None
        self.slurmrestd.slurm_version = None

        jobs = self.slurmrestd.jobs()

        # Verify discover was called (ping was requested)
        self.assertGreaterEqual(self.slurmrestd.session.get.call_count, 2)
        # Verify api_version was set
        self.assertIsNotNone(self.slurmrestd.api_version)
        # Verify jobs were returned
        self.assertEqual(jobs, jobs_asset)
