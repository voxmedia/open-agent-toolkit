---
oat_template: true
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-15
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: []
oat_plan_parallel_groups: []
oat_plan_source: lite
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Lite Plan: recon-1-1-2-follow-ups

**Goal:** Remove the avoidable orchestration complexity behind the remaining recon 1.1.2 failures while preserving fail-closed evidence and approval guarantees.

## Summary

Harden the standalone `recon` workflow around five cohesive seams: Cursor leaf
background execution, artifact-versus-stream outcome precedence, reliable
bundled CLI entry detection, worker-facing excerpt and closed-schema guidance,
and deterministic controller-owned reconciliation. The implementation keeps
the current exact-target approval and generic-role fallback boundaries, removes
the redundant reconciliation worker responsibility, and does not add locator
repair or a controller retry state machine.

## Decisions

- **Content shape:** `both` — the change alters observable recon behavior and
  crosses worker, controller, schema, CLI, provider projection, and public-docs
  contracts.
- Every Cursor recon leaf launches in background. The canonical
  `recon-worker` declares `is_background: true`, and recon Step 5 explicitly
  requires background launch for the pre-approved generic fallback too.
- A valid artifact at the approved path wins over a later transport stream
  error: when identity, schema, bytes, and digest validate, the lane is
  complete, the provider error is diagnostic, and no replacement launches.
- Cursor role installation and live Task discovery are separate facts. Use
  `recon-worker` when the current Task catalog exposes it; otherwise retain the
  visible, pre-approval generic background fallback. Do not add catalog-forcing
  materialization logic or require a live Cursor probe in this project.
- Workers validate and correct their sole unpromoted artifact within the same
  accepted task before returning. A terminal invalid write remains
  `PASS_FAILED`; there is no controller schema-retry or replacement-child
  lifecycle.
- Compile excerpts must be contiguous substrings of the cited source, apart
  from the existing explicit redaction representation. The candidate fails
  before review when that invariant does not hold.
- Reconciliation is a deterministic controller stage using
  `reconcileLedger()`, not a dispatched worker mode. The controller writes and
  validates the reconciliation result and candidate ledger, then promotes only
  the validated candidate to `claims.json`.
- Revise the existing triage record to reflect these accepted dispositions and
  include it in the implementation PR.
- **Approval:** the user approved this recorded requirement set and plan on
  2026-09-14 (America/Chicago), then selected the High managed dispatch ceiling.

## Product Behavior

1. **Cursor continuity** — every recon leaf started from Cursor is a background
   task, so a new parent chat message does not classify the interrupted parent
   turn as a worker crash.
2. **Durable lane completion** — a schema-valid, lane-matching, digestable
   artifact is accepted even if the RPC stream closes after the write; invalid
   or missing output still fails closed and never causes a replacement launch.
3. **Truthful role availability** — recon prefers the installed custom worker
   only when the current launch catalog exposes it and otherwise shows the
   generic background fallback before approval.
4. **Reliable bundled commands** — direct and symlinked invocation of every
   recon CLI runs `main()` or exits nonzero with a diagnostic; it never exits
   zero after silently doing nothing.
5. **Actionable worker output rules** — compile workers copy exact source spans,
   review workers receive compact valid JSON examples, and workers self-check
   their sole artifact before returning.
6. **Unambiguous reconciliation ownership** — standard and thorough runs have
   one controller-owned deterministic reconciliation stage with two named
   outputs and no synthetic worker launch or two-output worker envelope.

## Technical Design

- **Current operation:** `.agents/skills/recon/SKILL.md` delegates every
  manifest wave to `.agents/agents/recon-worker.md`. The role lacks Cursor's
  background field; accepted transport errors are described only as lane
  failures; five scripts compare unresolved entry URLs; worker contracts offer
  prose but no closed JSON examples; and the terminal `reconcile` worker is
  authorized for one artifact even though `reconcileLedger()` returns both a
  ledger and reconciliation result.
