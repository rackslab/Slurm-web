# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: GPL-3.0-or-later


from unittest import mock
import warnings
from pathlib import Path
import json
import copy

import requests

ASSETS = Path(__file__).parent.resolve() / ".." / "tests" / "assets"


def slurm_versions():
    for path in (ASSETS / "slurmrestd").iterdir():
        yield path.name


def load_asset(path: Path):
    with open(ASSETS / path) as f:
        return f.read()


def load_json_asset(path: Path):
    with open(ASSETS / path) as f:
        return json.load(f)


def all_slurm_versions(test):
    """Split test with a subtest for every slurm versions"""

    def inner(self, *args, **kwargs):
        for slurm_version in slurm_versions():
            with self.subTest(
                msg=f"slurm {slurm_version}", slurm_version=slurm_version
            ):
                test(self, slurm_version, *args, **kwargs)

    return inner


class SlurmwebAssetUnavailable(Exception):
    pass


def mock_slurmrestd_responses(slurmrestd, slurm_version, assets):
    responses = []
    results = []

    with open(ASSETS / f"slurmrestd/{slurm_version}/status.json") as fh:
        requests_statuses = json.load(fh)

    for asset_name, key in assets:
        if asset_name not in requests_statuses:
            warnings.warn(
                f"Unable to find asset {asset_name} in requests status file for Slurm "
                f"{slurm_version}"
            )
            raise SlurmwebAssetUnavailable()

        is_json = True
        if requests_statuses[asset_name]["content-type"] == "application/json":
            asset = load_json_asset(f"slurmrestd/{slurm_version}/{asset_name}.json")
            # Copy asset as it is modified during test processing and we need to keep
            # original value for comparison.
            original = copy.deepcopy(asset)
        else:
            is_json = False
            asset = load_asset(f"slurmrestd/{slurm_version}/{asset_name}.txt")
            original = asset
        fake_response = mock.create_autospec(requests.Response)
        fake_response.url = "/mocked/query"
        fake_response.status_code = requests_statuses[asset_name]["status"]
        fake_response.headers = {
            "content-type": requests_statuses[asset_name]["content-type"]
        }
        if is_json:
            fake_response.json = mock.Mock(return_value=asset)
        else:
            fake_response.text = mock.PropertyMock(return_value=asset)
        responses.append(fake_response)
        if key is not None:
            results.append(original[key])
        else:
            results.append(original)

    if len(responses) > 1:
        slurmrestd.session.get = mock.Mock(side_effect=responses)
    else:
        slurmrestd.session.get = mock.Mock(return_value=responses[0])

    return results
