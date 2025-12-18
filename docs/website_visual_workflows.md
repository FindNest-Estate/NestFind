# NestFind - Visual Workflow Diagrams

> **Visualizing the "Trust-First" & "State-Based" Flows**

---

## 1. User Authentication & Registration

```mermaid
flowchart TD
    Start([User Arrives]) --> Login{Has Account?}
    
    Login -- Yes --> InputCreds[Enter Email/Pass]
    InputCreds --> ValidateCreds{Valid?}
    ValidateCreds -- No --> Error[Show Error] --> InputCreds
    ValidateCreds -- Yes --> Dashboard[Redirect to Role Dashboard]

    Login -- No --> Register([Start Registration])
    Register --> RoleSelect{Select Role}
    
    RoleSelect -- Buyer/Seller --> Form[Common User Form]
    RoleSelect -- Agent --> AgentForm[Agent Application Form]
    
    Form --> EmailOTP[Triggers Email OTP]
    AgentForm --> EmailOTP
    
    EmailOTP --> VerifyOTP{Verify Code}
    VerifyOTP -- Invalid --> Retry[Resend/Retry]
    VerifyOTP -- Valid --> CreateAccount[Create User in DB]
    
    CreateAccount --> RoleCheck{Role?}
    RoleCheck -- Buyer/Seller --> Dashboard
    RoleCheck -- Agent --> UnderReview[Status: IN_REVIEW]
    UnderReview --> AdminCheck[Wait for Admin Approval]
```

---

## 2. Property Lifecycle (The "Trust" Chain)

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Seller Creates
    DRAFT --> PENDING_ASSIGNMENT : Seller Requests Agent
    PENDING_ASSIGNMENT --> ASSIGNED : Agent Accepts
    
    ASSIGNED --> VERIFICATION_IN_PROGRESS : Agent Visits Property
    
    state VERIFICATION_IN_PROGRESS {
        [*] --> CheckDocs
        CheckDocs --> CheckPhotos
        CheckPhotos --> CheckLocation
    }
    
    VERIFICATION_IN_PROGRESS --> ACTIVE : Agent Approves (Go Live)
    VERIFICATION_IN_PROGRESS --> DRAFT : Agent Rejects (Fix Needed)
    
    ACTIVE --> RESERVED : Offer Accepted & Deposit Paid
    
    RESERVED --> SOLD : Final Closing Complete
    RESERVED --> ACTIVE : Deal Cancelled/Timeout
    
    SOLD --> [*]
```

---

## 3. Visit Booking & Execution

```mermaid
sequenceDiagram
    participant Buyer
    participant System
    participant Agent
    participant Seller
    
    Buyer->>System: Request Visit (Slot)
    System->>Agent: Notify Request
    
    alt Auto-Approve
        Agent-->>System: Auto-rules pass
    else Manual
        Agent->>System: Approve Request
    end
    
    System->>Buyer: Visit Confirmed (Status: APPROVED)
    System->>Seller: Notify Visit Scheduled
    
    Note over Buyer, Agent: On Visit Day
    
    Agent->>System: "Start Visit" (Trigger OTP)
    System->>Buyer: Send Visit OTP
    Buyer->>Agent: Share OTP
    Agent->>System: Enter OTP
    
    alt OTP Valid
        System->>System: Log "Visit Verified"
        System->>Buyer: Unlock "Make Offer"
    else OTP Invalid
        System->>Agent: Error Message
    end
```

---

## 4. Offer & Negotiation Flow

```mermaid
flowchart TD
    start([Buyer Makes Offer]) --> check{Visit Verified?}
    check -- No --> block[Block: "Must Visit First"]
    check -- Yes --> submit[Submit Offer details]
    
    submit --> status_pend[Status: PENDING]
    status_pend --> notify_seller[Notify Seller & Agent]
    
    notify_seller --> decision{Seller Action}
    
    decision -- Accept --> status_accept[Status: ACCEPTED]
    decision -- Reject --> status_reject[Status: REJECTED] --> end_flow([End])
    decision -- Counter --> status_counter[Status: COUNTERED]
    
    status_counter --> buyer_dec{Buyer Action}
    buyer_dec -- Accept Counter --> status_accept
    buyer_dec -- Reject --> end_flow
    buyer_dec -- Counter Back --> status_pend
    
    status_accept --> timer[Start Reservation Timer]
    timer --> pay{Deposit Paid?}
    
    pay -- Yes --> reserved[Prop Status: RESERVED]
    pay -- No/Timeout --> expired[Offer Expired] --> status_pend
```

---

## 5. Agent Onboarding & Approval (Admin)

```mermaid
flowchart LR
    Applicant[New Agent] -->|Submit App| DB[(Database)]
    DB -->|Status: PENDING| Admin
    
    Admin -->|Review Docs| Verification
    
    Verification{Decision}
    Verification -- Approve --> Active[Status: ACTIVE]
    Verification -- Reject --> Rejected[Status: DECLINED]
    
    Active -->|Email| Applicant
    Rejected -->|Email Reason| Applicant
```
