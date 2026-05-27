# Copyright (c) 2026 Rackslab
#
# This file is part of Slurm-web.
#
# SPDX-License-Identifier: MIT

"""Development branding themes for the gateway [ui] section."""

from pathlib import Path

from paths import REPO_ROOT

BRANDING_ROOT = REPO_ROOT / "dev" / "branding"
BASE_LOGO_SVG = BRANDING_ROOT / "leaves.svg"

BRANDING_THEMES: dict[str, dict] = {
    "green": {
        "brand_name": "Verdant Grid",
        "logo_alt": "Verdant Grid",
        "colors": {
            "color_light": "#e8f5e8",
            "color_main": "#3d853d",
            "color_darker": "#327032",
            "color_dark": "#286028",
            "color_verydark": "#1a3a1a",
            "color_font_disabled": "#9bc99b",
        },
    },
    "orange": {
        "brand_name": "Amber Stack",
        "logo_alt": "Amber Stack",
        "colors": {
            "color_light": "#fff3e6",
            "color_main": "#c97428",
            "color_darker": "#ad6522",
            "color_dark": "#8f5219",
            "color_verydark": "#5c3411",
            "color_font_disabled": "#e4bf8f",
        },
    },
}

LOGO_FILES = (
    "logo_login.png",
    "logo_login_dark.png",
    "logo_horizontal.png",
    "logo_horizontal_dark.png",
    "favicon.ico",
)


def branding_dir(theme: str) -> Path:
    """Return the absolute path to assets for a development branding theme."""
    if theme not in BRANDING_THEMES:
        raise ValueError(f"Unknown branding theme: {theme}")
    return BRANDING_ROOT / theme