- **Proposed changes:** prove model-pinned Cursor materialization in
  `packages/cli/src/providers/cursor/codec/materialize.ts` preserves the
  canonical role's `is_background: true`; the generic Cursor view is a symlink
  and needs no projection. Centralize
  realpath-aware direct-execution detection under
  `.agents/skills/recon/scripts/lib/`. Tighten closed-schema validation and
  worker instructions. Remove `reconcile` from the worker vocabulary and from
  approved launch topology, then make the controller call
  `.agents/skills/recon/scripts/reconcile-ledger.mjs` once after review inputs
  are final. Add an `execution.reconciliation` manifest object containing the
  literal producer `controller:reconcile-ledger-v1` and exact input-ledger,
  output-ledger, output-review, and required/conditional review paths. Keep the
  reconciliation result as deterministic audit evidence; its existing
  `reviewerLane` field uses that reserved producer literal and validation
  accepts it only when every value matches the manifest object.
- **Data flow:** approved background leaves write unique unpromoted candidate
  artifacts; the controller validates the assigned path and digest before
  interpreting transport status; compile emits a candidate ledger; independent
  review results and any contradiction evidence feed `reconcileLedger()`; its
  two named outputs, `raw/drafts/claims-v2.json` and
  `reviews/reconciliation.json`, are validated together; the controller copies
  the exact validated ledger bytes to a packet-contained temporary file and
  atomically renames it to canonical `claims.json`. Reconciliation remains a
  profile-required pass derived from the manifest-bound controller artifact,
  independently of worker execution waves.

## Assumptions

- Cursor honors `is_background: true` when it discovers the materialized custom
  agent; current-session discovery itself remains a volatile provider fact.
- Existing generic-role fallback and exact-target approval behavior remain
  correct and are not redesigned.
- `reconcileLedger()` can remain deterministic over validated ledger and review
  inputs; a need for new semantic judgment is an unresolved gap for the calling
  agent, not a reason to dispatch a stronger reconciliation worker.
- The work fits one focused implementation sitting because it removes two
  proposed state machines and stays inside recon, its Cursor projection test,
  public recon docs, triage evidence, and release metadata.

## Out of Scope

- A post-reconciliation locator-repair revision or mutation of byte-frozen
  evidence.
- Controller retries after an accepted task returns terminal invalid output.
- New per-model Cursor agent materialization or changes intended to force the
  live Cursor Task catalog to refresh.
- A live Cursor catalog/launch acceptance run, Cursor product changes, or claims
  that installation alone proves launchability.
- Reopening the session-local approval, per-wave routing, or caller-owned final
  judgment decisions.
- New public GitHub issues or unrelated recon integrations tracked elsewhere.

## Validation Criteria

- [ ] `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/materialize.test.ts && node --test .agents/skills/recon/tests/skill-contract.test.mjs` proves canonical and model-pinned materialized Cursor recon workers retain `is_background: true`, both custom and generic fallback routes require background launch, and a materialized role file is not treated as live Task-catalog evidence.
- [ ] `node --test .agents/skills/recon/tests/workflow.integration.test.mjs` proves a post-write stream-close completes only for a valid approved-path artifact, invalid output remains `PASS_FAILED`, and neither case relaunches.
- [ ] `node --test .agents/skills/recon/tests/cli-entry.test.mjs` proves canonical and symlink invocations of every bundled CLI, including `reconcile-ledger.mjs`, reject the reproduced exit-zero/no-output failure.
- [ ] `node --test .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs` proves paraphrased excerpts and non-string `unresolvedIssues` fail while valid excerpts and every remaining review example pass.
- [ ] `node --test .agents/skills/recon/tests/routing-contracts.test.mjs .agents/skills/recon/tests/routing-preview.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs` proves routing dispatches no reconciliation worker and one controller stage safely promotes two named outputs.
- [ ] `node --test .agents/skills/recon/tests/*.test.mjs` proves the complete recon regression suite passes.
- [ ] `pnpm oat:validate-skills && pnpm run check:skill-bumps && pnpm release:check-versions && pnpm release:validate && pnpm build:docs` proves canonical skills, versions, public docs, bundled assets, packages, and triage agree.
- [ ] `pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm lint && pnpm format` proves CI-equivalent and explicitly ungated affected surfaces pass with captured exit codes.

