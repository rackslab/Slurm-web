# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later

from unittest import mock
from pathlib import Path

from slurmweb.slurmrestd import SlurmrestdFilteredCached
from slurmweb.cache import CachingService
from slurmweb.errors import SlurmwebCacheError

from ..lib.utils import (
    all_slurm_versions,
    SlurmwebAssetUnavailable,
)
from ..lib.slurmrestd import TestSlurmrestdBase


class TestSlurmrestdFilteredCached(TestSlurmrestdBase):
    def setUp(self):
        self.settings = self.load_agent_settings_definition()
        self.settings.cache.enabled = True
        self.cache = CachingService(
            self.settings.cache.host,
            self.settings.cache.port,
            self.settings.cache.password,
        )
        self.slurmrestd = SlurmrestdFilteredCached(
            Path("/dev/null"),
            "1.0.0",
            self.settings.filters,
            self.settings.cache,
            self.cache,
        )

    @all_slurm_versions
    def test_not_in_cache(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        self.slurmrestd.service.get = mock.Mock(return_value=None)
        self.slurmrestd.service.put = mock.Mock()
        jobs = self.slurmrestd.jobs()
        for idx in range(len(jobs)):
            self.assertEqual(jobs[idx]["job_id"], asset[idx]["job_id"])
        # Check SlurmrestdFilteredCached has tried to get jobs from cache
        self.slurmrestd.service.get.assert_called_once_with("jobs")
        # Check SlurmrestdFilteredCached has up jobs in cache with corresponding
        # expiration timeout.
        self.slurmrestd.service.put.assert_called_once_with(
            "jobs", jobs, self.settings.cache.jobs
        )

    @all_slurm_versions
    def test_in_cache(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        self.slurmrestd.service.get = mock.Mock(return_value=asset)
        self.slurmrestd.service.put = mock.Mock()
        jobs = self.slurmrestd.jobs()
        for idx in range(len(jobs)):
            self.assertEqual(jobs[idx]["job_id"], asset[idx]["job_id"])
        # Check SlurmrestdFilteredCached has tried to get jobs from cache.
        self.slurmrestd.service.get.assert_called_once_with("jobs")
        # Check SlurmrestdFilteredCached has not put jobs again in cache.
        self.slurmrestd.service.put.assert_not_called()

    @all_slurm_versions
    def test_cache_get_error(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        # Check behaviour when SlurmwebCacheError in raised at get()
        self.slurmrestd.service.get = mock.Mock(
            side_effect=SlurmwebCacheError("fake cache error")
        )
        self.slurmrestd.service.put = mock.Mock()
        with self.assertRaisesRegex(SlurmwebCacheError, "^fake cache error$"):
            self.slurmrestd.jobs()
        self.slurmrestd.service.get.assert_called_once_with("jobs")
        self.slurmrestd.service.put.assert_not_called()

    @all_slurm_versions
    def test_cache_put_error(self, slurm_version):
        try:
            [asset] = self.mock_slurmrestd_responses(
                slurm_version, [("slurm-jobs", "jobs")]
            )
        except SlurmwebAssetUnavailable:
            return
        # Check behaviour when SlurmwebCacheError in raised at put()
        self.slurmrestd.service.get = mock.Mock(return_value=None)
        self.slurmrestd.service.put = mock.Mock(
            side_effect=SlurmwebCacheError("fake cache error")
        )
        with self.assertRaisesRegex(SlurmwebCacheError, "^fake cache error$"):
            self.slurmrestd.jobs()
        self.slurmrestd.service.get.assert_called_once_with("jobs")
        self.slurmrestd.service.put.assert_called_once()
