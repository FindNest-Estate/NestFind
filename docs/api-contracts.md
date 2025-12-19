# NestFind API Contracts

API endpoint documentation with workflow references and state transitions.

---

## Base URL

```
Development: http://localhost:8000
Production: https://api.nestfind.com
```

---

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoints by Workflow

### AUTH_LOGIN

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Authenticate user |

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

---

### AUTH_SIGNUP_USER

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create user account |
| POST | `/auth/verify-otp` | Verify email OTP |
| POST | `/auth/resend-otp` | Resend OTP |

**State Transition:**
```
Entry: None → Exit: ACTIVE
```

---

### AUTH_SIGNUP_AGENT

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register-agent` | Create agent account |
| GET | `/agent-applications/{id}` | View application status |

**State Transition:**
```
Entry: None → Exit: IN_REVIEW
```

---

### PUBLIC_PROPERTY_VIEW

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/properties` | List public properties |
| GET | `/properties/{id}` | View property details |

**Query Parameters:**
- `status`: Filter by status (default: ACTIVE)
- `type`: Property type filter
- `min_price`, `max_price`: Price range
- `lat`, `lng`, `radius`: Geo filter

---

### BUYER_VISIT_BOOKING

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/visits` | Request visit |
| GET | `/visits` | List my visits |
| GET | `/visits/{id}` | Visit details |

**State Transition:**
```
Entry: None → Exit: REQUESTED
```

---

### BUYER_OFFER_FLOW

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/offers` | Submit offer |
| POST | `/offers/{id}/accept` | Accept counter |
| POST | `/offers/{id}/reject` | Reject counter |

**State Transition:**
```
Entry: None → Exit: PENDING
```

---

### BUYER_RESERVATION

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reservations` | Create reservation |
| POST | `/reservations/{id}/pay` | Process payment |
| GET | `/reservations/{id}` | View status |

**State Transition:**
```
Entry: Offer ACCEPTED → Exit: Reservation ACTIVE
```

---

### SELLER_PROPERTY_LISTING

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/properties` | Create property |
| PUT | `/properties/{id}` | Update property |
| POST | `/properties/{id}/media` | Upload media |
| DELETE | `/properties/{id}/media/{media_id}` | Remove media |
| POST | `/properties/{id}/submit` | Submit for verification |

**State Transition:**
```
Entry: None → Exit: DRAFT
Submit: DRAFT → PENDING_VERIFY
```

---

### SELLER_HIRE_AGENT

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agents` | List available agents |
| POST | `/agent-assignments` | Request agent |

**Query Parameters (GET /agents):**
- `lat`, `lng`: Property location
- `radius`: Max 100km

---

### SELLER_OFFER_HANDLING

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/offers` | List offers on my properties |
| POST | `/offers/{id}/accept` | Accept offer |
| POST | `/offers/{id}/reject` | Reject offer |
| POST | `/offers/{id}/counter` | Counter offer |

**State Transition:**
```
Entry: PENDING → Exit: ACCEPTED/REJECTED/COUNTERED
```

---

### AGENT_PROPERTY_VERIFICATION

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/properties/{id}/verify` | Approve/reject property |

**Request:**
```json
{
  "action": "APPROVE" | "REJECT",
  "gps_lat": 12.9716,
  "gps_lng": 77.5946,
  "notes": "Verification notes",
  "reject_reason": "Optional if rejecting"
}
```

**State Transition:**
```
Entry: PENDING_VERIFY → Exit: ACTIVE/DRAFT
```

---

### AGENT_VISIT_EXECUTION

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/visits/{id}/approve` | Approve visit request |
| POST | `/visits/{id}/reject` | Reject visit request |
| POST | `/visits/{id}/start` | Start visit (GPS verified) |
| POST | `/visits/{id}/verify-otp` | Verify buyer OTP |
| POST | `/visits/{id}/complete` | Mark complete |

---

### ADMIN_AGENT_APPROVAL

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/agent-applications` | List applications |
| POST | `/admin/agent-applications/{id}/approve` | Approve |
| POST | `/admin/agent-applications/{id}/reject` | Reject |

**State Transition:**
```
Entry: IN_REVIEW → Exit: ACTIVE/DECLINED
```

---

### ADMIN_USER_CONTROL

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List users |
| POST | `/admin/users/{id}/suspend` | Suspend user |
| POST | `/admin/users/{id}/activate` | Activate user |

---

### ADMIN_PROPERTY_OVERRIDE

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/admin/properties/{id}/status` | Force status change |

**Request:**
```json
{
  "new_status": "ACTIVE" | "INACTIVE" | "DRAFT",
  "reason": "Required override reason"
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot make offer on reserved property",
    "current_state": "RESERVED",
    "required_state": "ACTIVE"
  }
}
```

---

## Standard Response Fields

All entity responses include:

```json
{
  "id": "uuid",
  "status": "ACTIVE",
  "display_status": "Listed",
  "allowed_actions": ["book_visit", "save"],
  "visibility": {
    "show_phone": false,
    "show_address": false
  }
}
```
