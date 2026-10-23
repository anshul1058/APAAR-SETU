# ==============================================================================
# Multi-stage Dockerfile for APAAR-SETU
# 
# Targets:
#   - fullstack (default): Single container running FastAPI API + built React SPA
#   - backend-only: FastAPI service only (useful for Render / separated API deploy)
#   - frontend-only: Nginx serving the static React build
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend SPA
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /build

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Backend Base (Python dependencies & system packages)
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS backend-base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------------------------------
# Stage 3: Backend-Only Target
# ------------------------------------------------------------------------------
FROM backend-base AS backend-only
COPY backend/ .

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "python scripts/wait_for_db.py && python scripts/init_db.py && python scripts/seed.py && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

# ------------------------------------------------------------------------------
# Stage 4: Frontend-Only Target (Nginx)
# ------------------------------------------------------------------------------
FROM nginx:alpine AS frontend-only
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /build/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

# ------------------------------------------------------------------------------
# Stage 5: Full-stack (Default Target)
# Combines FastAPI API backend with compiled React static frontend in one image
# ------------------------------------------------------------------------------
FROM backend-base AS fullstack
COPY backend/ .
# Copy compiled frontend into static directory (served automatically by FastAPI)
COPY --from=frontend-builder /build/dist ./static

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "python scripts/wait_for_db.py && python scripts/init_db.py && python scripts/seed.py && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
