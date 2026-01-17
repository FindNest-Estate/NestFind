# 🧠 Anti-Gravity UX Design — `/sell/dashboard` (Seller Dashboard)

**Model:** Gemini Pro (High)
**Role:** Principal Product Designer + Frontend Systems Architect
**Phase:** Detailed Design
**Date:** 2025-12-23

---

## 1. Executive Summary

The `/sell/dashboard` is the **System of Record** for the seller. Unlike the marketing-led `/sell` page, this route is strictly **functional, data-dense, and state-aware**.

It must handle three distinct user lifecycles seamlessly:
1.  **The New Seller (Day 0):** Authenticated but no assets. Needs guidance.
2.  **The Active Seller:** Has verified listings. Needs analytics and management tools.
3.  **The Blocked Seller:** Missing verification or banned. Needs resolution paths.

**Core Philosophy:** "The Dashboard tells the Truth." It never guesses user state; it renders the database reality.

---

## 2. Information Architecture & Layout

**Layout Strategy:**
*   **Navigation:** Header-based Tabs only (`[Listings]`, `[Settings]`). No Sidebar.
*   **Scope:** Strictly limited to valid, backend-backed modules.

**/sell/dashboard (Root -> Redirects to /sell/dashboard/listings)**
*   **Redirect:** The root `/sell/dashboard` should redirect to the Listings tab by default.

**/sell/dashboard/listings (Default Tab)**
*   **Top:** "Listing Overview" (Derived strictly from loaded properties).
    *   *Rules:* Show counts only if `properties.length > 0`. No "pending actions" or inferred tasks.
*   **Primary:** Data Table (Sortable: Status, Price, Date).
*   **Action:** "Create New Listing" (Navigates to `/sell/create`).

---

## 3. Key User States & UI Responses

### A. The "Day 0" (Empty State)
*   **Trigger:** `properties.length == 0` (Strict check).
*   **UI:**
    *   **Message:** "You have no listings yet."
    *   **Primary Action:** "Create Your First Listing" (Link to `/sell/create`).
    *   **Constraint:** No other dashboards or empty widgets shown.

### B. The "Active" Seller
*   **Trigger:** `properties.length > 0`.
*   **UI:**
    *   **List:** Render property rows.
    *   **Stats:** Only if returned specifically in the property object. No global aggregations unless provided by API.

### C. The "Onboarding/Blocked" Seller
*   **Trigger:** `user.verification_status != 'verified'`.
*   **UI:**
    *   **Global Alert:** Warning banner at top.
    *   **Restricted Actions:** Actions in the list are disabled or hidden based on `allowed_actions`.

---

## 4. Component System (Atomic Elements)

### 1. Status Badges (Strict Schema - 1:1 with DB Enum)
*   `DRAFT` (Gray): Editable draft.
*   `PENDING_ASSIGNMENT` (Amber): Waiting for agent.
*   `ASSIGNED` (Purple): Agent assigned.
*   `VERIFICATION_IN_PROGRESS` (Purple): Verification ongoing.
*   `ACTIVE` (Green): Public listing.
*   `RESERVED` (Amber): Reserved (Legacy: Under Offer).
*   `SOLD` (Gray): Transaction complete.

**Strict Prohibition:** No "Blue" badges. No "Under Offer" text (use Reserved).

### 2. The "Property Card" (for Lists)
*   **Compact Row Design:**
    *   [Img] | 123 Main St | $1.2M | [Badge] | [Stats] | [Meatball Menu]
*   **Must handle missing data:** Fallback images, "Price TBD" states.

### 3. Analytics Widgets
*   **Strict Rule:** Do NOT render aggregated stats unless explicitly returned by backend.
*   **Constraint:** Do NOT infer totals, counts, or pending actions.

---

## 5. Security & Data Integrity

*   **Role-Based Access Control (RBAC):**
    *   Middleware check on *every* dashboard route.
    *   If `user.role != 'seller'`, redirect to onboarding flow or display "Access Denied".
*   **Data Fetching:**
    *   All data fetched Server-Side (Next.js Server Components) or via authenticated SWR/TanStack Query hooks.
    *   No exposed API keys in client bundles.
*   **Idempotency:**
    *   Double-clicking "Publish" must not create duplicate listings.

---

## 6. Implementation Plan Checkpoints

1.  **Skeleton Loading:**
    *   Dashboard must feel instant. Use skeleton rows while fetching DB data.
2.  **Listing Creation Wizard:**
    *   Multi-step form (Address -> Details -> Photos -> Price).
    *   Auto-save to Draft (DB persistence on step completion).
3.  **"My Agent" Integration:**
    *   If an agent is assigned, show their specific contact card/chat widget right on the dashboard.

---

## 7. UX Verdict

**Status:** READY FOR PROTO-TYPING.

**Why this works:**
It respects the "Front of House" (Marketing) vs "Back of House" (Operations) mental model. The dashboard is a tool, not a brochure. It favors utility, density, and clarity over "marketing fluff".

**Next Action:** Begin implementation of scaffolding for `/sell` and `/sell/dashboard` routes.
