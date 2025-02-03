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

ASSETS = Path(__file__).parent.resolve() / ".." / ".." / ".." / "tests" / "assets"


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


def any_slurm_version(test):
    """Return test with first slurm version"""

    def inner(self, *args, **kwargs):
        for slurm_version in slurm_versions():
            test(self, slurm_version, *args, **kwargs)
            break

    return inner


def flask_version():
    """Return version of Flask package as a tuple of integers."""
    import importlib

    try:
        version = importlib.metadata.version("flask")
    except AttributeError:
        version = flask.__version__
    return tuple([int(digit) for digit in version.split(".")])


# Flask 404 description message has changed in recent versions (one space has been
# removed). Some tests check this message is used, they use this variable which is
# defined depending on the version of Flask package found in the environment.
if flask_version() < (1, 0, 0):
    flask_404_description = (
        "The requested URL was not found on the server.  If you entered the URL "
        "manually please check your spelling and try again."
    )
else:
    flask_404_description = (
        "The requested URL was not found on the server. If you entered the URL "
        "manually please check your spelling and try again."
    )


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
    werkzeug.test.TestResponse class on werkzeug < 0.15."""

    @property
    def text(self):
        return self.get_data(as_text=True)

    @property
    def json(self):
        if self.mimetype != "application/json":
            return None
        return json.loads(self.text)


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


def mock_component_response(component, asset_name):
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

    response = mock.create_autospec(requests.Response)
    response.url = "/mocked/query"
    response.status_code = requests_statuses[asset_name]["status"]
    response.headers = {"content-type": requests_statuses[asset_name]["content-type"]}
    if is_json:
        response.json = mock.Mock(return_value=asset)
    else:
        response.text = mock.PropertyMock(return_value=asset)

    return asset, response


def mock_agent_response(asset_name):
    """Return mocked requests Response corresponding to the given agent asset."""
    return mock_component_response("agent", asset_name)


def mock_prometheus_response(asset_name):
    """Return mocked requests Response corresponding to the given Prometheus asset."""
    return mock_component_response("prometheus", asset_name)
