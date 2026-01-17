---
workflow_id: SYSTEM_RESERVATION_EXPIRY
role: SYSTEM
action_type: MUTATION
entities:
  primary: reservations
  secondary:
    - properties
    - audit_logs
entry_states:
  reservations: [ACTIVE]
exit_states:
  reservations: [EXPIRED]
  properties: [ACTIVE]
trigger:
  type: CRON
  schedule: "0 * * * *"
audit_required: true
diagram_types:
  - flowchart
  - sequenceDiagram
---

# System Reservation Expiry Workflow

Automatically expire reservations that exceed 30-day limit.

---

## Flow Diagram

```mermaid
flowchart TD
    A[CRON Job Runs<br/>Every Hour] --> B[Query Active Reservations]
    
    B --> C{Any Expired?}
    
    C -->|No| D[Sleep Until Next Run]
    
    C -->|Yes| E[For Each Expired Reservation]
    
    E --> F[Reservation Status: EXPIRED]
    F --> G[Property Status: ACTIVE]
    G --> H[Release Property Lock]
    H --> I[Create Audit Log]
    I --> J[Notify All Parties]
    
    J --> K{More Expired?}
    K -->|Yes| E
    K -->|No| L[Job Complete]

    style A fill:#e3f2fd
    style L fill:#c8e6c9
```

---

## Expiry Check Logic

```mermaid
sequenceDiagram
    participant C as CRON
    participant DB as Database
    participant N as Notification
    
    C->>DB: SELECT * FROM reservations WHERE status='ACTIVE' AND end_date < NOW()
    DB->>C: Expired Reservations List
    
    loop For Each Expired
        C->>DB: UPDATE reservations SET status='EXPIRED'
        C->>DB: UPDATE properties SET status='ACTIVE'
        C->>DB: INSERT INTO audit_logs
        C->>N: Send Expiry Notifications
    end
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| reservations | ACTIVE | EXPIRED | Timer exceeds 30 days |
| properties | RESERVED | ACTIVE | Reservation expires |
| audit_logs | - | RESERVATION_EXPIRED | System action |

---

## Key Points

- Runs every hour (0 * * * *)
- Checks all ACTIVE reservations
- 30-day limit is non-negotiable
- Property returns to open market
- All parties notified of expiry
- Token payment handling per policy
