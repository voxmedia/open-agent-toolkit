---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-29
oat_generated: false
---

# Discovery: Structured Output Contract for Gate Configuration

> Discovery status: initial, non-exhaustive starting point. This artifact is a
> bounded starting point, not a complete specification. Revalidate it in a
> fresh thread/worktree after PR #190 is dogfooded; it may be subsumed or
> narrowed before plan generation.

## Phase Guardrails (Discovery)

This quick discovery captures a bounded configuration contract. It does not
authorize implementation or define the complete review/gate receipt schema.

## Initial Request

Create the standalone quick-start follow-up for the structured-output contract
used by configured gate commands. The existing backlog item reports that a
configured command invoking `oat gate review` can omit the global `--json` flag,
causing human-oriented process output to reach an orchestrator that expects a
structured envelope. The flag is valid before or after the subcommand; a
provider exec target’s own output flag is a separate concern.

The linked backlog item is
[`BL-260726-validate-structured-output` — Validate structured-output contract
in gate skill commands](../../../repo/pjm/backlog/items/BL-260726-validate-structured-output.md).
This project is related to the spec-driven
[`review-gate-integrity` — Review and Gate Integrity](../review-gate-integrity/)
project and the existing
[`review-plan-workflow` — ReviewPlan-first reviewer workflow](../review-plan-workflow/).

## Problem Statement

`oat gate set --command` accepts a command string as configuration. A command
that invokes `oat gate review` without the CLI’s global JSON mode can still run,
but its consumer cannot reliably determine status, receive eligibility, or
artifact handoff from prose. The failure appears later as an operational gate
problem rather than at configuration time.

The desired work is deliberately narrow: identify the command family that
requires structured output, warn at configuration time without blocking a
deliberate non-JSON command, and surface already-drifted entries through the
closest existing health diagnostic. Do not design the complete review/gate
receipt envelope here; that belongs to the broader integrity project.

## Evidence and Current Baseline

- `packages/cli/src/commands/gate/index.ts` exposes the gate review command and
  structured-result path; exact global-option parsing must be confirmed during
  fresh discovery.
- The backlog evidence says Commander accepts `--json` before or after the
  subcommand and both forms produce equivalent JSON. The problem is absence,
  not position.
- The backlog evidence also says `--json` belongs on the `oat` invocation, not
  an exec target’s `baseCommand`; provider-native tools have their own output
  flags and must not receive an OAT flag accidentally.
- Existing config command tests live under `packages/cli/src/commands/config/`;
  gate/config tests live under `packages/cli/src/commands/gate/` and
  `packages/cli/src/config/`.
- The current gate configuration schema describes structured gates at
  `packages/cli/src/config/oat-config.ts:175-203`; `oat gate set` writes the
  command without a JSON-contract check at
  `packages/cli/src/commands/gate/index.ts:962-990`. The current test at
  `packages/cli/src/commands/gate/index.test.ts:850-869` accepts a missing
  `--json`, so discovery should verify whether this is still the desired
  compatibility behavior after the assumed PR #227 baseline.
- `oat pjm doctor` is the proposed diagnostic home for existing drift, but the
  exact current doctor check and config-entry traversal must be verified.
- The broader gate tests around configuration and provenance at
  `packages/cli/src/commands/gate/index.test.ts:5811-5908`, `:5930-6004`,
  and `:6382-6455` should be reused or extended so option placement, persisted
  command shape, and provider `baseCommand` isolation are tested together.
- PR #190 changes structured output, gate correlation, and validation surfaces.
  It is not merged in the current checkout and may reduce this project to a
  smaller residual or a closeout-only task.

## Clarifying Questions

### Question 1: Warn or block?

**Q:** Should a missing `--json` warning prevent writing the configured gate?

**A:** No. The existing backlog acceptance says to warn and allow a deliberate
non-JSON gate to remain possible.

**Decision:** Preserve warning-only configuration behavior unless fresh
revalidation uncovers a stronger compatibility requirement.

### Question 2: What gets validated?

**Q:** Should validation inspect every command string for JSON, or only commands
that invoke `oat gate review`?

**A:** Only `oat gate review` commands require the OAT structured envelope. A
provider exec target’s command is not an OAT gate command and must not be
rewritten by this check.

**Decision:** Scope validation to the OAT gate-review invocation family.

### Question 3: Is this still standalone after PR #190?

**Q:** Does PR #190 already validate the configuration and envelope at this
same boundary?

**A:** Unknown until dogfood/merge comparison.

**Decision:** Keep the scaffold, but block plan generation until residual
ownership is recorded.

## Solution Space

### Approach 1: Shared command-shape validator plus doctor reporting _(Recommended)_

Parse configured command strings just enough to recognize OAT gate-review
invocations and detect the global JSON flag in either accepted position. Reuse
the same pure validator for `gate set` warning and doctor reporting.

This is the right choice when configuration remains a string and the contract
is syntactic rather than a full shell parser. It requires careful tokenization
and shell-wrapper handling, but avoids duplicated checks and keeps the command
writable.

### Approach 2: Strict command parser/schema

Normalize configured commands into a typed OAT command schema and reject or
rewrite invalid gate entries. This is appropriate when a schema migration is
ready, but it materially expands compatibility and conflicts with the current
warning-only acceptance.

### Approach 3: Consumer-side fallback

Let gates run without JSON and make lifecycle consumers parse human output or
infer status when structured output is absent. This might bridge old configs,
but preserves drift and makes eligibility ambiguous; it is not recommended.

### Chosen Direction

