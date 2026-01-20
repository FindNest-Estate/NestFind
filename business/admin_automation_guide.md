# NestFind — Admin Automation Implementation Guide

**Document Version:** 1.0  
**Purpose:** Technical implementation guide for admin operations automation  
**Last Updated:** January 20, 2026

---

## 1. Overview

This document provides implementation specifications for automating admin operations to achieve:
- 70-80% reduction in manual admin work
- 10× transaction capacity per admin
- Improved response times
- Consistent decision-making

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        EVENT BUS                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     RULE ENGINE                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Risk Scorer │  │ Fraud Check │  │ Compliance Validator│ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │AUTO-PASS │ │AUTO-FLAG │ │  QUEUE   │
    └──────────┘ └──────────┘ └──────────┘
          │           │           │
          └───────────┼───────────┘
                      ▼
              ┌──────────────┐
              │  AUDIT LOG   │
              └──────────────┘
```

---

## 3. Risk Scoring System

### 3.1 Agent Risk Score

```python
def calculate_agent_risk_score(agent: AgentProfile) -> int:
    score = 0
    
    # Document completeness
    if not agent.aadhaar_verified:
        score += 20
    if not agent.pan_verified:
        score += 15
    if not agent.address_proof:
        score += 10
    
    # Experience factors
    if agent.total_cases == 0:
        score += 15
    elif agent.total_cases < 5:
        score += 10
    
    # History factors
    if agent.prior_rejections > 0:
        score += agent.prior_rejections * 20
    if agent.dispute_rate > 0.1:
        score += 25
    
    # Location factors
    if not validate_service_area(agent.base_location):
        score += 15
    
    return min(score, 100)
```

### 3.2 Agent Approval Thresholds

| Risk Score | Action | Admin Involvement |
|------------|--------|-------------------|
| 0-30 | Auto-approve | None |
| 31-60 | Auto-approve + monitoring flag | Review within 7 days |
| 61-80 | Queue for review | Required before activation |
| 81-100 | Auto-reject with reason | Appeal only |

---

## 4. Fraud Detection System

### 4.1 Real-Time Fraud Indicators

```python
class FraudIndicators:
    GPS_ANOMALY = 30           # GPS location doesn't match expected
    REPEATED_PAIRING = 20      # Same agent-buyer combo repeatedly
    DOC_MISMATCH = 40          # Document inconsistencies
    FAST_CLOSURE = 25          # Unusually fast deal completion
    MULTIPLE_ACCOUNTS = 35     # Same device/IP multiple accounts
    OTP_ABUSE = 30             # Repeated OTP failures
    PRICE_MANIPULATION = 25    # Unusual price patterns

def calculate_fraud_score(transaction: Transaction) -> int:
    score = 0
    
    # GPS verification
    if not verify_gps_accuracy(transaction.agent_gps, transaction.property_location):
        score += FraudIndicators.GPS_ANOMALY
    
    # Repeated pairing check
    if get_pairing_count(transaction.agent_id, transaction.buyer_id) > 2:
        score += FraudIndicators.REPEATED_PAIRING
    
    # Document verification
    if has_document_inconsistencies(transaction):
        score += FraudIndicators.DOC_MISMATCH
    
    # Speed check
    if transaction.days_to_close < 3:
        score += FraudIndicators.FAST_CLOSURE
    
    return score
```

### 4.2 Fraud Response Actions

| Fraud Score | Action |
|-------------|--------|
| 0-39 | Log only, allow to proceed |
| 40-69 | Flag for monitoring, allow to proceed |
| 70-89 | Hold transaction, notify admin |
| 90-100 | Block transaction, freeze accounts |

---

## 5. Payout Automation

### 5.1 Auto-Payout Conditions

```python
def should_auto_payout(transaction: Transaction) -> Tuple[bool, str]:
    """Returns (should_payout, reason)"""
    
    # Must-have conditions
    if not transaction.registration_otp_verified:
        return False, "OTP_NOT_VERIFIED"
    
    if not transaction.all_documents_uploaded:
        return False, "DOCS_INCOMPLETE"
    
    # Dispute check (48-hour window)
    if has_active_dispute(transaction.id):
        return False, "DISPUTE_ACTIVE"
    
    dispute_window = datetime.now() - transaction.completed_at
    if dispute_window < timedelta(hours=48):
        return False, "DISPUTE_WINDOW_OPEN"
    
    # Agent risk check
    agent = get_agent(transaction.agent_id)
    if agent.risk_score > 60:
        return False, "AGENT_HIGH_RISK"
    
    # Fraud check
    if transaction.fraud_score > 40:
        return False, "FRAUD_FLAG"
    
    return True, "APPROVED"
