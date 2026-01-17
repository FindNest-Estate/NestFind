---
workflow_id: SELLER_OFFER_HANDLING
role: SELLER
action_type: MUTATION
entities:
  primary: offers
  secondary:
    - properties
    - audit_logs
entry_states:
  offers: [PENDING]
exit_states:
  offers: [ACCEPTED, REJECTED, COUNTERED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Seller Offer Handling Workflow

Review, respond, and negotiate offers on listed properties.

---

## Flow Diagram

```mermaid
flowchart TD
    A[New Offer Received] --> B[Seller Notified]
    B --> C[View Offer Details]
    
    subgraph OfferInfo["Offer Information"]
        I1[Buyer Name]
        I2[Offered Price]
        I3[Expiry Time]
        I4[Buyer Trust Score]
    end
    
    C --> OfferInfo
    OfferInfo --> D{Multiple Offers?}
    
    D -->|Yes| E[View All Active Offers]
    D -->|No| F[Single Offer View]
    
    E --> F
    
    F --> G{Seller Decision}
    
    G -->|Accept| H[Offer Status: ACCEPTED]
    G -->|Reject| I[Offer Status: REJECTED]
    G -->|Counter| J[Enter Counter Price]
    
    J --> K[Set Counter Expiry]
    K --> L[Offer Status: COUNTERED]
    L --> M[Buyer Notified]
    
    H --> N{Other Offers Exist?}
    N -->|Yes| O[Auto-Reject Other Offers]
    N -->|No| P[Continue]
    
    O --> P
    P --> Q[Proceed to Reservation<br/>BUYER_RESERVATION]
    
    I --> R[Buyer Notified<br/>Can Submit New Offer]

    style A fill:#e3f2fd
    style H fill:#c8e6c9
    style I fill:#ffcdd2
    style L fill:#fff9c4
```

---

## Multiple Offers View

```mermaid
flowchart TD
    subgraph AllOffers["Active Offers on Property"]
        O1["Buyer A: 95L<br/>Expires: 24h"]
        O2["Buyer B: 100L<br/>Expires: 12h"]
        O3["Buyer C: 98L<br/>Expires: 36h"]
    end
    
    AllOffers --> D[Seller Selects One to Accept]
    D --> E[Selected: ACCEPTED]
    E --> F[Others: AUTO-REJECTED]
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Pending: Offer Received
    
    Pending --> Reviewing: Seller Views
    
    Reviewing --> Accepted: Accept
    Reviewing --> Rejected: Reject
    Reviewing --> Countered: Counter
    
    Countered --> WaitingBuyer: Counter Sent
    
    WaitingBuyer --> Accepted: Buyer Accepts
    WaitingBuyer --> Rejected: Buyer Rejects
    WaitingBuyer --> Countered: Buyer Re-counters
    
    Accepted --> [*]
    Rejected --> [*]
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| offers | PENDING | ACCEPTED | Seller accepts |
| offers | PENDING | REJECTED | Seller rejects |
| offers | PENDING | COUNTERED | Seller counters |
| offers | COUNTERED | ACCEPTED | Buyer accepts counter |
| offers | PENDING | REJECTED | Auto-reject (another accepted) |
| audit_logs | - | OFFER_ACCEPTED | Acceptance |
| audit_logs | - | OFFER_REJECTED | Rejection |
| audit_logs | - | OFFER_COUNTERED | Counter sent |

---

## Key Points

- Seller sees all active offers in one view
- Accepting one offer auto-rejects all others
- Counter offers have new expiry timers
- Agent can also respond on seller's behalf
- All negotiations are logged and immutable
