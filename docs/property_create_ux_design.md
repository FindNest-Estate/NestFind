# 🧠 `/sell/create` — UX Design Specification

**Role:** Principal Product Designer + Backend-First Systems Architect
**Phase:** Design & Logic (Strict)
**Principle:** *Draft-first, database-truth, zero optimistic UI*

---

## 1. Core Philosophy (Non-Negotiable)

1.  **/sell/create NEVER creates a property in memory.**
2.  **Property row MUST exist in DB before UI renders editable form.**
    *   Entry to page triggers `POST /properties` -> creates `DRAFT`.
3.  **All progress is persisted immediately.**
4.  **UI shows ONLY what DB confirms exists.**
5.  **No "unsaved changes" fiction.**

---

## 2. Purpose & Responsibility

**What it IS:** A **DRAFT PROPERTY EDITOR**.
**What it is NOT:** A generic form wizard.

**Responsibilities:**
*   Creates exactly one property row (`status = DRAFT`).
*   Allows incremental enrichment (Details, Location, Media).
*   Requests Agent Assignment (`PENDING_ASSIGNMENT`).

**Explicitly Out of Scope:**
*   Verification logic.
*   Publishing logic.
*   Admin/Agent assignment logic.

---

## 3. Entry Flow & Routing

**Route:** `/sell/create`

1.  **Auth Gate:** `Redirect if !authenticated`.
2.  **Role Gate:** `Redirect if user.role != SELLER`.
3.  **Creation Action (Server-Side):**
    *   On page load (or preceding action), trigger `POST /properties`.
    *   **Result:** A new Property ID is generated.
    *   **State:** The page *always* edits an existing ID.
    *   *Note: If user abandons, the draft remains in DB (cleanable by cron or user).*

---

## 4. Page Layout (No Sidebar)

**Structure:**
*   **Header:** Minimal. "Cancel/Exit" (leads back to dashboard).
*   **Progress:** "Completeness" indicator (Driven by backend `completeness_percentage`).
*   **Main Area:** Single-column, section-based editor.
*   **Footer:** Contextual Actions (Save, Delete Draft, Hire Agent).

**Navigation Scope:**
*   No Dashboard Sidebar.
*   No Global Nav.
*   Focus mode user interface.

---

## 5. Content Sections (DB Mapped)

Each section maps 1:1 to partial updates on the property entity.

### 5.1 Basic Details
*   **Fields:** `title`, `description`, `type`.
*   **Behavior:** Auto-save on blur. Optional in Draft.

### 5.2 Location (Trust Critical)
*   **Fields:** `latitude`, `longitude`, `address`, `city`.
*   **Behavior:** Google Maps / GPS integration.
*   **Privacy:** Visible only to Seller & Agent until published.

### 5.3 Property Details
*   **Fields:** `bedrooms`, `bathrooms`, `area_sqft`, `price`.
*   **Behavior:** Standard inputs. Price is locked once Agent Verification starts.

### 5.4 Media (Uploads)
*   **Entity:** `property_media` table.
*   **Flow:**
    1.  Request Upload URL.
    2.  Upload file.
    3.  Confirm -> DB row created.
*   **Rule:** Media is only shown if `property_media` row exists. No local previews masquerading as saved data.

---

## 6. Footer Actions & Logic

| Button | Condition | Action |
| :--- | :--- | :--- |
| **Delete Draft** | Always Visible | Soft delete property -> Redirect Dashboard |
| **Hire Agent** | `completeness >= threshold` | Transition status `DRAFT` -> `PENDING_ASSIGNMENT` |
| **Save & Exit** | Always Visible | Redirect Dashboard |

**"Hire Agent" Gate:**
*   Backend determines `can_hire_agent` boolean based on completeness.
*   Frontend simply respects this flag.

---

## 7. State Transitions

1.  **Entry:** `POST /properties` -> New Property (ID: `xyz`, Status: `DRAFT`).
2.  **Editing:** `PATCH /properties/xyz` -> Updates fields. Status remains `DRAFT`.
3.  **Completion:** User clicks "Hire Agent".
4.  **Transition:** `POST /properties/xyz/hire` -> Status becomes `PENDING_ASSIGNMENT`.
5.  **Exit:** Redirect to `/sell/dashboard`.

---

## 8. Audit & Integrity

*   Every field update creates an `audit_log` entry (`PROPERTY_UPDATED`).
*   "Hire Agent" triggers `AGENT_REQUESTED` audit event.

---

## 9. Explicit "Do Not Show"

*   ❌ "Publish Now" button.
*   ❌ "Verified" badges (it's a draft).
*   ❌ Agent selection (System assigns or separate flow).
*   ❌ Fake "Next Step" wizards.

---

## 10. Verdict

**Status:** READY FOR IMPLEMENTATION.
**Constraint:** Strict adherence to `DRAFT` status and DB-first rendering.
