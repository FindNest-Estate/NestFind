# NESTFIND - BUSINESS WORKFLOW & SYSTEM DESIGN DOCUMENT

*(Design Phase – No Development)*

---

## 1. PRODUCT VISION (ONE PARAGRAPH)

NestFind is a **trust-first real estate transaction platform** that connects **buyers, sellers, and platform-verified agents**.
Unlike listing platforms, NestFind **controls the entire transaction lifecycle** — from property listing to visit, negotiation, reservation, and registration — ensuring **security, anti-fraud, and zero off-platform leakage**.

The platform operates similar to **e-commerce + matrimonial models**, where interactions are **permission-based, state-driven, and auditable**.

---

## 2. CORE ACTORS & ROLES

### 2.1 User (Base Entity)

* Registers using **email verification (OTP)**
* Can act as:
  * Buyer
  * Seller
* Same registration process for both

### 2.2 Agent (Special Role)

* Registers separately
* Requires **admin approval**
* Acts as:
  * Property verifier
  * Visit approver
  * Negotiation mediator
  * Registration verifier
* Has a **100 km service radius**

### 2.3 Admin

* Platform authority
* Verifies agents
* Resolves disputes
* Enforces trust & security

---

## 3. BUSINESS WORKFLOW (END-TO-END)

### 3.1 USER REGISTRATION WORKFLOW (BUYER / SELLER)

**Purpose:** Ensure verified identity using low-cost, auditable email verification.

**Steps:**

1. User submits:
   * Name
   * Email
   * Mobile number (stored only)
   * Password + Confirm password
2. System creates a **PENDING_VERIFICATION** user record
3. OTP is sent to user's **email**
4. User verifies OTP
5. Account becomes **ACTIVE**

> Buyer and Seller are **not separate accounts** — role is inferred by actions.

---

### 3.2 AGENT REGISTRATION WORKFLOW

**Purpose:** Prevent fake agents and enforce platform trust.

**Steps:**

1. Agent submits:
   * Basic user details
   * Additional agent details:
     * Address
     * ID documents
     * Base location (lat/lng)
     * Service radius (≤ 100 km)
2. Email OTP verification (same as users)
3. Agent account enters **UNDER_REVIEW**
4. Admin reviews application:
   * APPROVE → Agent becomes ACTIVE
   * DECLINE → Admin provides reason
5. If declined, agent can **edit details and re-apply**

---

### 3.3 PROPERTY LISTING WORKFLOW (SELLER)

**Purpose:** Prevent fake or unverified listings.

**Steps:**

1. Seller creates property:
   * Property details
   * Price
   * Location
   * Images / videos
2. Property status = **DRAFT**
3. Seller must **hire an agent**
4. Agent verifies property:
   * Visits location
   * Confirms details
   * Uploads verification data
5. Property status = **ACTIVE**
6. Property becomes visible to buyers

---

### 3.4 AGENT ASSIGNMENT WORKFLOW

**Purpose:** Ensure accountability and enforce service radius.

**Steps:**

1. Seller chooses agent (map/list view)
2. Only agents within **100 km** are shown
3. Agent receives assignment request
4. Agent:
   * Accepts → Case active
   * Declines → Seller selects another agent
5. SLA is derived from distance

---

### 3.5 PROPERTY VISIT WORKFLOW (BUYER)

**Purpose:** Secure, verified property visits.

**Steps:**

1. Buyer requests visit slot
2. Agent approves or rejects
3. On visit day:
   * Agent verifies location (GPS)
   * Email OTP confirmation
4. Visit marked **COMPLETED**
5. All actions logged

---

### 3.6 OFFER & NEGOTIATION WORKFLOW

**Purpose:** Controlled, traceable negotiation.

**Steps:**

1. Buyer submits offer
2. Seller / Agent:
   * Accept
   * Reject
   * Counter
3. Buyer responds
4. All offers are:
   * Time-bound
   * Immutable
   * Logged

---

### 3.7 RESERVATION WORKFLOW (0.1%)

**Purpose:** Prevent multiple buyers blocking inventory.

**Steps:**

1. Buyer reserves property by paying **0.1%**
2. Property status = **RESERVED**
3. Reservation valid for **30 days**
4. If expired or cancelled:
   * Property returns to ACTIVE

---

### 3.8 REGISTRATION & TRANSACTION WORKFLOW

**Purpose:** Fraud-free closing.

**Steps:**

1. Agent schedules registration
2. On registration day:
   * Buyer email OTP
   * Seller email OTP
   * Agent GPS verification
3. Seller pays remaining **0.9%**
4. Commission split:
   * Agent → 80%
   * NestFind → 20%
5. Property status = **SOLD**
6. Transaction closed

---

## 4. SYSTEM ARCHITECTURE (DESIGN-ONLY)

### 4.1 HIGH-LEVEL ARCHITECTURE

```
Web Application
Mobile Application
        |
        | REST APIs
        |
      FastAPI
        |
  Business Logic Layer
        |
  Single Relational Database
```

### Key Principles

* One backend
* One database
* No business logic in frontend
* All state transitions handled server-side
* Full auditability

---

## 5. SYSTEM DESIGN PRINCIPLES

1. **State-Driven System**
   * Properties, users, agents all move through states

2. **Trust First**
   * No anonymous actions
   * No unverified listings

3. **Audit Everything**
   * Every critical action logged

4. **Anti-Disintermediation**
   * Masked communication
   * Platform-controlled flow

5. **Minimal Cost**
   * Email OTP only
   * Open-source stack

---

