# DATABASE TO UI MAPPING TABLE

**Version:** 1.0 | **Status:** Reference Document | **Last Updated:** December 19, 2024

---

## CORE PRINCIPLE

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    DATABASE-FIRST UI DEVELOPMENT                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  The UI is a READ-ONLY representation of database state.                  ║
║  Every button, badge, and screen reflects actual DB rows + states.        ║
║  No assumptions. No optimistic UI. No frontend-invented state.            ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## TABLE OF CONTENTS

1. [Authentication & OTP](#1-authentication--otp)
2. [Property Management](#2-property-management)
3. [Agent Assignment](#3-agent-assignment)
4. [Visit Booking](#4-visit-booking)
5. [Offers & Negotiation](#5-offers--negotiation)
6. [Reservations](#6-reservations)
7. [Transactions & Registration](#7-transactions--registration)
8. [Admin Actions](#8-admin-actions)
9. [Quick Reference Matrix](#9-quick-reference-matrix)

---

## 1. AUTHENTICATION & OTP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FEATURE: EMAIL OTP VERIFICATION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  TABLES          │ users, email_otp_verifications                          │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  KEY FIELDS      │ users.status, users.email_verified                      │
│                  │ email_otp_verifications.verified                        │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  STATES          │ PENDING_VERIFICATION → ACTIVE                           │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### State → UI Mapping

```
┌────────────────────────────┬──────────────────────────────────────────────┐
│ DB STATE                   │ UI BEHAVIOR                                  │
├────────────────────────────┼──────────────────────────────────────────────┤
│ users.status =             │ → Show OTP verification screen               │
│ PENDING_VERIFICATION       │ → Hide all other features                    │
│                            │ → Show "Resend OTP" button                   │
├────────────────────────────┼──────────────────────────────────────────────┤
│ users.status = ACTIVE      │ → Allow access to dashboard                  │
│                            │ → Never show OTP screen again                │
│                            │ → Show full navigation                       │
├────────────────────────────┼──────────────────────────────────────────────┤
│ users.status = SUSPENDED   │ → Show suspension notice                     │
│                            │ → Block all actions except logout            │
│                            │ → Show admin contact info                    │
└────────────────────────────┴──────────────────────────────────────────────┘
```

### Allowed Actions per State

```
┌────────────────────────────┬───────────────────┬─────────────────────────┐
│ STATE                      │ ALLOWED ACTIONS   │ BACKEND ENDPOINT        │
├────────────────────────────┼───────────────────┼─────────────────────────┤
│ PENDING_VERIFICATION       │ Submit OTP        │ POST /auth/verify-otp   │
│                            │ Resend OTP        │ POST /auth/resend-otp   │
├────────────────────────────┼───────────────────┼─────────────────────────┤
│ ACTIVE                     │ All user actions  │ (Various endpoints)     │
│                            │ Logout            │ POST /auth/logout       │
├────────────────────────────┼───────────────────┼─────────────────────────┤
│ SUSPENDED                  │ Logout only       │ POST /auth/logout       │
└────────────────────────────┴───────────────────┴─────────────────────────┘
```

---

## 2. PROPERTY MANAGEMENT

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FEATURE: PROPERTY VISIBILITY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  TABLES          │ properties, property_media, agent_assignments           │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  KEY FIELDS      │ properties.status, properties.seller_id                 │
│                  │ agent_assignments.status                                │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  STATES          │ DRAFT → PENDING_VERIFY → ACTIVE → RESERVED → SOLD       │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### State → UI Mapping

```
┌─────────────────┬──────────────┬────────────────────────────────────────────┐
│ DB STATUS       │ VISIBLE TO   │ UI BEHAVIOR                                │
├─────────────────┼──────────────┼────────────────────────────────────────────┤
│ DRAFT           │ Seller only  │ → Show editable form                       │
│                 │              │ → "Hire Agent" button enabled              │
│                 │              │ → "Save Draft" button visible              │
│                 │              │ → Hidden from public search                │
├─────────────────┼──────────────┼────────────────────────────────────────────┤
│ PENDING_VERIFY  │ Seller, Agent│ → "Waiting for Agent" badge               │
│                 │              │ → Read-only for seller                     │
│                 │              │ → Agent sees verification form             │
│                 │              │ → Hidden from public search                │
├─────────────────┼──────────────┼────────────────────────────────────────────┤
│ ACTIVE          │ Everyone     │ → Visible in public search                 │
│                 │              │ → "Book Visit" button enabled              │
│                 │              │ → "Save Property" enabled for buyers       │
│                 │              │ → Seller sees inquiries panel              │
├─────────────────┼──────────────┼────────────────────────────────────────────┤
│ RESERVED        │ Everyone     │ → "Reserved" badge prominent               │
│                 │              │ → Countdown timer visible                  │
│                 │              │ → All booking buttons disabled             │
│                 │              │ → "Watch for updates" only action          │
├─────────────────┼──────────────┼────────────────────────────────────────────┤
│ SOLD            │ Everyone     │ → "Sold" badge (greyed out)                │
│                 │              │ → Read-only view of final price            │
│                 │              │ → All actions removed                      │
│                 │              │ → May show in "Recently Sold"              │
└─────────────────┴──────────────┴────────────────────────────────────────────┘
```

### Allowed Actions per State

```
┌─────────────────┬────────────────────────────┬─────────────────────────────┐
│ STATE           │ ALLOWED ACTIONS            │ BACKEND ENDPOINT            │
├─────────────────┼────────────────────────────┼─────────────────────────────┤
│ DRAFT           │ Edit details               │ PUT /properties/{id}        │
│                 │ Upload media               │ POST /properties/{id}/media │
│                 │ Hire agent                 │ POST /agents/assign         │
│                 │ Delete property            │ DELETE /properties/{id}     │
├─────────────────┼────────────────────────────┼─────────────────────────────┤
│ PENDING_VERIFY  │ None (seller)              │ —                           │
│                 │ Verify property (agent)    │ POST /agents/verify/{id}    │
├─────────────────┼────────────────────────────┼─────────────────────────────┤
│ ACTIVE          │ Book visit (buyer)         │ POST /visits                │
│                 │ Make offer (buyer)         │ POST /offers                │
├─────────────────┼────────────────────────────┼─────────────────────────────┤
│ RESERVED        │ Cancel reservation         │ POST /reservations/{id}/cancel │
├─────────────────┼────────────────────────────┼─────────────────────────────┤
│ SOLD            │ None                       │ —                           │
└─────────────────┴────────────────────────────┴─────────────────────────────┘
```

---

## 3. AGENT ASSIGNMENT

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FEATURE: AGENT ASSIGNMENT                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  TABLES          │ agent_assignments, agent_profiles                       │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  KEY FIELDS      │ agent_assignments.status, agent_profiles.is_active      │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  STATES          │ (no row) → REQUESTED → ACCEPTED | REJECTED              │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### State → UI Mapping

```
┌────────────────────────────┬──────────────────────────────────────────────┐
│ DB STATE                   │ UI BEHAVIOR                                  │
├────────────────────────────┼──────────────────────────────────────────────┤
│ No row in agent_assignments│ → Show "Hire Agent" button                   │
│                            │ → Show agent search/discovery                │
│                            │ → Property remains in DRAFT                  │
├────────────────────────────┼──────────────────────────────────────────────┤
│ status = REQUESTED         │ → Show "Waiting for Agent Response"         │
│                            │ → Hide Hire Agent button                     │
│                            │ → Show agent name + pending badge            │
│                            │ → Optional: Cancel request button            │
├────────────────────────────┼──────────────────────────────────────────────┤
│ status = ACCEPTED          │ → Show assigned agent card                   │
│                            │ → Property moves to PENDING_VERIFY           │
│                            │ → Show "Awaiting Verification" status        │
│                            │ → Agent contact via platform only            │
├────────────────────────────┼──────────────────────────────────────────────┤
│ status = REJECTED          │ → Show "Agent Declined" notice               │
│                            │ → Re-enable "Hire Agent" button              │
│                            │ → Suggest other nearby agents                │
└────────────────────────────┴──────────────────────────────────────────────┘
```

---

## 4. VISIT BOOKING

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FEATURE: VISIT BOOKING                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  TABLES          │ visit_requests, visit_verifications                     │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  KEY FIELDS      │ visit_requests.status, visit_verifications.otp_verified │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  STATES          │ REQUESTED → APPROVED → COMPLETED | CANCELLED             │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### State → UI Mapping

```
┌────────────────────────────┬──────────────────────────────────────────────┐
│ DB STATE                   │ UI BEHAVIOR                                  │
├────────────────────────────┼──────────────────────────────────────────────┤
│ No visit row               │ → Show "Book Visit" button                   │
│ + property.status = ACTIVE │ → Show available date picker                 │
│                            │ → Show agent's available slots               │
├────────────────────────────┼──────────────────────────────────────────────┤
│ status = REQUESTED         │ → Show "Visit Requested" badge               │
│                            │ → Show requested date/time                   │
│                            │ → "Cancel Request" button visible            │
│                            │ → NO phone numbers shown                     │
├────────────────────────────┼──────────────────────────────────────────────┤
│ status = APPROVED          │ → Show "Visit Approved" ✓                    │
│                            │ → Show confirmed date/time                   │
│                            │ → Agent phone number NOW visible             │
│                            │ → Property address NOW visible               │
│                            │ → "Cancel Visit" button                      │
├────────────────────────────┼──────────────────────────────────────────────┤
│ status = COMPLETED         │ → Show "Visit Completed" badge               │
│                            │ → "Make Offer" button NOW enabled            │
│                            │ → "Book Another Visit" option                │
│                            │ → Rating prompt shown                        │
├────────────────────────────┼──────────────────────────────────────────────┤
│ status = CANCELLED         │ → Show "Visit Cancelled" notice              │
│                            │ → "Book New Visit" button enabled            │
│                            │ → Hide cancelled visit from main view        │
└────────────────────────────┴──────────────────────────────────────────────┘
```

### Critical Rule: Contact Information

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHONE NUMBER / ADDRESS VISIBILITY RULES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  visit_requests.status ≠ APPROVED  →  HIDE phone, HIDE exact address       │
│                                                                             │
│  visit_requests.status = APPROVED  →  SHOW phone, SHOW exact address       │
│                                                                             │
│  NO EXCEPTIONS. NO EARLY REVEAL. UI READS DB.                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. OFFERS & NEGOTIATION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FEATURE: OFFERS & NEGOTIATION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  TABLES          │ offers                                                  │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  KEY FIELDS      │ offers.status, offers.offered_price, offers.expires_at  │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  STATES          │ PENDING → ACCEPTED | REJECTED | COUNTERED | EXPIRED     │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### State → UI Mapping (By Role)

```
┌───────────────┬─────────────────────────────┬────────────────────────────────┐
│ OFFER STATUS  │ BUYER UI                    │ SELLER UI                      │
├───────────────┼─────────────────────────────┼────────────────────────────────┤
│ PENDING       │ → "Offer Sent" badge        │ → "New Offer" notification     │
│               │ → View offer details        │ → Accept / Reject / Counter    │
│               │ → Expiry countdown          │ → View buyer profile           │
│               │ → Cannot edit               │ → Expiry countdown             │
├───────────────┼─────────────────────────────┼────────────────────────────────┤
│ COUNTERED     │ → "Counter Offer" alert     │ → "Waiting for Buyer" badge    │
│               │ → Accept / Reject / Counter │ → View counter details         │
│               │ → New price visible         │ → Cannot modify                │
│               │ → New expiry countdown      │                                │
├───────────────┼─────────────────────────────┼────────────────────────────────┤
│ ACCEPTED      │ → "Offer Accepted!" ✓       │ → "Offer Accepted" ✓           │
│               │ → "Proceed to Reserve"      │ → Property status → RESERVED   │
│               │ → 0.1% payment prompt       │ → View reservation details     │
├───────────────┼─────────────────────────────┼────────────────────────────────┤
│ REJECTED      │ → "Offer Rejected" ✗        │ → "Offer Rejected" badge       │
│               │ → "Make New Offer" option   │ → Read-only history            │
│               │ → Read-only view            │                                │
├───────────────┼─────────────────────────────┼────────────────────────────────┤
│ EXPIRED       │ → "Offer Expired" badge     │ → "Offer Expired" badge        │
│               │ → "Make New Offer" option   │ → Read-only history            │
└───────────────┴─────────────────────────────┴────────────────────────────────┘
```

### Pre-condition Check

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OFFER BUTTON VISIBILITY                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  "Make Offer" button visible ONLY IF:                                       │
│                                                                             │
│    ✓ property.status = ACTIVE                                               │
│    ✓ visit_requests row exists WHERE status = COMPLETED                     │
│    ✓ buyer has no PENDING offer on this property                            │
│                                                                             │
│  If any condition fails → HIDE "Make Offer" button                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. RESERVATIONS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FEATURE: RESERVATIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  TABLES          │ reservations                                            │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  KEY FIELDS      │ reservations.status, reservations.end_date              │
│                  │ reservations.amount                                     │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  STATES          │ ACTIVE → EXPIRED | CANCELLED | COMPLETED                │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### State → UI Mapping

```
┌──────────────────────┬───────────────────────────────────────────────────────┐
│ DB STATE             │ UI BEHAVIOR                                           │
├──────────────────────┼───────────────────────────────────────────────────────┤
│ No reservation row   │ → No countdown shown                                  │
│                      │ → No reservation badge                                │
│                      │ → "Pay Deposit" button hidden                         │
├──────────────────────┼───────────────────────────────────────────────────────┤
│ status = ACTIVE      │ → Countdown timer = end_date - now                    │
│                      │ → "Reserved" badge on property                        │
│                      │ → "Complete Registration" button visible              │
│                      │ → Reserved amount shown                               │
│                      │ → "Cancel Reservation" option                         │
├──────────────────────┼───────────────────────────────────────────────────────┤
│ status = EXPIRED     │ → "Reservation Expired" notice                        │
│                      │ → Property goes back to ACTIVE                        │
│                      │ → Deposit may be forfeited (show notice)              │
├──────────────────────┼───────────────────────────────────────────────────────┤
│ status = CANCELLED   │ → "Reservation Cancelled" notice                      │
│                      │ → Show refund status if applicable                    │
│                      │ → Property goes back to ACTIVE                        │
├──────────────────────┼───────────────────────────────────────────────────────┤
│ status = COMPLETED   │ → "Registration Complete" ✓                           │
│                      │ → Link to transaction record                          │
│                      │ → Property status = SOLD                              │
└──────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 7. TRANSACTIONS & REGISTRATION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FEATURE: REGISTRATION & CLOSING                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  TABLES          │ transactions, registration_verifications                │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  KEY FIELDS      │ transactions.status, registration_verifications.*       │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  STATES          │ INITIATED → BUYER_VERIFIED → SELLER_VERIFIED → COMPLETE │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### State → UI Mapping

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ DB STATE            │ UI BEHAVIOR                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ status = INITIATED  │ → Progress tracker: Step 1 highlighted                 │
│                     │ → Show scheduled registration date                     │
│                     │ → "Awaiting OTP Verification" badge                    │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ buyer_verified      │ → Progress tracker: Step 2 highlighted                 │
│ = true              │ → Buyer checkmark visible                              │
│                     │ → "Awaiting Seller OTP" badge                          │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ seller_verified     │ → Progress tracker: Step 3 highlighted                 │
│ = true              │ → Seller checkmark visible                             │
│                     │ → "Complete Registration" button NOW visible           │
│                     │ → Commission breakdown shown                           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ status = COMPLETED  │ → Progress tracker: All complete                       │
│                     │ → "Transaction Complete" ✓                             │
│                     │ → Final receipt visible                                │
│                     │ → Agent commission details visible                     │
│                     │ → "Download Receipt" button                            │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 8. ADMIN ACTIONS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FEATURE: ADMIN ACTIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  TABLES          │ admin_actions, audit_logs, disputes                     │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  KEY FIELDS      │ All fields (admin sees everything)                      │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  CONSTRAINT      │ Append-only. No deletes. Every action creates DB record.│
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### Admin UI Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADMIN CAN:                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✓ View all records across all tables                                       │
│  ✓ Change user status (ACTIVE ↔ SUSPENDED)                                  │
│  ✓ Approve/decline agent applications                                       │
│  ✓ Override property status (with audit log)                                │
│  ✓ Resolve disputes                                                         │
│  ✓ Issue refunds/adjustments                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ADMIN CANNOT:                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✗ Delete any record (soft-delete only)                                     │
│  ✗ Modify audit logs                                                        │
│  ✗ Take actions without creating audit entry                                │
│  ✗ Bypass OTP verification for transactions                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. QUICK REFERENCE MATRIX

### Master Feature Matrix

```
┌───────────────────┬──────────────────────┬──────────────────┬────────────────────────────┐
│ FEATURE           │ PRIMARY TABLE        │ STATE FIELD      │ KEY UI TRIGGER             │
├───────────────────┼──────────────────────┼──────────────────┼────────────────────────────┤
│ Authentication    │ users                │ status           │ OTP screen vs Dashboard    │
│ Property Listing  │ properties           │ status           │ Edit vs View vs Book       │
│ Agent Assignment  │ agent_assignments    │ status           │ Hire vs Waiting vs Assigned│
│ Visit Booking     │ visit_requests       │ status           │ Book vs Waiting vs Contact │
│ Offer Negotiation │ offers               │ status           │ Submit vs Counter vs Accept│
│ Reservation       │ reservations         │ status           │ Pay vs Countdown vs Expired│
│ Registration      │ transactions         │ status           │ OTP steps vs Complete      │
│ Admin Override    │ admin_actions        │ (always append)  │ Full access + audit log    │
└───────────────────┴──────────────────────┴──────────────────┴────────────────────────────┘
```

### Status Badge Color Reference

```
┌─────────────────────┬──────────────────────┬───────────────────────────────────────────┐
│ STATUS TYPE         │ COLOR (HEX)          │ EXAMPLES                                  │
├─────────────────────┼──────────────────────┼───────────────────────────────────────────┤
│ Success/Active      │ Green (#16A34A)   │ ACTIVE, APPROVED, VERIFIED, COMPLETED     │
│ Pending/Waiting     │ Amber (#F59E0B)   │ REQUESTED, PENDING_VERIFICATION, COUNTERED│
│ Reserved            │ Amber (#F59E0B)   │ RESERVED                                  │
│ Under Review        │ Purple (#8B5CF6)  │ UNDER_REVIEW, PENDING_VERIFY              │
│ Error/Rejected      │ Red (#DC2626)     │ REJECTED, EXPIRED, CANCELLED, SUSPENDED   │
│ Neutral/Draft       │ Gray (#6B7280)    │ DRAFT, SOLD (archived)                    │
└─────────────────────┴──────────────────────┴───────────────────────────────────────────┘

NOTE: NO BLUE ALLOWED - Charcoal + Airbnb Red design system.
NOTE: Brand Red (#FF385C) is for ACTION BUTTONS only, NOT badges.
```

---

### Terminal States (IMPORTANT)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TERMINAL STATES — NO FURTHER TRANSITIONS ALLOWED                           │
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
│   ✗ Activity timeline shows but no new entries allowed                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Concurrency Rule

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONCURRENCY HANDLING (BACKEND ENFORCEMENT)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Backend must enforce row-level locking for:                                │
│   • reservations   — Only one buyer can reserve at a time                   │
│   • offers         — Prevent duplicate PENDING offers                       │
│   • transactions   — Atomic state transitions                               │
│                                                                             │
│  UI must handle 409 CONFLICT responses gracefully:                          │
│   • Show "This property was just reserved by another buyer"                 │
│   • Refetch current state                                                   │
│   • Update UI to reflect new reality                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### State Naming Convention

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NAMING RULES FOR STATUS ENUMS                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACTION STATES (something is happening):                                    │
│   • REQUESTED, SUBMITTED, INITIATED, COUNTERED                              │
│                                                                             │
│  ENTITY STATES (current condition):                                         │
│   • ACTIVE, RESERVED, SUSPENDED, DRAFT, SOLD                                │
│                                                                             │
│  OUTCOME STATES (result of action):                                         │
│   • APPROVED, REJECTED, COMPLETED, EXPIRED, CANCELLED                       │
│                                                                             │
│  NOTE: Frontend must NEVER invent synonyms. Use backend enum values only.     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CHANGELOG

| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| 1.2     | 2024-12-19 | Updated to Airbnb Red (#FF385C) color system |
|         |            | Added hex codes to all status colors         |
|         |            | Clarified Brand Red is for buttons only      |
| 1.1     | 2024-12-19 | Fixed blue color violation (now Amber/Purple)|
|         |            | Added Terminal States section                |
|         |            | Added Concurrency Rule                       |
|         |            | Added State Naming Convention                |
| 1.0     | 2024-12-19 | Initial feature mapping table created        |
