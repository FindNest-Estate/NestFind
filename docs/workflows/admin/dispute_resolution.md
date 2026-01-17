---
workflow_id: ADMIN_DISPUTE_RESOLUTION
role: ADMIN
action_type: MUTATION
entities:
  primary: disputes
  secondary:
    - users
    - properties
    - transactions
    - admin_actions
    - audit_logs
entry_states:
  disputes: [OPEN]
exit_states:
  disputes: [RESOLVED, ESCALATED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Admin Dispute Resolution Workflow

Review and resolve disputes between platform users.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Dispute Raised] --> B[Admin Notified]
    B --> C[Review Dispute Details]
    
    subgraph Evidence["Available Evidence"]
        E1[Complainant Statement]
        E2[Respondent Statement]
        E3[Transaction History]
        E4[Chat Logs]
        E5[Uploaded Proof]
    end
    
    C --> Evidence
    Evidence --> D{Sufficient Evidence?}
    
    D -->|No| E[Request More Information]
    E --> F[Wait for Response]
    F --> C
    
    D -->|Yes| G{Decision}
    
    G -->|Favor Complainant| H[Apply Remedy]
    G -->|Favor Respondent| I[Dismiss Dispute]
    G -->|Cannot Determine| J[Escalate]
    
    subgraph Remedies["Possible Remedies"]
        R1[Refund Payment]
        R2[Suspend User]
        R3[Cancel Transaction]
        R4[Issue Warning]
    end
    
    H --> Remedies
    Remedies --> K[Apply Selected Remedy]
    
    K --> L[Dispute Status: RESOLVED]
    I --> L
    J --> M[Dispute Status: ESCALATED]
    
    L --> N[All Parties Notified]
    M --> O[Assign to Senior Admin]

    style A fill:#e3f2fd
    style L fill:#c8e6c9
    style M fill:#fff9c4
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> OPEN: User Raises Dispute
    
    OPEN --> UNDER_REVIEW: Admin Picks Up
    
    UNDER_REVIEW --> AWAITING_INFO: Need More Data
    AWAITING_INFO --> UNDER_REVIEW: Info Provided
    
    UNDER_REVIEW --> RESOLVED: Decision Made
    UNDER_REVIEW --> ESCALATED: Cannot Resolve
    
    RESOLVED --> [*]
    ESCALATED --> RESOLVED: Senior Resolves
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| disputes | OPEN | UNDER_REVIEW | Admin starts review |
| disputes | UNDER_REVIEW | RESOLVED | Decision made |
| disputes | UNDER_REVIEW | ESCALATED | Cannot resolve |
| admin_actions | - | DISPUTE_RESOLVED | Resolution |
| audit_logs | - | ADMIN_DISPUTE_ACTION | Any action |

---

## Key Points

- All evidence is immutable
- Decision reason is mandatory
- Both parties are notified of outcome
- Escalation goes to senior admin
- Remedies can affect multiple entities
