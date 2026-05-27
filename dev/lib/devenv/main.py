# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import argparse
import atexit
import logging
import os
import shutil
import signal
import socket
import sys
import tempfile
import time
from pathlib import Path

import paramiko
from rfl.authentication.jwt import jwt_gen_key
from racksdb import RacksDB

from paths import DEV_ROOT, REALM_IMPORT_FILENAME, REPO_ROOT
from devenv.agent import SlurmwebAgent
from devenv.constants import (
    CLUSTERS,
    DEV_HOST,
    FRONTEND_PORT,
    GATEWAY_SERVICE_PORT,
    USER,
)
from devenv.gateway import SlurmwebGateway
from devenv import keycloak as keycloak_dev
from devenv.ports import PortAllocator

logger = logging.getLogger(__name__)

RACKSDB_SCHEMA = REPO_ROOT.parent / "RacksDB" / "schemas" / "racksdb.yml"


def delete_tmpdir(path: Path):
    logging.info("Removing temporary directory %s", path)
    shutil.rmtree(path)


def main():
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(
        description="Launch Slurm-web development environment"
    )
    parser.add_argument(
        "--no-cache",
        dest="cache",
        action="store_false",
        help="Disable redis cache",
    )
    parser.add_argument(
        "--with-ui",
        dest="ui",
        type=Path,
        help="Path to frontend application",
    )
    parser.add_argument(
        "--no-service-message",
        dest="service_message",
        action="store_false",
        help="Disable service message",
    )
    parser.add_argument(
        "--anonymous",
        action="store_true",
        help="Enable anonymous mode and disable authentication",
    )
    parser.add_argument(
        "--with-keycloak",
        action="store_true",
        help=(
            "Start Keycloak (Podman) with LDAP federation and configure "
            "gateway for OIDC"
        ),
    )
    parser.add_argument(
        "--clusters",
        nargs="+",
        choices=list(CLUSTERS.keys()),
        default=list(CLUSTERS.keys()),
        help="Select specific clusters to launch (default: all clusters)",
    )
    parser.add_argument(
        "--no-metrics",
        dest="metrics",
        action="store_false",
        help="Disable metrics collection globally",
    )
    parser.add_argument(
        "--gateway-prefix",
        default="/",
        help=(
            "URL path prefix under which to serve the gateway application "
            "(default: %(default)s)"
        ),
    )
    parser.add_argument(
        "--branding-theme",
        choices=["green", "orange"],
        help=("Apply a development branding theme (colors, logos, favicon)."),
    )
    args = parser.parse_args()

    if args.with_keycloak and args.anonymous:
        parser.error("--with-keycloak cannot be used with --anonymous")

    podman = None
    if args.with_keycloak:
        podman = keycloak_dev.require_podman()
        atexit.register(keycloak_dev.stop, podman)

    os.chdir(REPO_ROOT)

    db = RacksDB.load(
        db=str(DEV_ROOT / "firehpc" / "db"),
        schema=str(RACKSDB_SCHEMA),
    )

    ssh_client = paramiko.SSHClient()
    ssh_client.load_host_keys(Path("~/.ssh/known_hosts").expanduser())
    logger.info("Connecting to development host %s", DEV_HOST)
    try:
        ssh_client.connect(DEV_HOST, username=USER)
    except socket.gaierror as err:
        logger.error("Unable to get address of %s: %s", DEV_HOST, str(err))
        sys.exit(1)
    except paramiko.ssh_exception.PasswordRequiredException as err:
        logger.error("Unable to connect on %s@%s: %s", USER, DEV_HOST, str(err))
        sys.exit(1)

    tmpdir = Path(tempfile.mkdtemp(prefix="slurm-web-dev"))
    atexit.register(delete_tmpdir, tmpdir)

    jwt_key_path = tmpdir / "jwt.key"
    jwt_gen_key(jwt_key_path)

    cluster_id = 0
    agents = []
    port_allocator = PortAllocator()
    for infrastructure in db.infrastructures:
        if infrastructure.name not in args.clusters:
            continue

        if "name" in CLUSTERS[infrastructure.name]:
            ui_name = CLUSTERS[infrastructure.name]["name"]
        else:
            ui_name = infrastructure.name
        agent = SlurmwebAgent.init(
            DEV_HOST,
            port_allocator,
            ssh_client,
            infrastructure.name,
            ui_name,
            cluster_id,
        )
        agent.render_policy(tmpdir, args.anonymous)
        cluster_cfg = CLUSTERS[infrastructure.name]
        cluster_racksdb_enabled = cluster_cfg.get("racksdb", True)
        cluster_metrics_enabled = args.metrics and cluster_cfg.get("metrics", True)
        agent.render_conf(
            tmpdir,
            jwt_key_path,
            args.cache,
            cluster_racksdb_enabled,
            cluster_metrics_enabled,
        )
        agent.launch()
        agents.append(agent)
        cluster_id += 1

    if not agents:
        logger.error("No cluster agents started (check --clusters selection)")
        sys.exit(1)

    time.sleep(1)

    if args.with_keycloak:
        first = agents[0]
        keycloak_dev.start(
            podman,
            tmpdir / REALM_IMPORT_FILENAME,
            ldap_host="127.0.0.1",
            ldap_port=first.forwards["ldap"].local,
            ldap_cluster=first.name,
            gateway_port=GATEWAY_SERVICE_PORT,
            frontend_port=FRONTEND_PORT,
        )
        keycloak_dev.wait_ready(podman=podman)
        keycloak_dev.sync_ldap_groups()
        keycloak_dev.log_summary(
            keycloak_dev.DEFAULT_PORT,
            keycloak_dev.DEFAULT_CLIENT_SECRET,
            first.forwards["ldap"].local,
            first.name,
        )

    gateway = SlurmwebGateway()
    gateway.render_conf(
        tmpdir,
        jwt_key_path,
        agents,
        args.ui,
        args.anonymous,
        args.gateway_prefix,
        oidc=args.with_keycloak,
        branding_theme=args.branding_theme,
    )
    if args.service_message:
        gateway.render_message(
            tmpdir,
            agents[0].cluster_status["users"],
            agents[0].cluster_status["groups"],
        )
    gateway.launch(
        skip_ui_copy=args.ui is None and args.branding_theme is None,
        dev_ui_assets_dir=(tmpdir / "ui") if args.branding_theme else None,
    )

    logger.info("Development environment is ready, type ^c to stop")
    try:
        signal.pause()
    except KeyboardInterrupt:
        pass
    finally:
        gateway.stop()
        for agent in agents:
            agent.stop()
        logger.info("Closing SSH connection")
        ssh_client.close()
        logger.info("Stopping development environment tunnels")


if __name__ == "__main__":
    main()