```

### 5.2 Payout Queue Priorities

| Priority | Condition | SLA |
|----------|-----------|-----|
| P0 - Immediate | Score < 20, verified agent, no flags | Auto-process |
| P1 - Fast | Score 20-40, standard agent | Within 24 hours |
| P2 - Standard | Score 40-60, requires review | Within 48 hours |
| P3 - Manual | Score > 60 or flags present | Admin decision required |

---

## 6. Dispute Triage System

### 6.1 Dispute Categories

```python
class DisputeCategory(Enum):
    # Level 1 - Auto-resolvable
    LATE_ARRIVAL = "late_arrival"
    VISIT_RESCHEDULE = "visit_reschedule"
    SLA_MINOR_BREACH = "sla_minor_breach"
    
    # Level 2 - Assisted resolution
    PAYMENT_DELAY = "payment_delay"
    DOCUMENT_MINOR = "document_minor"
    COMMUNICATION_ISSUE = "communication_issue"
    
    # Level 3 - Manual only
    FRAUD_ALLEGATION = "fraud_allegation"
    LEGAL_THREAT = "legal_threat"
    MONEY_DISPUTE = "money_dispute"
    PROPERTY_MISREPRESENTATION = "property_misrepresentation"
```

### 6.2 Auto-Resolution Rules

```python
def auto_resolve_dispute(dispute: Dispute) -> Optional[Resolution]:
    if dispute.category == DisputeCategory.LATE_ARRIVAL:
        # Check logs, apply standard penalty
        if verify_late_arrival(dispute):
            return Resolution(
                action="APPLY_PENALTY",
                penalty_percent=5,
                refund_percent=0,
                reason="Verified late arrival per GPS logs"
            )
    
    if dispute.category == DisputeCategory.SLA_MINOR_BREACH:
        agent = get_agent(dispute.agent_id)
        if agent.first_breach:
            return Resolution(
                action="WARNING",
                penalty_percent=0,
                reason="First-time SLA breach - warning issued"
            )
        else:
            return Resolution(
                action="APPLY_PENALTY",
                penalty_percent=10,
                reason="Repeated SLA breach"
            )
    
    return None  # Escalate to human
```

---

## 7. Property Verification Automation

### 7.1 Auto-Verification Checks

```python
def verify_property_submission(property: Property, verification: Verification) -> VerificationResult:
    checks = []
    
    # GPS accuracy (within 10m)
    gps_valid = calculate_distance(
        verification.agent_gps,
        property.location
    ) <= 10
    checks.append(("GPS_ACCURACY", gps_valid))
    
    # Photo requirements
    photo_count = len(verification.photos)
    photos_valid = photo_count >= 5
    checks.append(("PHOTO_COUNT", photos_valid))
    
    # Document completeness
    docs_valid = all([
        verification.has_ownership_doc,
        verification.has_property_photo,
        verification.has_agent_selfie
    ])
    checks.append(("DOCS_COMPLETE", docs_valid))
    
    # Duplicate check
    not_duplicate = not is_duplicate_property(property)
    checks.append(("NOT_DUPLICATE", not_duplicate))
    
    # Image reuse check
    images_original = not has_reused_images(verification.photos)
    checks.append(("IMAGES_ORIGINAL", images_original))
    
    all_passed = all(check[1] for check in checks)
    failed_checks = [check[0] for check in checks if not check[1]]
    
    if all_passed:
        return VerificationResult(status="AUTO_APPROVED", flags=[])
    elif len(failed_checks) <= 1:
        return VerificationResult(status="AUTO_APPROVED", flags=failed_checks)
    else:
        return VerificationResult(status="NEEDS_REVIEW", flags=failed_checks)
