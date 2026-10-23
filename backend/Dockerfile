FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies (curl needed for healthcheck probe)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

EXPOSE 8000

# Docker healthcheck probe for liveness monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# On container startup:
#   1. scripts/wait_for_db.py — wait until PostgreSQL is ready to accept connections
#   2. scripts/init_db.py     — create tables + views idempotently
#   3. scripts/seed.py        — seed demo data (idempotent, skips if already present)
#   4. exec uvicorn           — start FastAPI server on $PORT (defaults to 8000)
CMD ["sh", "-c", "python scripts/wait_for_db.py && python scripts/init_db.py && python scripts/seed.py && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
