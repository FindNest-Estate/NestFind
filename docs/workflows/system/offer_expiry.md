---
workflow_id: SYSTEM_OFFER_EXPIRY
role: SYSTEM
action_type: MUTATION
entities:
  primary: offers
  secondary:
    - audit_logs
entry_states:
  offers: [PENDING, COUNTERED]
exit_states:
  offers: [EXPIRED]
trigger:
  type: CRON
  schedule: "*/15 * * * *"
audit_required: true
diagram_types:
  - flowchart
---

# System Offer Expiry Workflow

Automatically expire offers that exceed their time limit.

---

## Flow Diagram

```mermaid
flowchart TD
    A[CRON Job Runs<br/>Every 15 Minutes] --> B[Query Offers]
    
    B --> C[SELECT WHERE<br/>status IN PENDING, COUNTERED<br/>AND expires_at < NOW]
    
    C --> D{Any Expired?}
    
    D -->|No| E[Sleep Until Next Run]
    
    D -->|Yes| F[For Each Expired Offer]
    
    F --> G[Offer Status: EXPIRED]
    G --> H[Create Audit Log]
    H --> I[Notify Buyer]
    I --> J[Notify Seller]
    
    J --> K{More Expired?}
    K -->|Yes| F
    K -->|No| L[Job Complete]

    style A fill:#e3f2fd
    style L fill:#c8e6c9
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| offers | PENDING | EXPIRED | Timer runs out |
| offers | COUNTERED | EXPIRED | Timer runs out |
| audit_logs | - | OFFER_EXPIRED | System action |

---

## Key Points

- Runs every 15 minutes
- Default offer expiry: 48 hours
- Counter offers have separate expiry
- Expired offers cannot be revived
- Buyer must submit new offer
