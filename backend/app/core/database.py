import asyncpg
from typing import Optional


# Global connection pool
_pool: Optional[asyncpg.Pool] = None


async def init_db_pool():
    """Initialize database connection pool at startup."""
    global _pool
    _pool = await asyncpg.create_pool(
        host="localhost",
        port=5432,
        user="postgres",
        password="postgres",
        database="nestfind",
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
