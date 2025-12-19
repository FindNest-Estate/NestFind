# NESTFIND DESIGN CONSTITUTION

**Version:** 1.1 | **Status:** FROZEN | **Effective Date:** December 19, 2024

---

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                    N E S T F I N D                                        ║
║                                                                           ║
║              D E S I G N   C O N S T I T U T I O N                        ║
║                                                                           ║
║         The Immutable Rules Governing UI, State & Trust                   ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  This document is FROZEN. Changes require:                                ║
║   • Written justification                                                 ║
║   • Architectural review                                                  ║
║   • Version increment                                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## PREAMBLE

NestFind is a **trust-first real estate transaction platform**. Every design decision in this document exists to ensure:

1. **Trust** — Users see only verified, database-backed information
2. **Safety** — No action occurs without explicit backend validation
3. **Transparency** — Every state change is audited and visible
4. **Consistency** — UI reflects database truth, nothing more

This constitution applies to **all code**: web, mobile, admin, and AI-assisted development.

---

# PART I: THE GOLDEN RULE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     "Do not render any UI element unless it is backed by an existing       │
│      database record or state. No assumptions, no placeholders, no         │
│      optimistic UI."                                                        │
│                                                                             │
│                        — THE GOLDEN RULE —                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

This rule controls **everything**:
- Button visibility
- Badge content
- Form enablement
- Screen navigation
- Modal display
- Notification triggers

**Violating this rule is grounds for code rejection.**

---

# PART II: THE THREE AUTHORITIES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THE AUTHORITY MODEL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│   │   FRONTEND   │         │   BACKEND    │         │   DATABASE   │        │
│   │              │         │              │         │              │        │
│   │    READS     │◄────────│   DECIDES    │◄────────│   IS TRUTH   │        │
│   │              │         │              │         │              │        │
│   └──────────────┘         └──────────────┘         └──────────────┘        │
│                                                                             │
│   ❌ Cannot decide         ✅ Validates state       ✅ Single source        │
│   ❌ Cannot assume         ✅ Controls transitions  ✅ All entities         │
│   ❌ Cannot invent         ✅ Computes permissions  ✅ All states           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART III: DESIGN SYSTEM

