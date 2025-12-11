# Slurm-web Container Image
# 
# Multi-stage build for Slurm-web gateway and agent components.
# Includes frontend assets built from source.
#
# Usage:
#   docker build -t slurm-web:latest .
#   docker run -e SLURM_WEB_MODE=gateway -p 5011:5011 slurm-web:latest
#   docker run -e SLURM_WEB_MODE=agent -p 5012:5012 slurm-web:latest
#
# Environment Variables:
#   SLURM_WEB_MODE: Set to "gateway" or "agent" to select component
#
# Configuration:
#   Mount config files to /etc/slurm-web/gateway.ini or /etc/slurm-web/agent.ini
#   Mount JWT key to /var/lib/slurm-web/jwt.key

# Stage 1: Build frontend assets
FROM node:20-slim AS frontend-builder

WORKDIR /app

# Copy frontend source and assets (needed for symlinks)
COPY frontend/ frontend/
COPY assets/ assets/

WORKDIR /app/frontend
RUN npm ci && npm run build-only

# Stage 2: Build Python wheel
FROM python:3.11-slim AS python-builder

WORKDIR /app
COPY pyproject.toml README.md LICENSE ./
COPY slurmweb/ slurmweb/
COPY conf/ conf/

RUN pip install --no-cache-dir build && \
    python -m build --wheel

# Stage 3: Final runtime image
FROM python:3.11-slim

LABEL org.opencontainers.image.title="Slurm-web"
LABEL org.opencontainers.image.description="Web dashboard for Slurm HPC clusters"
LABEL org.opencontainers.image.url="https://github.com/rackslab/Slurm-web"
LABEL org.opencontainers.image.source="https://github.com/rackslab/Slurm-web"
LABEL org.opencontainers.image.licenses="MIT"

# Install runtime dependencies
# - GTK/Pango libraries for RacksDB infrastructure visualization
# - LDAP libraries for authentication support
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    pkg-config \
    libcairo2-dev \
    libgirepository-2.0-dev \
    gir1.2-glib-2.0 \
    gir1.2-pango-1.0 \
    gir1.2-pangocairo-1.0 \
    python3-gi \
    python3-gi-cairo \
    libldap2-dev \
    libsasl2-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copy built artifacts from previous stages
COPY --from=python-builder /app/dist/*.whl /app/
COPY --from=frontend-builder /app/frontend/dist /usr/share/slurm-web/frontend
COPY --from=python-builder /app/conf/vendor /usr/share/slurm-web/conf

# Install Slurm-web with all optional dependencies
RUN WHEEL=$(ls /app/*.whl) && \
    pip install --no-cache-dir "${WHEEL}[gateway,agent]" && \
    rm -f /app/*.whl

# Create required directories
RUN mkdir -p /etc/slurm-web /var/lib/slurm-web

# Copy entrypoint script
COPY <<'EOF' /entrypoint.sh
#!/bin/bash
set -e

case "${SLURM_WEB_MODE}" in
    gateway)
        exec slurm-web gateway --conf "${SLURM_WEB_CONF:-/etc/slurm-web/gateway.ini}"
        ;;
    agent)
        exec slurm-web agent --conf "${SLURM_WEB_CONF:-/etc/slurm-web/agent.ini}"
        ;;
    *)
        echo "Error: Set SLURM_WEB_MODE to 'gateway' or 'agent'"
        echo "Usage: docker run -e SLURM_WEB_MODE=gateway slurm-web"
        exit 1
        ;;
esac
EOF

RUN chmod +x /entrypoint.sh

# Gateway listens on 5011, Agent on 5012
EXPOSE 5011 5012

ENTRYPOINT ["/entrypoint.sh"]
