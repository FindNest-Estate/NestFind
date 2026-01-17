---
workflow_id: ADMIN_USER_CONTROL
role: ADMIN
action_type: MUTATION
entities:
  primary: users
  secondary:
    - admin_actions
    - audit_logs
entry_states:
  users: [ACTIVE, SUSPENDED]
exit_states:
  users: [ACTIVE, SUSPENDED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Admin User Control Workflow

Suspend, activate, and manage user accounts with full audit trail.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Admin Views User] --> B{User Status}
    
    B -->|ACTIVE| C[Actions Available]
    B -->|SUSPENDED| D[Actions Available]
    
    subgraph ActiveActions["Active User Actions"]
        C1[Suspend Account]
        C2[View Activity]
        C3[Reset Password]
    end
    
    subgraph SuspendedActions["Suspended User Actions"]
        D1[Reactivate Account]
        D2[View History]
    end
    
    C --> ActiveActions
    D --> SuspendedActions
    
    C1 --> E[Enter Suspension Reason]
    E --> F[Confirm Action]
    F --> G[User Status: SUSPENDED]
    G --> H[Create Admin Action Record]
    H --> I[User Notified]
    
    D1 --> J[Confirm Reactivation]
    J --> K[User Status: ACTIVE]
    K --> L[Create Admin Action Record]
    L --> M[User Notified]

    style A fill:#e3f2fd
    style G fill:#ffcdd2
    style K fill:#c8e6c9
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> ACTIVE
    
    ACTIVE --> SUSPENDED: Admin Suspends
    SUSPENDED --> ACTIVE: Admin Reinstates
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| users | ACTIVE | SUSPENDED | Admin suspension |
| users | SUSPENDED | ACTIVE | Admin reactivation |
| admin_actions | - | USER_SUSPENDED | Suspension action |
| admin_actions | - | USER_ACTIVATED | Reactivation |
| audit_logs | - | ADMIN_SUSPEND_USER | Suspension |
| audit_logs | - | ADMIN_ACTIVATE_USER | Activation |

---

## Key Points

- Reason is mandatory for suspension
- All actions create admin_action record
- User is notified of status change
- Suspended users cannot log in
- Admin cannot delete users (only suspend)
