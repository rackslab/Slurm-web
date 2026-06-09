# Slurm-web container images (agent and gateway)
#
# Build from the repository root:
#   docker build -f containers/Dockerfile --target agent -t slurm-web-agent:local .
#   docker build -f containers/Dockerfile --target gateway -t slurm-web-gateway:local .
#
# Or with Podman:
#   podman build -f containers/Dockerfile --target agent -t slurm-web-agent:local .
#   podman build -f containers/Dockerfile --target gateway -t slurm-web-gateway:local .
#
# Base images use rolling Debian stable tags; rebuild agent and gateway together
# so the Python venv and runtime OS stay on the same generation.

# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:22-slim
ARG PYTHON_IMAGE=python:3.13-slim
# Python slim image tracks Debian stable; venv is copied from the matching builder.
ARG RUNTIME_IMAGE=python:3.13-slim

# -----------------------------------------------------------------------------
# Frontend production build (gateway image only)
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

# UI static files under frontend/public/ symlink to ../../assets (repo root).
COPY assets/ /build/assets/
COPY frontend/ ./

RUN npm run build

# -----------------------------------------------------------------------------
# Python virtualenv builders (role-specific extras)
# -----------------------------------------------------------------------------
FROM ${PYTHON_IMAGE} AS python-base

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential \
        python3-dev \
        libldap2-dev \
        libsasl2-dev \
        libcairo2-dev \
        libgirepository-2.0-dev \
        libpango1.0-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY pyproject.toml README.md ./
COPY slurmweb ./slurmweb

FROM python-base AS python-builder-agent

RUN python -m venv --copies /opt/slurm-web-venv \
    && /opt/slurm-web-venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/slurm-web-venv/bin/pip install --no-cache-dir ".[agent,container]"

FROM python-base AS python-builder-gateway

RUN python -m venv --copies /opt/slurm-web-venv \
    && /opt/slurm-web-venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/slurm-web-venv/bin/pip install --no-cache-dir ".[gateway,container]"

# -----------------------------------------------------------------------------
# Shared runtime base
# -----------------------------------------------------------------------------
FROM ${RUNTIME_IMAGE} AS runtime-base

ARG SLURMWEB_UID=1000

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates \
        libldap2 \
        libsasl2-2 \
        libcairo2 \
        libpango-1.0-0 \
        libgirepository-2.0-0 \
        gir1.2-pango-1.0 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid "${SLURMWEB_UID}" slurm-web \
    && useradd --uid "${SLURMWEB_UID}" --gid slurm-web --create-home --home-dir /var/lib/slurm-web slurm-web \
    && mkdir -p /etc/slurm-web /usr/share/slurm-web/conf /usr/share/slurm-web/wsgi/agent /usr/share/slurm-web/wsgi/gateway \
    && chown -R slurm-web:slurm-web /var/lib/slurm-web

ENV HOME=/var/lib/slurm-web

COPY conf/vendor/ /usr/share/slurm-web/conf/
COPY lib/wsgi/agent/slurm-web-agent.py /usr/share/slurm-web/wsgi/agent/
COPY lib/wsgi/gateway/slurm-web-gateway.py /usr/share/slurm-web/wsgi/gateway/
COPY containers/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod 755 /usr/local/bin/docker-entrypoint.sh

# -----------------------------------------------------------------------------
# Agent image
# -----------------------------------------------------------------------------
FROM runtime-base AS agent

LABEL org.opencontainers.image.title="Slurm-web agent"
LABEL org.opencontainers.image.description="Web interface for Slurm HPC & AI clusters: agent"
LABEL org.opencontainers.image.url="https://slurm-web.com"
LABEL org.opencontainers.image.source="https://github.com/rackslab/Slurm-web"
LABEL org.opencontainers.image.licenses="MIT"

COPY --from=python-builder-agent /opt/slurm-web-venv /opt/slurm-web-venv

# Install RacksDB schemas
RUN mkdir -p /usr/share/racksdb/schemas \
    && ln -sf /opt/slurm-web-venv/share/racksdb/schemas/racksdb.yml /usr/share/racksdb/schemas/racksdb.yml \
    && ln -sf /opt/slurm-web-venv/share/racksdb/schemas/drawings.yml /usr/share/racksdb/schemas/drawings.yml

ENV SLURMWEB_ROLE=agent

EXPOSE 5012

USER slurm-web

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["agent"]

# -----------------------------------------------------------------------------
# Gateway image
# -----------------------------------------------------------------------------
FROM runtime-base AS gateway

LABEL org.opencontainers.image.title="Slurm-web gateway"
LABEL org.opencontainers.image.description="Web interface for Slurm HPC & AI clusters: gateway"
LABEL org.opencontainers.image.url="https://slurm-web.com"
LABEL org.opencontainers.image.source="https://github.com/rackslab/Slurm-web"
LABEL org.opencontainers.image.licenses="MIT"

COPY --from=python-builder-gateway /opt/slurm-web-venv /opt/slurm-web-venv
COPY --from=frontend-builder /build/frontend/dist /usr/share/slurm-web/frontend

ENV SLURMWEB_ROLE=gateway

EXPOSE 5011

USER slurm-web

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["gateway"]
