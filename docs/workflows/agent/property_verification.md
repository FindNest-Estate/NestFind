---
workflow_id: AGENT_PROPERTY_VERIFICATION
role: AGENT
action_type: MUTATION
entities:
  primary: properties
  secondary:
    - property_verifications
    - audit_logs
entry_states:
  properties: [PENDING_VERIFY]
exit_states:
  properties: [ACTIVE, DRAFT]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - sequenceDiagram
---

# Agent Property Verification Workflow

Verify property details on-site before making listing active.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Property Submitted for Verification] --> B[Agent Notified]
    B --> C[View Property Details]
    
    C --> D[Schedule Site Visit]
    D --> E[Visit Property Location]
    
    E --> F{Agent at Location?}
    F -->|No| G[Cannot Verify Remotely]
    F -->|Yes| H[GPS Verified<br/>Within 50-100m]
    
    H --> I[Verification Checklist]
    
    subgraph Checklist["Verification Items"]
        C1[Property Exists]
        C2[Details Match Listing]
        C3[Photos Accurate]
        C4[Access Confirmed]
        C5[No Legal Issues]
    end
    
    I --> Checklist
    Checklist --> J{All Verified?}
    
    J -->|Yes| K[Approve Property]
    J -->|No| L[Document Issues]
    
    K --> M[Property Status: ACTIVE]
    M --> N[Create Verification Record]
    N --> O[Property Now Visible]
    
    L --> P[Reject with Feedback]
    P --> Q[Property Status: DRAFT]
    Q --> R[Seller Notified to Fix]

    style A fill:#e3f2fd
    style O fill:#c8e6c9
    style R fill:#fff9c4
```

---

## Verification Sequence

```mermaid
sequenceDiagram
    participant S as Seller
    participant A as Agent
    participant P as Property
    participant DB as Database
    
    S->>P: Submit for Verification
    P->>A: Notification
    A->>P: Visit Location
    A->>A: GPS Check
    A->>P: Verify Details
    
    alt All Verified
        A->>DB: Approve
        DB->>P: Status = ACTIVE
        P->>S: Approval Email
    else Issues Found
        A->>DB: Reject + Reason
        DB->>P: Status = DRAFT
        P->>S: Rejection Email
    end
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| properties | PENDING_VERIFY | ACTIVE | Agent approves |
| properties | PENDING_VERIFY | DRAFT | Agent rejects |
| property_verifications | - | CREATED | Verification complete |
| audit_logs | - | PROPERTY_VERIFIED | Approval |
| audit_logs | - | PROPERTY_REJECTED | Rejection |

---

## Key Points

- Agent must be physically present (GPS verified)
- Verification creates immutable record
- Rejected properties return to DRAFT
- Seller must fix issues and resubmit
- Verification data includes GPS coordinates and timestamp
