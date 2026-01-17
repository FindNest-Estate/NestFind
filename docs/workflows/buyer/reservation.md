---
workflow_id: BUYER_RESERVATION
role: BUYER
action_type: MUTATION
entities:
  primary: reservations
  secondary:
    - properties
    - offers
    - payment_logs
    - audit_logs
entry_states:
  offers: [ACCEPTED]
  properties: [ACTIVE]
exit_states:
  reservations: [ACTIVE, EXPIRED, CANCELLED]
  properties: [RESERVED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
  - gantt
---

# Buyer Reservation Workflow

Secure property with 0.1% token payment and 30-day reservation period.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Offer ACCEPTED] --> B[Initiate Reservation]
    B --> C[Calculate 0.1% of Property Price]
    C --> D[Show Payment Summary]
    
    D --> E{Buyer Pays?}
    
    E -->|No| F[Reservation Not Created<br/>Offer Remains ACCEPTED]
    E -->|Yes| G[Process Payment]
    
    G --> H{Payment Success?}
    
    H -->|Failed| I[Show Error<br/>Retry Payment]
    I --> G
    
    H -->|Success| J[Create Reservation<br/>Status: ACTIVE]
    
    J --> K[Property Status: RESERVED]
    K --> L[Start 30-Day Timer]
    
    L --> M[All Parties Notified]
    M --> N[Reservation Active]
    
    N --> O{During 30 Days}
    
    O -->|Schedule Registration| P[AGENT_REGISTRATION_DAY]
    O -->|Cancel| Q[Reservation CANCELLED<br/>Property Returns to ACTIVE]
    O -->|Timer Expires| R[Reservation EXPIRED<br/>Property Returns to ACTIVE]
    
    P --> S[Transaction Complete]

    style A fill:#e3f2fd
    style J fill:#c8e6c9
    style Q fill:#ffcdd2
    style R fill:#fff9c4
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> PaymentPending: Offer Accepted
    
    PaymentPending --> Active: Payment Success
    PaymentPending --> [*]: Payment Declined
    
    Active --> RegistrationScheduled: Agent Schedules
    Active --> Cancelled: Buyer/Seller Cancels
    Active --> Expired: 30 Days Pass
    
    RegistrationScheduled --> Completed: Registration Done
    RegistrationScheduled --> Cancelled: Party Cancels
    
    Completed --> [*]
    Cancelled --> [*]
    Expired --> [*]
```

---

## Timeline

```mermaid
gantt
    title Reservation Timeline
    dateFormat  YYYY-MM-DD
    section Reservation
    Payment Processed      :milestone, m1, 2024-01-01, 0d
    Active Period          :active, a1, 2024-01-01, 30d
    Expiry Date            :milestone, m2, 2024-01-31, 0d
    section Actions
    Schedule Registration  :crit, 2024-01-15, 15d
```

---

## Payment Flow

```mermaid
flowchart LR
    A[Property Price: 1 Crore] --> B[Calculate 0.1%]
    B --> C[Token Amount: 10,000]
    C --> D[Buyer Pays]
    D --> E[Platform Holds]
    E --> F[Applied to Final Commission]
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| reservations | - | ACTIVE | Payment success |
| reservations | ACTIVE | EXPIRED | 30 days pass |
| reservations | ACTIVE | CANCELLED | Cancellation |
| properties | ACTIVE | RESERVED | Reservation created |
| properties | RESERVED | ACTIVE | Reservation expires/cancels |
| properties | RESERVED | SOLD | Registration complete |
| payment_logs | - | COMPLETED | Payment processed |
| audit_logs | - | RESERVATION_CREATED | Payment success |
| audit_logs | - | RESERVATION_EXPIRED | Timer expires |

---

## Key Points

- Token is 0.1% of agreed price
- Reservation locks property for 30 days
- Registration MUST happen within 30 days
- Token is non-refundable if buyer cancels
- Token refundable if seller cancels
- Expiry handled by SYSTEM_RESERVATION_EXPIRY workflow
