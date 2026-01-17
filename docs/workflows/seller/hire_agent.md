---
workflow_id: SELLER_HIRE_AGENT
role: SELLER
action_type: MUTATION
entities:
  primary: agent_assignments
  secondary:
    - properties
    - agent_profiles
    - audit_logs
entry_states:
  properties: [DRAFT]
  agent_assignments: []
exit_states:
  agent_assignments: [REQUESTED, ACCEPTED, DECLINED]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: true
diagram_types:
  - flowchart
  - stateDiagram-v2
---

# Seller Hire Agent Workflow

Discover and assign platform-verified agents within service radius.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Seller Needs Agent] --> B[Open Agent Discovery]
    
    B --> C[System Calculates Property Location]
    C --> D[Filter Agents within 100km]
    
    D --> E{View Mode}
    
    E -->|Map| F[Map with Agent Markers]
    E -->|List| G[Agent Cards List]
    
    F --> H[View Agent Details]
    G --> H
    
    subgraph AgentCard["Agent Card Shows"]
        I1[Distance from Property]
        I2[Rating]
        I3[Completed Deals]
        I4[Specialization]
        I5[Response Time SLA]
    end
    
    H --> AgentCard
    AgentCard --> I[Select Agent]
    
    I --> J[Send Assignment Request]
    J --> K[Assignment Status: REQUESTED]
    
    K --> L[Agent Notified]
    L --> M{Agent Response}
    
    M -->|Accept| N[Assignment Status: ACCEPTED]
    M -->|Decline| O[Assignment Status: DECLINED]
    
    O --> P[Seller Selects Another Agent]
    P --> I
    
    N --> Q[Agent Linked to Property]
    Q --> R[Can Now Submit for Verification]

    style A fill:#e3f2fd
    style R fill:#c8e6c9
    style O fill:#fff9c4
```

---

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Seller Sends Request
    
    REQUESTED --> ACCEPTED: Agent Accepts
    REQUESTED --> DECLINED: Agent Declines
    
    ACCEPTED --> COMPLETED: Transaction Done
    
    DECLINED --> [*]
    COMPLETED --> [*]
```

---

## Distance-Based SLA

```mermaid
flowchart LR
    subgraph Distance["Agent Distance from Property"]
        D1["0-20 km"]
        D2["20-50 km"]
        D3["50-100 km"]
    end
    
    subgraph SLA["Response Time SLA"]
        S1["24 hours"]
        S2["48 hours"]
        S3["72 hours"]
    end
    
    subgraph Priority["Priority Level"]
        P1["High"]
        P2["Medium"]
        P3["Standard"]
    end
    
    D1 --> S1 --> P1
    D2 --> S2 --> P2
    D3 --> S3 --> P3
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| agent_assignments | - | REQUESTED | Seller sends request |
| agent_assignments | REQUESTED | ACCEPTED | Agent accepts |
| agent_assignments | REQUESTED | DECLINED | Agent declines |
| agent_assignments | ACCEPTED | COMPLETED | Transaction complete |
| audit_logs | - | AGENT_REQUESTED | Request sent |
| audit_logs | - | AGENT_ACCEPTED | Agent accepts |
| audit_logs | - | AGENT_DECLINED | Agent declines |

---

## Key Points

- Only ACTIVE agents within 100km shown
- Agent radius is from their base location
- SLA based on distance ensures fair expectations
- Agents can decline without penalty
- Seller can only have ONE active agent per property
