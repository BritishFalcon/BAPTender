import os
import socket
import time

services = [
    (os.environ.get('DB_HOST', 'db'), int(os.environ.get('DB_PORT', '5432'))),
    (os.environ.get('REDIS_HOST', 'redis'), int(os.environ.get('REDIS_PORT', '6379'))),
]

for host, port in services:
    while True:
        try:
            with socket.create_connection((host, port), timeout=1):
                break
        except OSError:
            print(f"Waiting for {host}:{port}...")
            time.sleep(1)


