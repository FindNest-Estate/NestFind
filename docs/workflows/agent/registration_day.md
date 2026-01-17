---
workflow_id: AGENT_REGISTRATION_DAY
role: AGENT
action_type: MUTATION
entities:
  primary: transactions
  secondary:
    - properties
    - reservations
    - payment_logs
    - audit_logs
entry_states:
  reservations: [ACTIVE]
  properties: [RESERVED]
exit_states:
  transactions: [COMPLETED]
  properties: [SOLD]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - sequenceDiagram
---

# Agent Registration Day Workflow

Facilitate property registration and transaction completion.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Reservation ACTIVE] --> B[Agent Schedules Registration]
    B --> C[All Parties Notified<br/>Date/Time/Location]
    
    C --> D[Registration Day]
    D --> E[Agent Arrives at Location]
    
    E --> F{Agent GPS Verified?}
    F -->|No| G[Must Be at Registration Location]
    G --> E
    
    F -->|Yes| H[Start Registration Session]
    
    H --> I[Step 1: Buyer Verification]
    I --> J[Send OTP to Buyer Email]
    J --> K[Buyer Enters OTP]
    
    K --> L{Buyer OTP Valid?}
    L -->|No| M[Retry]
    M --> K
    L -->|Yes| N[Buyer Verified]
    
    N --> O[Step 2: Seller Verification]
    O --> P[Send OTP to Seller Email]
    P --> Q[Seller Enters OTP]
    
    Q --> R{Seller OTP Valid?}
    R -->|No| S[Retry]
    S --> Q
    R -->|Yes| T[Seller Verified]
    
    T --> U[Step 3: Seller Payment]
    U --> V[Seller Pays 0.9% Commission]
    
    V --> W{Payment Success?}
    W -->|No| X[Payment Failed - Retry]
    X --> V
    
    W -->|Yes| Y[Transaction Status: COMPLETED]
    Y --> Z[Property Status: SOLD]
    Z --> AA[Commission Split]
    
    subgraph Commission["Commission Distribution"]
        AA --> AB[Agent: 80%]
        AA --> AC[Platform: 20%]
    end
    
    Commission --> AD[All Parties Notified]
    AD --> AE[Transaction Closed]

    style A fill:#e3f2fd
    style AE fill:#c8e6c9
```

---

## Registration Sequence

```mermaid
sequenceDiagram
    participant B as Buyer
    participant SE as Seller
    participant A as Agent
    participant S as System
    
    A->>S: Arrive at Location
    S->>S: Verify Agent GPS
    
    rect rgb(200, 230, 200)
        Note over B,S: Buyer Verification
        S->>B: Send Email OTP
        B->>A: Provide OTP
        A->>S: Enter Buyer OTP
        S->>S: Validate
    end
    
    rect rgb(200, 200, 230)
        Note over SE,S: Seller Verification
        S->>SE: Send Email OTP
        SE->>A: Provide OTP
        A->>S: Enter Seller OTP
        S->>S: Validate
    end
    
    rect rgb(230, 230, 200)
        Note over SE,S: Payment
        S->>SE: Request 0.9%
        SE->>S: Make Payment
        S->>S: Process Payment
    end
    
    S->>S: Mark COMPLETED
    S->>B: Ownership Transferred
    S->>SE: Payment Confirmed
    S->>A: Commission Released
```

---

## Commission Flow

```mermaid
flowchart LR
    A[Property Price: 1 Crore] --> B[Total Commission: 1%]
    
    B --> C[Buyer Paid: 0.1%<br/>at Reservation]
    B --> D[Seller Pays: 0.9%<br/>at Registration]
    
    C --> E[Platform Holds Both]
    D --> E
    
    E --> F[Total: 1 Lakh]
    
    F --> G[Agent: 80,000]
    F --> H[Platform: 20,000]
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| transactions | - | INITIATED | Registration starts |
| transactions | INITIATED | VERIFIED | Both OTPs valid |
| transactions | VERIFIED | COMPLETED | Payment success |
| properties | RESERVED | SOLD | Transaction complete |
| reservations | ACTIVE | COMPLETED | Transaction complete |
| payment_logs | - | COMPLETED | Seller payment |
| audit_logs | - | REGISTRATION_STARTED | Session begins |
| audit_logs | - | REGISTRATION_COMPLETED | Transaction done |

---

## Key Points

- Registration must happen within reservation period
- Agent GPS verification mandatory
- Buyer OTP verified first, then Seller
- Seller pays 0.9% at registration
- Commission auto-splits to agent and platform
- Property becomes SOLD (terminal state)
