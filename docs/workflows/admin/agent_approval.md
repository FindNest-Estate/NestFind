---
workflow_id: ADMIN_AGENT_APPROVAL
role: ADMIN
action_type: MUTATION
entities:
  primary: users
  secondary:
    - agent_profiles
    - admin_actions
    - audit_logs
entry_states:
  users: [IN_REVIEW]
exit_states:
  users: [ACTIVE, DECLINED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Admin Agent Approval Workflow

Review and approve/decline agent applications.

---

## Flow Diagram

```mermaid
flowchart TD
    A[View Agent Application] --> B[Review Details]
    
    subgraph Review["Review Checklist"]
        R1[Identity Documents Valid]
        R2[Address Verified]
        R3[Base Location Reasonable]
        R4[Service Radius ≤ 100km]
        R5[No Red Flags]
    end
    
    B --> Review
    Review --> C{Decision}
    
    C -->|Approve| D[Confirm Approval]
    C -->|Decline| E[Enter Decline Reason]
    
    D --> F[User Status: ACTIVE]
    F --> G[Create Agent Profile]
    G --> H[Create Admin Action: APPROVED]
    H --> I[Send Approval Email]
    I --> J[Agent Can Start Working]
    
    E --> K[User Status: DECLINED]
    K --> L[Create Admin Action: DECLINED]
    L --> M[Send Decline Email with Reason]
    M --> N[Agent May Reapply]

    style A fill:#e3f2fd
    style J fill:#c8e6c9
    style N fill:#fff9c4
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> IN_REVIEW: Agent Applies
    
    IN_REVIEW --> ACTIVE: Admin Approves
    IN_REVIEW --> DECLINED: Admin Declines
    
    DECLINED --> IN_REVIEW: Agent Reapplies
    
    ACTIVE --> SUSPENDED: Violation
    SUSPENDED --> ACTIVE: Admin Reinstates
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| users | IN_REVIEW | ACTIVE | Admin approves |
| users | IN_REVIEW | DECLINED | Admin declines |
| users | DECLINED | IN_REVIEW | Agent reapplies |
| agent_profiles | - | CREATED | Approval |
| admin_actions | - | AGENT_APPROVED | Approval |
| admin_actions | - | AGENT_DECLINED | Decline |
| audit_logs | - | ADMIN_APPROVE_AGENT | Approval |
| audit_logs | - | ADMIN_DECLINE_AGENT | Decline |

---

## Key Points

- Decline reason is mandatory
- Declined agents can reapply
- Old applications are kept for audit
- Approval creates agent_profile record
- All decisions are audited
