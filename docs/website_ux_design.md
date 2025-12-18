# NestFind - Master Website UI/UX Design Specifications

> **STATUS:** APPROVED FOR DESIGN
> **SCOPE:** 36 SCREENS (WEB)
> **THEME:** CHARCOAL & EMERALD (TRUST-FIRST)
> **PRINCIPLE:** STATE-BASED UI (No Assumptions)

---

# 1. CORE DESIGN SYSTEM

### 1.1 Color Palette (NO BLUE)
*   **Primary (Structure):** `Charcoal` (`#1F2933`) - Navbar, Headings, Footers.
*   **Action (Buttons/Links):** `Emerald Green` (`#1E8E5A`) - Primary CTAs, Active States.
*   **Background:** `Vapor White` (`#F8FAF9`) - Main bg. `White` (`#FFFFFF`) - Cards.
*   **Text:** `Dark Gray` (`#111827`) - Body. `Medium Gray` (`#6B7280`) - Meta text.

### 1.2 Status Indicators (The "Truth" of the UI)
*   🟢 **ACTIVE:** Verified, Live. (Emerald)
*   🟠 **RESERVED:** Deposit paid, Locked. (Amber)
*   ⚫ **SOLD:** Transaction closed. (Dark Gray)
*   🟣 **UNDER_REVIEW:** Pending checks. (Muted Purple)
*   🔴 **DECLINED:** Rejected. (Muted Red)

### 1.3 Interaction Model
*   **Explicit Actions:** No hidden menus. Buttons say what they do (e.g., "Request Visit" not just "Book").
*   **Feedback:** Toast notification for every action ("Visit Requested", "Offer Sent").

---

# 2. PUBLIC SCREENS (1-8)

### 1. Home Page
*   **Layout:**
    1.  **Sticky Navbar:** Logo (Charcoal), specific distinct links (Browse, How it works), "Login / Register" (Right).
    2.  **Hero Section (Center):** High-trust headline ("Verified Properties..."). Emerald Primary CTA ("Browse Verified Homes").
    3.  **Trust Statistics:** Bar showing "XX,XXX Verified Visits" (Social Proof).
    4.  **How It Works (Visual):** 4-Step horizontal flow (List -> Verify -> Visit -> Close).
    5.  **Featured Listings:** Grid of 3 Active properties (Cards).
    6.  **Trust Footer:** "Backed by [Regulator/Partners]", "Secure Transactions".

### 2. How It Works
*   **Layout:** Vertical scroll.
*   **Sections:**
    1.  **"For Buyers":** Step-by-step diagram (Search -> Visit -> Offer -> Own).
    2.  **"For Sellers":** Diagram (List -> Agent Check -> Live -> Sell).
    3.  **"The Trust Model":** Explains *why* we verify (Visual comparison: "Us vs Them").
    4.  **FAQ Accordion:** "Is my money safe?", "Who are the agents?".

### 3. Browse Properties (Read-Only)
*   **Layout:** Sidebar Filters + Main Grid.
*   **Sidebar:**
    *   Location (Input).
    *   Price Range (Slider).
    *   Property Type (Checkbox).
    *   *Verification Status* (Toggle: "Show only Verified").
*   **Main Grid:** Large Cards.
    *   **Trust Element:** Every card must show the **Green Check** "Verified by Agent".
    *   **Status Badge:** Top-left of every image (ACTIVE=Green, RESERVED=Amber).

### 4. Property Details (Public)
*   **Layout:** Two-column (Media/Info Left, Contact/Agent Right).
*   **Left Column:**
    *   **Media Gallery:** Hero image + grid. Watermarked "NestFind Verified".
    *   **Key Facts:** Price (Large Charcoal), Address, Stats (Bed/Bath).
    *   **Description:** Text block.
    *   **Map:** Blurred/Circle radius (Privacy until visit).
*   **Right Column (Sticky):**
    *   **Agent Card:** Photo, Name, "Verified Partner" badge.
    *   **Status Widget:** "Status: ACTIVE".
    *   **CTA:** "Login to Book Visit" (Emerald, Full Width).
    *   **Trust Note:** "Free visit. No obligation."

### 5. Login
*   **Layout:** Centered Card on `Vapor White` bg.
*   **Content:**
    *   title: "Welcome Back"
    *   Input: Email, Password.
    *   Button: "Secure Login" (Emerald).
    *   Links: "Forgot Password", "Create Account".
    *   *Agent Portal Link:* "Agent Login Here" (Small, bottom).

