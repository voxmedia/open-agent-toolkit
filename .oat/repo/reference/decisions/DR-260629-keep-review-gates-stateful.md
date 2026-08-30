---
id: DR-260629-keep-review-gates-stateful
title: Keep review gates stateful and trusted target flags user-configured
date: 2026-06-29
status: accepted
legacy_id: ADR-023
---

### ADR-023: Keep review gates stateful and trusted target flags user-configured

- **Date:** 2026-06-29
- **Status:** accepted
- **Drivers:** Dogfood showed that a cross-provider review can report blocking findings while the provider process exits 0. The fix needs semantic review-gate status without turning reviews into read-only checks or baking provider approval bypass flags into OAT defaults.
- **Related:**
  - `.oat/projects/shared/workflow-gate-improvements/`
  - `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
  - `.oat/repo/pjm/backlog/items/BL-260830-re-evaluate-same-target-gate.md`

#### Context

The original V1 gate executor, `oat gate cross-provider-exec`, deliberately
returned only the child process status. That is still the right contract for
generic cross-runtime prompts, but it is not enough for review gates: a normal
review workflow writes an artifact with findings and may complete successfully
from the provider's process perspective.

The follow-up also surfaced provider permission concerns. Trusted
noninteractive review gates may need flags that let Codex, Claude, or Cursor run
tools without pausing for approval prompts, but those flags are environment
trust decisions rather than safe global defaults.

#### Options Considered

1. **Make `cross-provider-exec` parse review output.** Rejected because it would
   make the generic executor review-aware and blur child-status semantics.
2. **Add read-only gate review mode.** Rejected because the project decision is
   that gate reviews are normal `oat-project-review-provide` runs.
3. **Add a review-specific gate path and document trusted target config.**
   Chosen.

#### Decision

`oat gate review` is the review-specific gate path. It dispatches through the
target registry, resolves the produced review artifact, and maps configured
blocking findings to gate exit status. `oat gate cross-provider-exec` remains a
generic executor that exits with the child process status for arbitrary prompts.

Gate reviews stay stateful and equivalent to running
`oat-project-review-provide` in another terminal or provider. Review artifacts,
Reviews row updates, and bookkeeping commits are expected. Gate-produced review
artifacts use `oat_review_invocation: gate`; after an artifact is produced, the
host must run or hand off to `oat-project-review-receive` before treating the
review as dispositioned.

Trusted noninteractive provider flags are user-level gate target configuration,
not built-in OAT defaults. Examples may show Codex
`--dangerously-bypass-approvals-and-sandbox`, Claude
`--dangerously-skip-permissions` or `--permission-mode bypassPermissions`, and
Cursor `--force`/`--yolo`, but users must opt into them through
`workflow.gates.execTargets`.

Gate target model/effort config remains explicit. OAT does not infer gate target
selection from `workflow.dispatchCeiling` or phase dispatch ceilings; those
ceilings remain implementation/review dispatch controls. Same-target and
model-level target detection remain deferred to `bl-e6fc`.

Reusable lifecycle gate commands should normally omit exact `--target <id>` pins
so `oat gate review` and `cross-provider-exec` can avoid the current runtime.
Target definitions remain explicit user/shared/local config, but bundled skill
guidance and shared lifecycle examples should not hardcode provider or model
targets. Exact target pins are reserved for manual dispatch, debugging, or a
deliberate local/user-specific override.

#### Consequences

- Positive:
  - Review gates can block on blocking findings without changing generic
    `cross-provider-exec` behavior.
  - The handoff to `oat-project-review-receive` is explicit and durable.
  - Dangerous provider permission flags remain a user trust/config choice.
- Trade-offs:
  - Users who want fully unattended trusted gates must configure exec targets
    explicitly.
  - Gate target effort/model selection remains separate from dispatch ceilings,
    so users must keep both surfaces intentional.

#### Follow-ups

- Keep `bl-e6fc` scoped to same-target/model-level detection rather than V1
  review semantics.

---
