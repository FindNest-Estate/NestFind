---
workflow_id: AGENT_VISIT_EXECUTION
role: AGENT
action_type: MUTATION
entities:
  primary: visit_requests
  secondary:
    - visit_verifications
    - audit_logs
entry_states:
  visit_requests: [REQUESTED, APPROVED]
exit_states:
  visit_requests: [APPROVED, COMPLETED, REJECTED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - sequenceDiagram
---

# Agent Visit Execution Workflow

Manage, conduct, and verify property visits.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Visit Request Received] --> B[Review Request]
    
    B --> C{Approve?}
    
    C -->|No| D[Reject with Reason<br/>Suggest Alternative]
    D --> E[Visit Status: REJECTED]
    E --> F[Buyer Notified]
    
    C -->|Yes| G[Visit Status: APPROVED]
    G --> H[Both Parties Notified<br/>Date/Time Confirmed]
    
    H --> I[Visit Day]
    I --> J[Agent Arrives at Property]
    
    J --> K{GPS Verified?}
    K -->|No| L[Must Be Within 50-100m]
    L --> J
    
    K -->|Yes| M[Start Visit Session]
    M --> N[Generate Buyer OTP]
    N --> O[Send OTP to Buyer Email]
    
    O --> P[Buyer Arrives]
    P --> Q[Buyer Enters OTP]
    
    Q --> R{OTP Valid?}
    R -->|No| S[Invalid - Retry]
    S --> Q
    
    R -->|Yes| T[Visit Status: COMPLETED]
    T --> U[Create Visit Verification Record]
    U --> V[Buyer Can Now Make Offer]

    style A fill:#e3f2fd
    style V fill:#c8e6c9
    style E fill:#ffcdd2
```

---

## Visit Verification Sequence

```mermaid
sequenceDiagram
    participant B as Buyer
    participant A as Agent
    participant S as System
    participant P as Property
    
    A->>P: Arrive at Property
    S->>S: Verify Agent GPS
    S->>A: GPS Confirmed
    A->>S: Start Visit Session
    S->>B: Send Email OTP
    B->>P: Arrive at Property
    B->>A: Show OTP
    A->>S: Enter OTP
    S->>S: Validate OTP
    S->>S: Mark Visit COMPLETED
    S->>B: Unlock Make Offer
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| visit_requests | REQUESTED | APPROVED | Agent approves |
| visit_requests | REQUESTED | REJECTED | Agent rejects |
| visit_requests | APPROVED | COMPLETED | OTP verified |
| visit_requests | APPROVED | NO_SHOW | Buyer absent |
| visit_verifications | - | CREATED | Visit completed |
| audit_logs | - | VISIT_APPROVED | Approval |
| audit_logs | - | VISIT_COMPLETED | Completion |

---

## Key Points

- Agent must approve/reject within SLA
- GPS verification mandatory for agent
- OTP verification mandatory for buyer
- NO_SHOW affects buyer trust score
- Visit completion unlocks offer capability
