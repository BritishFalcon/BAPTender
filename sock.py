import socket

# Initialize the server socket
server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind(('0.0.0.0', 5001))
server_socket.listen(1)

print("Server is listening on port 5001...")

# Loop to keep the server running and accept multiple connections
while True:
    client_socket, addr = server_socket.accept()
    print(f"Connection from {addr}")

    # Loop to receive data from this client
    while True:
        data = client_socket.recv(1024)
        if not data:
            # No more data. Break out of loop.
            print("Client disconnected")
            break
        print(f"Received: {data.decode('utf-8')}")

    # Close the client socket
    client_socket.close()
