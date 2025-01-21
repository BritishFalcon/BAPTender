# Use an official Python runtime as the base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy project
COPY . .

# Expose the port Gunicorn will run on
EXPOSE 6969

# Define the default command to run the application
# Using Gunicorn with Eventlet worker class for Socket.IO support
CMD ["gunicorn", "app:app", "-k", "eventlet", "-w", "1", "--bind", "0.0.0.0:6969"]
