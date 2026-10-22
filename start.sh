#!/usr/bin/env bash
# Start/stop the APAAR-SETU backend (FastAPI + uvicorn).
#   ./start.sh          # start (detached)
#   ./start.sh stop     # stop
#   ./start.sh restart  # restart
#   ./start.sh status   # is it running?
# Logs: backend/server.log   PID: backend/.server.pid
set -euo pipefail
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(dirname "$0")/backend"

PIDFILE=.server.pid
LOG=server.log
UV=.venv/bin/uvicorn
[ -x "$UV" ] || UV="python3 -m uvicorn"   # fall back to system python if no venv

running() { [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

case "${1:-start}" in
  start)
    if running; then echo "already running (pid $(cat "$PIDFILE"))"; exit 0; fi
    # detach into its own session so the server survives the shell that started it
    nohup python3 -c "import os,sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])" \
      $UV app.main:app --host 0.0.0.0 --port 8000 >"$LOG" 2>&1 &
    echo $! > "$PIDFILE"
    sleep 1
    if running; then
      echo "backend up: http://localhost:8000  (docs: /docs, health: /health)"
    else
      echo "failed to start — last lines of $LOG:"; tail -20 "$LOG"; rm -f "$PIDFILE"; exit 1
    fi
    ;;
  stop)
    if running; then kill "$(cat "$PIDFILE")"; echo "stopped"; else echo "not running"; fi
    rm -f "$PIDFILE"
    ;;
  restart) "$SELF" stop; "$SELF" start ;;
  status)
    if running; then echo "running (pid $(cat "$PIDFILE"))"; else echo "stopped"; fi
    ;;
  *) echo "usage: $0 [start|stop|restart|status]"; exit 1 ;;
esac
