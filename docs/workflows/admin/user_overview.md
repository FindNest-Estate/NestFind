---
workflow_id: ADMIN_USER_OVERVIEW
role: ADMIN
action_type: READ_ONLY
entities:
  primary: users
  secondary:
    - audit_logs
entry_states:
  users: [PENDING_VERIFICATION, ACTIVE, SUSPENDED]
exit_states:
  users: [PENDING_VERIFICATION, ACTIVE, SUSPENDED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: false
diagram_types:
  - flowchart
---

# Admin User Overview Workflow

View and analyze user data without making changes.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Admin Opens User Management] --> B[View User List]
    
    B --> C{Apply Filters}
    
    subgraph Filters["Available Filters"]
        F1[Status: Active/Suspended]
        F2[Role: User/Agent/Admin]
        F3[Date Range]
        F4[Search by Email/Name]
    end
    
    C --> Filters
    Filters --> D[Filtered User List]
    
    D --> E[Select User]
    E --> F[View User Details]
    
    subgraph Details["User Detail View"]
        D1[Profile Information]
        D2[Account Status]
        D3[Activity History]
        D4[Properties Listed/Viewed]
        D5[Transactions]
        D6[Trust Score]
    end
    
    F --> Details
    
    Details --> G{Need Action?}
    G -->|Yes| H[ADMIN_USER_CONTROL]
    G -->|No| I[Continue Browsing]

    style A fill:#e3f2fd
```

---

## Key Points

- Read-only workflow
- No state changes occur
- No audit log created for views
- Filters are applied server-side
- Sensitive data masked appropriately