## Article 1: Color Palette

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      APPROVED COLOR SYSTEM                                  │
│                  Charcoal + Airbnb Red (Trust-First)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STRUCTURE & TEXT:                                                       │
│   • Charcoal Primary:    #1F2933  — Backgrounds, headers, navigation       │
│   • Text Dark:           #111827  — Primary text                           │
│   • Text Muted:          #6B7280  — Secondary text, labels                 │
│   • Border Gray:         #E5E7EB  — Borders, dividers                      │
│                                                                             │
│  PRIMARY ACTION (Airbnb Red):                                            │
│   • Brand Red:           #FF385C  — Primary CTAs, intent actions           │
│   • Red Hover:           #E31C5F  — Hover state                            │
│   • Red Soft BG:         #FFF1F2  — Light backgrounds                      │
│   • Red Border:          #FCA5A5  — Outlined buttons                       │
│                                                                             │
│  TRUST & SUCCESS:                                                        │
│   • Verified Green:      #16A34A  — Active, approved, verified, completed  │
│   • Success Text:        #065F46  — Success messages                       │
│                                                                             │
│  CAUTION:                                                                │
│   • Amber:               #F59E0B  — Reserved, pending, countered           │
│   • Amber Light:         #FEF3C7  — Pending backgrounds                    │
│                                                                             │
│  REVIEW:                                                                 │
│   • Muted Purple:        #8B5CF6  — Under review, pending verification     │
│                                                                             │
│  NEUTRAL/END:                                                            │
│   • Gray:                #6B7280  — Draft, sold (archived)                 │
│                                                                             │
│  PROHIBITED:                                                             │
│   • Blue (#0000FF or any blue hue) — NEVER USE                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Article 2: Red Usage Rules (CRITICAL)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RED = INTENT / COMMITMENT / MONEY                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [OK] USE RED (#FF385C) FOR:                                                  │
│   • "Book Visit" button                                                     │
│   • "Make Offer" button                                                     │
│   • "Pay Deposit" button                                                    │
│   • "Confirm Reservation" button                                            │
│   • "Accept Offer" button                                                   │
│   • Primary call-to-action buttons                                          │
│   • Destructive confirmations (Cancel, Reject) — outlined variant          │
│                                                                             │
│  [X] NEVER USE RED FOR:                                                      │
│   • Navigation links                                                        │
│   • Page backgrounds                                                        │
│   • Cards or containers                                                     │
│   • Status badges (except REJECTED)                                         │
│   • Admin structure                                                         │
│   • Headers or footers                                                      │
│                                                                             │
│  NOTE: Red must never dominate the UI. Charcoal provides structure.          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Article 3: Button Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BUTTON HIERARCHY                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRIMARY (Red Fill):                                                        │
│   Background: #FF385C | Text: White | Hover: #E31C5F                        │
│   Use: Main action per screen (Book Visit, Make Offer, Pay)                 │
│                                                                             │
│  SECONDARY (Charcoal Outline):                                              │
│   Background: Transparent | Border: #1F2933 | Text: #1F2933                 │
│   Use: Secondary actions (Save, Cancel, View Details)                       │
│                                                                             │
│  DESTRUCTIVE (Red Outline):                                                 │
│   Background: Transparent | Border: #FF385C | Text: #FF385C                 │
│   Use: Destructive actions (Cancel Reservation, Reject Offer)               │
│                                                                             │
│  DISABLED:                                                                  │
│   Background: #E5E7EB | Text: #9CA3AF                                       │
│   Use: Actions not currently allowed                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Article 4: Status Badge Colors

| Status | Color | Hex | Use For |
|--------|-------|-----|---------|
| ACTIVE, APPROVED, VERIFIED, COMPLETED | Green | `#16A34A` | Trust states |
| RESERVED, PENDING, COUNTERED | Amber | `#F59E0B` | Waiting states |
| UNDER_REVIEW, PENDING_VERIFY | Muted Purple | `#8B5CF6` | Review states |
| REJECTED, EXPIRED, CANCELLED, SUSPENDED | Muted Red | `#DC2626` | Error states |
| DRAFT, SOLD | Gray | `#6B7280` | Neutral/End states |

> NOTE: Status badges use **muted colors**, NOT brand red.

---

## Article 5: AI Color Instruction

```
Use Airbnb-style red (#FF385C) ONLY for primary user actions
that indicate intent, commitment, or payment.

Do NOT use red for navigation, layout, cards, or status labels.
Trust and structure must remain neutral (charcoal/gray).
Green (#16A34A) is for success/verified states only.
```

---

# PART IV: STATE MANAGEMENT

## Article 3: State Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STATE NAMING CONVENTION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACTION STATES (something is happening):                                    │
│   → REQUESTED, SUBMITTED, INITIATED, COUNTERED                              │
│                                                                             │
│  ENTITY STATES (current condition):                                         │
│   → ACTIVE, RESERVED, SUSPENDED, DRAFT, SOLD                                │
│                                                                             │
│  OUTCOME STATES (result of action):                                         │
│   → APPROVED, REJECTED, COMPLETED, EXPIRED, CANCELLED                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Article 4: Terminal States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│            TERMINAL STATES — NO FURTHER TRANSITIONS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  • SOLD           (Property)      — Deal complete, read-only forever        │
│  • SUSPENDED      (User/Agent)    — Blocked, no actions except appeal       │
│  • COMPLETED      (Transaction)   — Finalized, immutable record             │
│  • REJECTED       (Agent App)     — Must reapply from scratch               │
│                                                                             │
│  Terminal states:                                                           │
│   ✗ Cannot transition to any other state                                    │
│   ✗ All action buttons hidden                                               │
│   ✗ Read-only view only                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Article 5: State Transitions

All state transitions must:
1. Be defined in backend code (state machine)
2. Have explicit trigger actions
3. Create audit log entries
4. Return new state to frontend

```python
# MANDATORY: Validate before transition
if property.status != PropertyStatus.ACTIVE:
    raise HTTPException(400, "Invalid state transition")
```

---

# PART V: UI RENDERING RULES

## Article 6: No Optimistic UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OPTIMISTIC UI IS FORBIDDEN                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [X] WRONG:                                                                  │
│     onClick={() => {                                                        │
│       setStatus("approved");  // UI updated before confirmation             │
│       api.approve();                                                        │
│     }}                                                                      │
│                                                                             │
│  [OK] CORRECT:                                                                │
│     onClick={async () => {                                                  │
│       setLoading(true);                                                     │
│       const result = await api.approve();                                   │
│       if (result.success) refetch();  // UI reads new state from DB        │
│       setLoading(false);                                                    │
│     }}                                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Article 7: Conditional Rendering

UI elements are visible ONLY when backend permits:

```javascript
// Button visibility from backend
{data.allowed_actions.includes('make_offer') && 
  <Button>Make Offer</Button>
}
```

---

## Article 8: Empty States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EMPTY STATE MESSAGING                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [X] FORBIDDEN:                                                              │
│     "Coming soon"                                                           │
│     "Feature launching next month"                                          │
│     "Check back later"                                                      │
│                                                                             │
│  [OK] REQUIRED:                                                               │
│     "No properties found"                                                   │
│     "No visits scheduled"                                                   │
│     "No offers yet"                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Article 9: Progressive Disclosure

Sensitive information visibility is **database-controlled**:

| Information | Visible When |
|-------------|--------------|
| Phone number | `visit.status = APPROVED` |
| Exact address | `visit.status = APPROVED` |
| Seller email | Never (platform messaging only) |
| Agent commission | `transaction.status = COMPLETED` |

---

# PART VI: API CONTRACT

## Article 10: Response Structure

Every API response must include:

```json
{
  "id": "uuid",
  "status": "ACTIVE",
  "display_status": "Listed",
  "allowed_actions": ["book_visit", "save"],
  "visibility": {
    "show_phone": false,
    "show_address": false
  }
}
```

---

## Article 11: Error Responses

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot make offer on reserved property",
    "current_state": "RESERVED",
    "required_state": "ACTIVE"
  }
}
```

---

# PART VII: CONCURRENCY

## Article 12: Row-Level Locking

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONCURRENCY ENFORCEMENT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Backend must enforce row-level locking for:                                │
│   • reservations   — Only one buyer can reserve at a time                   │
│   • offers         — Prevent duplicate PENDING offers                       │
│   • transactions   — Atomic state transitions                               │
│                                                                             │
│  UI must handle 409 CONFLICT:                                               │
│   • Show "This property was just reserved by another buyer"                 │
│   • Refetch current state                                                   │
│   • Update UI to reflect new reality                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART VIII: AUDIT REQUIREMENTS

## Article 13: Audit Immutability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AUDIT LOG RULES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Every mutation MUST create audit log with:                                 │
│   • actor_id                                                                │
│   • actor_role                                                              │
│   • action                                                                  │
│   • entity_type                                                             │
│   • entity_id                                                               │
│   • timestamp                                                               │
│   • details                                                                 │
│                                                                             │
│  Audit logs:                                                                │
│   ✗ Cannot be updated                                                       │
│   ✗ Cannot be deleted                                                       │
│   ✗ Cannot be bypassed                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART IX: FEATURE MATRIX

## Article 14: Master Reference

| Feature | Primary Table | State Field | Key UI Trigger |
|---------|--------------|-------------|----------------|
| Authentication | `users` | `status` | OTP screen vs Dashboard |
| Property Listing | `properties` | `status` | Edit vs View vs Book |
| Agent Assignment | `agent_assignments` | `status` | Hire vs Waiting vs Assigned |
| Visit Booking | `visit_requests` | `status` | Book vs Waiting vs Contact |
| Offer Negotiation | `offers` | `status` | Submit vs Counter vs Accept |
| Reservation | `reservations` | `status` | Pay vs Countdown vs Expired |
| Registration | `transactions` | `status` | OTP steps vs Complete |
| Admin Override | `admin_actions` | (append) | Full access + audit log |

---

# PART X: AI DEVELOPMENT RULES

## Article 15: AI Assistant Instructions

When working with any AI coding assistant, include:

```
"Do not render any UI element unless it is backed by an existing
 database record or state. No assumptions, no placeholders, no
 optimistic UI. Every button visibility, badge content, and screen
 transition must be derived from actual database values.

 Frontend reads, Backend decides, Database is truth."
