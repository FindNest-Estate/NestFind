---
workflow_id: AUTH_LOGIN
role: USER
action_type: MUTATION
entities:
  primary: users
  secondary:
    - audit_logs
entry_states:
  users: [ACTIVE]
exit_states:
  users: [ACTIVE]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Login Workflow

Allow authenticated access only when database state permits.

---

## Flow Diagram

```mermaid
flowchart TD
    A[User Opens Login] --> B[Enter Email + Password]
    B --> C{Backend Validates}
    
    C -->|Invalid Credentials| D[Show Error Message]
    D --> B
    
    C -->|Valid Credentials| E{Check User Status}
    
    E -->|SUSPENDED| F[Block Login<br/>Show Suspension Notice]
    E -->|PENDING_VERIFICATION| G[Redirect to OTP Verification]
    E -->|ACTIVE| H[Generate JWT Token]
    
    H --> I{Check User Role}
    
    I -->|USER| J[Redirect to User Dashboard]
    I -->|AGENT| K{Agent Status?}
    I -->|ADMIN| L[Redirect to Admin Panel]
    
    K -->|IN_REVIEW| M[Redirect to Agent Pending Page]
    K -->|ACTIVE| N[Redirect to Agent Dashboard]
    
    J --> O[Login Complete]
    L --> O
    M --> O
    N --> O

    style A fill:#e3f2fd
    style O fill:#c8e6c9
    style F fill:#ffcdd2
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> LoginAttempt
    
    LoginAttempt --> CredentialCheck: Submit
    
    CredentialCheck --> InvalidCredentials: Wrong password
    CredentialCheck --> StatusCheck: Valid
    
    InvalidCredentials --> LoginAttempt: Retry
    
    StatusCheck --> Blocked: SUSPENDED
    StatusCheck --> NeedsVerification: PENDING_VERIFICATION
    StatusCheck --> Authenticated: ACTIVE
    
    Blocked --> [*]
    NeedsVerification --> OTPFlow
    Authenticated --> Dashboard
    
    Dashboard --> [*]
    OTPFlow --> [*]
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| users | ACTIVE | ACTIVE | Successful login (no change) |
| audit_logs | - | LOGIN_SUCCESS | Valid credentials + ACTIVE status |
| audit_logs | - | LOGIN_FAILED | Invalid credentials |
| audit_logs | - | LOGIN_BLOCKED | SUSPENDED user attempt |

---

## Critical Rules

- SUSPENDED users can NEVER log in
- IN_REVIEW agents can log in but see limited UI
- Admin role is determined from database, not claimed
- Every login attempt is logged (success or failure)
- JWT token contains user_id, role, and expiry
