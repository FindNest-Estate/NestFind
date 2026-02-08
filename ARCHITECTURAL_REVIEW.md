# Backend Architectural Review: NestFind

This review covers the backend architecture of the NestFind platform, focusing on Database Design, API Structure, Authentication Security, Validation, and Scalability for 10,000 users.

## 1. Database Design

### Summary
The database uses PostgreSQL with a clear separation of concerns via tables for `users`, `properties`, `audit_logs`, etc. The schema seems well-structured for relational data. However, the heavy reliance on raw SQL in services poses maintainability risks.

### Risks
-   **Direct SQL Queries:** Business logic is tightly coupled with SQL strings in services (e.g., `backend/app/services/property_service.py`). This makes refactoring the database schema difficult and error-prone.
-   **No ORM:** While raw SQL is performant, lack of an ORM (like SQLAlchemy or Tortoise) increases the risk of subtle SQL errors and makes the codebase harder for new developers to onboard.
-   **Hardcoded Enums:** Python Enums in `schemas/` and SQL Enums in DB are manually synchronized. A mismatch can cause runtime errors.

### Production Issues
-   **Schema Migrations:** Managing complex migrations without a migration tool (like Alembic) can lead to drift between environments if `backend/migrations/*.sql` files are not applied strictly in order.
-   **Data Integrity:** Lack of strict foreign key constraints in some JSON fields (e.g., `details` in `audit_logs`) might lead to inconsistent data over time.

### Improvements
-   **Adopt an ORM/Query Builder:** Consider using SQLAlchemy or Tortoise ORM for standard CRUD operations to reduce boilerplate and improve type safety. Keep raw SQL for complex analytical queries.
-   **Migration Management:** Use Alembic for database migrations to ensure consistency and easier rollbacks.
-   **Index Optimization:** Add partial indexes for frequently queried states (e.g., `WHERE status = 'ACTIVE'`) to speed up public browsing.

## 2. API Structure

### Summary
The API is built with FastAPI, utilizing routers for modularity. However, there is inconsistency in how request/response models are defined.

### Risks
-   **Inconsistent Schemas:** Pydantic models are scattered between `backend/app/schemas/` and `backend/app/routers/`. This leads to code duplication and potential validation gaps.
-   **Implicit Dependencies:** Some routers (e.g., `public_properties.py`) unpack dictionary results from services directly into Pydantic models. If the service return structure changes, the API will break at runtime.

### Production Issues
-   **Runtime Errors:** The dynamic unpacking of dictionaries (`**result["properties"]`) is fragile. A typo in a dictionary key in the service layer will cause a 500 Internal Server Error in the API.
-   **Lack of Versioning:** API endpoints are not versioned (e.g., `/api/v1/properties`). Breaking changes will impact all mobile/web clients immediately.

### Improvements
-   **Centralize Schemas:** Move all Pydantic models to `backend/app/schemas/` and enforce their use in Service return types, not just Router responses.
-   **API Versioning:** Prefix all routes with `/api/v1` to allow for future breaking changes without disrupting existing clients.
-   **Service Layer Typing:** Use Pydantic models or dataclasses for Service method return values instead of raw dictionaries to ensure type safety.

## 3. Authentication Security

### Summary
The system uses JWT for authentication with a dual-token system (Access + Refresh) and database-backed session validation.

### Risks
-   **CRITICAL: Hardcoded Secret Key:** `backend/app/core/jwt.py` contains `SECRET_KEY = "your-secret-key-change-in-production"`. This MUST be changed to load from environment variables immediately.
-   **Long-Lived Access Tokens:** Access tokens are valid for 30 days (for Users/Agents). If a token is stolen, the attacker has a long window of access.
-   **Synchronous DB Checks:** The middleware checks the database for session validity on *every request*. While secure, this adds significant latency.

### Production Issues
-   **Performance Bottleneck:** The `get_current_user` middleware performs a database query on every request. For 10,000 users, this could overwhelm the database connection pool.
-   **Token Invalidation:** With 30-day access tokens, effective revocation relies entirely on the database check, negating the stateless benefit of JWTs.

### Improvements
-   **Environment Variables:** Load `SECRET_KEY` and token durations from `.env`.
-   **Short-Lived Access Tokens:** Reduce access token lifespan to 15-60 minutes. Rely on refresh tokens (valid for days/weeks) to obtain new access tokens.
-   **Caching:** Implement Redis to cache session validity and user status for a short duration (e.g., 5 minutes) to reduce database load in the auth middleware.

## 4. Validation

### Summary
Validation is performed at the API level via Pydantic and partially in the Service layer.

### Risks
-   **Loose Service Validation:** The service layer often accepts raw values and relies on the caller (Router) to validate them. Direct calls to services (e.g., from background jobs) might bypass validation.
-   **Completeness Logic:** The "Completeness" check for properties (`READY_FOR_AGENT`) is complex and duplicated across frontend (implied) and backend.

### Production Issues
-   **Data inconsistencies:** Without strict validation in the Service layer, bad data can enter the system if a new entry point (like an admin script or import tool) is added.

### Improvements
-   **Service-Level Validation:** Enforce validation logic within the Service methods using Pydantic models as arguments.
-   **Rich Domain Models:** Encapsulate business rules (like "Property must have a type to be ACTIVE") in domain entities, not just ad-hoc checks.

## 5. Scalability (10,000 Users)

### Summary
The architecture uses `asyncpg` which is highly performant. However, certain patterns will limit scalability.

### Risks
-   **Pagination:** The `OFFSET` / `LIMIT` pagination in `get_public_properties` becomes slow as the dataset grows (the "deep pagination" problem).
-   **Search Performance:** Using `LIKE %...%` for search is not scalable. It forces a full table scan for every search query.

### Production Issues
-   **Database Load:** The combination of auth checks per request and inefficient search queries will likely cause database CPU spikes under load.
-   **Connection Pool Exhaustion:** With 10,000 users, if the connection pool is not properly sized or if queries are slow (due to lack of indexes), requests will timeout.

### Improvements
-   **Cursor Pagination:** Switch to cursor-based (keyset) pagination for infinite scroll features.
-   **Full-Text Search:** Use PostgreSQL's built-in Full-Text Search (tsvector/tsquery) or a dedicated search engine (Elasticsearch/Meilisearch) instead of `LIKE`.
-   **Read Replicas:** Configure the application to send read-only queries (like public browsing) to a database read replica.
-   **Caching:** aggressive caching of public property listings (e.g., CDN or Redis) as they don't change often.
