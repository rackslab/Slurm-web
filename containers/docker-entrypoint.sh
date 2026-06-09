#!/bin/sh
# Copyright (c) 2026 Rackslab
#
# SPDX-License-Identifier: MIT
#
# Start Slurm-web with Gunicorn (agent/gateway) or run slurm-web CLI subcommands.

set -e

ROLE="${SLURMWEB_ROLE:?SLURMWEB_ROLE must be set to agent or gateway}"
SLURM_WEB="/opt/slurm-web-venv/bin/slurm-web"
GUNICORN="/opt/slurm-web-venv/bin/gunicorn"

utility_subcommand() {
    case "$1" in
        ldap-check | gen-jwt-key | gen-session-key | show-conf | connect-check)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

run_gunicorn() {
    case "$ROLE" in
        agent)
            WSGI_DIR="/usr/share/slurm-web/wsgi/agent"
            WSGI_MODULE="slurm-web-agent:application"
            BIND="${SLURMWEB_BIND:-0.0.0.0:5012}"
            ;;
        gateway)
            WSGI_DIR="/usr/share/slurm-web/wsgi/gateway"
            WSGI_MODULE="slurm-web-gateway:application"
            BIND="${SLURMWEB_BIND:-0.0.0.0:5011}"
            ;;
        *)
            echo "docker-entrypoint: unknown SLURMWEB_ROLE=${ROLE}" >&2
            exit 1
            ;;
    esac

    exec "$GUNICORN" \
        --chdir "$WSGI_DIR" \
        --bind "$BIND" \
        --workers "${SLURMWEB_WORKERS:-4}" \
        --access-logfile - \
        --error-logfile - \
        "$WSGI_MODULE"
}

if [ "$#" -gt 0 ]; then
    if [ "$1" = "slurm-web" ]; then
        shift
        exec "$SLURM_WEB" "$@"
    fi

    if utility_subcommand "$1"; then
        exec "$SLURM_WEB" "$@"
    fi

    if [ "$1" = "agent" ] || [ "$1" = "gateway" ]; then
        if [ "$1" != "$ROLE" ]; then
            echo "docker-entrypoint: this image runs '${ROLE}', not '$1'" >&2
            exit 1
        fi
        run_gunicorn
    fi

    echo "docker-entrypoint: unknown command: $1" >&2
    echo "Usage: [<agent|gateway>] | slurm-web <subcommand> | <ldap-check|gen-jwt-key|gen-session-key|show-conf|connect-check> [args...]" >&2
    exit 1
fi

run_gunicorn
