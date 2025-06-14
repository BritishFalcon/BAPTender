# BAPTender

BAPTender is a web application that combines a Next.js frontend with a FastAPI backend. It allows groups of users to log drinks, view a real time BAC graph and manage group invites.

## Local Development

1. Create a Python virtual environment and install the API dependencies inside the `backend` folder:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Install the Node.js packages inside the `frontend` folder:
   ```bash
   cd frontend
   npm install
   ```
   To run the frontend tests use:
   ```bash
   npm test
   ```
3. Start the FastAPI and Next.js servers (each in its own terminal):
   ```bash
   cd backend && uvicorn api.index:app --reload
   ```
   ```bash
   cd frontend && npm run dev
   ```
   The frontend will run on `http://localhost:3000` and the API will run on `http://127.0.0.1:8000`.

4. Run the backend test suite with `pytest`:
   ```bash
   pytest
   ```

## Docker

You can also run the project using Docker. Create a `.env` file in the project
root with the following variables:

```
SECRET=<your-secret>
POSTGRES_USER=<db-user>
POSTGRES_PASSWORD=<db-password>
POSTGRES_DB=<db-name>
```

The `docker-compose.yml` file uses these values to build a
`DATABASE_URL` that is passed to the backend service.

Then build the images and start the services with:

```bash
docker compose up --build
```

The backend container waits for the database to accept connections before starting the API server. The frontend will be available on `http://localhost:3000` and the backend on `http://localhost:8000`.

## Testing

Unit tests for the FastAPI backend live under `backend/tests`. Install the backend dependencies and the test extras then run `pytest`:

```bash
cd backend
pip install -r requirements.txt pytest pytest-asyncio httpx asgi-lifespan
pytest
```

The tests run against a temporary SQLite database and use a mocked Redis client, so no additional services are required.

## Repository Structure

- `backend/` – FastAPI backend code and database scripts
- `frontend/` – Next.js application

## Running Tests

Unit tests for the frontend components are written with Jest and React Testing Library.
Run them from the `frontend` directory:

```bash
npm test
```

## License

This project is licensed under the MIT License. See `LICENSE` for details.
