# DESIGN VALIDATION CHECKLIST

**Version:** 1.0 | **Type:** QA Checklist | **Last Updated:** December 19, 2024

---

## PURPOSE

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                     DESIGN VALIDATION CHECKLIST                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Use this checklist BEFORE shipping any feature to production.            ║
║  Every checkbox must be verified. Incomplete features must not deploy.    ║
║  This is the quality gate for database-driven UI.                         ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## HOW TO USE

1. **Complete this checklist** for every new feature or significant change
2. **All checkboxes must be ✓** before merging to main branch
3. **Attach completed checklist** to PR or deployment ticket
4. **Explain any N/A items** — "N/A" is valid only with justification

---

## SECTION 1: DATABASE TRUTH VERIFICATION

### 1.1 Required DB Records

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FOR THIS FEATURE, ANSWER:                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  □ What table stores the truth for this feature?                            │
│    Table: _______________________________________________                   │
│                                                                             │
│  □ What field defines the state?                                            │
│    Field: _______________________________________________                   │
│                                                                             │
│  □ What are all possible state values?                                      │
│    States: ______________________________________________                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 State-UI Mapping

For **each state value**, verify:

| State | UI Element | Verified |
|-------|-----------|----------|
| _____________ | What UI shows | □ |
| _____________ | What UI shows | □ |
| _____________ | What UI shows | □ |
| _____________ | What UI shows | □ |

---

## SECTION 2: FRONTEND COMPLIANCE

### 2.1 No Optimistic UI

```
□ After user action, UI shows loading state
□ UI does NOT update until API confirms success
□ On success, UI refetches data from server
□ On failure, UI shows error and maintains previous state
```

### 2.2 Conditional Rendering

```
□ Every button visibility is based on backend-provided flags
□ No buttons enabled by frontend logic alone
□ Action buttons disabled while loading
□ Hidden features are truly hidden (not just visually disabled)
```

### 2.3 Status Badges

```
□ Badge text comes from API response (display_status field)
□ Badge colors are mapped from status values, not hardcoded
□ No frontend-invented status labels
□ Badge updates only after data refetch
```

### 2.4 Empty States

```
□ Empty state says "No [items] found" or "No [items] yet"
□ Empty state does NOT say "Coming soon" or promise future content
□ Empty state shows appropriate action (e.g., "Create your first property")
□ Empty state is visually distinct (not broken-looking)
```

### 2.5 Contact Information

```
□ Phone numbers hidden until explicitly permitted by backend
□ Addresses/locations hidden until visit approved (or equivalent)
□ Email addresses hidden in public views
□ All PII visibility controlled by API response fields
```

---

## SECTION 3: BACKEND COMPLIANCE

### 3.1 State Validation

```
□ Endpoint validates current state before any mutation
□ Invalid state transitions return 400 error with explanation
□ Error response includes current_state and required_state
□ No state change without explicit trigger action
```

### 3.2 Allowed Actions Response

```
□ GET endpoints return allowed_actions array
□ allowed_actions computed based on entity state + user role
□ Frontend uses allowed_actions to show/hide buttons
□ allowed_actions updated in cache after mutations
```

### 3.3 State Transitions

```
□ All valid transitions defined in code (state machine)
□ Each transition has a documented trigger
□ Transitions logged before commit
□ Invalid transitions raise clear exceptions
```

### 3.4 Authorization

```
□ Endpoint checks user has permission for action
□ Owner checks performed (e.g., seller can only edit own property)
□ Role checks performed (e.g., only agent can verify)
□ 403 returned for unauthorized with clear message
```

---

## SECTION 4: API CONTRACT

### 4.1 Response Structure

```
□ Response includes status field with current state
□ Response includes display_status for UI labels
□ Response includes allowed_actions array
□ Response includes visibility flags for sensitive fields
```

### 4.2 Mutation Responses

```
□ POST/PUT/DELETE returns updated entity
□ Response includes new_status after transition
□ Response includes any cascading changes (e.g., property status)
□ Response includes next_action suggestion
```

### 4.3 Error Responses

```
□ Error includes human-readable message
□ Error includes machine-readable error code
□ Error includes current_state if state-related
□ Error includes suggestion for resolution
```