```

---

# PART XI: ENFORCEMENT

## Article 16: Code Review Checklist

Before merging ANY code:

- [ ] UI elements based on DB field values
- [ ] No hardcoded status strings
- [ ] No optimistic UI updates
- [ ] Button actions call API then refetch
- [ ] Empty states say "No X found"
- [ ] Contact info hidden until DB permits
- [ ] State transitions in backend only
- [ ] Audit log created for mutations
- [ ] Tests verify state-UI mapping

---

## Article 17: Violation Consequences

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VIOLATION HANDLING                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Code violating this constitution:                                          │
│                                                                             │
│   1. MUST be rejected during code review                                    │
│   2. MUST be flagged if discovered in production                            │
│   3. MUST be refactored before new features added                           │
│   4. MUST be tracked as critical technical debt                             │
│                                                                             │
│  These are REQUIREMENTS, not guidelines.                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART XII: THE FIVE QUESTIONS

Before shipping ANY feature, answer:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   - What table stores truth?                                                │
│   - What field defines state?                                               │
│   - What UI is shown per state?                                             │
│   - What action mutates DB?                                                 │
│   - What happens if DB update fails?                                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  If ANY answer is missing → FEATURE IS INCOMPLETE → DO NOT SHIP             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SIGNATURES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  This Design Constitution is hereby adopted and frozen.                     │
│                                                                             │
│  Document Version:    1.0                                                   │
│  Freeze Date:         December 19, 2024                                     │
│  Status:              FROZEN                                             │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  All developers, AI assistants, and contributors                            │
│  are bound by these rules without exception.                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## REFERENCE DOCUMENTS

| Document | Purpose |
|----------|---------|
| `db_ui_mapping.md` | Detailed feature-to-state-to-UI mappings |
| `CODE_QUALITY_RULES.md` | Development quality guardrails |
| `design_validation_checklist.md` | Pre-deployment QA checklist |
| `system_design.md` | Full system architecture |

---

## AMENDMENT PROCESS

To amend this constitution:

1. Submit written justification
2. Conduct architectural review
3. Update all affected documents
4. Increment version number
5. Re-freeze with new date

**Amendments require explicit approval. Ad-hoc exceptions are not permitted.**
