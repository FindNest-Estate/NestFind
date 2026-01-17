---
workflow_id: AGENT_ONBOARDING
role: AGENT
action_type: READ_ONLY
entities:
  primary: agent_profiles
  secondary:
    - users
entry_states:
  users: [IN_REVIEW, ACTIVE]
exit_states:
  users: [IN_REVIEW, ACTIVE]
trigger:
  type: USER_ACTION
  schedule: null
audit_required: false
diagram_types:
  - flowchart
---

# Agent Onboarding Workflow

Guide newly approved agents through platform familiarization.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Agent Account ACTIVE] --> B[First Login]
    B --> C[Welcome Screen]
    
    C --> D[Onboarding Steps]
    
    subgraph Steps["Onboarding Checklist"]
        S1[Complete Profile]
        S2[Set Service Radius]
        S3[Upload Documents]
        S4[Review Platform Rules]
        S5[Acknowledge Terms]
    end
    
    D --> Steps
    
    Steps --> E{All Complete?}
    
    E -->|No| F[Show Progress Bar<br/>Incomplete Items Highlighted]
    F --> Steps
    
    E -->|Yes| G[Mark Onboarding Complete]
    G --> H[Unlock Full Dashboard]
    H --> I[Can Start Accepting Cases]

    style A fill:#e3f2fd
    style I fill:#c8e6c9
```

---

## Agent Profile Completion

```mermaid
flowchart LR
    subgraph Required["Required Fields"]
        R1[Base Location]
        R2[Service Radius]
        R3[ID Documents]
        R4[Profile Photo]
    end
    
    subgraph Optional["Optional Fields"]
        O1[Bio]
        O2[Specialization]
        O3[Languages]
    end
    
    Required --> Complete[Profile Complete]
    Optional --> Enhanced[Enhanced Visibility]
```

---

## Key Points

- Onboarding is guided but not blocking
- Agents can skip but get reminders
- Incomplete profiles have lower visibility
- Terms acknowledgment is mandatory
