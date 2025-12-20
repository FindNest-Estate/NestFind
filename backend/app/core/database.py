import asyncpg
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Global connection pool
_pool: Optional[asyncpg.Pool] = None


async def init_db_pool():
    """Initialize database connection pool at startup."""
    global _pool
    _pool = await asyncpg.create_pool(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        user=os.getenv("DB_USER", "nestfind_user"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME", "nestfind_auth"),
        min_size=5,
        max_size=20
    )


async def close_db_pool():
    """Close database connection pool at shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_db_pool() -> asyncpg.Pool:
    """Get database connection pool dependency."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool
