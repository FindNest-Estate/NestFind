# Authentication Security Rules

**Status:** CONSTITUTIONAL  
**Enforcement:** MANDATORY  
**Version:** 1.0

---

## Rule 1: OTP Single-Use Enforcement

**Vulnerability:** OTP Replay Attack

**Backend Rule:**
- Reject OTP if `consumed_at IS NOT NULL`
- Set `consumed_at` on first successful verification
- Set `consumed_by_ip` to request IP address

**Database:**
```
email_otp_verifications.consumed_at TIMESTAMP NULL
email_otp_verifications.consumed_by_ip TEXT NULL
```

---

## Rule 2: Login Brute Force Protection

**Vulnerability:** Password Guessing

**Backend Rule:**
- Increment `login_attempts` on failed password
- Lock for 15 minutes after 5 failed attempts
- Set `login_locked_until = NOW() + 15 minutes`
- Reset `login_attempts = 0` on successful login
- Reject login if `login_locked_until > NOW()`

**Database:**
```
users.login_attempts INT DEFAULT 0
users.login_locked_until TIMESTAMP NULL
```

---

## Rule 3: JWT Session Binding

**Vulnerability:** Token Theft & Reuse

**Backend Rule:**
- JWT payload MUST include `session_id` and `jti`
- On every protected request, check `sessions.revoked_at`
- If `revoked_at IS NOT NULL`, reject token even if not expired
- Logout endpoint sets `revoked_at = NOW()`

**JWT Payload:**
```json
{
  "user_id": "uuid",
  "role": "USER",
  "status": "ACTIVE",
  "session_id": "uuid",
  "jti": "unique_token_id"
}
```

**Database:**
```
sessions.session_id UUID PRIMARY KEY
sessions.revoked_at TIMESTAMP NULL
sessions.device_fingerprint TEXT
sessions.last_ip TEXT
```

---

## Rule 4: Role Re-Verification

**Vulnerability:** Privilege Escalation

**Backend Rule:**
- JWT signature MUST be verified on EVERY request
- For admin/agent endpoints, re-query `users.role` from database
- NEVER trust role from JWT alone for privileged actions

**Critical Endpoints Requiring DB Role Check:**
- `/admin/*`
- `/agent/*/verify`
- `/properties/*/submit`

---

## Rule 5: Agent Status Enforcement

**Vulnerability:** Agent Status Bypass

**Backend Rule:**
- Agent-only endpoints MUST check `role = AGENT` AND `status = ACTIVE`
- Query status from database, not JWT
- Reject if status IN (`IN_REVIEW`, `DECLINED`, `SUSPENDED`)

**Allowed for IN_REVIEW:**
- `/agent/profile`
- `/agent/application-status`

**Forbidden for IN_REVIEW:**
- All other `/agent/*` endpoints

---

## Rule 6: Email Immutability During Verification

**Vulnerability:** OTP Lockout Bypass

**Backend Rule:**
- Email change is FORBIDDEN for users in `PENDING_VERIFICATION`
- Only allowed after `status = ACTIVE`

---

## Rule 7: Refresh Token Family Tracking

**Vulnerability:** Refresh Token Reuse

**Backend Rule:**
- On refresh, check if `parent_token_hash` was already used
- If yes → Revoke ENTIRE token family (set `revoked_at` for all sessions with same `token_family_id`)
- If no → Issue new token, mark parent as used

**Database:**
```
sessions.token_family_id UUID
sessions.parent_token_hash TEXT
```

**Note:** Refresh token rotation is an internal security mechanism and does not require a user-facing workflow. It is a SYSTEM-initiated, non-UI process that does not transition user state.

---

## Audit Events

**Required:**
- `LOGIN_RATE_LIMITED`
- `OTP_REUSE_BLOCKED`
- `TOKEN_REVOKED`
- `SUSPICIOUS_ROLE_ACCESS`
- `OTP_LOCKED`

---

## Rate Limits

**Infrastructure Level:**
- `/auth/login`: 5 req/min per IP
- `/auth/verify-otp`: 10 req/min per IP
- `/auth/register`: 3 req/min per IP

---

## Password Policy

**Validation:**
- Minimum 8 characters
- Must include 1 letter
- Must include 1 number
- Check against common password list (top 10k)
- Reject if password contains email username

**Hashing:**
- bcrypt with cost factor 12
