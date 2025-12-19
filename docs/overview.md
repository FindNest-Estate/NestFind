# NestFind Overview

**Version:** 1.0 | **Last Updated:** December 19, 2024

---

## Product Vision

NestFind is a **trust-first real estate transaction platform** that connects buyers, sellers, and platform-verified agents.

Unlike listing platforms, NestFind **controls the entire transaction lifecycle**:

```mermaid
flowchart LR
    A[Listing] --> B[Verification]
    B --> C[Visit]
    C --> D[Negotiation]
    D --> E[Reservation]
    E --> F[Registration]
    F --> G[Completion]
```

---

## Core Problem

Traditional real estate platforms suffer from:

| Problem | Impact |
|---------|--------|
| Fake listings | Wasted buyer time |
| Unverified agents | Fraud risk |
| Off-platform negotiation | Lost visibility |
| No transaction control | Disputes |

---

## NestFind Solution

```mermaid
flowchart TD
    subgraph Trust["Trust Layer"]
        V[Agent Verification]
        P[Property Verification]
        A[Audit Logging]
    end

    subgraph Control["Control Layer"]
        S[State Machine]
        R[Role-Based Access]
        M[Masked Communication]
    end

    subgraph Transaction["Transaction Layer"]
        O[Offer System]
        RES[Reservation 0.1%]
        REG[Registration 0.9%]
    end

    Trust --> Control
    Control --> Transaction
```

---

## Core Actors

| Role | Description | Key Actions |
|------|-------------|-------------|
| **Buyer** | Property seeker | Browse, visit, offer, reserve |
| **Seller** | Property owner | List, hire agent, accept offers |
| **Agent** | Platform-verified mediator | Verify, conduct visits, close deals |
| **Admin** | Platform authority | Approve agents, resolve disputes |

---

## Design Principles

### 1. Database is Truth

```mermaid
flowchart LR
    DB[(Database)] -->|reads| BE[Backend]
    BE -->|validates| FE[Frontend]
    FE -->|displays| UI[User]
```

- Frontend never invents state
- Backend validates all transitions
- Database is single source of truth

### 2. State-Driven UI

Every UI element is controlled by database state:

| State | UI Result |
|-------|-----------|
| `DRAFT` | "Complete Listing" button |
| `PENDING_VERIFY` | "Awaiting Verification" badge |
| `ACTIVE` | "Book Visit" button |
| `RESERVED` | Countdown timer |
| `SOLD` | Read-only view |

### 3. Trust-First

- No anonymous actions
- No unverified listings
- Agent involvement mandatory
- All communication platform-controlled

### 4. Audit Everything

```mermaid
flowchart LR
    A[Action] --> V[Validation]
    V --> M[Mutation]
    M --> L[Audit Log]
    L --> S[Storage]
```

Every mutation creates immutable audit record.

---

## Key Documents

| Document | Purpose |
|----------|---------|
| [DESIGN_CONSTITUTION.md](DESIGN_CONSTITUTION.md) | UI/State rules |
| [DOCUMENTATION_RULES.md](DOCUMENTATION_RULES.md) | Doc governance |
| [system_design.md](system_design.md) | Technical architecture |
| [business_design_document.md](business_design_document.md) | Business workflows |

---

## What's Explicitly Out of Scope

- AI features (future)
- Loans & rentals (future)
- Subscriptions (future)
- External integrations (future)
