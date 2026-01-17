# NestFind Database Schema

Complete database schema with entity relationships and Mermaid ER diagrams.

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ PROPERTIES : "lists as seller"
    USERS ||--o| AGENT_PROFILES : "may have"
    USERS ||--o{ VISIT_REQUESTS : "requests as buyer"
    USERS ||--o{ OFFERS : "makes as buyer"
    USERS ||--o{ RESERVATIONS : "creates as buyer"
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ EMAIL_OTP_VERIFICATIONS : "verifies"
    
    AGENT_PROFILES ||--o{ AGENT_ASSIGNMENTS : "receives"
    AGENT_PROFILES ||--o{ VISIT_REQUESTS : "manages"
    
    PROPERTIES ||--o{ PROPERTY_MEDIA : "has"
    PROPERTIES ||--o{ AGENT_ASSIGNMENTS : "assigned to"
    PROPERTIES ||--o{ PROPERTY_VERIFICATIONS : "verified by"
    PROPERTIES ||--o{ VISIT_REQUESTS : "visited"
    PROPERTIES ||--o{ OFFERS : "receives"
    PROPERTIES ||--o| RESERVATIONS : "may have"
    PROPERTIES ||--o| TRANSACTIONS : "may have"
    
    OFFERS }o--|| PROPERTIES : "for"
    OFFERS }o--|| USERS : "from buyer"
    
    RESERVATIONS }o--|| PROPERTIES : "for"
    RESERVATIONS }o--|| USERS : "by buyer"
    
    TRANSACTIONS }o--|| PROPERTIES : "for"
    TRANSACTIONS }o--|| USERS : "buyer"
    TRANSACTIONS }o--|| USERS : "seller"
    TRANSACTIONS }o--|| AGENT_PROFILES : "agent"

    USERS {
        uuid id PK
        string full_name
        string email UK
        string mobile_number
        string password_hash
        boolean email_verified
        enum status
        enum role
        int login_attempts
        timestamp login_locked_until
        timestamp email_verified_at
        timestamp created_at
    }
    
    AGENT_PROFILES {
        uuid user_id PK,FK
        float base_lat
        float base_lng
        int service_radius_km
        enum kyc_status
        float rating
        int total_cases
        boolean is_active
    }
    
    PROPERTIES {
        uuid id PK
        uuid seller_id FK
        string title
        text description
        enum type
        decimal price
        float lat
        float lng
        enum status
        timestamp created_at
    }
    
    PROPERTY_MEDIA {
        uuid id PK
        uuid property_id FK
        enum media_type
        string file_url
        timestamp uploaded_at
    }
    
    AGENT_ASSIGNMENTS {
        uuid id PK
        uuid agent_id FK
        uuid property_id FK
        enum status
        timestamp assigned_at
    }
    
    VISIT_REQUESTS {
        uuid id PK
        uuid property_id FK
        uuid buyer_id FK
        uuid agent_id FK
        timestamp visit_date
        enum status
    }
    
    OFFERS {
        uuid id PK
        uuid property_id FK
        uuid buyer_id FK
        decimal offered_price
        enum status
        timestamp expires_at
    }
    
    RESERVATIONS {
        uuid id PK
        uuid property_id FK
        uuid buyer_id FK
        decimal amount
        timestamp start_date
        timestamp end_date
        enum status
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid property_id FK
        uuid buyer_id FK
        uuid seller_id FK
        uuid agent_id FK
        decimal total_price
        decimal platform_fee
        decimal agent_commission
        enum status
    }
    
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        enum role
        string action
        string entity_type
        uuid entity_id
        timestamp timestamp
        string ip_address
        jsonb details
    }
    
    SESSIONS {
        uuid session_id PK
        uuid user_id FK
        string refresh_token_hash
        timestamp expires_at
        timestamp revoked_at
        string device_fingerprint
        string last_ip
        uuid token_family_id
        string parent_token_hash
        timestamp created_at
    }
    
    EMAIL_OTP_VERIFICATIONS {
        uuid id PK
        uuid user_id FK
        string otp_hash
        timestamp expires_at
        int attempts
        timestamp consumed_at
        string consumed_by_ip
        timestamp created_at
    }

    PROPERTY_VERIFICATIONS {
        uuid id PK
        uuid property_id FK
        uuid agent_id FK
        timestamp started_at
        timestamp completed_at
        enum result
        float agent_gps_lat
        float agent_gps_lng
        string otp_code
        timestamp otp_expires_at
        boolean seller_otp_verified
        timestamp seller_otp_verified_at
        jsonb checklist
    }
```

---

## Table Descriptions

### Identity & Access

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `users` | All platform users | `id` (UUID) |
| `email_otp_verifications` | OTP tracking | `id` |
| `sessions` | JWT session tracking | `session_id` (UUID) |
| `agent_profiles` | Agent-specific data | `user_id` (FK) |

### Property System

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `properties` | Property listings | `id` (UUID) |
| `property_media` | Images/videos | `id` |
| `property_verifications` | Verification records | `id` |

### Interaction System

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `agent_assignments` | Agent-property links | `id` |
| `visit_requests` | Visit scheduling | `id` |
| `visit_verifications` | Visit proof | `visit_id` |
| `offers` | Buyer offers | `id` |
| `reservations` | Property locks | `id` |

### Transaction System

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `transactions` | Completed deals | `id` |
| `payment_logs` | Payment tracking | `id` |

### Audit & Admin

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `audit_logs` | Immutable action log | `id` |
| `admin_actions` | Admin decisions | `id` |
| `disputes` | Dispute records | `id` |

---

## Status Enums

### User Status

```mermaid
stateDiagram-v2
    [*] --> PENDING_VERIFICATION
    PENDING_VERIFICATION --> ACTIVE
    PENDING_VERIFICATION --> IN_REVIEW
    IN_REVIEW --> ACTIVE
    IN_REVIEW --> DECLINED
    ACTIVE --> SUSPENDED
    SUSPENDED --> ACTIVE
```

### Property Status

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_ASSIGNMENT: Hire Agent
    PENDING_ASSIGNMENT --> ASSIGNED: Agent Accepts
    PENDING_ASSIGNMENT --> DRAFT: Agent Declines
    ASSIGNED --> VERIFICATION_IN_PROGRESS: Start Verification
    VERIFICATION_IN_PROGRESS --> ACTIVE: Agent Approves
    VERIFICATION_IN_PROGRESS --> DRAFT: Agent Rejects
    ACTIVE --> RESERVED: Buyer Reserves
    ACTIVE --> INACTIVE: Seller Deactivates
    RESERVED --> ACTIVE: Reservation Expires
    RESERVED --> SOLD: Transaction Complete
    INACTIVE --> ACTIVE: Seller Reactivates
    SOLD --> [*]
```

### Offer Status

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> ACCEPTED
    PENDING --> REJECTED
    PENDING --> COUNTERED
    PENDING --> EXPIRED
    COUNTERED --> ACCEPTED
    COUNTERED --> REJECTED
    COUNTERED --> COUNTERED
```

---

## Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| `users` | `email` (unique) | Login lookup |
| `properties` | `seller_id` | Owner queries |
| `properties` | `status` | Listing filters |
| `properties` | `lat, lng` | Geo queries |
| `agent_profiles` | `base_lat, base_lng` | Geo queries |
| `offers` | `property_id, status` | Offer queries |
| `audit_logs` | `entity_type, entity_id` | History lookup |
