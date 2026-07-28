---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-28
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: surface-implementer-dispatches

## Overview

The CLI keeps the existing resolver selection behavior but adds explicit
observability around it. Managed named-cap implementation/fix calls accept
classification separately from candidate selection and policy. Dispatch Report
V1 gains nullable classification fields. When an actual runtime resolution
reaches `selectionMode=capped` without an exact candidate, the command emits a
coded warning in both human and JSON output while preserving
`status: resolved` and exit code `0`.

A shared structured notice shape carries skipped-selection warnings,
classification warnings, and terminal-reviewer eligibility advisories without
changing the compatibility stamp. Recommendation adoption and policy choices
disclose the configured terminal reviewer; runtime disclosure derives from the
effective resolved target. The CLI does not claim to determine model access or
organizational retention policy.

## Architecture

### System Context

The change extends the existing `dispatch-ceiling resolve` pipeline after
candidate selection. It does not alter ladder normalization, eligibility, cap
comparison, or target materialization.

**Key Components:**

- **Classification input:** parses task class and provider-specific preferred
  effort independently of selection controls.
- **Contextual notice derivation:** evaluates the completed selection with
  policy, role/action, preflight, and effective-target context.
- **Dispatch Report V1:** stores additive nullable classification and notices.
- **Recommendation disclosure:** describes the default terminal reviewer during
  adoption and choices.
- **Presenters:** render the same notices in human and JSON output.

### Component Diagram

```text
CLI arguments
    |
    v
classification normalization
    |
    v
existing policy + candidate resolver
    |
    v
contextual notice derivation
    |
    +----> Dispatch Report V1
    |           |
    |           +----> compatibility stamp (unchanged)
    v
human / JSON output

recommendation or effective target
    |
    v
terminal-reviewer disclosure helper
```

### Data Flow

1. Parse and validate classification separately from `--preferred` and
   exact-candidate flags.
2. Run the existing policy/candidate resolver unchanged.
3. Build notices from the completed resolution and report context.
4. Build Dispatch Report V1 with classification and notices.
5. Render human or JSON output from the same structured data.
6. For recommendation adoption/choices, describe the recommendation
   conditionally. For runtime preflight/review, match the effective target.

## Component Design

### Classification Input

**Purpose:** Record the root's task classification without using it as a
replacement for exact candidate selection.

**Responsibilities:**

- Accept `--task-class` for implementation/fix provenance across providers.
- Accept `--preferred-effort` for Codex provenance without selecting a target.
- Reject invalid classes, provider-inapplicable effort, reviewer classification,
  and conflicting controls.
- Keep classification distinct from ceiling, requested candidate, and selected
  candidate.

**Interfaces:**

```typescript
type DispatchTaskClass =
  | 'mechanical-recon'
  | 'intelligent-recon'
  | 'default-implementation'
  | 'hard-reasoning'
  | 'consequential';

interface DispatchClassification {
  taskClass: DispatchTaskClass | null;
  preferredEffort: string | null;
}
```

### Structured Notices

**Purpose:** Make deterministic violations and eligibility advisories visible to
humans and automation.

**Responsibilities:**

- Detect missing exact candidate only for actual managed named-cap
  implementation/fix routes.
- Detect missing classification when an exact candidate exists.
- Describe terminal reviewer access/retention constraints.
- Exclude preflight, reviewer-only, inherit, uncapped, unresolved, and
  non-applicable routes.

**Interfaces:**

```typescript
interface DispatchNotice {
  code:
    | 'managed-capped-selection-skipped'
    | 'managed-capped-classification-missing'
    | 'terminal-reviewer-eligibility';
  level: 'warning' | 'advisory';
  message: string;
}
```

### Dispatch Report V1

**Purpose:** Persist classification and notices without changing existing field
meanings.

**Responsibilities:**

- Add nullable classification and an ordered notice collection.
- Default old producers to null/`not-reported` classification and `[]` notices.
- Preserve stable ordered serialization and human formatting.
- Leave the compatibility `Dispatch:` stamp unchanged.

### Terminal Reviewer Disclosure

**Purpose:** Make the configured review target and user-owned constraints
explicit.

**Responsibilities:**

- Describe recommendation defaults conditionally during adoption and choices.
- Match the effective resolved target at runtime.
- Avoid inferring runtime target from recommendation version because explicit
  cells may be preserved.