## Parallelism

This plan has one phase and executes sequentially.

## Phase 1: Simplify and harden recon execution

### Task p01-t01: Make Cursor background launch and artifact completion explicit

**Files:**

- Modify: `.agents/agents/recon-worker.md`
- Modify: `.agents/skills/recon/SKILL.md`
- Modify: `.agents/skills/recon/references/worker-contract.md`
- Modify: `.agents/skills/recon/tests/skill-contract.test.mjs`
- Modify: `.agents/skills/recon/tests/workflow.integration.test.mjs`
- Modify: `packages/cli/src/providers/cursor/codec/materialize.test.ts`

**Implementation and Proof Strategy:**

- **Strategy:** test-first development
- **Observable risk:** Cursor recon leaves remain foreground, or a durable valid
  artifact is discarded because the return stream closes after the write.
- **Why proportionate:** focused contract and integration controls exercise the
  exact provider projection and the valid/invalid artifact precedence without
  depending on a volatile live Cursor session.

**Step 1: Implement**

First add failing assertions for canonical/materialized background frontmatter,
custom and generic Cursor background prose, and valid-artifact-over-stream
precedence. Then add `is_background: true`, require all Cursor recon launches to
be background, explain parent-turn interruption, and make approved-path
validation authoritative over a later transport error while retaining terminal
failure and no-replacement behavior for invalid output. State explicitly that a
materialized `.cursor/agents/recon-worker.md` file is not evidence that the
current Cursor Task catalog can launch that role; routing uses the observed live
catalog and retains the pre-approved generic fallback when the role is absent.

**Step 2: Prove**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/materialize.test.ts && node --test .agents/skills/recon/tests/skill-contract.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs`
Expected: the background assertions and both stream-close controls pass; removing
the background field or precedence rule makes the focused test fail.

**Step 3: Refactor and format**

Keep Cursor launch grammar in the provider mechanics reference and only state
recon's required outcome. Run:
`pnpm exec oxfmt --write .agents/agents/recon-worker.md .agents/skills/recon/SKILL.md .agents/skills/recon/references/worker-contract.md .agents/skills/recon/tests/skill-contract.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs packages/cli/src/providers/cursor/codec/materialize.test.ts`

**Step 4: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/materialize.test.ts && node --test .agents/skills/recon/tests/skill-contract.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs`
Expected: no errors.

**Step 5: Commit**

```bash
git add -- .agents/agents/recon-worker.md .agents/skills/recon/SKILL.md .agents/skills/recon/references/worker-contract.md .agents/skills/recon/tests/skill-contract.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs packages/cli/src/providers/cursor/codec/materialize.test.ts
git commit -m "fix(p01-t01): keep Cursor recon leaves durable"
```

---

### Task p01-t02: Make recon CLI entry detection realpath-safe

**Files:**

