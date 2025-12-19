# Workflow to API Mapping

**Version:** 1.0 | **Effective Date:** December 19, 2024

---

## Purpose

Define explicit connections between workflows and API endpoints. This prevents orphan APIs and undocumented side effects.

---

## Mapping Table

### Authentication Workflows

| Workflow ID | Endpoints | Methods |
|-------------|-----------|---------|
| `AUTH_LOGIN` | `/auth/login` | POST |
| `AUTH_SIGNUP_USER` | `/auth/register`, `/auth/verify-otp` | POST |
| `AUTH_SIGNUP_AGENT` | `/auth/register-agent`, `/auth/verify-otp` | POST |

---

### Public Workflows

| Workflow ID | Endpoints | Methods |
|-------------|-----------|---------|
| `PUBLIC_PROPERTY_VIEW` | `/properties`, `/properties/{id}` | GET |

---

### Buyer Workflows

| Workflow ID | Endpoints | Methods |
|-------------|-----------|---------|
| `BUYER_PROPERTY_DISCOVERY` | `/properties`, `/properties/{id}` | GET |
| `BUYER_VISIT_BOOKING` | `/visits`, `/visits/{id}` | GET, POST |
| `BUYER_OFFER_FLOW` | `/offers`, `/offers/{id}/accept`, `/offers/{id}/counter` | GET, POST |
| `BUYER_RESERVATION` | `/reservations`, `/reservations/{id}/pay` | GET, POST |

---

### Seller Workflows

| Workflow ID | Endpoints | Methods |
|-------------|-----------|---------|
| `SELLER_PROPERTY_LISTING` | `/properties`, `/properties/{id}`, `/properties/{id}/media` | GET, POST, PUT, DELETE |
| `SELLER_HIRE_AGENT` | `/agents`, `/agent-assignments` | GET, POST |
| `SELLER_OFFER_HANDLING` | `/offers/{id}`, `/offers/{id}/accept`, `/offers/{id}/reject`, `/offers/{id}/counter` | GET, POST |

---

### Agent Workflows

| Workflow ID | Endpoints | Methods |
|-------------|-----------|---------|
| `AGENT_ONBOARDING` | `/auth/register-agent`, `/agent-applications/{id}` | POST, GET |
| `AGENT_PROPERTY_VERIFICATION` | `/properties/{id}/verify` | POST |
| `AGENT_VISIT_EXECUTION` | `/visits/{id}/approve`, `/visits/{id}/complete`, `/visits/{id}/verify-otp` | POST |
| `AGENT_REGISTRATION_DAY` | `/transactions/{id}/verify`, `/transactions/{id}/complete` | POST |

---

### Admin Workflows

| Workflow ID | Endpoints | Methods |
|-------------|-----------|---------|
| `ADMIN_USER_OVERVIEW` | `/admin/users`, `/admin/users/{id}` | GET |
| `ADMIN_USER_CONTROL` | `/admin/users/{id}/suspend`, `/admin/users/{id}/activate` | POST |
| `ADMIN_AGENT_OVERVIEW` | `/admin/agents`, `/admin/agent-applications` | GET |
| `ADMIN_AGENT_APPROVAL` | `/admin/agent-applications/{id}/approve`, `/admin/agent-applications/{id}/reject` | POST |
| `ADMIN_PROPERTY_OVERRIDE` | `/admin/properties/{id}/status` | PUT |
| `ADMIN_DISPUTE_RESOLUTION` | `/admin/disputes`, `/admin/disputes/{id}/resolve` | GET, POST |

---

### System Workflows

| Workflow ID | Trigger | Affected Endpoints |
|-------------|---------|-------------------|
| `SYSTEM_RESERVATION_EXPIRY` | CRON | Internal - no API |
| `SYSTEM_OFFER_EXPIRY` | CRON | Internal - no API |
| `SYSTEM_OTP_EXPIRY` | CRON | Internal - no API |
| `SYSTEM_AUDIT_LOGGING` | EVENT | Internal - no API |

---

## Rules

### Rule 1: No Orphan Endpoints

Every API endpoint must be referenced by at least one workflow.

### Rule 2: No Undocumented Mutations

POST/PUT/DELETE endpoints must have corresponding workflow with `action_type: MUTATION`.

### Rule 3: State Transitions

Every endpoint that changes entity state must document:
- Entry state (valid before calling)
- Exit state (result after calling)

---

## Validation Checklist

- [ ] Every workflow references at least one endpoint
- [ ] Every mutating endpoint references a workflow
- [ ] System workflows document internal triggers
- [ ] No duplicate workflow-to-endpoint mappings
