---
workflow_id: BUYER_OFFER_FLOW
role: BUYER
action_type: MUTATION
entities:
  primary: offers
  secondary:
    - properties
    - users
    - audit_logs
entry_states:
  properties: [ACTIVE]
  offers: []
exit_states:
  offers: [PENDING, ACCEPTED, REJECTED, COUNTERED, EXPIRED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Buyer Offer Flow Workflow

Submit, negotiate, and finalize offers with controlled, traceable negotiation.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Buyer Views ACTIVE Property] --> B[Click Make Offer]
    B --> C[Enter Offer Price]
    C --> D[Set Offer Expiry<br/>Default: 48 hours]
    D --> E[Submit Offer]
    
    E --> F[Offer Status: PENDING]
    F --> G[Notify Seller + Agent]
    
    G --> H{Seller/Agent Response}
    
    H -->|Accept| I[Offer Status: ACCEPTED]
    H -->|Reject| J[Offer Status: REJECTED]
    H -->|Counter| K[Offer Status: COUNTERED<br/>New Price Proposed]
    H -->|No Response| L{Timer Expired?}
    
    L -->|Yes| M[Offer Status: EXPIRED]
    L -->|No| H
    
    J --> N[Buyer Notified<br/>Can Submit New Offer]
    M --> N
    
    K --> O[Buyer Reviews Counter]
    O --> P{Buyer Response}
    
    P -->|Accept Counter| I
    P -->|Reject Counter| Q[Offer Status: REJECTED]
    P -->|Counter Again| R[New Counter Offer]
    R --> K
    
    I --> S[Proceed to Reservation<br/>BUYER_RESERVATION]

    style A fill:#e3f2fd
    style I fill:#c8e6c9
    style J fill:#ffcdd2
    style M fill:#e0e0e0
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING: Buyer Submits
    
    PENDING --> ACCEPTED: Seller Accepts
    PENDING --> REJECTED: Seller Rejects
    PENDING --> COUNTERED: Seller Counters
    PENDING --> EXPIRED: Timer Runs Out
    
    COUNTERED --> ACCEPTED: Buyer Accepts Counter
    COUNTERED --> REJECTED: Buyer Rejects Counter
    COUNTERED --> COUNTERED: Buyer Re-counters
    
    ACCEPTED --> [*]
    REJECTED --> [*]
    EXPIRED --> [*]
```

---

## Counter Offer Flow

```mermaid
sequenceDiagram
    participant B as Buyer
    participant S as System
    participant SE as Seller
    
    B->>S: Submit Offer (100L)
    S->>SE: Notify: Offer Received
    SE->>S: Counter (110L)
    S->>B: Notify: Counter Offer
    B->>S: Accept Counter
    S->>SE: Notify: Offer Accepted
    S->>B: Proceed to Reservation
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| offers | - | PENDING | Buyer submits |
| offers | PENDING | ACCEPTED | Seller accepts |
| offers | PENDING | REJECTED | Seller rejects |
| offers | PENDING | COUNTERED | Seller counters |
| offers | PENDING | EXPIRED | Timer expires |
| offers | COUNTERED | ACCEPTED | Buyer accepts counter |
| offers | COUNTERED | REJECTED | Buyer rejects counter |
| audit_logs | - | OFFER_SUBMITTED | Offer created |
| audit_logs | - | OFFER_ACCEPTED | Acceptance |
| audit_logs | - | OFFER_COUNTERED | Counter made |

---

## Concurrency Rules

```mermaid
flowchart TD
    A[Property ACTIVE] --> B{Multiple Offers?}
    B -->|Yes| C[All Offers Visible to Seller]
    C --> D[Seller Accepts ONE]
    D --> E[Other Offers Auto-REJECTED]
    E --> F[Property → RESERVED]
```

---

## Key Points

- Multiple buyers can make offers simultaneously
- Only ONE offer can be accepted
- When one is accepted, others auto-reject
- All offers are time-bound (default 48h)
- Counter offers restart the timer
- Immutable offer history for disputes
