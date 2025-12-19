# OTP Service Implementation

OTP service implementing `AUTH_SECURITY_RULES.md` Rule 1.

## Files Created

- `app/services/otp_service.py` - Core OTP logic
- `app/routers/otp.py` - FastAPI endpoints
- `app/core/database.py` - Database connection pool

## Endpoints

### POST /auth/otp/generate
Generate OTP for user email verification.

**Request:**
```json
{
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "otp_id": "uuid",
  "expires_at": "2025-12-19T20:30:00",
  "message": "OTP generated (DEV MODE: 123456)"
}
```

### POST /auth/otp/verify
Verify OTP with single-use enforcement.

**Request:**
```json
{
  "user_id": "uuid",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Response (Locked):**
```json
{
  "success": false,
  "message": "Account locked for 30 minutes",
  "locked_until": "2025-12-19T20:45:00"
}
```

## Security Enforcement

✅ **Single-Use**: OTP marked `consumed_at` on first use  
✅ **Expiry**: 10-minute validity  
✅ **Lockout**: 3 failed attempts = 30-minute lock  
✅ **Hashing**: SHA-256 (not bcrypt - OTPs are short-lived)  
✅ **Audit**: All events logged to `audit_logs`

## Audit Events

- `OTP_GENERATED`
- `OTP_VERIFIED`
- `OTP_FAILED`
- `OTP_LOCKED`
- `OTP_REUSE_BLOCKED`
- `OTP_EXPIRED`
- `OTP_NOT_FOUND`

## Next Steps

1. Configure database connection in `.env`
2. Apply schema: `psql < backend/migrations/001_auth_schema.sql`
3. Test endpoints with Postman/curl
4. Integrate email service for OTP delivery
5. Add rate limiting (infrastructure level)

## Scope Compliance

✅ OTP generation  
✅ OTP verification  
✅ Single-use enforcement  
✅ Expiry checking  
✅ Lockout mechanism  
✅ Audit logging  

❌ No login logic  
❌ No JWT generation  
❌ No session management  
