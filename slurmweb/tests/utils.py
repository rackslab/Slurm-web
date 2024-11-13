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
import flask

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


class SlurmwebCustomTestResponse(flask.Response):
    """Custom flask Response class to backport text property of
    werkzeug.test.TestResponse class on werkzeug < 2.1 on Python 3.6."""

    @property
    def text(self):
        return self.get_data(as_text=True)


def fake_text_response():
    """Return a real requests.Response() initialized with fake text content, designed
    to fail when parsed in JSON."""
    response = requests.Response()
    text = "fake content"
    response.url = "/mocked/query"
    response.status_code = 200
    response.headers = {"content-type": "text/plain"}
    response._content = text.encode()
    return text, response


def mock_component_response(component, asset_name, remove_key=None):
    """Return mocked requests Response corresponding to the given component asset."""
    with open(ASSETS / component / "status.json") as fh:
        requests_statuses = json.load(fh)

    if asset_name not in requests_statuses:
        warnings.warn(
            f"Unable to find asset {asset_name} in {component} requests status file"
        )
        raise SlurmwebAssetUnavailable()

    is_json = True
    if requests_statuses[asset_name]["content-type"] == "application/json":
        asset = load_json_asset(f"{component}/{asset_name}.json")
    else:
        is_json = False
        asset = load_asset(f"{component}/{asset_name}.txt")

    # Remove specific key from asset, if JSON asset and key to remove is specified. This
    # is useful to test some error case.
    if is_json and remove_key:
        del asset[remove_key]

    response = mock.create_autospec(requests.Response)
    response.url = "/mocked/query"
    response.status_code = requests_statuses[asset_name]["status"]
    response.headers = {"content-type": requests_statuses[asset_name]["content-type"]}
    if is_json:
        response.json = mock.Mock(return_value=asset)
    else:
        response.text = mock.PropertyMock(return_value=asset)

    return asset, response


def mock_agent_response(asset_name, remove_key=None):
    """Return mocked requests Response corresponding to the given agent asset."""
    return mock_component_response("agent", asset_name, remove_key)


def mock_prometheus_response(asset_name):
    """Return mocked requests Response corresponding to the given Prometheus asset."""
    return mock_component_response("prometheus", asset_name)


class RemoveActionInPolicy:
    """Context manager to temporarily remove an action from a role in policy."""

    def __init__(self, policy, role, action):
        self.policy = policy
        self.role = role
        self.action = action
        self.removed_in_anonymous = False

    def __enter__(self):
        for _role in self.policy.loader.roles:
            if _role.name == self.role:
                _role.actions.remove(self.action)
            if _role.name == "anonymous" and self.action in _role.actions:
                _role.actions.remove(self.action)
                self.removed_in_anonymous = True

    def __exit__(self, exc_type, exc_val, exc_tb):
        for _role in self.policy.loader.roles:
            if _role.name == self.role:
                _role.actions.add(self.action)
            if _role.name == "anonymous" and self.removed_in_anonymous:
                _role.actions.add(self.action)