### 6. Register (Buyer / Seller)
*   **Layout:** Split Screen (Value Prop Left, Form Right).
*   **Form:**
    1.  Toggle: "I want to Buy" / "I want to Sell".
    2.  Inputs: Name, Email, Phone, Password.
    3.  Checkbox: "I agree to Identity Verification terms".
    4.  Button: "Create Account".

### 7. Register as Agent
*   **Layout:** Long-form Landing Page.
*   **Hero:** "Grow your business with verified leads."
*   **Requirements:** Checklist (License, ID, Experience).
*   **Form:** Multi-step.
    1.  Personal Details.
    2.  License Upload (File Picker).
    3.  Service Area (Zip codes / City).
    4.  Button: "Submit Application".

### 8. Email OTP Verification Screen
*   **Layout:** Minimalist Center Card.
*   **Content:**
    *   Icon: Envelop (Charcoal).
    *   Text: "We sent a code to [email]".
    *   Input: 6 huge digit boxes.
    *   Timer: "Resend in 30s".
    *   Button: "Verify Identity" (Emerald).

---

# 3. BUYER DASHBOARD (9-15)

### 9. Buyer Dashboard (Home)
*   **Layout:** Dashboard Shell (Left Sidebar, Top Header).
*   **Widgets:**
    *   **My Status:** "Identity: Verified" (Green Shield).
    *   **Recent Activity:** "Your visit to [Address] is tomorrow."
    *   **Saved Homes Preview:** Horizontal scroll of 3 cards.

### 10. Saved Properties
*   **Layout:** Grid View.
*   **Cards:** Similar to Browse, but with "Remove" icon and "Add Note" button.
*   **Status Updates:** If a saved home becomes SOLD, card dims and badge updates to Black.

### 11. Visit Booking Screen
*   **Layout:** Calendar Modal / Page.
*   **Header:** Property Address + Agent Name.
*   **Calendar:**
    *   Daily slots shown (e.g., "10:00 AM", "2:00 PM").
    *   Unavailable slots grayed out.
*   **Action:** Select Slot -> "Request Visit".
*   **Trust:** "Your request is sent directly to the verified agent."

### 12. My Visits (Tabbed)
*   **Tabs:**
    1.  **Requested:** List of pending approvals. Status: `WAITING_AGENT`.
    2.  **Upcoming (Approved):** Cards with "Get Directions" and "Cancel" button. Status: `APPROVED`.
    3.  **Completed:** Past visits. Action: "Make Offer" or "Rate Property".
*   **Details:** Date, Time, Agent Name, Phone (revealed only if Approved).

### 13. My Offers
*   **Layout:** List of Offer Cards.
*   **Content:**
    *   Address.
    *   **Your Offer:** $XXX,XXX.
    *   **Status Details:** "Seller is reviewing" or "Counter-offer received: $YYY,YYY".
    *   **Actions:** "View Details", "Withdraw Offer", "Accept Counter".

### 14. Reservations
*   **Layout:** High-Priority Alert Style.
*   **Active Reservation:**
    *   **Countdown Timer:** "23h 59m remaining to sign".
    *   **Steps Tracker:** 1. Offer Accepted (Done) -> 2. Deposit Paid (Pending) -> 3. Contract Signed.
    *   **CTA:** "Pay Deposit (Escrow)".

### 15. Transaction Timeline View
*   **Layout:** Vertical Timeline (Left of Detail Page).
*   **Nodes:**
    *   [Checked] Visit Completed (Date).
    *   [Checked] Offer Accepted.
    *   [Active] Escrow Pending.
    *   [Next] Transfer Title.

---

# 4. SELLER DASHBOARD (16-22)

### 16. Seller Dashboard (Home)
*   **Layout:** Overview Panel.
*   **Key Metrics:** "Total Views", "Visit Requests (Needs Action)", "Offers (Needs Action)".
*   **Property Card:** Shows logical state of their listing.

### 17. Create Property (Listing Wizard)
*   **Layout:** Multi-step wizard (Progress bar at top).
*   **Step 1:** Address & Location (Map Pin).
*   **Step 2:** Details (Type, Sqft, Price).
*   **Final:** "Save Draft" or "Proceed to Media".

### 18. Upload Property Media
*   **Layout:** Drag & Drop Zone.
*   **Features:**
    *   "Main Photo" selection.
    *   "Room" tagging (Dropdown for each photo).
    *   Grid preview of uploads.
*   **Note:** "These photos will be verified by your agent."

### 19. Hire Agent (Map & List)
*   **Layout:** Split Map/List.
*   **Content:**
    *   List of Agents nearby.
    *   **Agent Card:** Name, Rating (Stars), "Sold 12 homes nearby".
    *   **Action:** "Request Listing Agent".

