---
workflow_id: ADMIN_AGENT_OVERVIEW
role: ADMIN
action_type: READ_ONLY
entities:
  primary: agent_profiles
  secondary:
    - users
entry_states:
  users: [IN_REVIEW, ACTIVE, SUSPENDED, DECLINED]
exit_states:
  users: [IN_REVIEW, ACTIVE, SUSPENDED, DECLINED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: false
diagram_types:
  - flowchart
---

# Admin Agent Overview Workflow

View agent applications and profiles without making changes.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Admin Opens Agent Management] --> B{View Mode}
    
    B -->|Applications| C[Pending Applications]
    B -->|Active Agents| D[Active Agent List]
    
    C --> E[Filter: IN_REVIEW / DECLINED]
    D --> F[Filter: ACTIVE / SUSPENDED]
    
    E --> G[Select Application]
    F --> H[Select Agent]
    
    G --> I[View Application Details]
    H --> J[View Agent Profile]
    
    subgraph AppDetails["Application Details"]
        A1[Personal Info]
        A2[Documents]
        A3[Base Location]
        A4[Service Radius]
    end
    
    subgraph AgentDetails["Agent Details"]
        B1[Profile Info]
        B2[Completed Deals]
        B3[Rating]
        B4[Activity History]
    end
    
    I --> AppDetails
    J --> AgentDetails
    
    AppDetails --> K{Need Action?}
    K -->|Yes| L[ADMIN_AGENT_APPROVAL]
    K -->|No| M[Continue Browsing]

    style A fill:#e3f2fd
```

---

## Key Points

- Read-only workflow
- Separates applications from active agents
- No state changes occur
- Provides data for approval decisions
