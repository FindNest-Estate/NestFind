---
workflow_id: ADMIN_PROPERTY_OVERRIDE
role: ADMIN
action_type: MUTATION
entities:
  primary: properties
  secondary:
    - admin_actions
    - audit_logs
entry_states:
  properties: [DRAFT, PENDING_VERIFY, ACTIVE, RESERVED, INACTIVE]
exit_states:
  properties: [DRAFT, ACTIVE, INACTIVE, RESERVED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
---

# Admin Property Override Workflow

Force property state changes when normal workflow cannot proceed.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Admin Views Property] --> B[Review Current State]
    
    B --> C{Override Needed?}
    
    C -->|No| D[No Action]
    C -->|Yes| E[Select Override Action]
    
    subgraph Overrides["Available Overrides"]
        O1[Force ACTIVE<br/>Skip Verification]
        O2[Force INACTIVE<br/>Remove from Listing]
        O3[Force DRAFT<br/>Require Re-verification]
        O4[Cancel Reservation]
    end
    
    E --> Overrides
    Overrides --> F[Enter Override Reason]
    F --> G{Reason Provided?}
    
    G -->|No| H[Cannot Proceed<br/>Reason Required]
    G -->|Yes| I[Confirm Override]
    
    I --> J[Apply State Change]
    J --> K[Create Admin Action Record]
    K --> L[Notify Affected Parties]
    L --> M[Override Complete]

    style A fill:#e3f2fd
    style M fill:#c8e6c9
    style H fill:#ffcdd2
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| properties | PENDING_VERIFY | ACTIVE | Admin force approve |
| properties | ACTIVE | INACTIVE | Admin deactivate |
| properties | * | DRAFT | Admin force reset |
| properties | RESERVED | ACTIVE | Admin cancel reservation |
| admin_actions | - | PROPERTY_OVERRIDE | Any override |
| audit_logs | - | ADMIN_PROPERTY_OVERRIDE | Override action |

---

## Key Points

- Reason is always mandatory
- All overrides create permanent record
- Affected parties are always notified
- Overrides bypass normal workflows
- Cannot override to SOLD (requires transaction)
