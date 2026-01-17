# Workflow Naming Convention

**Version:** 1.0 | **Effective Date:** December 19, 2024

---

## Purpose

Standardize workflow IDs across all documentation to ensure consistency, searchability, and API-to-workflow mapping reliability.

---

## Format

```
<ROLE>_<INTENT>[_<OBJECT>]
```

| Component | Description | Examples |
|-----------|-------------|----------|
| ROLE | Actor performing the workflow | `BUYER`, `SELLER`, `AGENT`, `ADMIN`, `SYSTEM`, `PUBLIC`, `AUTH` |
| INTENT | Action or purpose | `LOGIN`, `OFFER`, `VERIFICATION`, `EXPIRY` |
| OBJECT | Target entity (optional) | `PROPERTY`, `USER`, `RESERVATION` |

---

## Valid Examples

| Workflow ID | Description |
|-------------|-------------|
| `AUTH_LOGIN` | User authentication |
| `AUTH_SIGNUP_USER` | Buyer/Seller registration |
| `AUTH_SIGNUP_AGENT` | Agent registration |
| `BUYER_OFFER_FLOW` | Buyer offer submission |
| `BUYER_VISIT_BOOKING` | Buyer visit request |
| `SELLER_PROPERTY_LISTING` | Seller property creation |
| `AGENT_PROPERTY_VERIFICATION` | Agent verifies property |
| `ADMIN_AGENT_APPROVAL` | Admin approves agent |
| `ADMIN_USER_CONTROL` | Admin manages users |
| `SYSTEM_RESERVATION_EXPIRY` | Automated expiry |
| `PUBLIC_PROPERTY_VIEW` | Unauthenticated property view |

---

## Prohibited Patterns

| Pattern | Reason |
|---------|--------|
| `property_flow` | Missing role prefix |
| `BUYER_SELLER_OFFER` | Mixed roles |
| `VIEW_PROPERTY_PAGE` | UI-based naming |
| `doOffer` | camelCase |
| `admin_action` | Generic, non-specific |
| `flow1`, `flow2` | Numbered generics |

---

## Rules

### Rule 1: Role Must Be First

Every workflow ID starts with the role that initiates it.

```
BUYER_OFFER_FLOW     # Correct
OFFER_BUYER_FLOW     # Wrong
```

### Rule 2: Use SCREAMING_SNAKE_CASE

All workflow IDs use uppercase with underscores.

```
BUYER_VISIT_BOOKING  # Correct
buyerVisitBooking    # Wrong
buyer-visit-booking  # Wrong
```

### Rule 3: Be Specific, Not Generic

Workflow ID must clearly indicate what happens.

```
ADMIN_AGENT_APPROVAL   # Correct - specific action
ADMIN_AGENT_ACTION     # Wrong - too generic
```

### Rule 4: SYSTEM for Automated Workflows

Any workflow triggered by cron or events (not users) uses SYSTEM role.

```
SYSTEM_RESERVATION_EXPIRY  # Correct
AUTO_RESERVATION_EXPIRY    # Wrong
CRON_RESERVATION_EXPIRY    # Wrong
```

### Rule 5: AUTH for Authentication Workflows

Login, signup, password reset use AUTH role (not USER).

```
AUTH_LOGIN           # Correct
USER_LOGIN           # Wrong
```

---

## Cross-Reference

Workflow IDs are used in:

- Workflow file metadata (`workflow_id` field)
- API documentation (`api-contracts.md`)
- Workflow-to-API mapping
- Audit log references
