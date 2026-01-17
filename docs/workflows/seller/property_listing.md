---
workflow_id: SELLER_PROPERTY_LISTING
role: SELLER
action_type: MUTATION
entities:
  primary: properties
  secondary:
    - property_media
    - agent_assignments
    - audit_logs
entry_states:
  properties: []
exit_states:
  properties: [DRAFT, PENDING_VERIFY, ACTIVE, INACTIVE]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Seller Property Listing Workflow

Create, manage, and publish properties through agent verification.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Seller Opens Create Property] --> B[Enter Property Details]
    
    subgraph Details["Required Fields"]
        D1[Title]
        D2[Description]
        D3[Type: House/Apartment/Land]
        D4[Price]
        D5[Location lat/lng]
        D6[Bedrooms/Bathrooms]
    end
    
    B --> Details
    Details --> C[Upload Images/Videos]
    C --> D[Property Status: DRAFT]
    
    D --> E{Ready to Publish?}
    
    E -->|No| F[Save as DRAFT<br/>Edit Later]
    E -->|Yes| G{Agent Assigned?}
    
    G -->|No| H[Must Hire Agent First<br/>SELLER_HIRE_AGENT]
    G -->|Yes| I[Submit for Verification]
    
    H --> J[Agent Assigned]
    J --> I
    
    I --> K[Property Status: PENDING_VERIFY]
    K --> L[Agent Notified]
    
    L --> M{Agent Verifies}
    
    M -->|Approve| N[Property Status: ACTIVE]
    M -->|Reject| O[Property Status: DRAFT<br/>Feedback Provided]
    
    O --> P[Seller Edits Property]
    P --> I
    
    N --> Q[Property Visible to Buyers]
    Q --> R[Listing Active]

    style A fill:#e3f2fd
    style R fill:#c8e6c9
    style O fill:#fff9c4
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Seller Creates
    
    DRAFT --> PENDING_VERIFY: Submit + Agent Assigned
    DRAFT --> DRAFT: Edit
    
    PENDING_VERIFY --> ACTIVE: Agent Approves
    PENDING_VERIFY --> DRAFT: Agent Rejects
    
    ACTIVE --> RESERVED: Buyer Reserves
    ACTIVE --> INACTIVE: Seller Deactivates
    
    RESERVED --> ACTIVE: Reservation Expires/Cancels
    RESERVED --> SOLD: Registration Complete
    
    INACTIVE --> ACTIVE: Seller Reactivates
    
    SOLD --> [*]
```

---

## Media Upload Flow

```mermaid
flowchart LR
    A[Select Files] --> B{Validate}
    B -->|Invalid Format| C[Error: Only JPG/PNG/MP4]
    B -->|Too Large| D[Error: Max 10MB per file]
    B -->|Valid| E[Upload to Storage]
    E --> F[Create property_media Record]
    F --> G[Display in Gallery]
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| properties | - | DRAFT | Seller creates |
| properties | DRAFT | PENDING_VERIFY | Submit for verification |
| properties | PENDING_VERIFY | ACTIVE | Agent approves |
| properties | PENDING_VERIFY | DRAFT | Agent rejects |
| properties | ACTIVE | INACTIVE | Seller deactivates |
| properties | INACTIVE | ACTIVE | Seller reactivates |
| property_media | - | CREATED | File uploaded |
| audit_logs | - | PROPERTY_CREATED | Initial creation |
| audit_logs | - | PROPERTY_SUBMITTED | Submit for verify |
| audit_logs | - | PROPERTY_VERIFIED | Agent approval |

---

## Key Points

- Property cannot go ACTIVE without agent verification
- Agent must be assigned before submission
- Rejected properties return to DRAFT with feedback
- Seller can edit DRAFT properties freely
- ACTIVE properties have limited editable fields
