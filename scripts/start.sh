#!/bin/sh
python /app/scripts/wait_for_services.py
exec uvicorn api.index:app --host 0.0.0.0 --port 8000