- Avoid claiming that availability probing establishes organizational retention
  eligibility.

## Data Models

```typescript
interface DispatchReportClassification {
  taskClass: DispatchTaskClass | null;
  preferredEffort: string | null;
  source: 'caller' | 'not-reported';
}

interface DispatchReportV1 {
  // Existing fields remain unchanged.
  classification: DispatchReportClassification;
  notices: DispatchNotice[];
}
```

`classification` is top-level so it remains separate from policy and selection.
New builders always emit the additive fields; legacy callers receive safe
defaults. Resolver and configuration envelopes may reuse `DispatchNotice`, but
notice derivation remains owned by each command's effective context.

## API Design

### Classification Flags

- `--task-class <class>`: provider-neutral implementation/fix classification.
- `--preferred-effort <effort>`: Codex classification provenance, separate from
  candidate selection.

Classification flags require implementation/fix report context and are invalid
for reviewers. They do not satisfy or replace exact-candidate requirements.

### Notice Behavior

- `managed-capped-selection-skipped`: no exact candidate; resolver selected the
  cap.
- `managed-capped-classification-missing`: exact candidate supplied but no task
  class recorded.
- `terminal-reviewer-eligibility`: effective reviewer target requires access and
  applicable retention-policy confirmation.

Notices preserve resolution status and exit code. Human output renders them
after resolution; JSON includes the same coded objects and report
classification.

### Disclosure Behavior

Adoption output states the recommendation's terminal target conditionally
because explicit cells may remain unchanged. Runtime output derives disclosure
from the actual effective target. High and custom non-Fable Frontier targets do
not receive the Fable disclosure.

## Error Handling

- Invalid task-class values, provider-inapplicable preferred efforts,
  conflicting controls, or reviewer classification are CLI input errors with
  exit code `1`.
- Missing candidate or classification on an actual managed-capped
  implementation/fix route produces coded warnings, not errors.
- Existing unresolved/blocked policy and ladder behavior remains authoritative.
- Policy-only preflight is excluded from skipped-selection warnings.
- Terminal reviewer disclosure is advisory.
- JSON notices are the source of truth; logger output is only a rendering.
- Compatibility stamps remain parseable and unchanged.

## Testing Strategy

### Resolver and Command Tests

- Missing candidate on managed-capped implementation/fix emits
  `managed-capped-selection-skipped`.
- Candidate without task class emits
  `managed-capped-classification-missing`.
- Deliberate at-cap and below-cap candidates with classification remain
  successful and preserve classification.
- Above-cap candidate retains its existing error.
- Preflight, reviewer, inherit, uncapped, and unresolved paths emit no false
  implementation/fix warning.

### Dispatch Report Tests

- Legacy producers receive nullable defaults.
- Ordered JSON serialization includes classification and notices.
- Human formatting renders the new fields.
- Gate report producers remain compatible.
- `formatDispatchStamp()` output is byte-for-byte unchanged.

### Disclosure Tests

- Recommendation adoption/choices identify the default terminal reviewer.
- Preserved explicit cells are described conditionally.
- Runtime disclosure appears only when the effective reviewer target matches
  the constrained target.
- High and custom non-matching Frontier targets do not receive the disclosure.

### Integration and Contract Tests

- CLI help and end-to-end JSON include the new flags and fields.
- Implementation skill command examples pass classification.
- Skill tests pin the runtime warning/disclosure contract.
- Docs explain access versus retention eligibility.

### Verification Commands

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/dispatch-ceiling/index.test.ts \
  src/providers/identity/dispatch-report.test.ts \
  src/commands/config/index.test.ts \
  src/config/dispatch-policy-options.test.ts \
  src/commands/commands.integration.test.ts \
  src/commands/help-snapshots.test.ts \
  src/commands/gate/index.test.ts \
  src/validation/skills.test.ts
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm build:docs
pnpm release:validate
```

## References

- Backlog:
  `.oat/repo/pjm/backlog/items/BL-260727-surface-implementer-dispatches.md`
- Discovery: `discovery.md`
- Resolver:
  `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Dispatch report:
  `packages/cli/src/providers/identity/dispatch-report.ts`
- Dispatch guidance:
  `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
