# Copyright (c) 2024 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import socket
import logging

from urllib3.connection import HTTPConnection
from urllib3.connectionpool import HTTPConnectionPool
from requests.adapters import HTTPAdapter

logger = logging.getLogger(__name__)


class SlurmrestdUnixConnection(HTTPConnection):
    def __init__(self, path):
        super().__init__("localhost")
        self.path = path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        logger.debug("Connecting to unix socket %s", self.path)
        self.sock.connect(str(self.path))


class SlurmrestdUnixConnectionPool(HTTPConnectionPool):
    def __init__(self, path):
        super().__init__("localhost")
        self.path = path

    def _new_conn(self):
        return SlurmrestdUnixConnection(self.path)


class SlurmrestdUnixAdapter(HTTPAdapter):
    def __init__(self, path):
        super().__init__()
        self.path = path

    # Required by Requests >= 2.32.2. For reference:
    # https://github.com/psf/requests/pull/6710
    #
    # As mentionned by Requests maintainers, this is backwards compatible between
    # versions of Requests.
    def get_connection_with_tls_context(self, request, verify, proxies=None, cert=None):
        return self.get_connection(request.url, proxies)

    def get_connection(self, url, proxies=None):
        return SlurmrestdUnixConnectionPool(self.path)