- Create: `.agents/skills/recon/scripts/lib/cli-entry.mjs`
- Create: `.agents/skills/recon/tests/cli-entry.test.mjs`
- Modify: `.agents/skills/recon/scripts/validate-artifact.mjs`
- Modify: `.agents/skills/recon/scripts/create-review-brief.mjs`
- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/scripts/render-packet.mjs`
- Modify: `.agents/skills/recon/scripts/prepare-routing.mjs`

**Implementation and Proof Strategy:**

- **Strategy:** test-first development
- **Observable risk:** a bundled CLI invoked through a symlink exits zero with
  no output because its `main()` guard compares different path spellings.
- **Why proportionate:** a subprocess matrix over the five actual executables
  preserves the reproduced host failure and proves both direct and symlink
  entry paths rather than testing only the helper.

**Step 1: Implement**

Preserve the current silent-no-op behavior as a failing symlink regression.
Add one realpath-aware ESM direct-entry helper, use it in all five CLIs, and
ensure a direct invocation either reaches `main()` or exits nonzero with a
diagnostic. Preserve import-without-execution behavior for library consumers.

**Step 2: Prove**

Run: `node --test .agents/skills/recon/tests/cli-entry.test.mjs`
Expected: each CLI reaches normal usage/validation behavior through canonical
and symlink paths; the pre-fix guard makes the symlink controls fail.

**Step 3: Refactor and format**

Keep error policy in each CLI and path identity in the shared helper. Run:
`pnpm exec oxfmt --write .agents/skills/recon/scripts/lib/cli-entry.mjs .agents/skills/recon/tests/cli-entry.test.mjs .agents/skills/recon/scripts/validate-artifact.mjs .agents/skills/recon/scripts/create-review-brief.mjs .agents/skills/recon/scripts/validate-packet.mjs .agents/skills/recon/scripts/render-packet.mjs .agents/skills/recon/scripts/prepare-routing.mjs`

**Step 4: Verify**

Run:
`node --test .agents/skills/recon/tests/cli-entry.test.mjs .agents/skills/recon/tests/routing-preview.test.mjs .agents/skills/recon/tests/review-brief.test.mjs .agents/skills/recon/tests/render-packet.test.mjs`
Expected: no errors.

**Step 5: Commit**

```bash
git add -- .agents/skills/recon/scripts/lib/cli-entry.mjs .agents/skills/recon/tests/cli-entry.test.mjs .agents/skills/recon/scripts/validate-artifact.mjs .agents/skills/recon/scripts/create-review-brief.mjs .agents/skills/recon/scripts/validate-packet.mjs .agents/skills/recon/scripts/render-packet.mjs .agents/skills/recon/scripts/prepare-routing.mjs
git commit -m "fix(p01-t02): run recon CLIs through symlinked paths"
```

---

### Task p01-t03: Close worker excerpt and review-result schemas

**Files:**

- Modify: `.agents/agents/recon-worker.md`
- Modify: `.agents/skills/recon/SKILL.md`
- Modify: `.agents/skills/recon/references/worker-contract.md`
- Modify: `.agents/skills/recon/references/packet-contract.md`
- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/tests/skill-contract.test.mjs`

**Implementation and Proof Strategy:**

- **Strategy:** test-first development
- **Observable risk:** workers paraphrase source excerpts, emit structurally
  misleading review JSON, or return without checking the sole candidate they
  are still allowed to correct.
- **Why proportionate:** contract tests pin the worker-facing instructions and
  direct validator controls prove rejection and acceptance at the actual
  publication boundary.

**Step 1: Implement**

Add failing controls for paraphrased excerpts and object-valued
`unresolvedIssues`. Require exact contiguous source substrings with the existing
redaction exception, validate string array members, add compact closed JSON
examples for verify, adversary, and coverage results, and require a worker to
run the supplied validator on its unpromoted `writePath` and correct it within
the same task before returning. Clarify that a terminal invalid return cannot
be retried or replaced.

**Step 2: Prove**

Run:
`node --test .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs`
Expected: exact and redacted-exact controls pass; paraphrased excerpts,
non-string unresolved issues, unknown fields, and missing example clauses fail.

**Step 3: Refactor and format**

Keep examples short and generated-schema-aligned; do not add retry state. Run:
`pnpm exec oxfmt --write .agents/agents/recon-worker.md .agents/skills/recon/SKILL.md .agents/skills/recon/references/worker-contract.md .agents/skills/recon/references/packet-contract.md .agents/skills/recon/scripts/lib/contracts.mjs .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs`

**Step 4: Verify**

Run:
`node --test .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs`
Expected: no errors.

**Step 5: Commit**

