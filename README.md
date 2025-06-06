# BAPTender

BAPTender is a web application that combines a Next.js frontend with a FastAPI backend. It allows groups of users to log drinks, view a real time BAC graph and manage group invites.

## Local Development

1. Create a Python virtual environment and install the API dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Install the Node.js packages:
   ```bash
   npm install
   ```
3. Start both the Next.js and FastAPI servers:
   ```bash
  npm run dev
  ```
   The frontend will run on `http://localhost:3000` and the API will run on `http://127.0.0.1:8000`.

## Docker Development

You can also run the project using Docker. This will start the frontend, backend,
PostgreSQL and a Redis instance using `docker-compose`.

```bash
docker compose up --build
```

The application will be available on `http://localhost:3000` and the API on `http://localhost:8000`.

## Repository Structure

- `api/` – FastAPI backend code
- `app/` – Next.js app directory
- `components/` – React components
- `context/` – React context providers
- `db/` – database initialization scripts

## License

This project is licensed under the MIT License. See `LICENSE` for details.
