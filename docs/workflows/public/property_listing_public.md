---
workflow_id: PUBLIC_PROPERTY_VIEW
role: PUBLIC
action_type: READ_ONLY
entities:
  primary: properties
  secondary:
    - property_media
entry_states:
  properties: [ACTIVE, RESERVED]
exit_states:
  properties: [ACTIVE, RESERVED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: false
diagram_types:
  - flowchart
---

# Public Property View Workflow

Control what unauthenticated users can see when browsing properties.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Public User Visits Site] --> B[View Property Listings]
    B --> C{Property Status?}
    
    C -->|DRAFT| D[Not Visible]
    C -->|PENDING_VERIFY| E[Not Visible]
    C -->|ACTIVE| F[Show Property Card]
    C -->|RESERVED| G[Show Property Card<br/>with RESERVED Badge]
    C -->|SOLD| H[Not Visible<br/>or Archived View]
    C -->|INACTIVE| I[Not Visible]
    
    F --> J[User Clicks Property]
    G --> J
    
    J --> K[Property Detail Page]
    
    K --> L{What is Visible?}
    
    subgraph Visible["Visible to Public"]
        M1[Title]
        M2[Description]
        M3[Type]
        M4[Price]
        M5[Approximate Location]
        M6[Photos/Videos]
        M7[Agent Name]
    end
    
    subgraph Hidden["Hidden from Public"]
        N1[Exact Address]
        N2[Seller Contact]
        N3[Agent Phone]
        N4[Seller Name]
    end
    
    L --> Visible
    L --> Hidden
    
    K --> O{User Wants to Act?}
    O -->|Book Visit| P[Redirect to Login/Signup]
    O -->|Make Offer| P
    O -->|Contact Agent| P

    style D fill:#e0e0e0
    style E fill:#e0e0e0
    style H fill:#e0e0e0
    style I fill:#e0e0e0
    style F fill:#c8e6c9
    style G fill:#fff9c4
```

---

## Visibility Rules

```mermaid
flowchart LR
    subgraph Status["Property Status"]
        S1[DRAFT]
        S2[PENDING_VERIFY]
        S3[ACTIVE]
        S4[RESERVED]
        S5[SOLD]
        S6[INACTIVE]
    end
    
    subgraph PublicView["Public Visibility"]
        V1[Hidden]
        V2[Hidden]
        V3[Visible]
        V4[Visible + Badge]
        V5[Hidden]
        V6[Hidden]
    end
    
    S1 --> V1
    S2 --> V2
    S3 --> V3
    S4 --> V4
    S5 --> V5
    S6 --> V6
```

---

## Field Visibility Matrix

| Field | Public | Registered User | After Visit Approved |
|-------|--------|-----------------|---------------------|
| Title | Yes | Yes | Yes |
| Description | Yes | Yes | Yes |
| Price | Yes | Yes | Yes |
| Photos | Yes | Yes | Yes |
| Approximate Area | Yes | Yes | Yes |
| Exact Address | No | No | Yes |
| Seller Name | No | No | No |
| Seller Phone | No | No | No |
| Agent Name | Yes | Yes | Yes |
| Agent Phone | No | No | Yes |

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| properties | ACTIVE | ACTIVE | View only (no change) |
| properties | RESERVED | RESERVED | View only (no change) |

---

## Key Points

- Public users see only ACTIVE and RESERVED properties
- RESERVED properties show countdown timer
- Exact address is NEVER shown to unauthenticated users
- Contact information requires login
- All action buttons redirect to login/signup
- SEO-friendly property cards with public data only
