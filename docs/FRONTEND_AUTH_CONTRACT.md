# Frontend Authentication Contract

## 1. Core Principles
- **Backend-Driven:** UI renders strictly based on backend response state. No local optimistic updates for auth status.
- **Stateless Verification:** Authorization is re-verified on every request.
- **Explicit States:** UI handles specific auth states (`OTP_REQUIRED`, `IN_REVIEW`, `LOCKED`, etc.) returned by API.

## 2. Shared Types

```typescript
type UserRole = 'USER' | 'AGENT' | 'ADMIN';

type UserStatus = 
  | 'PENDING_VERIFICATION'  // OTP sent, not verified
  | 'ACTIVE'                // Fully authenticated
  | 'IN_REVIEW'             // Agent specific: awaiting admin approval
  | 'DECLINED'              // Agent specific: admin rejected
  | 'SUSPENDED';            // Admin suspended

type AuthResponse = {
  success: boolean;
  message?: string;
  error?: string;
};
```

## 3. Endpoints & Contracts

### A. Registration

#### 1. Register User (Buyer/Seller)
- **Endpoint:** `POST /auth/register/user`
- **Payload:**
  ```typescript
  {
    full_name: string;
    email: string;
    password: string; // min 8 chars, 1 letter, 1 number
    mobile_number?: string;
  }
  ```
- **Success (202):**
  ```typescript
  {
    message: "Verification OTP sent to email"
  }
  ```
  **UI Action:** Transition to OTP Verification Screen.
- **Error (400):** Validation failure or email exists (generic error).

#### 2. Register Agent
- **Endpoint:** `POST /auth/register/agent`
- **Payload:**
  ```typescript
  {
    full_name: string;
    email: string;
    password: string;
    mobile_number?: string;
    license_id: string;
    service_radius_km: number; // max 100
  }
  ```
- **Success (202):**
  ```typescript
  {
    message: "Verification OTP sent to email"
  }
  ```
  **UI Action:** Transition to OTP Verification Screen.

### B. Authentication

#### 3. Login
- **Endpoint:** `POST /auth/login`
- **Payload:**
  ```typescript
  {
    email: string;
    password: string;
  }
  ```
- **Success (200):**
  ```typescript
  {
    access_token: string;
    refresh_token: string;
    token_type: "bearer";
    user: {
      id: string;
      full_name: string;
      email: string;
      role: UserRole;
      status: UserStatus;
    }
  }
  ```
- **Lockout (200 - Logic Handled via Response Field):**
  ```typescript
  {
    success: false;
    error: "Account locked...";
    locked_until: string; // ISO DateTime
  }
  ```
  **UI Action:** Show lockout timer. Disable login button until `locked_until`.

#### 4. Refresh Token
- **Endpoint:** `POST /auth/refresh`
- **Payload:**
  ```typescript
  {
    refresh_token: string;
  }
  ```
- **Success (200):**
  ```typescript
  {
    access_token: string;
    refresh_token: string;
    token_type: "bearer";
  }
  ```
- **Failure (401/400):** Redirect to Login (Session Invalid/Reuse Detected).

#### 5. Logout
- **Endpoint:** `POST /auth/logout`
- **Payload:** None (Requires Bearer Token)
- **Success (200):**
  ```typescript
  {
    message: "Logged out successfully"
  }
  ```
  **UI Action:** Clear tokens, redirect to home.

### C. Verification

#### 6. OTP Verify
- **Endpoint:** `POST /auth/otp/verify`
- **Payload:**
  ```typescript
  {
    user_id: string; // From registration context or separate flow
    otp: string;
  }
  ```
- **Success (200):**
  ```typescript
  {
    success: true;
    message: "Email verified successfully"
  }
  ```
  **UI Action:**
  - If USER: Auto-login or redirect to login.
  - If AGENT: Redirect to "Application Under Review" screen.
- **Lockout (200):**
  ```typescript
  {
    success: false;
    error: "Account locked...";
    locked_until: string;
  }
  ```
- **Failure (200):**
  ```typescript
  {
    success: false;
    error: "Invalid OTP. X attempts remaining"
  }
  ```

#### 7. Resend OTP
- **Endpoint:** `POST /auth/otp/generate`
- **Payload:**
  ```typescript
  {
    user_id: string;
  }
  ```
- **Success (200):** `expires_at` returned.

### D. Admin Actions (Agent Approval)

#### 8. Approve Agent
- **Endpoint:** `POST /admin/agents/{agent_id}/approve`
- **Headers:** Bearer Token (Admin)
- **Payload:** `{ decision_reason?: string }`
- **Success (200):** `{ status: "ACTIVE" }`

#### 9. Decline Agent
- **Endpoint:** `POST /admin/agents/{agent_id}/decline`
- **Headers:** Bearer Token (Admin)
- **Payload:** `{ decision_reason?: string }`
- **Success (200):** `{ status: "DECLINED" }`

## 4. UI State Machine Mapping

| Backend Status | User Role | UI State / Access |
| :--- | :--- | :--- |
| `PENDING_VERIFICATION` | ANY | **Block Access.** Route to OTP Entry. |
| `ACTIVE` | `USER` | **Full Access.** Buyer/Seller Dashboards. |
| `ACTIVE` | `AGENT` | **Full Access.** Agent Dashboard. |
| `ACTIVE` | `ADMIN` | **Full Access.** Admin Dashboard. |
| `IN_REVIEW` | `AGENT` | **Restricted.** Route to "Wait for Approval" screen. |
| `DECLINED` | `AGENT` | **Restricted.** Route to "Application Declined" screen. |
| `SUSPENDED` | ANY | **Block Access.** Route to "Account Suspended" screen. |
| (Lockout Response) | ANY | **Input Disabled.** Show Countdown. |

## 5. Global Error Handling
- **401 Unauthorized:** Token expired/invalid. Attempt Refresh. If Refresh fails -> Forced Logout.
- **403 Forbidden:** Role mismatch or Account Status issue (e.g. `IN_REVIEW` trying to access active features). Show appropriate state screen based on `user.status`.
- **429 Too Many Requests:** Show "Rate limit exceeded, please wait" toast/modal.