```bash
git add -- .agents/agents/recon-worker.md .agents/skills/recon/SKILL.md .agents/skills/recon/references/worker-contract.md .agents/skills/recon/references/packet-contract.md .agents/skills/recon/scripts/lib/contracts.mjs .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs
git commit -m "fix(p01-t03): close recon worker output contracts"
```

---

### Task p01-t04: Move reconciliation to one deterministic controller stage

**Files:**

- Modify: `.agents/agents/recon-worker.md`
- Modify: `.agents/skills/recon/SKILL.md`
- Modify: `.agents/skills/recon/references/profiles.md`
- Modify: `.agents/skills/recon/references/worker-contract.md`
- Modify: `.agents/skills/recon/references/packet-contract.md`
- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/recon/scripts/lib/routing.mjs`
- Modify: `.agents/skills/recon/scripts/lib/validated-run.mjs`
- Modify: `.agents/skills/recon/scripts/reconcile-ledger.mjs`
- Modify: `.agents/skills/recon/scripts/validate-packet.mjs`
- Modify: `.agents/skills/recon/tests/fixtures/packet-fixture.mjs`
- Modify: `.agents/skills/recon/tests/helpers/fake-recon-run.mjs`
- Modify: `.agents/skills/recon/tests/conditional-routing.test.mjs`
- Modify: `.agents/skills/recon/tests/integrity-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/packet-validation.test.mjs`
- Modify: `.agents/skills/recon/tests/render-packet.test.mjs`
- Modify: `.agents/skills/recon/tests/routing-contracts.test.mjs`
- Modify: `.agents/skills/recon/tests/routing-preview.test.mjs`
- Modify: `.agents/skills/recon/tests/skill-contract.test.mjs`
- Modify: `.agents/skills/recon/tests/workflow.integration.test.mjs`
- Modify: `.agents/skills/recon/tests/cli-entry.test.mjs`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Implementation and Proof Strategy:**

- **Strategy:** characterization-first work
- **Observable risk:** removing the dispatched reconciliation wave could weaken
  legal ledger transitions, review incorporation, conditional evidence flow,
  or atomic promotion of the canonical ledger.
- **Why proportionate:** the existing packet fixture and end-to-end fake run
  already characterize these assurance invariants; adapting them while adding
  missing/swapped/tampered output controls directly tests the simplified owner.

**Step 1: Implement**

First preserve the existing valid standard/thorough packet and all invalid
transition controls. Remove `reconcile` from the worker vocabulary and remove
the terminal reconciliation wave and target from approval/routing topology.
Define `execution.reconciliation` as a closed manifest object with producer
`controller:reconcile-ledger-v1`, input ledger
`raw/drafts/claims-v1.json`, output ledger `raw/drafts/claims-v2.json`, output
review `reviews/reconciliation.json`, and exact required plus conditional review
paths. Make `reconcile-ledger.mjs` directly invocable as:

```bash
node reconcile-ledger.mjs \
  --manifest "$PACKET_ROOT/manifest.json" \
  --input-ledger "$PACKET_ROOT/raw/drafts/claims-v1.json" \
  --review "$PACKET_ROOT/reviews/semantic.json" \
  --review "$PACKET_ROOT/reviews/adversarial.json" \
  --review "$PACKET_ROOT/reviews/coverage.json" \
  --output-ledger "$PACKET_ROOT/raw/drafts/claims-v2.json" \
  --output-review "$PACKET_ROOT/reviews/reconciliation.json"
