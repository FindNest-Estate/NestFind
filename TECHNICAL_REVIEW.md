# NestFind Technical Review

## 1️⃣ SYSTEM UNDERSTANDING

**What this product is solving:**
NestFind is a full-lifecycle real estate platform designed to streamline the chaotic process of buying/renting property. Unlike simple listing sites, it manages the entire transaction workflow—from discovery and visit scheduling (with safety checks) to digital offers, token payments, and deal closure.

**Users:**
- **Buyers**: Search properties, schedule visits, make offers, pay tokens.
- **Sellers (Owners)**: List properties, manage visit requests, receive offers.
- **Agents**: "Uber-style" service providers who can be hired for buying/selling assistance, manage listings, and facilitate visits.
- **Admins**: Oversight, document verification, dispute resolution, financial payouts.

**Core User Flows:**
1.  **Discovery**: User searches for properties or agents (Near Me / Filtered).
2.  **Visit**: Buyer requests time -> Agent/Owner approves (or counters) -> **OTP generation** -> Physical Visit (Location Check) -> Completion -> Review.
3.  **Deal**: Buyer makes Offer -> Seller accepts -> Token Payment (stripe/mock) -> Document Upload -> Commission Payout.

**Source of Truth:**
-   **Data**: The SQLite database (`nestfind.db`) is the single source of truth.
-   **State**: Complex state transitions (e.g., Visit Status: PENDING -> APPROVED -> IN_PROGRESS -> COMPLETED) are enforced in the Application Layer (FastAPI Routers), specifically `bookings.py` and `offers.py`.

---

## 2️⃣ ARCHITECTURE REVIEW

**Evaluation:**
-   **Frontend ↔ Backend**: Clean separation. Frontend (Next.js) acts as a consumer of the FastAPI backend. Logic is reasonably well encapsulated in the backend, with the frontend focused on presentation and API integration (`api.ts`).
-   **API Design**: RESTful design is generally consistent (`/bookings`, `/offers`), but some resource nesting is implied rather than explicit. The "God Object" tendency is visible in Routers (e.g., `bookings.py` handles scheduling, reviews, OTPs, and images).
-   **Database**: **SQLite** is used. While fine for a dev/hobby project, it is **unsuitable for a production multi-user platform** due to write locking and lack of connection pooling scalability.
-   **Coupling**: High coupling between `BackgroundTasks` and API logic. Email sending is triggered directly within route handlers, meaning if the server crashes immediately after a DB commit, emails might be lost (no persistent message queue).

**Issues:**
-   **Under-engineering**: Testing is non-existent (`backend/tests` is empty).
-   **Hidden Tech Debt**: `BackgroundTasks` in FastAPI runs in-process. If the app restarts/crashes, pending tasks (emails, notifications) are lost forever.

---

## 3️⃣ BUSINESS LOGIC & PRODUCT LOGIC

**Analysis:**
-   **Workflow**: The **Visit Logic** (`bookings.py`) is surprisingly robust. It handles optimistic locking (`version` field), counter-proposals, and even geolocation verification (`haversine` formula) to ensure the agent is actually at the property.
-   **Financials**: Commission logic (20% platform / 80% agent) is hardcoded in specific flows. This should be configuration-driven.
-   **Role Separation**: Enforced via `auth.get_current_user` and explicit checks (e.g., `if booking.agent_id != current_user.id: raise 403`).
-   **Exploits**:
    -   **Bypassing**: A malicious user could potentially "complete" a visit without actually being there if they spoof the GPS coordinates sent to the `complete_visit` endpoint (client-side trust).
    -   **Commission**: The payout logic trusts the `total_commission_received` passed during payout generation without robust reconciliation against a payment gateway webhook.

---

## 4️⃣ FAILURE MODES & EDGE CASES

