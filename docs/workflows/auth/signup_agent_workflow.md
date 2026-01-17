---
workflow_id: AUTH_SIGNUP_AGENT
role: AGENT
action_type: MUTATION
entities:
  primary: users
  secondary:
    - agent_profiles
    - email_otp_verifications
    - admin_actions
    - audit_logs
entry_states:
  users: []
exit_states:
  users: [ACTIVE, IN_REVIEW, DECLINED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Agent Signup Workflow

Create agent accounts with admin approval requirement to prevent fake agents and maintain platform trust.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Agent Opens Registration] --> B[Fill Basic User Details<br/>Name, Email, Mobile, Password]
    B --> C[Fill Agent-Specific Details]
    
    subgraph AgentDetails["Agent Details Required"]
        D1[Address]
        D2[ID Documents Upload]
        D3[Base Location lat/lng]
        D4[Service Radius ≤100km]
    end
    
    C --> AgentDetails
    AgentDetails --> E{Validate All Fields}
    
    E -->|Invalid| F[Show Validation Errors]
    F --> C
    
    E -->|Valid| G[Create User Record<br/>Role: AGENT<br/>Status: PENDING_VERIFICATION]
    
    G --> H[Generate Email OTP]
    H --> I[User Verifies OTP]
    I --> J[Update Status: IN_REVIEW]
    
    J --> K[Create Agent Profile]
    K --> L[Notify Admin: New Application]
    L --> M[Show Pending Review Screen]
    
    M --> N{Admin Reviews}
    
    N -->|Approve| O[Status: ACTIVE<br/>Create Agent Record]
    N -->|Decline| P[Status: DECLINED<br/>Store Reason]
    
    O --> Q[Send Approval Email]
    P --> R[Send Decline Email with Reason]
    
    Q --> S[Agent Can Start Working]
    R --> T[Agent May Reapply]

    style A fill:#e3f2fd
    style S fill:#c8e6c9
    style T fill:#fff9c4
    style P fill:#ffcdd2
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> FormEntry
    
    FormEntry --> Validation: Submit
    Validation --> FormEntry: Invalid
    Validation --> UserCreated: Valid
    
    UserCreated --> OTPVerification: OTP Sent
    OTPVerification --> PendingReview: OTP Verified
    
    PendingReview --> AdminReview: Auto-submitted
    
    AdminReview --> Active: Approved
    AdminReview --> Declined: Rejected
    
    Declined --> FormEntry: Reapply
    
    Active --> [*]
```

---

## Agent User Status States

```mermaid
stateDiagram-v2
    [*] --> PENDING_VERIFICATION: Registration Started
    
    PENDING_VERIFICATION --> IN_REVIEW: OTP Verified
    
    IN_REVIEW --> ACTIVE: Admin Approves
    IN_REVIEW --> DECLINED: Admin Declines
    
    DECLINED --> IN_REVIEW: Reapply
    
    ACTIVE --> SUSPENDED: Violation
    SUSPENDED --> ACTIVE: Admin Reinstates
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| users | - | PENDING_VERIFICATION | Form submitted |
| users | PENDING_VERIFICATION | IN_REVIEW | OTP verified |
| users | IN_REVIEW | ACTIVE | Admin approves |
| users | IN_REVIEW | DECLINED | Admin declines |
| users | DECLINED | IN_REVIEW | Agent reapplies |
| agent_profiles | - | CREATED | OTP verified |
| admin_actions | - | AGENT_APPROVED | Admin approves |
| admin_actions | - | AGENT_DECLINED | Admin declines |
| audit_logs | - | AGENT_SIGNUP | Registration complete |
| audit_logs | - | AGENT_APPROVED | Admin approval |
| audit_logs | - | AGENT_DECLINED | Admin decline |

---

## Key Points

- Agents have separate registration flow from users
- Admin approval is mandatory before agent can operate
- IN_REVIEW agents can log in but have limited UI access
- DECLINED agents can edit details and reapply
- Old records are NEVER deleted (audit trail)
- Service radius cannot exceed 100km

---

## Security Rules

- Each OTP can only be used ONCE (single-use enforcement)
- Email cannot be changed until account is verified
- Password must be minimum 8 characters with 1 letter and 1 number
