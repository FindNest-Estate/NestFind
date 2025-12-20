# PostgreSQL Integration Setup

## Migration Command

Apply the auth schema to your local PostgreSQL database:

```bash
psql -U nestfind_user -d nestfind_auth -f migrations/001_auth_schema.sql
```

## Smoke Test

### 1. Start the server
```bash
cd backend
uvicorn main:app --reload
```

### 2. Register a user
```bash
curl -X POST http://localhost:8000/auth/register/user \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**Expected Response:**
```json
{
  "message": "Verification OTP sent to email"
}
```

### 3. Verify database row
```bash
psql -U nestfind_user -d nestfind_auth -c "SELECT id, full_name, email, role, status FROM users WHERE email = 'test@example.com';"
```

**Expected Output:**
```
                  id                  |  full_name  |       email        | role |        status         
--------------------------------------+-------------+--------------------+------+-----------------------
 <uuid>                               | Test User   | test@example.com   | USER | PENDING_VERIFICATION
```

## Environment Variables

Ensure your `.env` file contains:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nestfind_auth
DB_USER=nestfind_user
DB_PASSWORD=<your_password>
```

## Verification Checklist

- [x] `app/core/database.py` uses environment variables
- [x] `main.py` calls `init_db_pool()` on startup
- [x] `main.py` calls `close_db_pool()` on shutdown
- [x] `.env` file exists with correct credentials
- [x] `python-dotenv` is installed
