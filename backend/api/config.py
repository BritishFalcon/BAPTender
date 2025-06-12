import os
from dotenv import load_dotenv

# Load environment variables from a .env file if present
load_dotenv()

# Secret used for JWT tokens
SECRET = os.getenv("SECRET", "dev-secret")

# Database credentials
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
POSTGRES_DB = os.getenv("POSTGRES_DB", "baptender")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{DB_HOST}:{DB_PORT}/{POSTGRES_DB}"
)

# Validation ranges with environment fallbacks
MIN_WEIGHT = float(os.getenv("MIN_WEIGHT", "10"))
MAX_WEIGHT = float(os.getenv("MAX_WEIGHT", "650"))
MIN_HEIGHT = float(os.getenv("MIN_HEIGHT", "100"))
MAX_HEIGHT = float(os.getenv("MAX_HEIGHT", "250"))
MIN_AGE = int(os.getenv("MIN_AGE", "10"))
MAX_AGE = int(os.getenv("MAX_AGE", "150"))
