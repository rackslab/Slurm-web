# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT


from unittest import mock
from pathlib import Path
import json
import copy

import requests
import flask
import aiohttp
import parameterized

ASSETS = Path(__file__).parent.resolve() / ".." / ".." / ".." / "tests" / "assets"


def slurm_versions():
    return [path.name for path in (ASSETS / "slurmrestd").iterdir()]


def load_asset(path: Path):
    with open(ASSETS / path) as f:
        return f.read()


def load_json_asset(path: Path):
    with open(ASSETS / path) as f:
        return json.load(f)


all_slurm_versions = parameterized.parameterized.expand(slurm_versions())


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
            raise SlurmwebAssetUnavailable(
                f"Unable to find asset {asset_name} in requests status file for Slurm "
                f"{slurm_version}"
            )

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
            type(fake_response).text = mock.PropertyMock(return_value=asset)
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
        raise SlurmwebAssetUnavailable(
            f"Unable to find asset {asset_name} for component {component}"
        )

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
        type(response).text = mock.PropertyMock(return_value=asset)

    return asset, response


class AsyncContextManagerMock:
    """Mock for async context managers for aiohttp responses."""

    def __init__(self, mock):
        """Initialize with a mock that will be returned from __aenter__."""
        self.mock = mock

    async def __aenter__(self):
        """Enter async context manager."""
        return self.mock

    async def __aexit__(self, exc_type, exc, tb):
        """Exit async context manager."""
        pass


def async_mock(content, fail_content_type: bool):
    """Unfortunately, mock.AsyncMock is not available in Python >= 3.8. When this class
    is not available, return a dumb awaitable."""
    exception = aiohttp.client_exceptions.ContentTypeError(
        aiohttp.client_reqrep.RequestInfo("http://localhost/info", "GET", {}),
        (),
    )
    try:
        if fail_content_type:
            return mock.AsyncMock(side_effect=exception)
        return mock.AsyncMock(return_value=content)
    except AttributeError:

        async def _awaitable():
            if fail_content_type:
                raise exception
            return content

        return _awaitable


def mock_component_aio_response(
    component: str,
    asset=None,
    status=200,
    content=None,
    is_json=True,
    fail_content_type=False,
):
    """Return mocked aiohttp Response corresponding to the given component asset. If
    asset is None, use status and json."""
    if component and asset:
        with open(ASSETS / component / "status.json") as fh:
            requests_statuses = json.load(fh)

        if asset not in requests_statuses:
            raise SlurmwebAssetUnavailable(
                f"Unable to find asset {asset} for component {component}"
            )

        is_json = True
        if requests_statuses[asset]["content-type"] == "application/json":
            content = load_json_asset(f"{component}/{asset}.json")
        else:
            is_json = False
            content = load_asset(f"{component}/{asset}.txt")
        status = requests_statuses[asset]["status"]
    else:
        assert content

    response = mock.create_autospec(aiohttp.client_reqrep.ClientResponse)
    response.status = status
    if is_json:
        response.headers = {"content-type": "application/json"}
        response.json = async_mock(content, fail_content_type)
    else:
        response.headers = {"content-type": "text/plain"}
        response.json = async_mock(content, fail_content_type)

    return content, AsyncContextManagerMock(response)


def mock_agent_aio_response(
    asset=None, status=200, content=None, is_json=True, fail_content_type=False
):
    """Return mocked aiohttp Response corresponding to the given agent asset. If
    asset is None, use status and json."""
    return mock_component_aio_response(
        "agent", asset, status, content, is_json, fail_content_type
    )


def mock_prometheus_response(asset_name):
    """Return mocked requests Response corresponding to the given Prometheus asset."""
    return mock_component_aio_response("prometheus", asset_name)
