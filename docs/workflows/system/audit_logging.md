---
workflow_id: SYSTEM_AUDIT_LOGGING
role: SYSTEM
action_type: MUTATION
entities:
  primary: audit_logs
  secondary: []
entry_states:
  audit_logs: []
exit_states:
  audit_logs: [CREATED]
trigger:
  type: EVENT
  schedule: null
audit_required: false
diagram_types:
  - flowchart
  - sequenceDiagram
---

# System Audit Logging Workflow

Create immutable audit records for all platform mutations.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Mutation Event Occurs] --> B[Extract Event Details]
    
    subgraph Details["Audit Record Fields"]
        D1[actor_id]
        D2[actor_role]
        D3[action]
        D4[entity_type]
        D5[entity_id]
        D6[old_state]
        D7[new_state]
        D8[timestamp]
        D9[ip_address]
        D10[details JSON]
    end
    
    B --> Details
    Details --> C[Create Audit Log Entry]
    C --> D[Entry is Immutable]
    
    D --> E{Critical Action?}
    
    E -->|Yes| F[Trigger Real-time Alert]
    E -->|No| G[Standard Logging]
    
    F --> H[Notify Admin]
    G --> I[Log Complete]
    H --> I

    style A fill:#e3f2fd
    style I fill:#c8e6c9
```

---

## Audit Entry Sequence

```mermaid
sequenceDiagram
    participant U as User Action
    participant B as Backend
    participant A as Audit Service
    participant DB as Database
    
    U->>B: Mutation Request
    B->>B: Validate & Process
    B->>DB: Apply Mutation
    B->>A: Create Audit Entry
    A->>DB: INSERT audit_log
    A->>B: Confirm Logged
    B->>U: Response
```

---

## Audit Record Categories

```mermaid
flowchart LR
    subgraph Categories["Action Categories"]
        C1[AUTH: Login/Signup/Logout]
        C2[PROPERTY: Create/Update/Verify]
        C3[OFFER: Submit/Accept/Reject]
        C4[RESERVATION: Create/Expire]
        C5[TRANSACTION: Initiate/Complete]
        C6[ADMIN: Override/Suspend/Approve]
    end
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| audit_logs | - | CREATED | Any mutation |

---

## Key Points

- Triggered by ALL mutations
- Records are immutable
- Cannot be updated or deleted
- Includes before/after state
- IP address logged for security
- Critical actions trigger alerts
