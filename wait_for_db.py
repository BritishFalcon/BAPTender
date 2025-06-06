import sys
import time
import socket

host = sys.argv[1]
port = int(sys.argv[2])
timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 60

start = time.time()
while True:
    try:
        with socket.create_connection((host, port), timeout=1):
            break
    except OSError:
        if time.time() - start >= timeout:
            print(f"Timeout waiting for {host}:{port}", file=sys.stderr)
            sys.exit(1)
        time.sleep(1)
print("Database is up - continuing...")
