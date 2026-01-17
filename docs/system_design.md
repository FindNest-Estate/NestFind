# NESTFIND — SYSTEM DESIGN DOCUMENT

**Version:** 1.0 | **Status:** Design Phase | **Last Updated:** December 18, 2024

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Component Design](#3-component-design)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [Security Architecture](#6-security-architecture)
7. [Data Flow](#7-data-flow)
8. [State Machines](#8-state-machines)
9. [Technology Stack](#9-technology-stack)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. EXECUTIVE SUMMARY

### 1.1 System Overview

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                           NESTFIND PLATFORM                               ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  A trust-first real estate transaction platform controlling the entire   ║
║  lifecycle from listing → verification → visit → negotiation →           ║
║  reservation → registration with mandatory agent involvement.             ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### 1.2 Key Design Principles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DESIGN PRINCIPLES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  1. SINGLE SOURCE OF TRUTH     - One database, one backend             │
│  2. STATE-DRIVEN               - All entities move through states      │
│  3. TRUST-FIRST                - No anonymous actions allowed          │
│  4. AUDIT EVERYTHING           - Every action logged immutably         │
│  5. ANTI-DISINTERMEDIATION     - Platform controls all communication   │
│  6. MINIMAL COST               - Email OTP, open-source stack          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HIGH-LEVEL ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │           CLIENT LAYER              │
                    ├─────────────────┬───────────────────┤
                    │                 │                   │
               ┌────▼────┐       ┌────▼────┐       ┌──────▼──────┐
               │   WEB   │       │ MOBILE  │       │   ADMIN     │
               │   APP   │       │   APP   │       │   PANEL     │
               │(Next.js)│       │ (React  │       │  (Next.js)  │
               │         │       │ Native) │       │             │
               └────┬────┘       └────┬────┘       └──────┬──────┘
                    │                 │                   │
                    └─────────────────┼───────────────────┘
                                      │
                              ┌───────▼───────┐
                              │   HTTPS/TLS   │
                              │   REST API    │
                              └───────┬───────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────┐
│                           API LAYER │                                     │
│                     ┌───────────────▼───────────────┐                     │
│                     │         FASTAPI               │                     │
│                     │    ┌─────────────────────┐    │                     │
│                     │    │   API Gateway       │    │                     │
│                     │    │  • Rate Limiting    │    │                     │
│                     │    │  • Authentication   │    │                     │
│                     │    │  • Request Routing  │    │                     │
│                     │    └─────────────────────┘    │                     │
│                     └───────────────┬───────────────┘                     │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────┐
│                       SERVICE LAYER │                                     │
│            ┌────────────────────────┼────────────────────────┐            │
│            │                        │                        │            │
│     ┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐     │
│     │    AUTH     │          │   PROPERTY  │          │    AGENT    │     │
│     │   SERVICE   │          │   SERVICE   │          │   SERVICE   │     │
│     └─────────────┘          └─────────────┘          └─────────────┘     │
│            │                        │                        │            │
│     ┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐     │
│     │   VISIT     │          │    OFFER    │          │ TRANSACTION │     │
│     │   SERVICE   │          │   SERVICE   │          │   SERVICE   │     │
│     └─────────────┘          └─────────────┘          └─────────────┘     │
│            │                        │                        │            │
│     ┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐     │
│     │   AUDIT     │          │NOTIFICATION │          │   DISPUTE   │     │
│     │   SERVICE   │          │   SERVICE   │          │   SERVICE   │     │
│     └─────────────┘          └─────────────┘          └─────────────┘     │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────┐
│                        DATA LAYER   │                                     │
│                     ┌───────────────▼───────────────┐                     │
│                     │       POSTGRESQL              │                     │
│                     │    (Single Database)          │                     │
│                     │                               │                     │
│                     │  ┌─────────┐ ┌─────────┐      │                     │
│                     │  │  Users  │ │Properties│     │                     │
│                     │  └─────────┘ └─────────┘      │                     │
│                     │  ┌─────────┐ ┌─────────┐      │                     │
│                     │  │ Agents  │ │Transactions│   │                     │
│                     │  └─────────┘ └─────────┘      │                     │
│                     │  ┌─────────┐ ┌─────────┐      │                     │
│                     │  │  Audit  │ │ Disputes│      │                     │
│                     │  └─────────┘ └─────────┘      │                     │
│                     └───────────────────────────────┘                     │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REQUEST FLOW                                    │
└─────────────────────────────────────────────────────────────────────────┘

  Client                API Gateway              Service               Database
    │                       │                       │                      │
    │  1. HTTP Request      │                       │                      │
    │──────────────────────►│                       │                      │
    │                       │                       │                      │
    │                       │  2. Validate JWT      │                      │
    │                       │─────────┐             │                      │
    │                       │◄────────┘             │                      │
    │                       │                       │                      │
    │                       │  3. Check RBAC        │                      │
    │                       │─────────┐             │                      │
    │                       │◄────────┘             │                      │
    │                       │                       │                      │
    │                       │  4. Route to Service  │                      │
    │                       │──────────────────────►│                      │
    │                       │                       │                      │
    │                       │                       │  5. Business Logic   │
    │                       │                       │─────────┐            │
    │                       │                       │◄────────┘            │
    │                       │                       │                      │
    │                       │                       │  6. DB Query         │
    │                       │                       │─────────────────────►│
    │                       │                       │                      │
    │                       │                       │  7. DB Response      │
    │                       │                       │◄─────────────────────│
    │                       │                       │                      │
    │                       │                       │  8. Write Audit Log  │
    │                       │                       │─────────────────────►│
    │                       │                       │                      │
    │                       │  9. Service Response  │                      │
    │                       │◄──────────────────────│                      │
    │                       │                       │                      │
    │  10. HTTP Response    │                       │                      │
    │◄──────────────────────│                       │                      │
    │                       │                       │                      │
```

---

## 3. COMPONENT DESIGN

### 3.1 Service Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVICE COMPONENTS                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  AUTH SERVICE                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                                      │
│   • User registration (email OTP)                                       │
│   • Login / Logout                                                      │
│   • JWT token management                                                │
│   • Password reset                                                      │
│   • Session management                                                  │
│                                                                         │
│  Endpoints:                                                             │
│   POST /auth/register                                                   │
│   POST /auth/verify-otp                                                 │
│   POST /auth/login                                                      │
│   POST /auth/logout                                                     │
│   POST /auth/refresh-token                                              │
│   POST /auth/forgot-password                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PROPERTY SERVICE                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                                      │
│   • Property CRUD                                                       │
│   • Media upload management                                             │
│   • Property search & filtering                                         │
│   • Status transitions                                                  │
│                                                                         │
│  Endpoints:                                                             │
│   POST   /properties                                                    │
│   GET    /properties                                                    │
│   GET    /properties/{id}                                               │
│   PUT    /properties/{id}                                               │
│   POST   /properties/{id}/media                                         │
│   DELETE /properties/{id}/media/{media_id}                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  AGENT SERVICE                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                                      │
│   • Agent registration                                                  │
│   • Agent discovery (within 100km)                                      │
│   • Assignment management                                               │
│   • Property verification                                               │
│   • GPS verification                                                    │
│                                                                         │
│  Endpoints:                                                             │
│   POST /agents/apply                                                    │
│   GET  /agents/nearby?lat=&lng=&radius=                                 │
│   GET  /agents/{id}                                                     │
│   POST /agents/assignments/{id}/accept                                  │
│   POST /agents/assignments/{id}/decline                                 │
│   POST /agents/verify-property/{id}                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  VISIT SERVICE                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                                      │
│   • Visit slot booking                                                  │
│   • Visit approval/rejection                                            │
│   • GPS check-in                                                        │
│   • OTP verification                                                    │
│   • Visit completion                                                    │
│                                                                         │
│  Endpoints:                                                             │
│   POST /visits                                                          │
│   GET  /visits                                                          │
│   POST /visits/{id}/approve                                             │
│   POST /visits/{id}/reject                                              │
│   POST /visits/{id}/check-in                                            │
│   POST /visits/{id}/complete                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  OFFER SERVICE                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                                      │
│   • Offer creation                                                      │
│   • Counter-offer handling                                              │
│   • Offer expiry management                                             │
│   • Negotiation history                                                 │
│                                                                         │
│  Endpoints:                                                             │
│   POST /offers                                                          │
│   GET  /offers                                                          │
│   POST /offers/{id}/accept                                              │
│   POST /offers/{id}/reject                                              │
│   POST /offers/{id}/counter                                             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  TRANSACTION SERVICE                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                                      │
│   • Reservation (0.1% payment)                                          │
│   • Registration scheduling                                             │
│   • Multi-party OTP verification                                        │
│   • Commission calculation                                              │
│   • Transaction completion                                              │
│                                                                         │
│  Endpoints:                                                             │
│   POST /reservations                                                    │
│   POST /reservations/{id}/cancel                                        │
│   POST /registrations                                                   │
│   POST /registrations/{id}/verify-buyer                                 │
│   POST /registrations/{id}/verify-seller                                │
│   POST /registrations/{id}/complete                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. DATABASE DESIGN

### 4.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ENTITY RELATIONSHIP DIAGRAM                             │
└─────────────────────────────────────────────────────────────────────────────┘

                                 ┌──────────────┐
                                 │    USERS     │
                                 │──────────────│
                                 │ id (PK)      │
                                 │ email (UK)   │
                                 │ full_name    │
                                 │ mobile       │
                                 │ password_hash│
                                 │ email_verified│
                                 │ status       │
                                 │ created_at   │
                                 └──────┬───────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           │ 1:N                        │ 1:1                        │ 1:N
           ▼                            ▼                            ▼
   ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
   │  USER_ROLES   │           │AGENT_PROFILES │           │  PROPERTIES   │
   │───────────────│           │───────────────│           │───────────────│
   │ id (PK)       │           │ user_id (PK,FK)           │ id (PK)       │
   │ user_id (FK)  │           │ base_lat      │           │ seller_id (FK)│
   │ role          │           │ base_lng      │           │ title         │
   └───────────────┘           │ service_radius│           │ description   │
                               │ kyc_status    │           │ type          │
                               │ rating        │           │ price         │
                               │ is_active     │           │ lat, lng      │
                               └───────┬───────┘           │ status        │
                                       │                   └───────┬───────┘
                                       │                           │
                    ┌──────────────────┼───────────────────────────┼───────┐
                    │                  │                           │       │
                    │ 1:N              │ 1:N                       │ 1:N   │ 1:N
                    ▼                  ▼                           ▼       ▼
           ┌───────────────┐  ┌───────────────┐           ┌───────────────┐
           │   AGENT_      │  │    VISIT_     │           │  PROPERTY_    │
           │ ASSIGNMENTS   │  │   REQUESTS    │           │    MEDIA      │
           │───────────────│  │───────────────│           │───────────────│
           │ id (PK)       │  │ id (PK)       │           │ id (PK)       │
           │ property_id   │  │ property_id   │           │ property_id   │
           │ agent_id      │  │ buyer_id      │           │ media_type    │
           │ status        │  │ agent_id      │           │ file_url      │
           │ assigned_at   │  │ visit_date    │           │ uploaded_at   │
           └───────────────┘  │ status        │           └───────────────┘
                              └───────────────┘
                                       │
                                       │ 1:1
                                       ▼
                              ┌───────────────┐
                              │    VISIT_     │
                              │ VERIFICATIONS │
                              │───────────────│
                              │ visit_id (PK) │
                              │ agent_gps_lat │
                              │ agent_gps_lng │
                              │ otp_verified  │
                              │ timestamp     │
                              └───────────────┘

   ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
   │    OFFERS     │           │ RESERVATIONS  │           │ TRANSACTIONS  │
   │───────────────│           │───────────────│           │───────────────│
   │ id (PK)       │           │ id (PK)       │           │ id (PK)       │
   │ property_id   │           │ property_id   │           │ property_id   │
   │ buyer_id      │           │ buyer_id      │           │ buyer_id      │
   │ offered_price │           │ amount        │           │ seller_id     │
   │ status        │           │ start_date    │           │ agent_id      │
   │ expires_at    │           │ end_date      │           │ total_price   │
   │ created_at    │           │ status        │           │ platform_fee  │
   └───────────────┘           └───────────────┘           │ agent_comm    │
                                                           │ status        │
                                                           └───────────────┘

   ┌───────────────┐           ┌───────────────┐
   │  AUDIT_LOGS   │           │   DISPUTES    │
   │───────────────│           │───────────────│
   │ id (PK)       │           │ id (PK)       │
   │ actor_id      │           │ raised_by_id  │
   │ actor_role    │           │ property_id   │
   │ action        │           │ against_id    │
   │ entity_type   │           │ description   │
   │ entity_id     │           │ status        │
   │ timestamp     │           │ created_at    │
   │ ip_address    │           └───────────────┘
   └───────────────┘
```

### 4.2 Table Specifications

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TABLE: users                                    │
├─────────────────┬───────────┬──────────────────┬────────────────────────┤
│ Column          │ Type      │ Constraints      │ Description            │
├─────────────────┼───────────┼──────────────────┼────────────────────────┤
│ id              │ UUID      │ PK, DEFAULT uuid │ Unique identifier      │
│ email           │ VARCHAR   │ UNIQUE, NOT NULL │ User email             │
│ full_name       │ VARCHAR   │ NOT NULL         │ Full name              │
│ mobile_number   │ VARCHAR   │                  │ Phone (stored only)    │
│ password_hash   │ VARCHAR   │ NOT NULL         │ Bcrypt hash            │
│ email_verified  │ BOOLEAN   │ DEFAULT false    │ Email verification     │
│ status          │ ENUM      │ NOT NULL         │ PENDING/ACTIVE/SUSPEND │
│ created_at      │ TIMESTAMP │ DEFAULT now()    │ Registration time      │
│ updated_at      │ TIMESTAMP │                  │ Last update            │
└─────────────────┴───────────┴──────────────────┴────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         TABLE: properties                               │
├─────────────────┬───────────┬──────────────────┬────────────────────────┤
│ Column          │ Type      │ Constraints      │ Description            │
├─────────────────┼───────────┼──────────────────┼────────────────────────┤
│ id              │ UUID      │ PK               │ Unique identifier      │
│ seller_id       │ UUID      │ FK → users       │ Property owner         │
│ title           │ VARCHAR   │ NOT NULL         │ Listing title          │
│ description     │ TEXT      │                  │ Detailed description   │
│ type            │ ENUM      │ NOT NULL         │ LAND/HOUSE/FLAT/COMM   │
│ price           │ DECIMAL   │ NOT NULL         │ Asking price           │
│ lat             │ FLOAT     │ NOT NULL         │ Latitude               │
│ lng             │ FLOAT     │ NOT NULL         │ Longitude              │
│ address         │ TEXT      │                  │ Full address           │
│ status          │ ENUM      │ NOT NULL         │ DRAFT/ACTIVE/RESERVED  │
│ created_at      │ TIMESTAMP │ DEFAULT now()    │ Creation time          │
└─────────────────┴───────────┴──────────────────┴────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      TABLE: agent_profiles                              │
├─────────────────┬───────────┬──────────────────┬────────────────────────┤
│ Column          │ Type      │ Constraints      │ Description            │
├─────────────────┼───────────┼──────────────────┼────────────────────────┤
│ user_id         │ UUID      │ PK, FK → users   │ Links to user          │
│ base_lat        │ FLOAT     │ NOT NULL         │ Base latitude          │
│ base_lng        │ FLOAT     │ NOT NULL         │ Base longitude         │
│ service_radius  │ INTEGER   │ DEFAULT 100      │ Max km (≤100)          │
│ kyc_status      │ ENUM      │ NOT NULL         │ PENDING/VERIFIED       │
│ rating          │ FLOAT     │ DEFAULT 0        │ Average rating         │
│ total_cases     │ INTEGER   │ DEFAULT 0        │ Completed deals        │
│ is_active       │ BOOLEAN   │ DEFAULT false    │ Can take cases         │
│ approved_at     │ TIMESTAMP │                  │ Admin approval time    │
└─────────────────┴───────────┴──────────────────┴────────────────────────┘
```

---

## 5. API DESIGN

### 5.1 RESTful API Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         API STRUCTURE                                   │
└─────────────────────────────────────────────────────────────────────────┘

  BASE URL: https://api.nestfind.com/v1

  ┌─────────────────────────────────────────────────────────────────┐
  │  AUTHENTICATION                                                 │
  ├─────────────────────────────────────────────────────────────────┤
  │  POST   /auth/register           Register new user             │
  │  POST   /auth/verify-otp         Verify email OTP              │
  │  POST   /auth/login              User login                    │
  │  POST   /auth/logout             User logout                   │
  │  POST   /auth/refresh            Refresh JWT token             │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │  PROPERTIES                                                     │
  ├─────────────────────────────────────────────────────────────────┤
  │  GET    /properties              List properties (with filters)│
  │  POST   /properties              Create property [SELLER]      │
  │  GET    /properties/{id}         Get property details          │
  │  PUT    /properties/{id}         Update property [SELLER]      │
  │  POST   /properties/{id}/media   Upload media [SELLER]         │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │  AGENTS                                                         │
  ├─────────────────────────────────────────────────────────────────┤
  │  POST   /agents/apply            Apply as agent                │
  │  GET    /agents/nearby           Find agents within radius     │
  │  GET    /agents/{id}             Get agent profile             │
  │  POST   /agents/assign           Assign agent to property      │
  │  POST   /agents/verify           Verify property [AGENT]       │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │  VISITS                                                         │
  ├─────────────────────────────────────────────────────────────────┤
  │  POST   /visits                  Request visit [BUYER]         │
  │  GET    /visits                  List visits                   │
  │  POST   /visits/{id}/approve     Approve visit [AGENT]         │
  │  POST   /visits/{id}/check-in    GPS check-in [AGENT]          │
  │  POST   /visits/{id}/complete    Complete visit [AGENT]        │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │  OFFERS                                                         │
  ├─────────────────────────────────────────────────────────────────┤
  │  POST   /offers                  Make offer [BUYER]            │
  │  GET    /offers                  List offers                   │
  │  POST   /offers/{id}/accept      Accept offer [SELLER]         │
  │  POST   /offers/{id}/counter     Counter offer [SELLER]        │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │  TRANSACTIONS                                                   │
  ├─────────────────────────────────────────────────────────────────┤
  │  POST   /reservations            Reserve property (0.1%)       │
  │  POST   /registrations           Schedule registration         │
  │  POST   /registrations/{id}/verify-buyer   Buyer OTP           │
  │  POST   /registrations/{id}/verify-seller  Seller OTP          │
  │  POST   /registrations/{id}/complete       Complete deal       │
  └─────────────────────────────────────────────────────────────────┘
```

### 5.2 Response Format

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STANDARD RESPONSE FORMAT                             │
└─────────────────────────────────────────────────────────────────────────┘

  SUCCESS RESPONSE (2xx):
  ┌─────────────────────────────────────────────────────────────────┐
  │  {                                                              │
  │    "success": true,                                             │
  │    "data": { ... },                                             │
  │    "meta": {                                                    │
  │      "timestamp": "2024-12-18T12:00:00Z",                       │
  │      "request_id": "uuid"                                       │
  │    }                                                            │
  │  }                                                              │
  └─────────────────────────────────────────────────────────────────┘

  ERROR RESPONSE (4xx/5xx):
  ┌─────────────────────────────────────────────────────────────────┐
  │  {                                                              │
  │    "success": false,                                            │
  │    "error": {                                                   │
  │      "code": "VALIDATION_ERROR",                                │
  │      "message": "Human readable message",                       │
  │      "details": [ ... ]                                         │
  │    },                                                           │
  │    "meta": { ... }                                              │
  │  }                                                              │
  └─────────────────────────────────────────────────────────────────┘
```

---

## 6. SECURITY ARCHITECTURE

### 6.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SECURITY ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────┘

                          ┌───────────────────────┐
                          │    CLIENT REQUEST     │
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │   LAYER 1: HTTPS/TLS  │
                          │   • Encrypted transit │
                          │   • Certificate valid │
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │  LAYER 2: RATE LIMIT  │
                          │   • Per IP limiting   │
                          │   • Per user limiting │
                          │   • DDoS protection   │
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │  LAYER 3: AUTH (JWT)  │
                          │   • Token validation  │
                          │   • Token expiry      │
                          │   • Refresh tokens    │
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │  LAYER 4: RBAC        │
                          │   • Role verification │
                          │   • Permission check  │
                          │   • Resource access   │
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │  LAYER 5: VALIDATION  │
                          │   • Input sanitization│
                          │   • Schema validation │
                          │   • SQL injection prev│
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │  LAYER 6: AUDIT       │
                          │   • Action logging    │
                          │   • Immutable records │
                          │   • IP tracking       │
                          └───────────────────────┘
```

### 6.2 Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RBAC MATRIX                                     │
├───────────────────┬────────┬────────┬────────┬────────┬─────────────────┤
│ Resource/Action   │ BUYER  │ SELLER │ AGENT  │ ADMIN  │ Description     │
├───────────────────┼────────┼────────┼────────┼────────┼─────────────────┤
│ Properties:List   │   ✅   │   ✅   │   ✅   │   ✅   │ View listings   │
│ Properties:Create │   ❌   │   ✅   │   ❌   │   ✅   │ Create listing  │
│ Properties:Update │   ❌   │ Owner  │   ❌   │   ✅   │ Edit listing    │
├───────────────────┼────────┼────────┼────────┼────────┼─────────────────┤
│ Visits:Request    │   ✅   │   ❌   │   ❌   │   ❌   │ Book visit      │
│ Visits:Approve    │   ❌   │   ❌   │ Assign │   ✅   │ Approve visit   │
│ Visits:Complete   │   ❌   │   ❌   │ Assign │   ✅   │ Complete visit  │
├───────────────────┼────────┼────────┼────────┼────────┼─────────────────┤
│ Offers:Create     │   ✅   │   ❌   │   ❌   │   ❌   │ Make offer      │
│ Offers:Accept     │   ❌   │ Owner  │   ❌   │   ✅   │ Accept offer    │
├───────────────────┼────────┼────────┼────────┼────────┼─────────────────┤
│ Agents:Approve    │   ❌   │   ❌   │   ❌   │   ✅   │ Approve agent   │
│ Users:Suspend     │   ❌   │   ❌   │   ❌   │   ✅   │ Suspend user    │
│ Audit:View        │   ❌   │   ❌   │   ❌   │   ✅   │ View audit logs │
└───────────────────┴────────┴────────┴────────┴────────┴─────────────────┘
```

---

## 7. DATA FLOW

### 7.1 Property Transaction Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 COMPLETE TRANSACTION DATA FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

SELLER              AGENT               BUYER               SYSTEM
  │                   │                   │                   │
  │ 1. Create DRAFT   │                   │                   │
  │──────────────────────────────────────────────────────────►│
  │                   │                   │                   │
  │ 2. Hire Agent     │                   │                   │
  │──────────────────►│                   │                   │
  │                   │                   │                   │
  │                   │ 3. Accept         │                   │
  │◄──────────────────│                   │                   │
  │                   │                   │                   │
  │                   │ 4. Verify (GPS)   │                   │
  │                   │──────────────────────────────────────►│
  │                   │                   │                   │
  │                   │                   │   5. ACTIVE       │
  │◄──────────────────────────────────────────────────────────│
  │                   │                   │                   │
  │                   │                   │ 6. Request Visit  │
  │                   │◄──────────────────│                   │
  │                   │                   │                   │
  │                   │ 7. Approve Visit  │                   │
  │                   │──────────────────►│                   │
  │                   │                   │                   │
  │                   │ 8. Complete Visit │                   │
  │                   │──────────────────────────────────────►│
  │                   │                   │                   │
  │                   │                   │ 9. Make Offer     │
  │◄──────────────────────────────────────│                   │
  │                   │                   │                   │
  │ 10. Accept Offer  │                   │                   │
  │──────────────────────────────────────►│                   │
  │                   │                   │                   │
  │                   │                   │ 11. Pay 0.1%      │
  │                   │                   │──────────────────►│
  │                   │                   │                   │
  │                   │                   │   12. RESERVED    │
  │◄──────────────────────────────────────────────────────────│
  │                   │                   │                   │
  │                   │ 13. Schedule Reg  │                   │
  │                   │──────────────────────────────────────►│
  │                   │                   │                   │
  │                   │ 14. GPS + OTPs    │                   │
  │                   │──────────────────────────────────────►│
  │                   │                   │                   │
  │ 15. Pay 0.9%      │                   │                   │
  │──────────────────────────────────────────────────────────►│
  │                   │                   │                   │
  │                   │                   │   16. SOLD        │
  │◄──────────────────────────────────────────────────────────│
  │                   │                   │                   │
```

---

## 8. STATE MACHINES

### 8.1 Property States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROPERTY STATE MACHINE                               │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │  START   │
                              └────┬─────┘
                                   │ Seller Creates
                                   ▼
                              ┌──────────┐
                              │  DRAFT   │◄─────────────────────┐
                              └────┬─────┘                      │
                                   │ Agent Assigned             │ Verification
                                   ▼                            │ Failed
                         ┌──────────────────┐                   │
                         │  PENDING_VERIFY  │───────────────────┘
                         └────────┬─────────┘
                                  │ Agent Verifies
                                  ▼
                              ┌──────────┐
              ┌──────────────►│  ACTIVE  │◄─────────────────────┐
              │               └────┬─────┘                      │
              │                    │ Buyer Reserves             │
    Reservation                    ▼                    Reservation
    Expired/               ┌────────────────┐            Expired/
    Cancelled              │    RESERVED    │            Cancelled
              │            └────────┬───────┘                   │
              │                     │ Registration              │
              │                     ▼ Complete                  │
              │               ┌──────────┐                      │
              └───────────────│   SOLD   │──────────────────────┘
                              └──────────┘
                                   │
                                   ▼
                              ┌──────────┐
                              │   END    │
                              └──────────┘
```

### 8.2 Agent States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AGENT STATE MACHINE                                │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │  START   │
                              └────┬─────┘
                                   │ Apply
                                   ▼
                         ┌────────────────────┐
                         │ PENDING_VERIFICATION│
                         └─────────┬──────────┘
                                   │ OTP Verified
                                   ▼
                         ┌────────────────────┐  Admin Declines
                    ┌───►│   UNDER_REVIEW     │─────────────────┐
                    │    └─────────┬──────────┘                 │
                    │              │ Admin Approves             ▼
               Reapply             ▼                    ┌────────────┐
                    │       ┌────────────┐              │  DECLINED  │
                    │       │   ACTIVE   │◄───────┐     └─────┬──────┘
                    │       └─────┬──────┘        │           │
                    │             │               │           │
                    │        Violation        Reinstated      │
                    │             │               │           │
                    │             ▼               │           │
                    │       ┌────────────┐        │           │
                    └───────│  SUSPENDED │────────┘           │
                            └────────────┘                    │
                                                              │
                            ◄─────────────────────────────────┘
```

---

## 9. TECHNOLOGY STACK

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       TECHNOLOGY STACK                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FRONTEND                                                               │
│  ├── Web App:        Next.js 14 (React, TypeScript)                     │
│  ├── Mobile App:     React Native / Expo                                │
│  ├── Admin Panel:    Next.js 14 (React, TypeScript)                     │
│  └── Styling:        Tailwind CSS                                       │
│                                                                         │
│  BACKEND                                                                │
│  ├── Framework:      FastAPI (Python 3.11+)                             │
│  ├── ORM:            SQLAlchemy 2.0                                     │
│  ├── Validation:     Pydantic v2                                        │
│  ├── Auth:           JWT (python-jose)                                  │
│  └── Testing:        Pytest                                             │
│                                                                         │
│  DATABASE                                                               │
│  ├── Primary:        PostgreSQL 15                                      │
│  ├── Migrations:     Alembic                                            │
│  └── Caching:        Redis (optional, for sessions)                     │
│                                                                         │
│  INFRASTRUCTURE                                                         │
│  ├── Hosting:        AWS / DigitalOcean / Railway                       │
│  ├── Storage:        S3 / Cloudinary (for media)                        │
│  ├── Email:          SendGrid / AWS SES                                 │
│  └── Maps:           OpenStreetMap / Mapbox                             │
│                                                                         │
│  DEVOPS                                                                 │
│  ├── CI/CD:          GitHub Actions                                     │
│  ├── Containerization: Docker                                           │
│  └── Monitoring:     Sentry (error tracking)                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │     USERS       │
                           │  (Web/Mobile)   │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │   CLOUDFLARE    │
                           │  (CDN + WAF)    │
                           └────────┬────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
           ┌────────▼────────┐             ┌────────▼────────┐
           │    FRONTEND     │             │    BACKEND      │
           │    (Vercel)     │             │   (Railway/     │
           │                 │             │   DigitalOcean) │
           │  ┌───────────┐  │             │  ┌───────────┐  │
           │  │  Next.js  │  │             │  │  FastAPI  │  │
           │  │  Web App  │  │             │  │  Server   │  │
           │  └───────────┘  │             │  └─────┬─────┘  │
           │                 │             │        │        │
           │  ┌───────────┐  │             │        │        │
           │  │   Admin   │  │             │        │        │
           │  │   Panel   │  │             │        │        │
           │  └───────────┘  │             │        │        │
           └─────────────────┘             └────────┼────────┘
                                                    │
                    ┌───────────────────────────────┴───────────────────┐
                    │                                                   │
           ┌────────▼────────┐                                 ┌────────▼────────┐
           │   POSTGRESQL    │                                 │   FILE STORAGE   │
           │   (Managed)     │                                 │   (S3/Cloudinary)│
           │                 │                                 │                  │
           │  ┌───────────┐  │                                 │  ┌───────────┐   │
           │  │  Primary  │  │                                 │  │  Images   │   │
           │  │    DB     │  │                                 │  │  Videos   │   │
           │  └───────────┘  │                                 │  │  Docs     │   │
           └─────────────────┘                                 └──────────────────┘
```

---

## APPENDIX: ENUMS & CONSTANTS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ENUMS                                    │
└─────────────────────────────────────────────────────────────────────────┘

  UserStatus        = PENDING_VERIFICATION | ACTIVE | SUSPENDED
  UserRole          = BUYER | SELLER | AGENT | ADMIN
  
  PropertyType      = LAND | HOUSE | FLAT | COMMERCIAL
  PropertyStatus    = DRAFT | PENDING_VERIFY | ACTIVE | RESERVED | SOLD
  
  AgentStatus       = UNDER_REVIEW | APPROVED | DECLINED | ACTIVE | SUSPENDED
  AgentKycStatus    = PENDING | VERIFIED | REJECTED
  
  VisitStatus       = REQUESTED | APPROVED | REJECTED | COMPLETED | NO_SHOW
  OfferStatus       = PENDING | ACCEPTED | REJECTED | COUNTERED | EXPIRED
  ReservationStatus = ACTIVE | EXPIRED | CANCELLED | COMPLETED
  TransactionStatus = INITIATED | VERIFIED | COMPLETED | FAILED
  
  DisputeStatus     = OPEN | UNDER_REVIEW | RESOLVED | CLOSED
  DisputeDecision   = FAVOR_BUYER | FAVOR_SELLER | FAVOR_AGENT | NO_ACTION

┌─────────────────────────────────────────────────────────────────────────┐
│                         CONSTANTS                                       │
└─────────────────────────────────────────────────────────────────────────┘

  MAX_AGENT_RADIUS_KM     = 100
  OTP_EXPIRY_MINUTES      = 10
  OTP_MAX_ATTEMPTS        = 5
  JWT_ACCESS_EXPIRY_HOURS = 24
  JWT_REFRESH_EXPIRY_DAYS = 30
  RESERVATION_DAYS        = 30
  OFFER_EXPIRY_HOURS      = 48
  BUYER_COMMISSION_PCT    = 0.1
  SELLER_COMMISSION_PCT   = 0.9
  AGENT_SHARE_PCT         = 80
  PLATFORM_SHARE_PCT      = 20
```

---

> **Document Version:** 1.0  
> **Classification:** Technical - Internal  
> **Next Review:** March 2025
