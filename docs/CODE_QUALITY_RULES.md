# ANTI-GRAVITY ENFORCEMENT RULES

**Version:** 1.0 | **Type:** AI Development Guardrails | **Last Updated:** December 19, 2024

---

## PURPOSE

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    ANTI-GRAVITY ENFORCEMENT RULES                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  These rules are MANDATORY instructions for AI-assisted development.     ║
║  They ensure all code follows database-first, state-driven UI patterns.  ║
║  Violations result in rejected code. No exceptions.                       ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## TABLE OF CONTENTS

1. [Core Principle](#1-core-principle)
2. [Universal Rules](#2-universal-rules)
3. [Frontend Rules](#3-frontend-rules)
4. [Backend Rules](#4-backend-rules)
5. [API Contract Rules](#5-api-contract-rules)
6. [State Transition Rules](#6-state-transition-rules)
7. [Audit Rules](#7-audit-rules)
8. [Testing Rules](#8-testing-rules)
9. [Code Review Checklist](#9-code-review-checklist)

---

## 1. CORE PRINCIPLE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THE GOLDEN RULE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  "Do not render any UI element unless it is backed by an existing          │
│   database record or state. No assumptions, no placeholders, no            │
│   optimistic UI."                                                           │
│                                                                             │
│  Apply this rule to EVERY:                                                  │
│   • Button visibility                                                       │
│   • Badge content                                                           │
│   • Form enablement                                                         │
│   • Screen navigation                                                       │
│   • Modal display                                                           │
│   • Notification trigger                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. UNIVERSAL RULES

### Rule 2.1: UI = Read-Only Mirror of DB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [X] NEVER                        │  [OK] ALWAYS                               │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  if (user_clicked) show_success  │  if (db_state === 'SUCCESS') show_badge  │
│  assume_next_step()              │  fetch_current_state()                   │
│  show_loading_then_success()     │  show_loading_then_refetch()             │
│  guess_user_role()               │  read_user_role_from_db()                │
│  hardcode_status = "Active"      │  status = data.status                    │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

### Rule 2.2: No Optimistic UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTIMISTIC UI IS FORBIDDEN                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Definition: Updating UI before backend confirms action success.            │
│                                                                             │
│  [X] WRONG PATTERN:                                                          │
│     onClick={() => {                                                        │
│       setStatus("approved");  // ← UI updated immediately                   │
│       api.approve();          // ← Backend call happens after               │
│     }}                                                                      │
│                                                                             │
│  [OK] CORRECT PATTERN:                                                        │
│     onClick={async () => {                                                  │
│       setLoading(true);                                                     │
│       const result = await api.approve();                                   │
│       if (result.success) {                                                 │
│         refetch();  // ← UI reads new state from DB                         │
│       }                                                                     │
│       setLoading(false);                                                    │
│     }}                                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rule 2.3: No Frontend State Invention

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND CANNOT CREATE STATUS VALUES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [X] FORBIDDEN:                                                              │
│     const status = isLoading ? "pending" : data?.status;                    │
│     // "pending" is invented by frontend, not from DB                       │
│                                                                             │
│  [OK] ALLOWED:                                                                │
│     if (isLoading) return <Spinner />;                                      │
│     return <StatusBadge status={data.status} />;                            │
│     // All status values come directly from DB                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. FRONTEND RULES

### Rule 3.1: Conditional Rendering Based on DB

```javascript
// [X] WRONG: Button always visible, action validated on click
<Button onClick={handleOffer}>Make Offer</Button>

// [OK] CORRECT: Button rendered only if DB allows
{data.canMakeOffer && <Button onClick={handleOffer}>Make Offer</Button>}

// Where canMakeOffer is computed by BACKEND:
// canMakeOffer = property.status === 'ACTIVE' 
//             && visit.status === 'COMPLETED'
//             && !existingPendingOffer
```

### Rule 3.2: No Empty State Lies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHEN DB HAS NO ROWS:                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [X] WRONG:                                                                  │
│     "Coming soon"                                                           │
│     "Feature launching next month"                                          │
│     "Check back later"                                                      │
│                                                                             │
│  [OK] CORRECT:                                                                │
│     "No properties found"                                                   │
│     "No visits scheduled"                                                   │
│     "No offers yet"                                                         │
│                                                                             │
│  The UI must NEVER promise future content. Only state current reality.      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rule 3.3: Status Badge Source

```javascript
// [X] WRONG: Frontend defines status text
const getStatusText = (status) => {
  if (status === 'pending') return 'Under Review';  // Invented label
};

// [OK] CORRECT: Backend provides display text
// API returns: { status: "PENDING", display_status: "Under Review" }
<Badge>{data.display_status}</Badge>
```

### Rule 3.4: Progressive Disclosure from DB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONTACT INFO VISIBILITY                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phone numbers, addresses, and personal details are ONLY shown when        │
│  the database record permits it.                                            │
│                                                                             │
│  Example for visit booking:                                                 │
│                                                                             │
│  // Backend returns phone ONLY if visit is approved                         │
│  if (visit.status === 'APPROVED') {                                         │
│    return { ...visit, agent_phone: agent.phone };                           │
│  } else {                                                                   │
│    return { ...visit, agent_phone: null };                                  │
│  }                                                                          │
│                                                                             │
│  Frontend simply renders what backend provides:                             │
│  {data.agent_phone && <Text>{data.agent_phone}</Text>}                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. BACKEND RULES

### Rule 4.1: State Transitions are Backend-Only

```python
# [X] WRONG: Frontend sends desired status
@router.put("/properties/{id}")
async def update_property(id: str, body: UpdateRequest):
    property.status = body.status  # Frontend controls state

# [OK] CORRECT: Backend computes allowed transitions
@router.post("/properties/{id}/verify")
async def verify_property(id: str, verification: VerificationData):
    property = get_property(id)
    if property.status != PropertyStatus.PENDING_VERIFY:
        raise HTTPException(400, "Property not in verifiable state")
    
    # Backend decides the new state
    property.status = PropertyStatus.ACTIVE
    log_audit(action="PROPERTY_VERIFIED", entity_id=id)
    db.commit()
```

### Rule 4.2: Return Allowed Actions

```python
# Backend tells frontend what actions are permitted
@router.get("/properties/{id}")
async def get_property(id: str, current_user: User):
    property = db.query(Property).get(id)
    
    return {
        **property.dict(),
        "allowed_actions": compute_allowed_actions(property, current_user),
        # Returns: ["edit", "hire_agent"] or ["book_visit"] etc.
    }
```

### Rule 4.3: Validate Before Every Action

```python
# Every endpoint validates current state before mutation
@router.post("/offers/{id}/accept")
async def accept_offer(id: str, current_user: User):
    offer = db.query(Offer).get(id)
    
    # Validate state
    if offer.status != OfferStatus.PENDING:
        raise HTTPException(400, "Offer not in acceptable state")
    
    # Validate ownership
    if offer.property.seller_id != current_user.id:
        raise HTTPException(403, "Not the property owner")
    
    # Validate timing
    if offer.expires_at < datetime.utcnow():
        raise HTTPException(400, "Offer has expired")
    
    # Only now perform action
    offer.status = OfferStatus.ACCEPTED
```

---

## 5. API CONTRACT RULES

### Rule 5.1: Response Must Include State

```json
// [X] WRONG: Response without state context
{
  "id": "123",
  "title": "Beautiful House"
}

// [OK] CORRECT: Response includes full state context
{
  "id": "123",
  "title": "Beautiful House",
  "status": "ACTIVE",
  "display_status": "Listed",
  "allowed_actions": ["book_visit", "save"],
  "visibility": {
    "show_address": false,
    "show_seller_phone": false
  }
}
```

### Rule 5.2: Mutations Return New State

```json
// After any mutation, return the updated entity
// POST /offers/{id}/accept response:
{
  "success": true,
  "data": {
    "offer_id": "123",
    "new_status": "ACCEPTED",
    "property_new_status": "RESERVED",
    "next_action": "proceed_to_reservation"
  }
}
```

### Rule 5.3: Error Responses Include Required State

```json
// When action fails, tell frontend what state is required
{
  "success": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot make offer on this property",
    "current_state": "RESERVED",
    "required_state": "ACTIVE",
    "suggestion": "This property is currently reserved by another buyer"
  }
}
```

---

## 6. STATE TRANSITION RULES

### Rule 6.1: Define Valid Transitions

```python
# Every entity must have explicit state transitions
PROPERTY_TRANSITIONS = {
    PropertyStatus.DRAFT: [PropertyStatus.PENDING_VERIFY],
    PropertyStatus.PENDING_VERIFY: [PropertyStatus.DRAFT, PropertyStatus.ACTIVE],
    PropertyStatus.ACTIVE: [PropertyStatus.RESERVED],
    PropertyStatus.RESERVED: [PropertyStatus.ACTIVE, PropertyStatus.SOLD],
    PropertyStatus.SOLD: [],  # Terminal state
}

def validate_transition(current: PropertyStatus, target: PropertyStatus):
    if target not in PROPERTY_TRANSITIONS.get(current, []):
        raise InvalidStateTransition(f"Cannot go from {current} to {target}")
```

### Rule 6.2: Transitions Require Triggers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EVERY STATE TRANSITION REQUIRES AN EXPLICIT ACTION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DRAFT → PENDING_VERIFY    Trigger: Agent accepts assignment               │
│  PENDING_VERIFY → ACTIVE   Trigger: Agent completes verification           │
│  ACTIVE → RESERVED         Trigger: Buyer pays 0.1% deposit                │
│  RESERVED → SOLD           Trigger: Registration completed + all OTPs      │
│                                                                             │
│  States NEVER change without a corresponding API call + audit log.          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. AUDIT RULES

### Rule 7.1: Every Mutation Creates Audit Log

```python
# No DB change without audit record
async def complete_transaction(transaction_id: str, actor: User):
    transaction = get_transaction(transaction_id)
    transaction.status = TransactionStatus.COMPLETED
    
    # MANDATORY: Create audit log
    create_audit_log(
        actor_id=actor.id,
        actor_role=actor.role,
        action="TRANSACTION_COMPLETED",
        entity_type="transaction",
        entity_id=transaction_id,
        details={"final_price": transaction.total_price}
    )
    
    db.commit()
```

### Rule 7.2: Audit Logs are Immutable

```sql
-- Audit table constraints
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ... other fields ...
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    
    -- NO update timestamp - records are immutable
    -- NO soft delete flag - records cannot be removed
);

-- Revoke UPDATE and DELETE permissions
REVOKE UPDATE, DELETE ON audit_logs FROM application_user;
```

### Rule 7.3: UI Shows Audit Trail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ACTIVITY TIMELINE REQUIREMENTS                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Every entity detail page must show:                                        │
│                                                                             │
│  • Activity timeline based on audit_logs                                    │
│  • Each entry shows: timestamp, actor, action, details                      │
│  • Timeline is read-only (cannot be modified by anyone)                     │
│  • Admin can see full trail; users see relevant entries                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. TESTING RULES

### Rule 8.1: Test State-UI Mapping

```javascript
// Test that UI correctly reflects DB state
describe('PropertyCard', () => {
  it('shows Book Visit button only when status is ACTIVE', () => {
    const { queryByText } = render(
      <PropertyCard property={{ ...mockProperty, status: 'DRAFT' }} />
    );
    expect(queryByText('Book Visit')).toBeNull();
  });

  it('shows reserved badge when status is RESERVED', () => {
    const { getByText } = render(
      <PropertyCard property={{ ...mockProperty, status: 'RESERVED' }} />
    );
    expect(getByText('Reserved')).toBeInTheDocument();
  });
});
```

### Rule 8.2: Test State Transition Guards

```python
# Test that invalid transitions are rejected
def test_cannot_accept_expired_offer():
    offer = create_offer(expires_at=datetime.now() - timedelta(hours=1))
    
    with pytest.raises(HTTPException) as exc:
        accept_offer(offer.id, seller)
    
    assert exc.value.status_code == 400
    assert "expired" in exc.value.detail.lower()
```

### Rule 8.3: Test Audit Log Creation

```python
# Verify audit logs are created for every mutation
def test_transaction_completion_creates_audit_log():
    transaction = create_transaction()
    
    complete_transaction(transaction.id, admin_user)
    
    logs = db.query(AuditLog).filter(
        AuditLog.entity_id == transaction.id,
        AuditLog.action == "TRANSACTION_COMPLETED"
    ).all()
    
    assert len(logs) == 1
    assert logs[0].actor_id == admin_user.id
```

---

## 9. CODE REVIEW CHECKLIST

### Pre-Merge Verification

Before any PR is merged, verify:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DATABASE-UI COMPLIANCE CHECKLIST                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  □ Every UI element visibility is based on DB field value                   │
│  □ No hardcoded status strings in frontend                                  │
│  □ No optimistic UI updates                                                 │
│  □ Button actions call API, wait for response, then refetch                 │
│  □ Empty states say "No X found" not "Coming soon"                          │
│  □ Contact info hidden until DB permits (visit approved, etc.)              │
│                                                                             │
│  □ State transitions defined in backend only                                │
│  □ API validates current state before mutation                              │
│  □ API returns allowed_actions with entity data                             │
│  □ Error responses include current_state and required_state                 │
│                                                                             │
│  □ Audit log created for every mutation                                     │
│  □ Audit logs cannot be modified or deleted                                 │
│  □ Activity timeline visible in UI                                          │
│                                                                             │
│  □ Tests verify state-UI mapping                                            │
│  □ Tests verify invalid transition rejection                                │
│  □ Tests verify audit log creation                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## INSTRUCTING AI ASSISTANTS

When working with any AI coding assistant (Claude, ChatGPT, Gemini, etc.), include this instruction in your prompts:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MANDATORY AI INSTRUCTION                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  "Do not render any UI element unless it is backed by an existing          │
│   database record or state. No assumptions, no placeholders, no            │
│   optimistic UI. Every button visibility, badge content, and screen        │
│   transition must be derived from actual database values.                   │
│                                                                             │
│   Frontend reads, Backend decides, Database is truth."                      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  COLOR SYSTEM INSTRUCTION                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  "Use Airbnb-style red (#FF385C) ONLY for primary user actions             │
│   that indicate intent, commitment, or payment.                             │
│                                                                             │
│   Do NOT use red for navigation, layout, cards, or status labels.          │
│   Trust and structure must remain neutral (charcoal #1F2933).               │
│   Green (#16A34A) is for success/verified states only.                      │
│   Amber (#F59E0B) is for pending/waiting states.                            │
│   NO BLUE ANYWHERE."                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## VIOLATION CONSEQUENCES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CODE THAT VIOLATES THESE RULES:                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Must be REJECTED during code review                                     │
│  2. Must be FLAGGED if discovered in production                             │
│  3. Must be REFACTORED before any new features are added                    │
│  4. Must be TRACKED as technical debt if immediate fix not possible         │
│                                                                             │
│  These are not guidelines. They are requirements.                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CHANGELOG

| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| 1.1     | 2024-12-19 | Added Airbnb Red color system instruction    |
|         |            | Updated AI prompts with color guidance       |
| 1.0     | 2024-12-19 | Initial enforcement rules document created   |
