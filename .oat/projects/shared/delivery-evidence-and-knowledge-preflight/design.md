---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-30
oat_generated: false
oat_template: false
---

# Design: delivery-evidence-and-knowledge-preflight

## Overview

Four fixes share one PR. Three live in the goal-mode delivery evidence code
under `packages/cli/src/commands/project/` (`delivery/`, `closeout-check/`,
`journal-check/`); the fourth is a canonical skill,
`.agents/skills/oat-repo-knowledge-index/SKILL.md`.

The evidence fixes stay inside the existing fail-closed bookkeeping-successor
model (brief contract §12.8). They change _which_ heads a stacked delivery's
exit carrier is judged against (#383), _which_ artifacts count as bookkeeping
paths for a carrier the gate itself produced (#384), and _when_ an
append-only journal violation is reported (#385). None of them loosens the
set-once delivery-field unlock, which still comes only from a delivery's own
Reviews rows.

The skill fix (#355) reorders the knowledge-index workflow so a usable mapper
route is resolved through `oat-dispatch-subagents` before anything is deleted
or written, and moves every provider-specific launch control into a
per-provider route so Claude, Codex and Cursor each launch the installed
`oat-codebase-mapper` role correctly.

## Architecture

### System Context

`oat project delivery check|refresh` and `oat project closeout-check` all
judge evidence through `delivery/evidence.ts`. `oat project journal check` is
a separate, pure evaluator over the project's three files. The knowledge-index
skill is prose executed by the host agent; it depends on the generic dispatch
engine skill and the installed mapper role projections.

### Data Flow

```text
check.ts / refresh.ts / closeout-check  ──►  deliveryEvidenceScope()  ──►  EvidenceScope
                                     │                                   (+ gate artifacts, #384)
                                     └──►  carrierPublishedHeads()  ──►  evaluateGateCarrier()
                                            (tip for stack, #383)

journal check  ──►  evaluateJournal()  +  journalRewrites(HEAD blob, working file)   (#385, goal mode)
```

## Component Design

### Stack-aware carrier heads (#383)

- **Purpose:** judge a stack's exit carrier against the stack tip.
- **Responsibilities:** a shared helper in `delivery/evidence.ts` returns the
  heads an exit carrier is evaluated against: for `kind: stack`, only the last
  member's `observed_head`; otherwise every member's (unchanged). For a stack,
  each lower member's `observed_head` must be an ancestor of (or equal to) the
  tip's; a violation yields `freshness: stale` with a distinct
  `stack-order` reason, and an unobserved member (`null` head) stays stale as
  today.
- **Interfaces:** used by `check.ts`, `refresh.ts` and
  `closeout-check/index.ts` in place of the three inline
  `delivery.members.map((m) => m.observed_head)` expressions passed to
  `evaluateGateCarrier`. `evaluateDeliveryReview` is unchanged (per-member
  review already works for stacks).
- **Milestone/delivery agreement:** for a milestone subject whose milestone
  has a registered, non-superseded delivery, `check.ts` builds the evidence
  scope with `deliveryEvidenceScope` for that delivery (reusing the existing
  latest-non-superseded selection that `refresh.ts` applies) so the milestone
  scope carries `ownEvidenceArtifacts`. A milestone with no registered
  delivery keeps today's `mNN`-row scope.
- **Refresh write:** unchanged mechanism; once heads are tip-based, refresh no
  longer writes a `not-ancestor` reason that only applied to a lower layer.

### Gate-originated artifact admission (#384)

- **Purpose:** let the configured exit gate's own artifact commit be a
  bookkeeping successor of the carrier it produced.
- **Rule:** a code-review row is a _gate evidence row_ for a carrier when its
  `invocation` is `gate`, its `reviewedHead` is non-placeholder and equals the
  carrier's `reviewed_head`, and its artifact is non-placeholder. Its artifact
  (and archived counterpart, via the existing `artifactVariants`) joins
  `EvidenceScope.evidenceArtifacts` only.
- **Isolation (must hold):** gate evidence rows are never added to
  `ownEvidenceArtifacts`, and never selected as a milestone's or delivery's
  integrated-review row. The existing `reviewRowsFor` label matching
  (`mNN`, `dNN`) already excludes a `final` row; the new admission does not
  change that selection.
- **Interfaces:** a helper (for example `gateEvidenceArtifacts(reviews,
carrier)`) called where scopes are built: the milestone branch of
  `check.ts`, and `deliveryEvidenceScope` (extended to receive the relevant
  carrier — the milestone working carrier for check/refresh, the delivery's
  `exit_gate` for closeout — through its project input, without changing its
  existing callers' behavior when no carrier is supplied).
- **Docs:** reconcile `oat-project-implement`
  `references/completion-and-closeout.md` goal-mode exit-gate wording with the
  verbatim configured command (`--review-scope final`), state that the gate's
  own row is admitted as bookkeeping, and that no placeholder row is needed.
  Add the admission to brief contract §12.8's path list.

### Journal rewrite detection (#385)

- **Purpose:** report the same rewrite `judgeJournalChange` rejects, at
  journal-check time.
- **Shared rule:** refactor `judgeJournalChange` in `delivery/evidence.ts`
  into an exported function that lists every offending line
  (`journalRewrites(before, after)` returning line text plus kind: rewritten
  line or extraction marker), with `judgeJournalChange` returning the first as
  its `Verdict`. Behavior of the delivery evaluator is unchanged.
- **Journal check:** for goal projects only (state `oat_workflow_mode: goal`),
  `oat project journal check` reads `HEAD:<projectDir>/implementation.md`
  through an injectable git dependency and adds one
  `journal-line-rewritten` reason per offending line (path
  `implementation.md`, line `null` or the working-file line when locatable).
  No committed version (new file, or no repository HEAD) adds no reason. Other
  workflow modes are unaffected.
- **Reason code:** add `journal-line-rewritten` to `JournalReasonCode` and
  whatever reason registry/docs enumerate codes.

### Knowledge-index dispatch preflight (#355)

- **Purpose:** never mutate knowledge before a usable mapper route exists, and
  launch mappers correctly on Claude, Codex and Cursor.
- **New ordering:** Step 1 (existing knowledge + user choice) → **new
  dispatch-route preflight** → Step 2 ownership cleanup → Step 3 SHAs → Step 4
  thin index → mapper launches → collection → verify.
- **Preflight:** load `oat-dispatch-subagents` using the same
  probe-and-bind wording `oat-repo-improve` uses (`${SKILL_DIR}/..`,
  `${HOME}/.agents/skills`, `<repo-root>/.agents/skills`), read the
  model-selection principles and the one matching provider selection and
  mechanics references, and classify capability as `available`,
  `authorization-required` (ask once for all mapper lanes), or
  `unresolved-or-unsupported`. Only `available` (after any authorization)
  continues; otherwise stop with an actionable message before Step 2, leaving
  generated and manual knowledge unchanged.
- **Write mode:** the background write-permission probe moves ahead of Step 2
  and runs only on a resolved route. A probe worker that did not launch is a
  route failure (stop), not read-only mode; read-only fallback requires a
  launched worker that reported `WRITE_BLOCKED`.
- **Routes:** mapper launch blocks become provider-neutral requests (role
  `oat-codebase-mapper`, class `recon`, bounded objective, output file,
  deadline) dispatched through the engine. Claude-specific controls (`haiku`,
  `run_in_background`, `Explore`) appear only in a labelled Claude route; Codex
  and Cursor use the installed role projection and the engine's mechanics
  references. Step 6b's hard-coded `/private/tmp/claude-502/...` path is
  replaced by the accepted handle's returned output.
- **Unchanged:** owned-output protection (`refresh-owned.mjs`), templates and
  frontmatter, manual-note handling, and the final verify step.
- **Version:** bump the skill's `metadata.version`.

## Error Handling

- Evidence code stays fail closed: missing objects, unknown paths, failed
  inspection and stack-order violations are `stale`, never `fresh`.
- `journal check` treats an unreadable committed version as "no comparison"
  only when Git proves the file is untracked at HEAD; any other Git failure is
  a command error rather than a silent pass.
- The skill stops before mutation on any unresolved dispatch capability.

## Testing Strategy

- **Unit (evidence):** stack helper (linear stack fresh at tip; lower layer
  not an ancestor → `stack-order`; unobserved member → stale; `kind: pr`
  multi-head unchanged). Gate admission (gate row with matching head admitted
  as bookkeeping; manual `final` row rejected; gate row with a different
  reviewed head rejected; gate artifact never in `ownEvidenceArtifacts`; gate
  row never selected as the integrated review). `journalRewrites` lists every
  offending line and `judgeJournalChange` still refuses the existing fixture.
- **Command-level:** multi-member fixtures for `delivery check`, `delivery
refresh` and `closeout-check` through the production scope builder (§12.8
  negative-control requirement); milestone/delivery subject agreement after a
  member's reviewed head moves with a new own artifact; `journal check` on a
  goal fixture with an in-place edit reports `journal-line-rewritten`, an
  append passes, and a quick project is unaffected.
- **Can-fail proof:** for each P0 guard (tip selection, stack order, gate
  head binding, own-evidence isolation, journal rewrite), neutralize the guard,
  confirm the test fails, restore — reported in `implementation.md`.
- **Skill:** shared and validation contract suites
  (`src/commands/init/tools/shared`, `src/validation`) and the skill's own
  `tests/refresh-owned.test.mjs`; add or update a contract pin that the
  preflight precedes ownership cleanup and that no Claude-only launch argument
  appears outside the Claude route.
- **Gates:** the AGENTS.md Definition of Done gate list, captured with
  explicit exit codes.