## 6. DATABASE DESIGN (CONCEPTUAL)

### Core Entity Groups

#### Identity & Access
* Users
* Roles
* Email OTP verifications

#### Agent Management
* Agent applications
* Agent profiles
* Admin decisions

#### Property System
* Properties
* Property media (images/videos)
* Property verification records

#### Interaction System
* Visits
* Offers
* Reservations

#### Transaction System
* Registrations
* Payments
* Commission records

#### Security & Trust
* Audit logs
* Dispute records

> **Single database = single source of truth**

---

## 7. SECURITY & TRUST MECHANISMS

* Email-only OTP verification
* Role-based access
* GPS verification for agents
* Mandatory agent involvement
* Admin override authority
* Immutable audit logs

---

## 8. WHAT IS EXPLICITLY OUT OF SCOPE (FOR NOW)

* AI features
* Loans & rentals
* Subscriptions
* External integrations
* Scaling optimizations

---

## 9. SUCCESS METRIC (DESIGN PHASE)

A successful design means:

* Every feature has a clear workflow
* Every workflow maps to database states
* No undefined transitions
* No trust assumptions
* No hidden logic

---

## 10. HOW TO USE THIS DOCUMENT

This document should be:

* Treated as **ground truth**
* Used to derive:
  * System architecture
  * ER diagrams
  * API contracts
* Referenced to avoid inventing new flows
* Consulted to ensure agent/admin checks are not bypassed

---

## 11. FEATURE ADDITIONS

### Trust & Anti-Fraud Features

1. **Immutable Activity Log** - Every critical action logged
2. **Secure In-App Communication** - Chat + call masking, AI detection for phone/email sharing
3. **Reputation & Trust Scores** - Based on completion rate, disputes, no-shows
4. **Dispute Resolution System** - Raise dispute, upload proof, admin decision

### Agent Service Radius (100km)

1. **Agent Service Radius** - Base location + max 100km radius
2. **Distance-Based Agent Filtering** - Show only agents within 100km
3. **Distance-Based SLA**:
   * 0–20 km → visit in 24 hrs
   * 20–50 km → visit in 48 hrs
   * 50–100 km → visit in 72 hrs
4. **GPS Geofencing** - Agent must be within 50-100m radius of property

---

## 12. DATABASE TABLES (DETAILED)

### Users & Roles

```
users
├── id (UUID)
├── full_name
├── email (unique)
├── mobile_number
├── password_hash
├── email_verified (boolean)
├── status (PENDING_VERIFICATION / ACTIVE / SUSPENDED)
└── created_at

email_otp_verifications
├── id
├── user_id
├── otp_code
├── expires_at
├── attempt_count
└── verified (boolean)

user_roles
├── user_id
└── role (BUYER / SELLER)
```

### Agent System

```
agent_applications
├── id
├── user_id
├── address
├── govt_id_url
├── base_lat
├── base_lng
├── service_radius_km
├── status (UNDER_REVIEW / APPROVED / DECLINED)
├── decline_reason
└── created_at

agents
├── user_id
├── approved_at
├── rating
├── total_cases
└── is_active
```

### Property System

```
properties
├── id
├── seller_id
├── title
├── description
├── type
├── price
├── lat
├── lng
├── status (DRAFT / ACTIVE / RESERVED / SOLD)
└── created_at

property_media
├── id
├── property_id
├── media_type (IMAGE / VIDEO)
├── file_url
└── uploaded_at

property_verifications
├── property_id
├── agent_id
├── gps_lat
├── gps_lng
├── verified_at
└── notes
```

### Interaction System

```
agent_assignments
├── id
├── agent_id
├── property_id
├── status (ASSIGNED / ACCEPTED / COMPLETED)
└── assigned_at

visit_requests
├── id
├── property_id
├── buyer_id
├── agent_id
├── visit_date
└── status (REQUESTED / APPROVED / COMPLETED / CANCELLED)

visit_verifications
├── visit_id
├── agent_gps_lat
├── agent_gps_lng
├── otp_verified
└── timestamp

offers
├── id
├── property_id
├── buyer_id
├── offered_price
├── status (PENDING / ACCEPTED / REJECTED / COUNTERED)
└── expires_at

reservations
├── id
├── property_id
├── buyer_id
├── amount (0.1%)
├── start_date
├── end_date
└── status (ACTIVE / EXPIRED / CANCELLED)
```

### Transaction System

```
transactions
├── id
├── property_id
├── buyer_id
├── seller_id
├── agent_id
├── total_price
├── platform_fee
├── agent_commission
└── status (INITIATED / VERIFIED / COMPLETED)

payment_logs
├── id
├── transaction_id
├── payer
├── amount
├── method
└── status
```

### Audit System

```
audit_logs
├── id
├── user_id
├── role
├── action
├── entity_type
├── entity_id
├── timestamp
└── ip_address

admin_actions
├── id
├── admin_id
├── action
├── target_type
├── target_id
├── reason
└── timestamp
```

---

## 13. FASTAPI MODULE STRUCTURE

```
app/
 ├── main.py
 ├── auth/
 │   ├── models.py
 │   ├── schemas.py
 │   ├── routes.py
 │   └── service.py
 ├── users/
 ├── properties/
 ├── agents/
 ├── visits/
 ├── offers/
 ├── reservations/
 ├── transactions/
 ├── audits/
 ├── notifications/
 └── db/
```

---

> **Document Version:** 1.0  
> **Last Updated:** December 18, 2024  
> **Purpose:** Source of Truth for NestFind Development
