# Copyright (c) 2023-2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

from dataclasses import dataclass
import logging
import os
import shlex
from pathlib import Path

import jinja2

from paths import CONF_DIR, FRONTEND_PUBLIC_DIR, REPO_ROOT
from devenv.agent import SlurmwebAgent
from devenv.branding import BRANDING_THEMES, branding_dir
from devenv.constants import DEBUG_FLAGS, GATEWAY_SERVICE_PORT
from slurmweb.ui import SlurmwebFrontendEnvSettings
from devenv.keycloak import DEFAULT_CLIENT_SECRET, DEFAULT_PORT as KEYCLOAK_PORT
from devenv.ports import runcmd

logger = logging.getLogger(__name__)

VENDOR_GATEWAY_YML = REPO_ROOT / "conf" / "vendor" / "gateway.yml"


@dataclass
class SlurmwebGateway:
    conf_path: Path = None
    gateway_prefix: str = "/"

    def render_conf(
        self,
        tmpdir: Path,
        jwt_key_path: Path,
        agents: list[SlurmwebAgent],
        ui: Path | None,
        anonymous: bool,
        gateway_prefix: str = "/",
        oidc: bool = False,
        keycloak_port: int = KEYCLOAK_PORT,
        oidc_client_secret: str = DEFAULT_CLIENT_SECRET,
        branding_theme: str | None = None,
    ):
        self.gateway_prefix = gateway_prefix
        branding = None
        theme_branding_dir = None
        if ui is None:
            ui = FRONTEND_PUBLIC_DIR
        if branding_theme is not None:
            if branding_theme not in BRANDING_THEMES:
                raise ValueError(f"Unknown branding theme: {branding_theme}")
            branding = BRANDING_THEMES[branding_theme]
            theme_branding_dir = branding_dir(branding_theme)
            logger.info(
                "Development branding theme: %s (%s)",
                branding_theme,
                branding["logo_alt"],
            )
        environment = jinja2.Environment(loader=jinja2.FileSystemLoader(CONF_DIR))
        template = environment.get_template("gateway.ini.j2")
        self.conf_path = tmpdir / "gateway.ini"
        self.message_path = tmpdir / "message.md"
        session_key = tmpdir / "session_key"
        session_key.write_text("gateway-dev-session-key\n", encoding="utf-8")
        with open(self.conf_path, "w+") as fh:
            fh.write(
                template.render(
                    service_port=GATEWAY_SERVICE_PORT,
                    jwt_key=jwt_key_path,
                    ldap_port=agents[0].forwards["ldap"].local,
                    ldap_base=agents[0].name,
                    agents=agents,
                    ui=ui,
                    message=self.message_path,
                    anonymous=anonymous,
                    gateway_prefix=gateway_prefix,
                    oidc=oidc,
                    keycloak_port=keycloak_port,
                    oidc_client_secret=oidc_client_secret,
                    session_key=session_key,
                    branding=branding,
                    branding_dir=theme_branding_dir,
                )
            )

    def render_message(self, tmpdir: Path, users, groups):
        environment = jinja2.Environment(loader=jinja2.FileSystemLoader(CONF_DIR))
        template = environment.get_template("message.md.j2")
        with open(self.message_path, "w+") as fh:
            fh.write(template.render(users=users, groups=groups))

    def launch(
        self,
        *,
        skip_ui_copy: bool = False,
        dev_ui_assets_dir: Path | None = None,
    ):
        cmd = (
            [
                "slurm-web",
                "gateway",
                "--log-component",
                "gateway",
                "--debug",
                "--debug-flags",
            ]
            + DEBUG_FLAGS
            + [
                "--conf-defs",
                str(VENDOR_GATEWAY_YML),
                "--conf",
                str(self.conf_path),
            ]
        )
        env = os.environ.copy()
        if skip_ui_copy:
            env[SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_SKIP_COPY] = "1"
        if dev_ui_assets_dir is not None:
            env[SlurmwebFrontendEnvSettings.SLURMWEB_DEV_UI_ASSETS_DIR] = str(
                dev_ui_assets_dir
            )
        logging.info("Launching Slurm-web gateway: %s", shlex.join(cmd))
        self.process = runcmd(cmd, env=env)

    def stop(self):
        logging.info("Stopping slurm-web gateway")
        self.process.kill()