```

Its direct-entry guard uses the shared realpath-aware
`scripts/lib/cli-entry.mjs` helper introduced by p01-t02, and the symlink
subprocess matrix covers this sixth executable.

The controller adds only manifest-declared completed conditional review paths.
The CLI rejects path or review-set drift before writing, calls
`reconcileLedger()` once, writes both candidates, and returns their references.
The reconciliation artifact uses the manifest's reserved producer literal in
`reviewerLane`; other review results still require an approved worker lane.
Packet validation derives the profile's reconciliation pass from this exact
manifest-bound artifact rather than a wave. Only after both outputs validate
and their digests bind to the manifest may the controller copy the exact ledger
bytes to a temporary file and atomically rename it to `claims.json`. Treat a
request for new semantic judgment as an unresolved caller-owned gap rather
than a target escalation.

**Step 2: Prove**

Run:
`node --test .agents/skills/recon/tests/cli-entry.test.mjs .agents/skills/recon/tests/routing-contracts.test.mjs .agents/skills/recon/tests/routing-preview.test.mjs .agents/skills/recon/tests/conditional-routing.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: approval previews contain no reconciliation worker target; valid
packets preserve reconciliation audit and ledger invariants; forged controller
identity, manifest path/review drift, missing, swapped, tampered, or partially
promoted outputs fail closed; canonical and symlink invocation reach the new
controller CLI; and the CLI validation suite pins the new
`controller:reconcile-ledger-v1` wording. Removing the controller stage makes
the positive workflow control fail.

**Step 3: Refactor and format**

Delete obsolete routing and worker branches instead of adding compatibility
aliases. Run:
`pnpm exec oxfmt --write .agents/agents/recon-worker.md .agents/skills/recon/SKILL.md .agents/skills/recon/references/profiles.md .agents/skills/recon/references/worker-contract.md .agents/skills/recon/references/packet-contract.md .agents/skills/recon/scripts/lib/contracts.mjs .agents/skills/recon/scripts/lib/routing.mjs .agents/skills/recon/scripts/lib/validated-run.mjs .agents/skills/recon/scripts/reconcile-ledger.mjs .agents/skills/recon/scripts/validate-packet.mjs .agents/skills/recon/tests/fixtures/packet-fixture.mjs .agents/skills/recon/tests/helpers/fake-recon-run.mjs .agents/skills/recon/tests/cli-entry.test.mjs .agents/skills/recon/tests/conditional-routing.test.mjs .agents/skills/recon/tests/integrity-contracts.test.mjs .agents/skills/recon/tests/packet-validation.test.mjs .agents/skills/recon/tests/render-packet.test.mjs .agents/skills/recon/tests/routing-contracts.test.mjs .agents/skills/recon/tests/routing-preview.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs .agents/skills/recon/tests/workflow.integration.test.mjs packages/cli/src/validation/skills.test.ts`

**Step 4: Verify**

Run:
`node --test .agents/skills/recon/tests/*.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: all recon and CLI validation tests pass with one controller
reconciliation, no reconciliation worker dispatch, and realpath-safe direct
execution for all six bundled CLIs.

**Step 5: Commit**

```bash
git add -- .agents/agents/recon-worker.md .agents/skills/recon/SKILL.md .agents/skills/recon/references/profiles.md .agents/skills/recon/references/worker-contract.md .agents/skills/recon/references/packet-contract.md .agents/skills/recon/scripts/lib/contracts.mjs .agents/skills/recon/scripts/lib/routing.mjs .agents/skills/recon/scripts/lib/validated-run.mjs .agents/skills/recon/scripts/reconcile-ledger.mjs .agents/skills/recon/scripts/validate-packet.mjs .agents/skills/recon/tests packages/cli/src/validation/skills.test.ts
git commit -m "refactor(p01-t04): make recon reconciliation controller-owned"
```

---

### Task p01-t05: Align docs, triage disposition, and release metadata

**Files:**

- Modify: `.agents/skills/recon/SKILL.md`
- Modify: `.agents/agents/recon-worker.md`
- Modify: `apps/oat-docs/docs/workflows/skills/recon.md`
- Modify: `.oat/repo/pjm/triage/2026-09-14-recon-1-1-2-feedback.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `pnpm-lock.yaml`

**Implementation and Proof Strategy:**

- **Strategy:** implementation followed by a focused regression
- **Observable risk:** shipped docs, triage conclusions, bundled skill/agent
  versions, or lockstep packages describe a different contract than the tested
  implementation.
