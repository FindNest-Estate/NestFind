# NESTFIND - ADMIN SYSTEM DESIGN DOCUMENT

**Version:** 1.0  
**Last Updated:** December 18, 2024  
**Document Type:** System Design & Workflow Specification  
**Status:** Design Phase  

---

## TABLE OF CONTENTS

1. [Admin Purpose & Authority](#1-admin-purpose--authority)
2. [Admin Roles & Permissions](#2-admin-roles--permissions)
3. [Agent Approval Workflow](#3-agent-approval-workflow)
4. [User Moderation Workflow](#4-user-moderation-workflow)
5. [Property Oversight Workflow](#5-property-oversight-workflow)
6. [Dispute Resolution Workflow](#6-dispute-resolution-workflow)
7. [Audit & Investigation](#7-audit--investigation)
8. [Transaction Override](#8-transaction-override)
9. [Admin Dashboard Design](#9-admin-dashboard-design)
10. [Database Schema](#10-database-schema)
11. [Security Rules](#11-security-rules)

---

## 1. ADMIN PURPOSE & AUTHORITY

### 1.1 What Admin IS

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN = TRUST AUTHORITY               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ✅ Fraud Prevention         ✅ Rule Enforcement           │
│   ✅ Data Integrity           ✅ Conflict Resolution        │
│   ✅ Agent Approval           ✅ Platform Governance        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 What Admin is NOT

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN IS NOT                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ❌ Customer Support          ❌ Deal Participant          │
│   ❌ Content Editor            ❌ Sales Representative      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Core Principles

```
╔═══════════════════════════════════════════════════════════════╗
║                     ADMIN PRINCIPLES                          ║
╠═══════════════════════════════════════════════════════════════╣
║  📝 Every Action LOGGED          - No silent changes          ║
║  📋 Every Decision JUSTIFIED     - Reason mandatory           ║
║  🔍 Every Override AUDITABLE     - Full trail maintained      ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 2. ADMIN ROLES & PERMISSIONS

### 2.1 Phase 1: Simple Structure (Current)

```
                    ┌─────────────────┐
                    │  🔐 SUPER_ADMIN │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Agent Review  │   │    User       │   │   Property    │
│               │   │  Moderation   │   │   Oversight   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Dispute     │   │    Audit      │   │  Transaction  │
│  Resolution   │   │    Access     │   │   Override    │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 2.2 Phase 2: Future Role Split (Optional)

```
                        ┌─────────────────┐
                        │  🔐 SUPER_ADMIN │
                        └────────┬────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
   │    AGENT      │     │    DISPUTE    │     │   FINANCE     │
   │ REVIEW_ADMIN  │     │     ADMIN     │     │    ADMIN      │
   └───────────────┘     └───────────────┘     └───────────────┘
           │                     │                     │
           ▼                     ▼                     ▼
   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
   │   Approve/    │     │   Disputes    │     │ Transactions  │
   │ Decline Agents│     │  Resolution   │     │  & Refunds    │
   └───────────────┘     └───────────────┘     └───────────────┘
```

### 2.3 Capabilities Matrix

```
╔═══════════════════════════════════╦═══════════════════════════════════╗
║         ✅ ADMIN CAN              ║         ❌ ADMIN CANNOT           ║
╠═══════════════════════════════════╬═══════════════════════════════════╣
║ • Review Agent Applications       ║ • Participate in Deals            ║
║ • Approve/Decline Agents          ║ • Edit Content Silently           ║
║ • View All Users                  ║ • Delete Records                  ║
║ • Suspend/Reactivate Users        ║ • Bypass Audit Logs               ║
║ • View All Transactions           ║ • Act Without Reason              ║
║ • Access Audit Logs               ║ • Modify Historical Data          ║
║ • Resolve Disputes                ║                                   ║
║ • Override System States          ║                                   ║
╚═══════════════════════════════════╩═══════════════════════════════════╝
```

---

## 3. AGENT APPROVAL WORKFLOW

### 3.1 Visual Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     AGENT APPROVAL WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │  🧑‍💼 Agent Submits   │
    │    Application      │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Status: UNDER_REVIEW│◄───────────────────────────────┐
    └──────────┬──────────┘                                │
               │                                           │
               ▼                                           │
    ┌─────────────────────┐                                │
    │  📧 Admin Notified  │                                │
    └──────────┬──────────┘                                │
               │                                           │
               ▼                                           │
    ┌─────────────────────┐                                │
    │ 👨‍💻 Admin Reviews    │                                │
    │  • Documents        │                                │
    │  • Location         │                                │
    │  • Experience       │                                │
    └──────────┬──────────┘                                │
               │                                           │
               ▼                                           │
        ┌──────────────┐                                   │
       ╱   All Valid?   ╲                                  │
      ╱                  ╲                                 │
     ╱                    ╲                                │
    ▼                      ▼                               │
  [YES]                  [NO]                              │
    │                      │                               │
    ▼                      ▼                               │
┌─────────┐      ┌──────────────────┐                      │
│  Admin  │      │ Request More Info│                      │
│Decision │      └────────┬─────────┘                      │
└────┬────┘               │                                │
     │                    ▼                                │
     │           ┌──────────────────┐                      │
     │           │ Agent Updates    │───────────────────────┘
     │           └──────────────────┘
     │
     ├──────────────────┬─────────────────┐
     ▼                  ▼                 │
┌─────────┐      ┌─────────────┐          │
│ APPROVE │      │   DECLINE   │          │
└────┬────┘      └──────┬──────┘          │
     │                  │                 │
     ▼                  ▼                 │
┌─────────────┐  ┌──────────────┐         │
│ ✅ Agent    │  │ ❌ Reason    │         │
│   ACTIVE    │  │   MANDATORY  │         │
└─────────────┘  └──────┬───────┘         │
                        │                 │
                        ▼                 │
                 ┌──────────────┐         │
                 │ Agent Wants  │         │
                 │ to Reapply?  │         │
                 └──────┬───────┘         │
                        │                 │
               ┌────────┴────────┐        │
               ▼                 ▼        │
            [YES]              [NO]       │
               │                 │        │
               │                 ▼        │
               │        ┌─────────────┐   │
               │        │ Application │   │
               │        │   Closed    │   │
               │        └─────────────┘   │
               │                          │
               └──────────────────────────┘
```

### 3.2 Status Lifecycle

```
                    ┌─────────────────────────────────────┐
                    │      AGENT STATUS LIFECYCLE         │
                    └─────────────────────────────────────┘

    ┌──────────────────┐
    │       START      │
    └────────┬─────────┘
             │ Registration
             ▼
    ┌──────────────────┐      OTP Verified      ┌──────────────────┐
    │ PENDING_         │ ────────────────────►  │   UNDER_REVIEW   │
    │ VERIFICATION     │                        └────────┬─────────┘
    └──────────────────┘                                 │
                                                         │
                                    ┌────────────────────┴────────────────────┐
                                    │                                         │
                           Admin Approves                            Admin Declines
                                    │                                         │
                                    ▼                                         ▼
                           ┌──────────────┐                          ┌──────────────┐
                    ┌─────►│    ACTIVE    │                          │   DECLINED   │
                    │      └──────────────┘                          └──────┬───────┘
                    │             │                                         │
             Admin Reinstates     │ Violation                         Reapply│
                    │             ▼                                         │
                    │      ┌──────────────┐                                 │
                    └──────│  SUSPENDED   │                                 │
                           └──────────────┘                                 │
                                                                            │
                                    ┌───────────────────────────────────────┘
                                    │
                                    ▼
                           Back to UNDER_REVIEW
```

---

## 4. USER MODERATION WORKFLOW

### 4.1 Visual Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     USER MODERATION WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │ 👨‍💻 Admin Identifies │
    │      Issue          │
    └──────────┬──────────┘
               │
               ▼
        ┌─────────────┐
       ╱  Issue Type?  ╲
      ╱                 ╲
     ╱                   ╲
    ▼         ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Policy  │ │  Fraud  │ │  User   │
│Violation│ │ Report  │ │Complaint│
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └─────────┬─┴───────────┘
               │
               ▼
    ┌─────────────────────┐
    │   Review Evidence   │
    │   + Audit Logs      │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Select User/Agent  │
    └──────────┬──────────┘
               │
               ▼
        ┌─────────────┐
       ╱Choose Action? ╲
      ╱                 ╲
     ╱                   ╲
    ▼         ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ SUSPEND │ │REACTIVATE│ │ WARNING │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     ▼           ▼           ▼
┌─────────────────────────────────────┐
│     ⚠️ REASON MANDATORY            │
└──────────────────┬──────────────────┘
                   │
                   ▼
           ┌─────────────┐
           │Status Updated│
           └──────┬──────┘
                  │
                  ▼
           ┌─────────────┐
           │ 📧 User     │
           │  Notified   │
           └──────┬──────┘
                  │
                  ▼
           ┌─────────────┐
           │ 📝 Action   │
           │   Logged    │
           └─────────────┘
```

### 4.2 User Status Lifecycle

```
              ┌───────────────────────────────────────┐
              │       USER STATUS LIFECYCLE           │
              └───────────────────────────────────────┘

                         User Verified
                              │
                              ▼
                    ┌──────────────────┐
      ┌────────────►│      ACTIVE      │◄────────────┐
      │             └────────┬─────────┘             │
      │                      │                       │
      │         ┌────────────┴────────────┐          │
      │         │                         │          │
      │   Admin Suspends           Admin Warns       │
      │         │                         │          │
      │         ▼                         ▼          │
      │  ┌─────────────┐         ┌─────────────┐     │
      │  │  SUSPENDED  │         │   WARNED    │     │
      │  └─────────────┘         └──────┬──────┘     │
      │                                 │            │
 Admin Reactivates            ┌────────┴────────┐   │
      │                       │                 │   │
      └───────────────────────┘     Repeat   Warning│
                                   Violation  Ack'd │
                                      │             │
                                      ▼             │
                               ┌─────────────┐      │
                               │  SUSPENDED  │──────┘
                               └─────────────┘
```

---

## 5. PROPERTY OVERSIGHT WORKFLOW

### 5.1 Visual Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PROPERTY OVERSIGHT WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │ 🏠 Property Flagged │
    │   or Reported       │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ 👨‍💻 Admin Reviews    │
    │  • Property Details │
    │  • Media            │
    │  • Agent Verify     │
    │  • Audit History    │
    └──────────┬──────────┘
               │
               ▼
        ┌─────────────┐
       ╱ Issue Found?  ╲
      ╱                 ╲
     ╱                   ╲
    ▼         ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│   NO    │ │  MINOR  │ │  MAJOR  │
│  ISSUE  │ │  ISSUE  │ │  ISSUE  │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────────┐
│✅ Clear │ │ 📝 Add  │ │Choose Action│
│  Flag   │ │  Note   │ └──────┬──────┘
└─────────┘ └─────────┘        │
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │ 🚩 FLAG     │       │ 🔒 FREEZE   │
             └──────┬──────┘       └──────┬──────┘
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ ⚠️ REASON MANDATORY │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ 📧 Seller & Agent   │
                    │    Notified         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   📝 Action Logged  │
                    └─────────────────────┘
```

### 5.2 Property Admin Status

```
              ┌───────────────────────────────────────┐
              │     PROPERTY ADMIN STATUS             │
              └───────────────────────────────────────┘

                              │
                              ▼
                    ┌──────────────────┐
      ┌────────────►│      ACTIVE      │◄────────────┐
      │             └────────┬─────────┘             │
      │                      │                       │
      │              Admin Flags                     │
      │                      │                       │
      │                      ▼                       │
      │             ┌──────────────────┐             │
      │             │     FLAGGED      │─────────────┤
      │             └────────┬─────────┘  Issue      │
      │                      │          Resolved     │
  Admin                      │                       │
 Unfreezes           Severe Issue                    │
      │                      │                       │
      │                      ▼                       │
      │             ┌──────────────────┐             │
      └─────────────│     FROZEN       │             │
                    └────────┬─────────┘             │
                             │                       │
                     Permanent                       │
                     Violation                       │
                             │                       │
                             ▼                       │
                    ┌──────────────────┐             │
                    │     REMOVED      │─────────────┘
                    └──────────────────┘   (Not possible)
```

---

## 6. DISPUTE RESOLUTION WORKFLOW

### 6.1 Visual Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DISPUTE RESOLUTION WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │ ⚠️ User Raises      │
    │    Dispute          │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Submit Details:     │
    │  • Property ID      │
    │  • Against User     │
    │  • Description      │
    │  • Evidence         │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Status: OPEN        │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ 📧 All Parties      │◄─────────────────────────────┐
    │    Notified         │                              │
    └──────────┬──────────┘                              │
               │                                         │
               ▼                                         │
    ┌─────────────────────┐                              │
    │ 👨‍💻 Admin Reviews    │                              │
    │  • Evidence         │                              │
    │  • Audit Logs       │                              │
    │  • Transaction Hist │                              │
    └──────────┬──────────┘                              │
               │                                         │
               ▼                                         │
        ┌──────────────┐                                 │
       ╱  Need More    ╲                                 │
      ╱    Info?        ╲                                │
     ╱                   ╲                               │
    ▼                     ▼                              │
  [YES]                 [NO]                             │
    │                     │                              │
    ▼                     ▼                              │
┌──────────────┐   ┌──────────────┐                      │
│Request More  │   │Admin Decision│                      │
│  Evidence    │   └──────┬───────┘                      │
└──────┬───────┘          │                              │
       │                  │                              │
       └──────────────────┼──────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┬─────────────────┐
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   FAVOR     │   │   FAVOR     │   │   FAVOR     │   │    NO       │
│   BUYER     │   │   SELLER    │   │   AGENT     │   │   ACTION    │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │ Apply Resolution:       │
                    │  • Refund?              │
                    │  • Penalty?             │
                    │  • Warning?             │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ Dispute Status: CLOSED  │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 📧 All Parties Notified │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 📝 Full Audit Record    │
                    └─────────────────────────┘
```

### 6.2 Dispute Status Lifecycle

```
              ┌───────────────────────────────────────┐
              │       DISPUTE STATUS LIFECYCLE        │
              └───────────────────────────────────────┘

                         User Raises
                              │
                              ▼
                    ┌──────────────────┐
                    │       OPEN       │
                    └────────┬─────────┘
                             │
                      Admin Picks Up
                             │
                             ▼
                    ┌──────────────────┐       Need More Info
          ┌────────│   UNDER_REVIEW   │─────────────────────┐
          │        └────────┬─────────┘                     │
          │                 │                               │
          │                 │ Decision                      ▼
          │                 │                    ┌──────────────────┐
          │                 │                    │ AWAITING_EVIDENCE│
          │                 │                    └────────┬─────────┘
          │                 │                             │
          │                 │              Evidence Received
          │                 │                             │
          │                 ▼                             │
          │   ┌─────────────────────────────────┐         │
          │   │          RESOLVED               │◄────────┘
          │   │  • FAVOR_BUYER                  │
          │   │  • FAVOR_SELLER                 │
          │   │  • FAVOR_AGENT                  │
          │   │  • NO_ACTION                    │
          │   └─────────────┬───────────────────┘
          │                 │
          │          Action Applied
          │                 │
          │                 ▼
          │        ┌──────────────────┐
          └───────►│      CLOSED      │
                   └──────────────────┘
```

---

## 7. AUDIT & INVESTIGATION

### 7.1 Visual Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     AUDIT & INVESTIGATION WORKFLOW                       │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │ 👨‍💻 Admin Opens      │
    │   Audit Explorer    │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Select Filter:      │
    │  • User ID/Email    │
    │  • Property ID      │
    │  • Transaction ID   │
    │  • Date Range       │
    │  • Action Type      │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ 🔍 Query Audit Logs │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Display Results:    │
    │  • Timeline View    │
    │  • Actor Details    │
    │  • Action Type      │
    │  • Entity Affected  │
    └──────────┬──────────┘
               │
               ▼
        ┌──────────────┐
       ╱Further Action? ╲
      ╱                  ╲
     ╱                    ╲
    ▼          ▼           ▼
┌────────┐ ┌────────┐ ┌──────────┐
│ EXPORT │ │INVESTIG│ │  TAKE    │
│ REPORT │ │  ATE   │ │ ACTION   │
└────────┘ └────┬───┘ └──────────┘
                │
                ▼
         ┌──────────────┐
         │  Deep Dive   │
         │  into Record │
         └──────────────┘


    ╔═══════════════════════════════════════════════════════════════╗
    ║                    ⚠️ IMPORTANT RULES                         ║
    ╠═══════════════════════════════════════════════════════════════╣
    ║  • READ-ONLY ACCESS to audit logs                             ║
    ║  • ❌ Cannot DELETE logs                                       ║
    ║  • ❌ Cannot MODIFY logs                                       ║
    ║  • Logs are APPEND-ONLY                                       ║
    ╚═══════════════════════════════════════════════════════════════╝
```

### 7.2 Audit Log Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    📝 AUDIT LOG RECORD STRUCTURE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┬─────────────────────────────────────────────────┐  │
│  │ Field       │ Description                                    │  │
│  ├─────────────┼─────────────────────────────────────────────────┤  │
│  │ id          │ Unique record identifier                       │  │
│  │ actor_id    │ User who performed the action                  │  │
│  │ actor_role  │ Role at time of action (BUYER/SELLER/AGENT/ADM)│  │
│  │ action      │ What was done (CREATE/UPDATE/DELETE/APPROVE)   │  │
│  │ entity_type │ What was affected (USER/PROPERTY/TRANSACTION)  │  │
│  │ entity_id   │ ID of affected entity                          │  │
│  │ timestamp   │ When it happened (UTC)                         │  │
│  │ ip_address  │ Source IP address                              │  │
│  │ details     │ Additional context (JSON)                      │  │
│  └─────────────┴─────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. TRANSACTION OVERRIDE

### 8.1 Visual Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TRANSACTION OVERRIDE WORKFLOW                        │
│                           (RARE - USE WITH CAUTION)                      │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────┐
    │ ⚠️ Edge Case        │
    │   Identified        │
    └──────────┬──────────┘
               │
               ▼
        ┌──────────────┐
       ╱Override Type?  ╲
      ╱                  ╲
     ╱                    ╲
    ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ Legal │ │Payment│ │System │ │ Fraud │
│ Issue │ │Failure│ │ Error │ │Detected│
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    │         │         │         │
    └─────────┴─────────┴─────────┘
                  │
                  ▼
    ┌─────────────────────┐
    │ 👨‍💻 Admin Initiates  │
    │   Override          │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Select Entity:      │
    │  • Property         │
    │  • Transaction      │
    │  • Reservation      │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ View Current State  │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Select New State    │
    └──────────┬──────────┘
               │
               ▼
    ╔═════════════════════════════════════════════════════════════════╗
    ║            ⚠️ MANDATORY REASON REQUIRED                         ║
    ╚══════════════════════════════╤══════════════════════════════════╝
                                   │
                                   ▼
                        ┌───────────────────┐
                       ╱  Confirm Override?  ╲
                      ╱                       ╲
                     ╱                         ╲
                    ▼                           ▼
                 [CANCEL]                   [CONFIRM]
                    │                           │
                    ▼                           ▼
           ┌──────────────┐          ┌──────────────────┐
           │ ❌ Override  │          │ ✅ Override      │
           │  Cancelled   │          │   Applied        │
           └──────────────┘          └────────┬─────────┘
                                              │
                                              ▼
                                   ┌──────────────────┐
                                   │ Record:          │
                                   │  • Old State     │
                                   │  • New State     │
                                   │  • Reason        │
                                   │  • Admin ID      │
                                   │  • Timestamp     │
                                   └────────┬─────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │ 📧 All Parties   │
                                   │   Notified       │
                                   └────────┬─────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │ 📝 Override      │
                                   │   Logged         │
                                   └──────────────────┘
```

### 8.2 Override Rules

```
╔═══════════════════════════════════════════════════════════════════════╗
║                       ⚖️ OVERRIDE RULES                               ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  1. ⚠️  REASON IS MANDATORY                                           ║
║         No override without explicit justification                    ║
║                                                                       ║
║  2. 📧 ALL PARTIES NOTIFIED                                           ║
║         Buyer, Seller, Agent all receive notification                 ║
║                                                                       ║
║  3. 📝 FULL AUDIT RECORD                                              ║
║         Complete before/after state captured                          ║
║                                                                       ║
║  4. 🔄 CANNOT UNDO                                                    ║
║         Must create NEW override to reverse                           ║
║                                                                       ║
║  5. 🔐 SUPER ADMIN ONLY                                               ║
║         Lower admins cannot perform overrides                         ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 9. ADMIN DASHBOARD DESIGN

### 9.1 Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        📊 ADMIN DASHBOARD                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────  OVERVIEW PANEL  ─────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │ │
│  │  │ 👤 1,234   │  │ 🧑‍💼 156    │  │ 🏠 2,456   │  │ 💰 89      │       │ │
│  │  │ Active     │  │ Active     │  │ Properties │  │ Ongoing    │       │ │
│  │  │ Users      │  │ Agents     │  │ (by status)│  │ Deals      │       │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────  ACTION QUEUES  ───────────┐  ┌──────  🚨 ALERTS  ──────────┐ │
│  │                                        │  │                            │ │
│  │  📋 Agent Review Queue          [12]  │  │  ⚠️ Failed Registrations    │ │
│  │  ├── Pending applications              │  │     3 in last 24hrs        │ │
│  │  └── View all →                        │  │                            │ │
│  │                                        │  │  ⚠️ High-Dispute Users     │ │
│  │  ⚠️ Pending Disputes            [5]   │  │     2 accounts flagged     │ │
│  │  ├── Open cases                        │  │                            │ │
│  │  └── View all →                        │  │  ⚠️ Expired Reservations   │ │
│  │                                        │  │     7 expiring today       │ │
│  │  🚩 Flagged Properties          [8]   │  │                            │ │
│  │  ├── Requires review                   │  │                            │ │
│  │  └── View all →                        │  │                            │ │
│  │                                        │  │                            │ │
│  └────────────────────────────────────────┘  └────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────  TOOLS  ──────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │ │
│  │  │ 🔍 Audit       │  │ 📄 Reports     │  │ ⚙️ System      │           │ │
│  │  │   Explorer     │  │   Generator    │  │   Settings     │           │ │
│  │  └────────────────┘  └────────────────┘  └────────────────┘           │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. DATABASE SCHEMA

### 10.1 Admin Tables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN DATABASE TABLES                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: admins                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Column          │ Type      │ Constraints          │ Description           │
├─────────────────┼───────────┼──────────────────────┼───────────────────────┤
│ user_id         │ UUID      │ PK, FK → users       │ Links to user account │
│ role            │ ENUM      │ NOT NULL             │ SUPER_ADMIN, etc.     │
│ is_active       │ BOOLEAN   │ DEFAULT true         │ Active status         │
│ created_at      │ TIMESTAMP │ NOT NULL             │ When granted          │
└─────────────────┴───────────┴──────────────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: admin_user_actions                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Column          │ Type      │ Constraints          │ Description           │
├─────────────────┼───────────┼──────────────────────┼───────────────────────┤
│ id              │ UUID      │ PK                   │ Unique ID             │
│ admin_id        │ UUID      │ FK → admins          │ Who did it            │
│ target_user_id  │ UUID      │ FK → users           │ Affected user         │
│ action          │ ENUM      │ NOT NULL             │ SUSPEND/REACTIVATE    │
│ reason          │ TEXT      │ NOT NULL             │ Justification         │
│ created_at      │ TIMESTAMP │ NOT NULL             │ When actioned         │
└─────────────────┴───────────┴──────────────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: admin_property_actions                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Column          │ Type      │ Constraints          │ Description           │
├─────────────────┼───────────┼──────────────────────┼───────────────────────┤
│ id              │ UUID      │ PK                   │ Unique ID             │
│ admin_id        │ UUID      │ FK → admins          │ Who did it            │
│ property_id     │ UUID      │ FK → properties      │ Affected property     │
│ action          │ ENUM      │ NOT NULL             │ FLAG/FREEZE/UNFREEZE  │
│ reason          │ TEXT      │ NOT NULL             │ Justification         │
│ created_at      │ TIMESTAMP │ NOT NULL             │ When actioned         │
└─────────────────┴───────────┴──────────────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: disputes                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Column          │ Type      │ Constraints          │ Description           │
├─────────────────┼───────────┼──────────────────────┼───────────────────────┤
│ id              │ UUID      │ PK                   │ Unique ID             │
│ raised_by_id    │ UUID      │ FK → users           │ Who raised            │
│ property_id     │ UUID      │ FK → properties      │ Related property      │
│ against_user_id │ UUID      │ FK → users           │ Accused party         │
│ description     │ TEXT      │ NOT NULL             │ Issue details         │
│ status          │ ENUM      │ NOT NULL             │ OPEN/UNDER_REVIEW/etc │
│ created_at      │ TIMESTAMP │ NOT NULL             │ When raised           │
└─────────────────┴───────────┴──────────────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: dispute_actions                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Column          │ Type      │ Constraints          │ Description           │
├─────────────────┼───────────┼──────────────────────┼───────────────────────┤
│ id              │ UUID      │ PK                   │ Unique ID             │
│ dispute_id      │ UUID      │ FK → disputes        │ Related dispute       │
│ admin_id        │ UUID      │ FK → admins          │ Who resolved          │
│ decision        │ ENUM      │ NOT NULL             │ FAVOR_BUYER/etc       │
│ notes           │ TEXT      │                      │ Resolution notes      │
│ created_at      │ TIMESTAMP │ NOT NULL             │ When resolved         │
└─────────────────┴───────────┴──────────────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TABLE: admin_overrides                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Column          │ Type      │ Constraints          │ Description           │
├─────────────────┼───────────┼──────────────────────┼───────────────────────┤
│ id              │ UUID      │ PK                   │ Unique ID             │
│ admin_id        │ UUID      │ FK → admins          │ Who overrode          │
│ entity_type     │ ENUM      │ NOT NULL             │ PROPERTY/TRANSACTION  │
│ entity_id       │ UUID      │ NOT NULL             │ Affected entity       │
│ old_state       │ TEXT      │ NOT NULL             │ Before state          │
│ new_state       │ TEXT      │ NOT NULL             │ After state           │
│ reason          │ TEXT      │ NOT NULL             │ Justification         │
│ created_at      │ TIMESTAMP │ NOT NULL             │ When overridden       │
└─────────────────┴───────────┴──────────────────────┴───────────────────────┘
```

### 10.2 Entity Relationships

```
                    ┌─────────────────────────────────────────────────┐
                    │           ADMIN ER DIAGRAM                      │
                    └─────────────────────────────────────────────────┘

                                    ┌──────────┐
                                    │  USERS   │
                                    └────┬─────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                          ▼              │              ▼
                   ┌──────────┐          │       ┌───────────────┐
                   │  ADMINS  │──────────┘       │   DISPUTES    │
                   └────┬─────┘                  └───────┬───────┘
                        │                                │
        ┌───────────────┼───────────────┐                │
        │               │               │                │
        ▼               ▼               ▼                ▼
┌───────────────┐ ┌───────────┐ ┌───────────────┐ ┌─────────────────┐
│ ADMIN_USER_   │ │  ADMIN_   │ │   ADMIN_      │ │ DISPUTE_ACTIONS │
│   ACTIONS     │ │ PROPERTY_ │ │  OVERRIDES    │ │                 │
│               │ │  ACTIONS  │ │               │ │                 │
└───────────────┘ └───────────┘ └───────────────┘ └─────────────────┘
        │               │
        ▼               ▼
   ┌──────────┐   ┌────────────┐
   │  USERS   │   │ PROPERTIES │
   │ (target) │   │  (target)  │
   └──────────┘   └────────────┘
```

---

## 11. SECURITY RULES

### 11.1 Non-Negotiable Rules

```
╔═════════════════════════════════════════════════════════════════════════════╗
║                     🔒 NON-NEGOTIABLE ADMIN RULES                           ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  1️⃣  EVERY ACTION REQUIRES REASON                                          ║
║      └── No action can be taken without explicit justification              ║
║                                                                             ║
║  2️⃣  ADMIN CANNOT DELETE DATA                                              ║
║      └── Data can be marked inactive, never deleted                         ║
║                                                                             ║
║  3️⃣  ADMIN CANNOT BYPASS AUDIT LOGS                                        ║
║      └── All admin actions are automatically logged                         ║
║                                                                             ║
║  4️⃣  ALL ACTIONS TRIGGER NOTIFICATIONS                                     ║
║      └── Affected parties are always notified                               ║
║                                                                             ║
║  5️⃣  MINIMAL ACCESS PRINCIPLE                                              ║
║      └── Admins only see what they need                                     ║
║                                                                             ║
║  6️⃣  ALL OVERRIDES ARE REVERSIBLE                                          ║
║      └── Only via new override, never silent undo                           ║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

### 11.2 Enforcement Mechanisms

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ENFORCEMENT MECHANISMS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RULE                         │  ENFORCEMENT                                │
│ ─────────────────────────────────────────────────────────────────────────── │
│  Reason Required              │  Database NOT NULL constraint               │
│  Cannot Delete Data           │  No DELETE endpoints, soft-delete only      │
│  Cannot Bypass Audit          │  Append-only audit tables                   │
│  Notifications                │  Backend triggers on all admin actions      │
│  Minimal Access               │  Role-based API guards (RBAC)               │
│  Reversible Overrides         │  State machine validation                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. SUMMARY TABLES

### 12.1 Admin Workflow Summary

| Workflow | Trigger | Admin Action | Outcome | Logged |
|----------|---------|--------------|---------|--------|
| Agent Approval | Agent applies | Approve/Decline | Agent ACTIVE or DECLINED | ✅ |
| User Moderation | Violation detected | Suspend/Reactivate/Warn | Status changed | ✅ |
| Property Oversight | Report/Flag | Flag/Freeze/Unfreeze | Property status changed | ✅ |
| Dispute Resolution | User raises | Investigate & Decide | Dispute CLOSED | ✅ |
| Audit Investigation | Admin query | View logs | Read-only access | N/A |
| Transaction Override | Edge case | Change state + reason | State overridden | ✅ |

### 12.2 Admin Action Types

| Category | Actions |
|----------|---------|
| **User Actions** | SUSPEND, REACTIVATE, WARN |
| **Property Actions** | FLAG, FREEZE, UNFREEZE, REMOVE |
| **Agent Actions** | APPROVE, DECLINE, REQUEST_INFO |
| **Dispute Decisions** | FAVOR_BUYER, FAVOR_SELLER, FAVOR_AGENT, NO_ACTION |

---

## DOCUMENT APPROVAL

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | | | |
| Reviewer | | | |
| Approver | | | |

---

> **Document Classification:** Internal Use Only  
> **Review Cycle:** Quarterly or on major changes  
> **Next Review:** March 2025
