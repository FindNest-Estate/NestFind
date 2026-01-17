# NestFind Documentation Rules

**Version:** 1.0 | **Status:** FROZEN | **Effective Date:** December 19, 2024

---

## Purpose

This document governs all documentation in the NestFind repository. Every contributor, AI tool, and automated system must follow these rules without exception.

---

## Core Rules

### Rule 1: Mermaid-Only Diagrams

All diagrams must use Mermaid syntax.

| Allowed | Prohibited |
|---------|------------|
| `flowchart TD` | ASCII art |
| `stateDiagram-v2` | PlantUML |
| `erDiagram` | Images of diagrams |
| `sequenceDiagram` | External diagram tools |
| `gantt` | Hand-drawn scans |

**Rationale:** Mermaid diagrams are diff-friendly, GitHub-renderable, and machine-parseable.

---

### Rule 2: One Workflow = One File

Each workflow must exist in its own dedicated markdown file.

- No combining multiple workflows in one file
- No splitting one workflow across files
- No inline workflow definitions in other docs

**Rationale:** Enables atomic versioning and clear ownership.

---

### Rule 3: One Mutation = One Audit Entry

Every state-changing action must create exactly one audit log entry.

- Mutations without audit logs are prohibited
- Batch mutations must create batch audit entries
- Read-only actions do not require audit logs

**Rationale:** Ensures complete traceability.

---

### Rule 4: No Undocumented State Transitions

Every state transition must be documented in a workflow file.

- Transitions not in workflows are invalid
- Backend must reject undocumented transitions
- UI must not render controls for undocumented transitions

**Rationale:** Prevents ghost behaviors and security holes.

---

### Rule 5: Database is Source of Truth

All data displayed in UI must originate from database.

- No client-side computed states
- No optimistic UI updates
- No cached states treated as truth

**Rationale:** Ensures consistency across all clients.

---

### Rule 6: UI Must Never Invent State

Frontend may only render what backend provides.

- No hardcoded status strings
- No assumed permissions
- No invented capabilities

**Rationale:** Prevents trust violations.

---

## Workflow File Requirements

Every workflow file must include:

### Mandatory YAML Frontmatter

```yaml
---
workflow_id: ROLE_INTENT_OBJECT
role: USER | AGENT | ADMIN | SYSTEM | PUBLIC
action_type: READ_ONLY | MUTATION
entities:
  primary: main_table
  secondary:
    - audit_logs
entry_states:
  table_name: [STATE1]
exit_states:
  table_name: [STATE2]
trigger:
  type: USER_ACTION | CRON | EVENT
  schedule: null
audit_required: true | false
diagram_types:
  - stateDiagram-v2
---
```

### Mandatory Content

1. Purpose section (1-2 sentences)
2. At least one Mermaid diagram
3. State transition table (if applicable)

---

## Naming Conventions

See [WORKFLOW_NAMING_CONVENTION.md](file:///d:/NestFind/docs/WORKFLOW_NAMING_CONVENTION.md) for workflow ID rules.

---

## Enforcement

Violations of these rules:

1. Must be rejected during code/doc review
2. Must be flagged if discovered in production
3. Must be fixed before new features are added
4. Must be tracked as documentation debt

---

## Amendment Process

To change these rules:

1. Submit written justification
2. Conduct architecture review
3. Update all affected workflows
4. Increment version number
5. Re-freeze with new date