- **Why proportionate:** version gates, canonical skill validation, docs build,
  and the full repository gate sequence cover every release surface required by
  repository policy.

**Step 1: Implement**

Update public recon documentation and revise the proposed triage ledger to the
accepted simplified dispositions: all Cursor leaves background; valid artifact
precedence; shared CLI entry helper; exact excerpts without locator repair;
worker self-validation without controller retry; live Cursor discovery remains
volatile; and reconciliation is controller-owned. Bump recon once from 1.1.2,
recon-worker once from 1.0.1, and all five public packages in lockstep above
`origin/main`; update the CLI validation version pin; refresh the lockfile and
bundled assets through documented commands. Set the triage record to
`status: approved`, keep `triage_pr: null` until a PR exists, mark every claim
as approved by the user on 2026-09-14 for direct implementation by this Lite
project, and leave each post-merge result pending until merge. Create no new
consolidated backlog item: this project now owns the accepted work directly.
Leave `BL-260906-harden-dispatch-launch` and
`BL-260719-add-pinned-recon-agents` unchanged and retain them only as related
context in the triage record.

**Step 2: Prove**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts && pnpm oat:validate-skills && pnpm run check:skill-bumps && pnpm release:check-versions && pnpm release:validate && pnpm build:docs`
Expected: canonical and packaged assets agree, required version bumps are
present, release dry-run validation passes, and public docs build.

**Step 3: Refactor and format**

Remove superseded triage recommendations instead of preserving alternatives.
Run:
`pnpm exec oxfmt --write .agents/skills/recon/SKILL.md .agents/agents/recon-worker.md apps/oat-docs/docs/workflows/skills/recon.md .oat/repo/pjm/triage/2026-09-14-recon-1-1-2-feedback.md packages/cli/src/validation/skills.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json`

**Step 4: Verify**

First run the affected version-and-wording regression:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`.
Then run the definition-of-done gates in repository order, capturing each exit
code: `pnpm check`; `pnpm type-check`; `pnpm test`; `pnpm build`;
`pnpm run check:skill-bumps`; `pnpm release:check-versions` after fetching
`origin/main`; `pnpm release:validate`; `pnpm build:docs`. Then run the affected
ungated surfaces: `pnpm lint` and `pnpm format`.
Expected: every command exits zero; uncached evidence is used for affected recon
tests where Turborepo reports a cache replay.

**Step 5: Commit**

```bash
git add -- .agents/skills/recon/SKILL.md .agents/agents/recon-worker.md apps/oat-docs/docs/workflows/skills/recon.md .oat/repo/pjm/triage/2026-09-14-recon-1-1-2-feedback.md packages/cli/src/validation/skills.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "chore(p01-t05): align recon release surfaces"
```

---

## Reviews

| Scope | Type     | Status   | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target                   |
| ----- | -------- | -------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ----------------------------- |
| p01   | code     | pending  | -          | -                                                           | -             | -          | -                             |
| final | code     | pending  | -          | -                                                           | -             | -          | -                             |
| plan  | artifact | passed   | 2026-09-15 | structured-output                                           | -             | auto       | oat-reviewer-gpt-5-6-sol-high |
| plan  | artifact | received | 2026-09-15 | reviews/archived/artifact-plan-review-2026-09-15T042341Z.md | -             | -          | -                             |

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks — simplify and harden recon execution, contracts,
  reconciliation ownership, documentation, and release surfaces.

**Total: 5 tasks**

Ready for final code review and PR preparation after implementation.

## References

- Feedback triage:
  `.oat/repo/pjm/triage/2026-09-14-recon-1-1-2-feedback.md`
- Session-local approval decision:
  `.oat/repo/reference/decisions/DR-260911-use-session-local-recon.md`
- Economical routing decision:
  `.oat/repo/reference/decisions/DR-260910-restore-economical-recon.md`
- Cursor generic-agent decision:
  `.oat/repo/reference/decisions/DR-260709-cursor-uses-generic-agents.md`
