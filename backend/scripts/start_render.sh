#!/bin/sh
set -u

# Render health-checks the web process while the database setup runs. Start
# Uvicorn first so a slow remote Postgres connection or the demo seed cannot
# make the web service look crashed during deployment.
PORT_VALUE="${PORT:-8000}"

uvicorn app.main:app --host 0.0.0.0 --port "$PORT_VALUE" &
SERVER_PID=$!

cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(
    if python scripts/wait_for_db.py \
        && python scripts/init_db.py \
        && python scripts/seed.py; then
        echo "[startup] database initialization and seed completed"
    else
        echo "[startup] database initialization failed; API remains available for health checks" >&2
    fi
) &

wait "$SERVER_PID"