```

---

## 8. Admin Dashboard Queues

### 8.1 Queue Structure

```typescript
interface AdminQueue {
  id: string;
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  items: QueueItem[];
  sla_hours: number;
}

const ADMIN_QUEUES: AdminQueue[] = [
  {
    id: 'high_risk_agents',
    name: 'High-Risk Agent Approvals',
    priority: 'critical',
    sla_hours: 4
  },
  {
    id: 'blocked_payouts',
    name: 'Blocked Payouts',
    priority: 'high',
    sla_hours: 24
  },
  {
    id: 'flagged_properties',
    name: 'Flagged Properties',
    priority: 'high',
    sla_hours: 24
  },
  {
    id: 'active_disputes',
    name: 'Active Disputes (Level 3)',
    priority: 'high',
    sla_hours: 48
  },
  {
    id: 'sla_breaches',
    name: 'SLA Breaches',
    priority: 'medium',
    sla_hours: 72
  },
  {
    id: 'review_queue',
    name: 'General Review',
    priority: 'low',
    sla_hours: 168
  }
];
```

### 8.2 Dashboard Metrics

```typescript
interface AdminDashboardMetrics {
  // Queue health
  queue_counts: Record<string, number>;
  sla_compliance: Record<string, number>;  // percentage
  
  // Automation metrics
  auto_approved_today: number;
  auto_rejected_today: number;
  escalated_today: number;
  
  // Performance
  avg_resolution_time_hours: number;
  pending_over_sla: number;
}
```

---

## 9. Rule Engine Configuration

### 9.1 Rule Definition Schema

```yaml
rules:
  - id: agent_auto_approve
    trigger: agent_application_submitted
    conditions:
      - risk_score < 30
      - documents_complete = true
      - no_prior_rejections = true
    action: auto_approve
    audit_message: "Auto-approved: Low risk score ({risk_score})"

  - id: payout_auto_release
    trigger: dispute_window_closed
    conditions:
      - transaction_status = completed
      - fraud_score < 40
      - no_active_disputes = true
      - agent_risk_score < 60
    action: release_payout
    audit_message: "Auto-payout: All conditions met"

  - id: fraud_block
    trigger: transaction_update
    conditions:
      - fraud_score >= 90
    action: block_and_alert
    audit_message: "FRAUD ALERT: Score {fraud_score}, blocking transaction"
```

---

## 10. Database Schema Additions

```sql
-- Risk scores table
CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,  -- 'agent', 'transaction', 'property'
    entity_id UUID NOT NULL,
    score INTEGER NOT NULL,
    factors JSONB NOT NULL,
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Automation logs
CREATE TABLE automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action_taken VARCHAR(100) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Admin queue items
CREATE TABLE admin_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    priority INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT
);

-- Indexes
CREATE INDEX idx_risk_scores_entity ON risk_scores(entity_type, entity_id);
CREATE INDEX idx_admin_queue_pending ON admin_queue(queue_name, priority) WHERE resolved_at IS NULL;
CREATE INDEX idx_automation_logs_entity ON automation_logs(entity_type, entity_id);
```

---

## 11. Implementation Phases

### Phase 1 (Week 1-2)
- [ ] Risk scoring service
- [ ] Auto-payout rules
- [ ] Basic fraud detection

### Phase 2 (Week 3-4)
- [ ] Dispute triage system
- [ ] Admin queue dashboard
- [ ] Agent auto-approval

### Phase 3 (Week 5-6)
- [ ] Property verification automation
- [ ] Advanced fraud scoring
- [ ] Rule engine configuration UI

---

## 12. Monitoring & Alerts

```yaml
alerts:
  - name: high_fraud_rate
    condition: fraud_blocks_per_hour > 10
    severity: critical
    notify: [admin, security]

  - name: auto_approval_rate_drop
    condition: auto_approval_rate < 0.5
    severity: warning
    notify: [ops]

  - name: queue_sla_breach
    condition: pending_over_sla > 20
    severity: high
    notify: [admin]
```

---

*This document provides the technical foundation for scaling NestFind operations efficiently.*