### 20. Property Management Screen
*   **Layout:** Tabbed Control Panel.
*   **Tabs:** Details | Media | Availability | Settings.
*   **Availability:** Toggle days/times for visits.
*   **Status Banner:** "Your property is currently ACTIVE."

### 21. Offers Received
*   **Layout:** Detailed Table / Card List.
*   **Columns:** Buyer Name (Verified), Offer Price, Conditions (Cash/Loan), Date.
*   **Actions:** Green "Accept", Charcoal "Counter", Red "Decline".
*   **Warning:** "Accepting an offer locks your property."

### 22. Registration Progress Screen
*   **Purpose:** Pre-listing checklist.
*   **List:**
    *   [x] Account Created.
    *   [x] Email Verified.
    *   [ ] Property Draft Created.
    *   [ ] Agent Assigned.
    *   [ ] Property Verified (By Agent).

---

# 5. AGENT DASHBOARD (23-29)

### 23. Agent Dashboard (Work Console)
*   **Layout:** Dense, data-heavy, "Cockpit" feel.
*   **Inbox/Tasks:** "Verify 123 Main St", "Visit at 2pm today (Code: 1234)", "New Lead".
*   **Map Widget:** Active listings & Today's visits pins.

### 24. Assigned Properties
*   **Layout:** Data Table.
*   **Filters:** Verification Pending | Active | Pending Closing.
*   **Columns:** Address, Owner, Price, Status, Days on Market.
*   **Action:** "Manage", "Start Verification".

### 25. Property Verification Screen
*   **Layout:** Mobile-friendly Checklist (for tablet/phone use).
*   **Tasks:**
    1.  "Confirm Address" (GPS Button).
    2.  "Review Owner Docs" (PDF Viewer).
    3.  "Upload Verified Photos" (Camera Interface).
    4.  "Approve Listing" (Big Green Button) or "Request Changes" (Text Area).

### 26. Visit Approval Screen
*   **Layout:** List of incoming requests.
*   **Card:** "Buyer: John Doe (Verified)". "Time: Tuesday 10am".
*   **Actions:** "Approve" (Sends confirmation), "Reschedule", "Decline".

### 27. Visit Day Verification (OTP)
*   **Layout:** Simple Input Field (High contrast).
*   **Prompt:** "Ask buyer for their 6-digit Visit Code".
*   **Input:** [ _ _ _ _ _ _ ]
*   **Feedback:** Success -> "Visit Verified. Buyer can now make offers."

### 28. Registration Day Verification
*   *(Similar to Property Verification but for verifying a Seller's identity in person if required)*
*   **Content:** ID Capture, Signature Pad.

### 29. Earnings & Performance
*   **Layout:** Charts & Figures.
*   **Stats:** "Total Commission Earned", "Pending Payouts", "Conversion Rate".
*   **History:** List of closed deals with commission breakdown.

---

# 6. ADMIN DASHBOARD (30-36)

### 30. Admin Dashboard
*   **Layout:** High-level metrics.
*   **Big Numbers:** Total Users, Active Listings, Disputes Open.
*   **Recent Alerts:** "Suspicious login", "Reported listing".

### 31. Agent Application Review
*   **Layout:** Split pane (List Left, details Right).
*   **Detail View:**
    *   Applicant Info.
    *   Uploaded License Image.
    *   External Verification Links.
    *   **Decision:** Approve / Reject.

### 32. Agent Approval / Decline
*   **Layout:** Modal.
*   **If Decline:** Required "Reason" dropdown (e.g., "Invalid Docs", "Out of Area") + Custom Note.
*   **If Approve:** Triggers 'Welcome' email and activates account.

### 33. User Management
*   **Layout:** Searchable Table (Users).
*   **Filters:** Buyer / Seller / Agent / Admin.
*   **Columns:** Name, Email, Status (Active/Banned), Date Joined.
*   **Actions:** "Reset Password", "Ban User", "View Logs".

### 34. Property Moderation
*   **Layout:** Grid of Flagged/Reported properties.
*   **Content:** Report Reason (e.g. "Fake Photos").
*   **Actions:** "Unpublish", "Delete", "Dismiss Report".

### 35. Dispute Resolution
*   **Layout:** Ticket System.
*   **Ticket:** Subject, Parties involved.
*   **Thread:** Message history between Admin and Parties.
*   **Resolution:** "Refund", "Close Ticket".

### 36. Audit Log Explorer
*   **Layout:** Terminal-like / Dense Table.
*   **Columns:** Timestamp (UTC), UserID, Action (e.g. `PROP_VERIFY`, `OFFER_SENT`), IP Address.
*   **Search:** Filter by Entity ID or User ID.

---
**End of Master Design Specifications**
