---
workflow_id: BUYER_VISIT_BOOKING
role: BUYER
action_type: MUTATION
entities:
  primary: visit_requests
  secondary:
    - properties
    - agent_profiles
    - visit_verifications
    - audit_logs
entry_states:
  properties: [ACTIVE]
  visit_requests: []
exit_states:
  visit_requests: [REQUESTED, APPROVED, COMPLETED, REJECTED, CANCELLED, NO_SHOW]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Buyer Visit Booking Workflow

Request, schedule, and verify property visits with agent involvement.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Buyer Views ACTIVE Property] --> B[Click Book Visit]
    B --> C[Select Preferred Date/Time]
    C --> D[Submit Visit Request]
    
    D --> E[Visit Status: REQUESTED]
    E --> F[Agent Receives Notification]
    
    F --> G{Agent Reviews}
    
    G -->|Approve| H[Visit Status: APPROVED]
    G -->|Reject| I[Visit Status: REJECTED<br/>Suggest Alternative]
    
    I --> J[Buyer Notified]
    J --> C
    
    H --> K[Both Parties Notified<br/>Exact Address Revealed to Buyer]
    
    K --> L[Visit Day]
    
    L --> M{Agent at Location?}
    M -->|No| N[Cannot Start Visit]
    M -->|Yes| O[Agent GPS Verified<br/>Within 50-100m of Property]
    
    O --> P[Generate Email OTP for Buyer]
    P --> Q[Buyer Enters OTP]
    
    Q --> R{OTP Valid?}
    R -->|No| S[Retry or Cancel]
    R -->|Yes| T[Visit Status: COMPLETED]
    
    T --> U[Buyer Can Now:<br/>Make Offer / Leave Review]

    style A fill:#e3f2fd
    style T fill:#c8e6c9
    style I fill:#ffcdd2
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Buyer Books
    
    REQUESTED --> APPROVED: Agent Approves
    REQUESTED --> REJECTED: Agent Rejects
    
    REJECTED --> REQUESTED: Buyer Resubmits
    
    APPROVED --> COMPLETED: Visit Done + OTP Verified
    APPROVED --> CANCELLED: Either Party Cancels
    APPROVED --> NO_SHOW: Buyer Didn't Appear
    
    COMPLETED --> [*]
    CANCELLED --> [*]
    NO_SHOW --> [*]
```

---

## Visit Verification Flow

```mermaid
sequenceDiagram
    participant B as Buyer
    participant A as Agent
    participant S as System
    participant P as Property
    
    A->>S: Arrive at Property
    S->>S: Verify GPS (within 50-100m)
    S->>B: Send Email OTP
    B->>S: Enter OTP
    S->>S: Validate OTP
    S->>A: Visit Verified
    S->>P: Log Completed Visit
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| visit_requests | - | REQUESTED | Buyer submits |
| visit_requests | REQUESTED | APPROVED | Agent approves |
| visit_requests | REQUESTED | REJECTED | Agent rejects |
| visit_requests | APPROVED | COMPLETED | OTP verified |
| visit_requests | APPROVED | CANCELLED | Cancellation |
| visit_requests | APPROVED | NO_SHOW | Buyer absent |
| audit_logs | - | VISIT_REQUESTED | Request created |
| audit_logs | - | VISIT_APPROVED | Agent approves |
| audit_logs | - | VISIT_COMPLETED | Visit done |

---

## Trust & Security

- Exact address revealed ONLY after visit approved
- Agent must be physically present (GPS verified)
- Buyer must verify presence with OTP
- All actions logged immutably
- NO_SHOW affects buyer trust score
