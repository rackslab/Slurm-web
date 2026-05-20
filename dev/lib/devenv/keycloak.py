# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

import json
import logging
import shlex
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from pathlib import Path

import jinja2

from paths import CONF_DIR, REALM_IMPORT_FILENAME

logger = logging.getLogger(__name__)

DEFAULT_IMAGE = "quay.io/keycloak/keycloak:latest"
DEFAULT_CONTAINER = "slurm-web-keycloak"
DEFAULT_PORT = 8080
DEFAULT_REALM = "slurm"
DEFAULT_LDAP_PROVIDER = "firehpc-ldap"
DEFAULT_GROUP_MAPPER = "groups"
DEFAULT_CLIENT_SECRET = "slurm-web-dev-secret"
READINESS_TIMEOUT = 120
ADMIN_USER = "admin"
ADMIN_PASSWORD = "admin"


def require_podman() -> str:
    podman = shutil.which("podman")
    if podman is None:
        logger.error("podman not found in PATH")
        sys.exit(1)
    return podman


def render_realm(
    realm_import_path: Path,
    ldap_host: str,
    ldap_port: int,
    ldap_cluster: str,
    client_secret: str = DEFAULT_CLIENT_SECRET,
    gateway_port: int = 5012,
    frontend_port: int = 5173,
) -> Path:
    environment = jinja2.Environment(loader=jinja2.FileSystemLoader(CONF_DIR))
    template = environment.get_template("realm-slurm.json.j2")
    content = template.render(
        ldap_host=ldap_host,
        ldap_port=ldap_port,
        ldap_cluster=ldap_cluster,
        client_secret=client_secret,
        gateway_port=gateway_port,
        frontend_port=frontend_port,
    )
    json.loads(content)

    realm_import_path.write_text(content, encoding="utf-8")
    logger.info("Rendered realm import to %s", realm_import_path)
    return realm_import_path


def podman_cmd(
    podman: str, *args: str, check: bool = True
) -> subprocess.CompletedProcess:
    cmd = [podman, *args]
    logger.info("Running: %s", shlex.join(cmd))
    return subprocess.run(cmd, check=check)


def discovery_url(port: int = DEFAULT_PORT) -> str:
    return f"http://127.0.0.1:{port}/realms/{DEFAULT_REALM}/.well-known/openid-configuration"


def _admin_token(
    admin_user: str = ADMIN_USER,
    admin_password: str = ADMIN_PASSWORD,
    port: int = DEFAULT_PORT,
) -> str:
    data = urllib.parse.urlencode(
        {
            "client_id": "admin-cli",
            "grant_type": "password",
            "username": admin_user,
            "password": admin_password,
        }
    ).encode()
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/realms/master/protocol/openid-connect/token",
        data=data,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        payload = json.loads(response.read())
    return payload["access_token"]


def _admin_request(
    method: str,
    path: str,
    token: str,
    port: int = DEFAULT_PORT,
) -> bytes:
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/admin/realms/{DEFAULT_REALM}{path}",
        headers={"Authorization": f"Bearer {token}"},
        method=method,
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def sync_ldap_groups(
    admin_user: str = ADMIN_USER,
    admin_password: str = ADMIN_PASSWORD,
    port: int = DEFAULT_PORT,
    provider_name: str = DEFAULT_LDAP_PROVIDER,
    mapper_name: str = DEFAULT_GROUP_MAPPER,
) -> None:
    """Import LDAP groups into the realm (separate from user sync)."""
    token = _admin_token(admin_user, admin_password, port)
    components = json.loads(
        _admin_request(
            "GET",
            f"/components?type=org.keycloak.storage.UserStorageProvider&name={provider_name}",
            token,
            port,
        )
    )
    if not components:
        logger.error(
            "LDAP provider %s not found in realm %s", provider_name, DEFAULT_REALM
        )
        sys.exit(1)
    provider_id = components[0]["id"]

    mappers = json.loads(
        _admin_request(
            "GET",
            f"/components?parent={provider_id}&type=org.keycloak.storage.ldap.mappers.LDAPStorageMapper",
            token,
            port,
        )
    )
    group_mapper = next((m for m in mappers if m["name"] == mapper_name), None)
    if group_mapper is None:
        logger.error(
            "LDAP mapper %s not found on provider %s", mapper_name, provider_name
        )
        sys.exit(1)

    result = json.loads(
        _admin_request(
            "POST",
            f"/user-storage/{provider_id}/mappers/{group_mapper['id']}/sync"
            "?direction=fedToKeycloak",
            token,
            port,
        )
    )
    logger.info("LDAP group sync: %s", result.get("status", result))


