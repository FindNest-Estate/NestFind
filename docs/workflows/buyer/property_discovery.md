---
workflow_id: BUYER_PROPERTY_DISCOVERY
role: BUYER
action_type: READ_ONLY
entities:
  primary: properties
  secondary:
    - property_media
    - agent_profiles
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

# Buyer Property Discovery Workflow

Authenticated buyers browse and search for properties with enhanced visibility.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Buyer Logs In] --> B[View Property Feed]
    
    B --> C{Apply Filters}
    
    subgraph Filters["Available Filters"]
        F1[Location/Area]
        F2[Price Range]
        F3[Property Type]
        F4[Bedrooms]
        F5[Status: ACTIVE only]
    end
    
    C --> Filters
    Filters --> D[Fetch Matching Properties]
    
    D --> E{View Mode}
    
    E -->|List| F[Property Cards List]
    E -->|Map| G[Map with Markers]
    
    F --> H[Click Property Card]
    G --> H
    
    H --> I[Property Detail Page]
    
    I --> J{Property Status}
    
    J -->|ACTIVE| K[Show Full Details<br/>+ Action Buttons]
    J -->|RESERVED| L[Show Details<br/>+ Reserved Badge<br/>+ Waitlist Option]
    
    K --> M{Buyer Actions}
    
    M -->|Save| N[Add to Saved Properties]
    M -->|Book Visit| O[BUYER_VISIT_BOOKING]
    M -->|Make Offer| P[BUYER_OFFER_FLOW]
    
    L --> Q[Join Waitlist<br/>If Reservation Expires]

    style A fill:#e3f2fd
    style K fill:#c8e6c9
    style L fill:#fff9c4
```

---

## Buyer vs Public Visibility

```mermaid
flowchart LR
    subgraph Public["Public View"]
        P1[Basic Info]
        P2[Photos]
        P3[Price]
    end
    
    subgraph Buyer["Buyer View - Additional"]
        B1[Agent Profile Link]
        B2[Save Property]
        B3[Book Visit Button]
        B4[Make Offer Button]
        B5[Property History]
    end
    
    Public --> Buyer
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| properties | ACTIVE | ACTIVE | View only (no change) |

---

## Key Points

- Buyers see same fields as public plus action buttons
- Exact address still hidden until visit approved
- Saved properties persist across sessions
- Filters are applied server-side
- RESERVED properties show remaining time
