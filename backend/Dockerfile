FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Render injects $PORT (default 8000). On every boot:
#   1. scripts/init_db.py — create tables + views idempotently (incl. the
#      additive ERP columns), never fails on optional bits (llm_reader role)
#   2. scripts/seed.py    — load the demo dataset once; the seed is additive
#      and skips inserts when data is already present, so restarts are safe
#   3. uvicorn            — serve the API on 0.0.0.0:$PORT (/health = probe)
CMD ["sh", "-c", "python scripts/init_db.py && python scripts/seed.py && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