**Top 5 Dangerous Scenarios:**
1.  **SQLite Lock Timeout**: At 10x traffic (or even 5 concurrent writes), SQLite will throw "database is locked" errors, failing bookings and payments randomly.
2.  **Lost Notifications**: Server restart during deployment wipes out all queued email/SMS notifications (In-memory `BackgroundTasks`).
3.  **Race Conditions**: Two buyers booking the same slot simultaneously. While conflict checking exists, the lack of database-level locking (SELECT FOR UPDATE) on the *Agent's Schedule* means two requests could pass the check in parallel before writing.
4.  **Storage Failure**: Uploads go to local disk (`backend/uploads`). If the container/server is recreated (standard cloud deployment), **all user images and documents are deleted**.
5.  **Token Expiry Mid-Flow**: Access tokens last 24 hours (hardcoded). If a user is filling a long form or in a negotiation flow when it expires, they lose state/work with no refresh mechanism.

---

## 5️⃣ SECURITY & DATA SAFETY

**Review:**
-   **Secrets**: **CRITICAL RISK**. `SECRET_KEY = "supersecretkey"` is hardcoded in `auth.py`. If this code is public (which it is on GitHub), anyone can forge JWTs and become Admin.
-   **Auth**: Good use of `bcrypt` for passwords. However, lacking Refresh Tokens means users are forced to re-login abruptly.
-   **Data Exposure**: The `User` model includes sensitive fields (Phone, Email, Revenue). The `UserOut` schema must be carefully checked to ensure it doesn't leak PII to other users (e.g., fetching "Nearby Agents" shouldn't reveal their private revenue data).
-   **Client Trust**: The system trusts the Client to send GPS coordinates for verification. This is unavoidable but easily spoofed.

---

## 6️⃣ SCALABILITY & COST REALITY

**Verdict:**
-   **1k Users**: **Survives**. SQLite handles reads fine. Writes might occasionally slow down.
-   **10k Users**: **Fails**. SQLite write locks become a daily incident. Local file storage fills up server disk space.
-   **100k Users**: **Impossible**. Architecture requires complete rewrite (Postgres, S3, Redis/Celery for tasks).

**Bottlenecks:**
1.  **Database**: Write throughput of SQLite.
2.  **Storage**: Local filesystem IO and capacity.
3.  **Search**: `LIKE %query%` searches will bring the DB to a crawl as data grows.

---

## 7️⃣ MAINTAINABILITY & TEAM SCALE

**Assess:**
-   **Tests**: **0/10**. The `tests` folder is empty. Any change by a new junior dev has a high probability of breaking existing complex flows (like the Visit Status machine) without detection.
-   **Code Quality**: Python code is readable and type-hinted. Structure is logical.
-   **Bug Risk**: High in "Business Logic" scattered across large router functions (e.g., `update_booking_status` is a monolith of if/else statements).

---

## 8️⃣ WHAT SENIOR ENGINEERS WOULD CHANGE FIRST

**Top 5 Changes (Impact vs Effort):**
1.  **[CRITICAL] Move Secrets to Environment**: Remove `"supersecretkey"` immediately.
2.  **[HIGH] Switch to PostgreSQL**: SQLite is a ticking time bomb for a transactional system.
3.  **[HIGH] Cloud Storage**: Move uploads to S3 (AWS/MinIO). Local uploads die in production.
4.  **[MEDIUM] Testing**: Write integration tests for the `Booking` workflow. It's too complex to leave untested.
5.  **[MEDIUM] Structured Logging**: Replace `print()` with a proper logger to debug production issues.

**What to DEFER:**
-   Microservices (Monolith is fine).
-   Complex Search (Elasticsearch) - SQL is fine for now if indexed.

**What to NEVER build:**
-   Custom Chat Solution (Use an integration or simple polling for now, don't build a WebSocket server from scratch unless necessary).

---

## 9️⃣ VERDICT

**Production Readiness**: **3/10**
**Launch Classification**: **Hobby / MVP**
**Single Biggest Blocker**: **Hardcoded Security Credentials & SQLite Database**
**If launched today**: "The server will crash on the first day of high traffic due to DB locking, and you will get hacked because the Secret Key is on GitHub."

**Next 3 Actions:**
1.  **Security Patch**: Externalize `SECRET_KEY` and DB connection strings.
2.  **Infra Upgrade**: Dockerize with PostgreSQL and S3-compatible storage.
3.  **Quality Assurance**: Write at least 5 "Happy Path" integration tests for Visits and Offers.
