---
workflow_id: AUTH_SIGNUP_USER
role: USER
action_type: MUTATION
entities:
  primary: users
  secondary:
    - email_otp_verifications
    - audit_logs
entry_states:
  users: []
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

# User Signup Workflow

Create verified user accounts for Buyers and Sellers using email OTP verification.

---

## Flow Diagram

```mermaid
flowchart TD
    A[User Opens Signup] --> B[Enter Registration Details<br/>Name, Email, Mobile, Password]
    B --> C{Validate Input}
    
    C -->|Invalid| D[Show Validation Errors]
    D --> B
    
    C -->|Email Exists| E[Show Email Already Registered]
    E --> B
    
    C -->|Valid| F[Create User Record<br/>Status: PENDING_VERIFICATION]
    
    F --> G[Generate Email OTP]
    G --> H[Send OTP to Email]
    H --> I[Show OTP Input Screen]
    
    I --> J[User Enters OTP]
    J --> K{Verify OTP}
    
    K -->|Invalid| L{Attempts < 3?}
    L -->|Yes| M[Show Error, Allow Retry]
    M --> J
    L -->|No| N[Lock Account<br/>Require New OTP]
    N --> G
    
    K -->|Expired| O[OTP Expired<br/>Resend Required]
    O --> G
    
    K -->|Valid| P[Update User Status: ACTIVE]
    P --> Q[Create Audit Log: SIGNUP_SUCCESS]
    Q --> R[Redirect to Dashboard]
    R --> S[Signup Complete]

    style A fill:#e3f2fd
    style S fill:#c8e6c9
    style E fill:#ffcdd2
    style N fill:#fff9c4
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> FormEntry
    
    FormEntry --> Validation: Submit
    
    Validation --> FormEntry: Invalid
    Validation --> UserCreated: Valid
    
    UserCreated --> OTPSent: Generate OTP
    
    OTPSent --> OTPVerification: User enters OTP
    
    OTPVerification --> OTPFailed: Invalid/Expired
    OTPVerification --> AccountActive: Valid
    
    OTPFailed --> OTPSent: Retry/Resend
    
    AccountActive --> [*]
```

---

## User Status States

```mermaid
stateDiagram-v2
    [*] --> PENDING_VERIFICATION: User Created
    
    PENDING_VERIFICATION --> ACTIVE: OTP Verified
    PENDING_VERIFICATION --> PENDING_VERIFICATION: OTP Failed (Retry)
    
    ACTIVE --> SUSPENDED: Admin Action
    SUSPENDED --> ACTIVE: Admin Reinstates
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| users | - | PENDING_VERIFICATION | Form submitted |
| users | PENDING_VERIFICATION | ACTIVE | OTP verified |
| email_otp_verifications | - | PENDING | OTP generated |
| email_otp_verifications | PENDING | VERIFIED | OTP matched |
| email_otp_verifications | PENDING | EXPIRED | Timeout |
| audit_logs | - | SIGNUP_INITIATED | Form submitted |
| audit_logs | - | SIGNUP_SUCCESS | OTP verified |

---

## Key Points

- Single registration for both Buyer and Seller
- Role is inferred by actions (list property = Seller, make offer = Buyer)
- Email OTP only (no SMS to minimize cost)
- Maximum 3 OTP attempts before lockout
- OTP expires after 10 minutes
- Lockout duration: 30 minutes (automatic unlock)

---

## Security Rules

- Each OTP can only be used ONCE (single-use enforcement)
- Subsequent attempts with same OTP are rejected even if not expired
- Email cannot be changed until account is verified (status=ACTIVE)
- Password must be minimum 8 characters with 1 letter and 1 number