**Approach:** Approach 1, provisional pending PR #190 revalidation.

**Rationale:** It addresses the confirmed configuration defect at entry,
preserves deliberate non-JSON commands, and gives doctor a shared read-only
view of existing drift.

**User validated:** Directionally yes through the decision to keep this as a
possible standalone quick project; formal discovery approval is not recorded.

## Options Considered

### Option A: Token-level recognition versus shell execution

**Choice:** Token-level recognition with conservative unknown handling.

Executing arbitrary configured commands to discover flags is unsafe and
non-deterministic. The validator should recognize supported OAT command shapes
and report unknown wrappers for human review rather than guess.

### Option B: Gate-set warning versus hard failure

**Choice:** Warning-only, matching the existing backlog acceptance.

Existing users may intentionally configure a non-JSON gate or a legacy command;
warning preserves compatibility while making the contract visible.

## Key Decisions

1. **Workflow:** Quick-start because the residual contract is small and
   syntactically bounded.
2. **Validation target:** Only OAT gate-review command invocations, not
   provider exec target commands.
3. **Flag position:** Accept global `--json` before or after the subcommand.
4. **Configuration behavior:** Warn without blocking the write.
5. **Diagnostics:** Surface existing omissions through a read-only health
   check, preferably PJM doctor if that remains the correct owner.
6. **PR #190:** Reconcile first; narrow or retire this project if the landed
   structured-output contract covers it.
7. **Discovery status:** This is non-exhaustive and must be revalidated before
   plan generation.

## Constraints

- Do not put `--json` into a provider exec target’s `baseCommand`.
- Do not silently rewrite a user’s configured command.
- Do not turn a warning into a gate failure without explicit product approval.
- Preserve shell wrappers and unknown command shapes for deliberate human
  review rather than unsafe parsing or execution.
- Do not duplicate the broader source-qualified receipt schema owned by the
  review/gate integrity project.
- CLI/config changes require repository tests, skill/version checks, and
  lockstep release validation.

## Success Criteria

- `gate set` warns when a command invoking `oat gate review` omits global
  `--json`, naming the structured-output contract.
- The warning accepts both supported flag positions and does not block writing.
- The validator does not mistake a provider command’s output flag for OAT JSON.
- Doctor or the agreed health check reports existing invalid gate entries with
  actionable paths/commands without rewriting them.
- Tests cover missing flag, flag before/after subcommand, provider target
  command, wrappers/unknown shapes, and PR #190 compatibility.

## Out of Scope

- Defining the full review/gate provenance envelope or receive state machine.
- Making every configured command JSON-producing.
- Rewriting shell command configuration into a typed AST/schema.
- Provider-specific agent/materialization or restart behavior.
- Implementing PR #190’s ReviewPlan/correlation work.

## Deferred Ideas

- A typed command configuration schema if warning-only validation proves too
  fragile across shell wrappers.
- A migration command that offers to repair known gate strings after explicit
  confirmation.
- A general structured-output capability declaration for non-gate commands.

## Open Questions

- **PR #190 overlap:** Which configuration and envelope checks land, and what
  exact residual remains after dogfood?
- **Parser boundary:** Which wrappers (`env`, `pnpm`, shell `-c`, quoted args)
  are supported, and when should the validator report “unknown” rather than
  “missing”?
- **Flag semantics:** Does repeated `--json` or explicit `--no-json` count as
  compliant, and how are conflicting flags diagnosed?
- **Doctor ownership:** Is PJM doctor canonical, or should gate config
  validation own the diagnostic with doctor consuming it?
- **Legacy behavior:** How are existing configs versioned, and how is the
  warning stable across CLI versions?
- **Output contract:** What minimum JSON envelope is required beyond the global
  flag, and is that contract already supplied by PR #190?
- **Testing:** Can fixtures validate tokenization without invoking arbitrary
  user commands?
- **Release:** Does a config-only change require all bundled skill and public
  package version updates under current policy?

## Assumptions

- The warning-only requirement remains the intended compatibility policy.
- Commander’s accepted global-flag positions remain stable after PR #190.
- The current config representation remains a command string for this slice.
- PR #190 may reduce this project to a small validation/doctor residue.

## Risks

- **False warning:** A supported wrapper is classified as missing JSON.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Conservative parser fixtures and explicit unknown
    diagnostics instead of guessed noncompliance.
- **False compliance:** A provider-native `--output-format json` is mistaken
  for OAT `--json`.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Recognize only the OAT command token boundary and
    test provider target commands separately.
- **Duplicate work:** PR #190 already owns the validator.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Revalidate after merge and narrow or retire before
    planning.

## Dependencies and Related Work

- [`review-gate-integrity` — Review and Gate Integrity](../review-gate-integrity/)
- [`review-plan-workflow` — ReviewPlan-first reviewer workflow](../review-plan-workflow/)
- [PR #190 — ReviewPlan Stage A compatibility release](https://github.com/voxmedia/open-agent-toolkit/pull/190)
- [`BL-260726-validate-structured-output` — Validate structured-output
  contract in gate skill commands](../../../repo/pjm/backlog/items/BL-260726-validate-structured-output.md)

## References

- `packages/cli/src/commands/gate/index.ts`
- `packages/cli/src/commands/config/`
- `packages/cli/src/commands/pjm/`
- `packages/cli/src/config/`

## Next Steps

1. Revalidate command/config behavior against merged PR #190.
2. Confirm the exact parser and diagnostic owner.
3. Complete discovery and generate a quick plan only if residual ownership
   remains independent.