---

## SECTION 5: AUDIT LOGGING

### 5.1 Audit Creation

```
□ Every mutation creates an audit_logs entry
□ Audit includes actor_id and actor_role
□ Audit includes action name and entity_id
□ Audit includes relevant details (old/new values if applicable)
□ Audit created within same transaction as mutation
```

### 5.2 Audit Immutability

```
□ Audit table has no UPDATE or DELETE permissions for app user
□ Audit logs have no soft-delete mechanism
□ Audit records include immutable timestamp
□ Audit logs stored with entity for traceability
```

### 5.3 Audit Visibility

```
□ Activity timeline visible on entity detail pages
□ Users see relevant audit entries only
□ Admins see complete audit trail
□ Audit entries formatted for human readability
```

---

## SECTION 6: TESTING REQUIREMENTS

### 6.1 State-UI Mapping Tests

```
□ Unit tests verify correct UI for each state
□ Tests check button visibility per state
□ Tests check badge content per state
□ Tests check disabled state of actions
```

### 6.2 State Transition Tests

```
□ Tests verify valid transitions succeed
□ Tests verify invalid transitions return 400
□ Tests check state after transition
□ Tests verify cascade effects (e.g., property status change)
```

### 6.3 Audit Tests

```
□ Tests verify audit log created for each mutation
□ Tests verify audit log contains correct actor
□ Tests verify audit log contains correct action
□ Tests verify audit log cannot be modified
```

### 6.4 Edge Case Tests

```
□ Test expired offers/reservations handled correctly
□ Test concurrent modifications handled correctly
□ Test network failure scenarios handled gracefully
□ Test permission denied scenarios show correct error
```

---

## SECTION 7: SECURITY COMPLIANCE

### 7.1 Data Leakage Prevention

```
□ Sensitive data only returned when authorized
□ Phone numbers masked until appropriate state
□ Addresses hidden until visit approved
□ User lists don't expose private information
```

### 7.2 Rate Limiting

```
□ Mutation endpoints rate limited
□ Search endpoints rate limited
□ OTP resend rate limited
□ Login attempts rate limited
```

### 7.3 Input Validation

```
□ All inputs validated against schema
□ SQL injection prevented (parameterized queries)
□ XSS prevented (output encoding)
□ CSRF token verified for mutations
```

---

## SECTION 8: FEATURE COMPLETENESS

### 8.1 Core Requirements

```
□ Feature table stores all required data
□ Feature state field covers all scenarios
□ Feature UI shows correct content per state
□ Feature actions correctly mutate state
```

### 8.2 Error Handling

```
□ All error states have user-friendly messages
□ Network errors show retry option
□ Validation errors highlight specific fields
□ Authorization errors explain what's needed
```

### 8.3 Loading States

```
□ Initial load shows skeleton or spinner
□ Action processing shows loading indicator
□ Loading states prevent duplicate submissions
□ Loading timeout shows error after reasonable delay
```

### 8.4 Success Confirmation

```
□ Successful actions show toast notification
□ State change reflected in UI immediately after refetch
□ Activity timeline updated with new entry
□ Next action clearly indicated
```

---

## FINAL SIGN-OFF

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FEATURE:  _______________________________________________________          │
│                                                                             │
│  CHECKLIST COMPLETED BY: ________________________  DATE: ____________      │
│                                                                             │
│  REVIEWED BY: ____________________________________  DATE: ____________      │
│                                                                             │
│  ALL ITEMS VERIFIED:  □ YES   □ NO (explain below)                          │
│                                                                             │
│  NOTES:                                                                     │
│  ___________________________________________________________________        │
│  ___________________________________________________________________        │
│  ___________________________________________________________________        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## QUICK REFERENCE: THE 5 QUESTIONS

Before shipping, every feature must answer:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  - What table stores truth?                                                 │
│  - What field defines state?                                                │
│  - What UI is shown per state?                                              │
│  - What action mutates DB?                                                  │
│  - What happens if DB update fails?                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  If ANY answer is missing → FEATURE IS INCOMPLETE → DO NOT SHIP             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CHANGELOG

| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| 1.0     | 2024-12-19 | Initial design validation checklist created |
