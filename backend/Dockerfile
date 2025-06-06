FROM python:3.11-slim

# Set base directory and add path for installed packages
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

# Trying to fix line endings for the wait script
RUN sed -i 's/\r$//' wait_for_db.sh

# Copy the wait script and application code
RUN chmod +x wait_for_db.sh
EXPOSE 8000

CMD ["./wait_for_db.sh", "uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8000"]