def _container_running(podman: str, container: str) -> bool:
    result = subprocess.run(
        [podman, "inspect", "-f", "{{.State.Running}}", container],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0 and result.stdout.strip() == "true"


def _log_container_failure(podman: str, container: str) -> None:
    status = subprocess.run(
        [podman, "ps", "-a", "--filter", f"name={container}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if status.stdout.strip():
        logger.error("Container status:\n%s", status.stdout.strip())
    logs = subprocess.run(
        [podman, "logs", "--tail", "40", container],
        capture_output=True,
        text=True,
        check=False,
    )
    if logs.stdout.strip() or logs.stderr.strip():
        logger.error(
            "Keycloak container logs (last 40 lines):\n%s%s",
            logs.stdout,
            logs.stderr,
        )


def wait_ready(
    port: int = DEFAULT_PORT,
    timeout: int = READINESS_TIMEOUT,
    *,
    podman: str | None = None,
    container: str = DEFAULT_CONTAINER,
) -> None:
    url = discovery_url(port)
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if podman is not None and not _container_running(podman, container):
            _log_container_failure(podman, container)
            logger.error(
                "Keycloak container %s exited before becoming ready", container
            )
            sys.exit(1)
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status == 200:
                    logger.info("Keycloak is ready (%s)", url)
                    return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(2)
    if podman is not None:
        _log_container_failure(podman, container)
    logger.error("Keycloak did not become ready within %s seconds", timeout)
    sys.exit(1)


def start(
    podman: str,
    realm_import_path: Path,
    ldap_host: str,
    ldap_port: int,
    ldap_cluster: str,
    *,
    client_secret: str = DEFAULT_CLIENT_SECRET,
    gateway_port: int = 5012,
    frontend_port: int = 5173,
    image: str = DEFAULT_IMAGE,
    container: str = DEFAULT_CONTAINER,
    admin_user: str = ADMIN_USER,
    admin_password: str = ADMIN_PASSWORD,
) -> None:
    render_realm(
        realm_import_path,
        ldap_host=ldap_host,
        ldap_port=ldap_port,
        ldap_cluster=ldap_cluster,
        client_secret=client_secret,
        gateway_port=gateway_port,
        frontend_port=frontend_port,
    )

    podman_cmd(podman, "rm", "-f", container, check=False)

    podman_cmd(
        podman,
        "run",
        "-d",
        "--name",
        container,
        "--network",
        "host",
        "-e",
        f"KC_BOOTSTRAP_ADMIN_USERNAME={admin_user}",
        "-e",
        f"KC_BOOTSTRAP_ADMIN_PASSWORD={admin_password}",
        "-v",
        f"{realm_import_path.resolve()}:/opt/keycloak/data/import/{REALM_IMPORT_FILENAME}:Z",
        image,
        "start-dev",
        "--import-realm",
        "--spi-import-realm-strategy=OVERWRITE_EXISTING",
    )


def stop(podman: str, container: str = DEFAULT_CONTAINER) -> None:
    result = podman_cmd(podman, "rm", "-f", container, check=False)
    if result.returncode == 0:
        logger.info("Removed Keycloak container %s", container)
    else:
        logger.warning("Keycloak container %s was not running", container)


def log_summary(
    port: int,
    client_secret: str,
    ldap_port: int,
    ldap_cluster: str,
) -> None:
    issuer = f"http://localhost:{port}/realms/slurm"
    logger.info("Keycloak development IdP is running")
    logger.info("  Admin console: http://localhost:%s/admin/", port)
    logger.info("  Issuer:        %s", issuer)
    logger.info("  Client ID:     slurm-web")
    logger.info("  Client secret: [REDACTED]")
    logger.info(
        "  LDAP:          ldap://127.0.0.1:%s (cluster %s)", ldap_port, ldap_cluster
    )
