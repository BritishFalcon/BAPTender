FROM python:3.11-slim

WORKDIR /app

# Install dependencies and PostgreSQL client for health checks
COPY requirements.txt /app/requirements.txt
RUN apt-get update \
    && apt-get install -y postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . /app
COPY wait_for_db.sh /wait_for_db.sh
RUN chmod +x /wait_for_db.sh

EXPOSE 8000

CMD ["/wait_for_db.sh", "uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8000"]
