---
workflow_id: SYSTEM_OTP_EXPIRY
role: SYSTEM
action_type: MUTATION
entities:
  primary: email_otp_verifications
  secondary:
    - audit_logs
entry_states:
  email_otp_verifications: [PENDING]
exit_states:
  email_otp_verifications: [EXPIRED]
trigger:
  type: CRON
  schedule: "*/5 * * * *"
audit_required: false
diagram_types:
  - flowchart
---

# System OTP Expiry Workflow

Automatically expire OTPs that exceed their validity period.

---

## Flow Diagram

```mermaid
flowchart TD
    A[CRON Job Runs<br/>Every 5 Minutes] --> B[Query OTPs]
    
    B --> C[SELECT WHERE<br/>verified = false<br/>AND expires_at < NOW]
    
    C --> D{Any Expired?}
    
    D -->|No| E[Sleep Until Next Run]
    
    D -->|Yes| F[Batch Update to EXPIRED]
    
    F --> G[Cleanup Old Records<br/>Older than 24 hours]
    G --> H[Job Complete]

    style A fill:#e3f2fd
    style H fill:#c8e6c9
```

---

## State Transitions

| Entity | From | To | Trigger |
|--------|------|-----|---------|
| email_otp_verifications | PENDING | EXPIRED | 10 minutes pass |

---

## Key Points

- Runs every 5 minutes
- OTP validity: 10 minutes
- Records cleaned after 24 hours
- No notification on expiry
- User must request new OTP
