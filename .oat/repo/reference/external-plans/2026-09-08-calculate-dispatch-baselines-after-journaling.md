---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md
oat_external_plan_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_main_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-harden-dispatch-launch
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/265
created: '2026-09-08T21:21:53Z'
---

# Resolve the accepted execution baseline after mandatory launch journaling, and make the ordering auditable

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> One `Soft` row records that this lane writes version pins in
> `packages/cli/src/validation/skills.test.ts` and must not share a wave-7
> parallel group with the other lanes that write the same file.

## Outcome

A managed phase dispatch stops invalidating its own base. The root records
`PHASE_BASE_HEAD` only after every mandatory prelaunch journal commit has
landed, so the first authorized dispatch of a phase is valid at the moment the
child verifies it. The acceptance dispatch record is still written the instant
the host returns, but its commit is deferred to the phase-outcome bookkeeping —
the same rule `oat-project-implement` already applies to the project log — so no
root commit lands in the child's checkout between baseline capture and the
child's base check. `oat project dispatch record` stamps the baseline it
actually observed, from git, into the record's namespaced `oat` evidence, so the
ordering is auditable from the journal itself rather than inferred from
surrounding prose. A genuinely stale or unrelated base still fails closed before
any implementation edit: the phase implementer's exact-equality check is
unchanged.

This plan covers **only** GitHub issue
[#265](https://github.com/voxmedia/open-agent-toolkit/issues/265). Issue
[#266](https://github.com/voxmedia/open-agent-toolkit/issues/266) (durable
terminal reconciliation for every accepted dispatch) is explicitly out of scope
per the item's "Triage split (2026-09-08)" section, which admits #265 to a wave
as bounded and holds #266 back pending a concrete producer and a
completion/failure/cancellation/invalid-run matrix. **The backlog item
`BL-260906-harden-dispatch-launch` closes only when both halves land**, so this
lane must not archive it; it updates the item's #265 acceptance criteria only.

## Source and live evidence

- Source backlog item:
  [BL-260906-harden-dispatch-launch — Harden dispatch launch baselines and terminal reconciliation](../../pjm/backlog/items/BL-260906-harden-dispatch-launch.md)
- Source issue: [#265 — Calculate execution baselines after mandatory launch journaling](https://github.com/voxmedia/open-agent-toolkit/issues/265)
  (state OPEN, labels `bug`, `tracked-in-backlog`)
- Inspected `HEAD`: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the tree whose
  content this plan read.
- Comparison baseline: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the fetched
  `origin/main` tip, identical to the inspected `HEAD` because the planning
  branch is at `origin/main`.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty when this plan
  was started; sibling plan authors later added untracked files under
  `.oat/repo/reference/external-plans/` and modified
  `.oat/repo/pjm/backlog/items/BL-260908-correct-the-factual-skill.md`. Neither
  path is a surface of this plan.

### Where the baseline and the journaling actually live

The item and the issue both read as if the ordering bug sits in one place. It
does not, and the executor needs the true split before editing.

- **The baseline is captured in skill prose, not in TypeScript.**
  `.agents/skills/oat-project-implement/references/phase-execution.md:59` is
  step 4 of the phase launch sequence: `Record PHASE_BASE_HEAD=$(git rev-parse
HEAD) and require a clean worktree.` Step 5 (`:60-100`) then sends the Phase
  Scope carrying `phase_base_head: {PHASE_BASE_HEAD}` (`:74`) and
  `expected_base_sha: {group base or PHASE_BASE_HEAD}` (`:77`). Nothing between
  steps 4 and 5 forbids a further root commit.
- **The journaling is a CLI write plus a caller-owned commit.**
  `.agents/skills/oat-dispatch-subagents/SKILL.md:142-146` requires that
  "Immediately after the host returns, record either `launch_status: accepted`
  or `launch_status: blocked-before-start` in the generic dispatch record."
  `:180-187` shows the call —
  `oat project dispatch record --project "$PROJECT_PATH" --event-file - --json` —
  and states "The command validates and persists evidence only. It never
  launches a provider."
- **The command writes files; it does not commit.**
  `packages/cli/src/commands/project/dispatch/index.ts:1-56` wires the command;
  `packages/cli/src/commands/project/dispatch/record.ts:502-533`
  (`recordProjectDispatch`) resolves `dispatchDir = join(projectPath,
'dispatch')` and `record.ts:457-493` (`publishRevision`) writes
  `dispatch/<request-id>[@NNNN].json` through `publishContainedJsonRevision`.
  There is no `git` invocation anywhere in
  `packages/cli/src/commands/project/dispatch/`. The comment at `record.ts:470-474`
  states the intent plainly: "the journal is committed to a shared repository".
  The commit is the caller's, and it is what moves `HEAD`.
- **The child then checks exact equality.**
  `.agents/agents/oat-phase-implementer.md:344-347` (Mode: Implement, step
  1 "Verify Phase Base"): "Confirm the current worktree is clean and its HEAD
  exactly equals `phase_base_head`. When `expected_base_sha` is supplied,
  separately confirm that `phase_base_head` equals it or is an explicitly
  allowed descendant. Never use ancestry from `expected_base_sha` as a
  substitute for the exact `phase_base_head` check." That clause is pinned by
  `packages/cli/src/validation/skills.test.ts:3345-3347`, so it cannot be
  weakened without the pin failing.

So the failure is exactly: capture at `phase-execution.md:59` → launch → journal
write → **caller commits the journal** → `HEAD` advances → the child's
`phase-implementer.md:344` equality check fails on a base that was never stale
in any meaningful sense.

### The repository already states the governing principle

`.agents/skills/oat-project-implement/SKILL.md:47-49`: "**Never append while a
dispatched child owns the worktree.** The tracked log dirties the tree that the
child's preflight and per-task commit checks require to be clean; each append is
committed by the bookkeeping that owns it." `:51-54` then applies it to the
dispatch record's _content_ — "After every accepted subagent dispatch, record
the acceptance in the generic dispatch record at
`$PROJECT_PATH/implementation.md#<run-anchor>` … Do not write the project log at
acceptance; append it with the phase-outcome entry after the child's report
returns" — but says nothing about when the dispatch record's own **commit**
lands. That gap is the defect. This plan extends the existing rule rather than
inventing a new one.

### Constraints the fix must respect

- `packages/cli/src/commands/project/dispatch/record.ts:378-383` —
  `sameGenericRecord` compares `JSON.stringify` of the whole generic part, and
  `record.ts:534-541` throws `Existing generic fields are immutable and cannot
be redefined.` So a _generic_ field added on a later revision of the same
  `request_id` is rejected. A baseline that must be stamped at journal time
  therefore cannot live in the generic block.
- `packages/cli/src/providers/identity/oat-dispatch-record.test.ts:550-560`
  (`covers every generic dispatch field with an explicit mutability decision`)
  asserts that `Object.keys(genericDispatchRecordSchema.innerType().shape)`
  equals `IMMUTABLE_FALLBACK_CONTROL_FIELDS ∪ MUTABLE_FALLBACK_CONTROL_FIELDS`.
  Any new generic field must be classified there or this case fails.
- `packages/cli/src/providers/identity/oat-dispatch-record.ts:589-598` —
  `oatRecordSchema` is the namespaced evidence block: `schemaVersion`,
  `canonicalRole`, `preStartRejection`, `fallbackClaim`, `fallback`,
  `runtimeObservation`, `.strict()`. `initialOatRecord()` (`:668-677`) seeds it
  and `genericPart` (`:679-684`) strips it, so `oat` is exempt from generic
  revision immutability and from the mutability-coverage case. This is the
  correct home for recorder-observed evidence.
- `.agents/skills/oat-dispatch-subagents/SKILL.md:147-149` — "Preserve the exact
  target and controls … Namespaced evidence cannot redefine any generic field."
  The baseline defines no generic field, so it is admissible namespaced
  evidence.
- `packages/cli/src/providers/identity/generic-dispatch-record.ts:237` —
  `launch_status: z.enum(['planned', 'accepted', 'blocked-before-start'])`. The
  `planned` value already exists in the schema but **no skill in
  `.agents/skills` ever writes it** (verified: `grep -rn "launch_status"
.agents/skills` returns only `accepted` and `blocked-before-start`, in
  `oat-dispatch-subagents/SKILL.md:143-144` and
  `references/record-schema.md:105,150,185,222,226`). This plan does not
  introduce a mandatory `planned` revision; it is recorded here only so the
  executor does not mistake the unused enum member for an existing prelaunch
  journaling step.

## Dependencies

| Type                  | Dependency                                                                                                                                                                                    | Required state                                                                                                                              | Current state                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Soft ordering         | Every other wave-7 lane that writes version pins in `packages/cli/src/validation/skills.test.ts` — the stray-fence lane, the skill-version validator lane, the doctor lane, and the seal lane | Never composed into one parallel group with this lane.                                                                                      | Recorded; the wave composer serializes them.                                                            |
| Soft adjacency        | GitHub issue [#266](https://github.com/voxmedia/open-agent-toolkit/issues/266), the other half of `BL-260906-harden-dispatch-launch`                                                          | Stays out of this lane entirely. The backlog item closes only when both halves land, so this lane updates the item but must not archive it. | Not admitted to a wave; the item's triage split holds it back pending a producer and an outcome matrix. |
| Satisfied predecessor | `DR-260906-one-version-bump-per-changed`                                                                                                                                                      | Accepted, so a later lane in the same PR carries an already-bumped skill value and moves no pin.                                            | Accepted.                                                                                               |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                | Affected | Files in common                                                                                                                                                     | Required update                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #190 (ReviewPlan Stage A compatibility release, OPEN draft) lands | Major    | `.agents/skills/oat-project-implement/SKILL.md`, `.agents/skills/oat-project-implement/references/phase-execution.md`, `packages/cli/src/validation/skills.test.ts` | Re-derive `phase-execution.md:59`, `:74`, `:77` and `oat-project-implement/SKILL.md:47-54` before editing, and re-read the `2.3.7` pins. Do not apply this plan's line numbers unchecked.                                          |
| PR #273 (provider-neutral remote project management, OPEN) lands     | None     | none — its files are `oat-doctor/SKILL.md` and `oat-pjm-remote/**`                                                                                                  | No update. Reconfirm with `gh api --paginate repos/voxmedia/open-agent-toolkit/pulls/273/files --jq '.[].filename'`.                                                                                                               |
| PR #125 (oat-brainstorm visual companion, OPEN) lands                | None     | none                                                                                                                                                                | No update.                                                                                                                                                                                                                         |
| Issue #266 is planned and lands                                      | Minor    | `packages/cli/src/providers/identity/oat-dispatch-record.ts`, `record.ts`                                                                                           | #266 adds a terminal-reconciliation slot to the same `oat` evidence block. Whichever lands second re-reads `oatRecordSchema` and `initialOatRecord()` before extending them; the two slots are independent and must not be merged. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat c9f2e147ac0674e73a60735e0c1727ccc6048756..origin/main -- \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-implement/references/phase-execution.md \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  .agents/agents/oat-phase-implementer.md \
  packages/cli/src/commands/project/dispatch/index.ts \
  packages/cli/src/commands/project/dispatch/record.ts \
  packages/cli/src/commands/project/dispatch/record.test.ts \
  packages/cli/src/providers/identity/oat-dispatch-record.ts \
  packages/cli/src/providers/identity/oat-dispatch-record.test.ts \
  packages/cli/src/validation/skills.test.ts \
  .oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md
```

Expected at the authored commit: empty output. Any non-empty result means a
cited anchor may have moved; re-locate it before editing. Executing inside a
wave, run the same diff from the actual execution `HEAD` after predecessor lanes
integrate.

## Repository conventions

- Build: `pnpm build` → all packages build; required before `pnpm test:smoke`
  and `pnpm test:release`.
- Typecheck: `pnpm type-check` → passes.
- Focused test: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch src/providers/identity/oat-dispatch-record.test.ts`
  → all cases pass.
- Lane gates (lane mode, see "Wave execution"): `pnpm check`, `pnpm type-check`,
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
  `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`,
  `pnpm oat:validate-skills`.
- `pnpm lint` and `pnpm format` are mandatory here because this lane edits
  `.agents/skills/**/*.md` and CI runs neither.
- Skill versioning: one `metadata.version` bump per changed canonical skill per
  PR; the top-level `version:` key is gone from bundled skills since CLI 0.2.65.
  `.agents/agents/*.md` roles still declare a **top-level** `version:` per
  `DR-260908-bundled-skills-declare`, which deliberately leaves them
  unmigrated — bump `oat-phase-implementer.md` in that shape, not in
  `metadata.version`.
- Locating pins: search the **old version literal** across `packages/cli/src`,
  `tools/smoke`, and `.agents/skills/*/tests`, then move only the hits that
  belong to the file you bumped. `1.1.5` is a live example of why: it pins both
  `.agents/agents/oat-phase-implementer.md` (`skills.test.ts:3026`, `:3334`,
  `:6017`, `:7954`) and an unrelated adapter (`skills.test.ts:5950`).
- `DR-260906-standing-claims-in-skills-name`: a standing claim added to a skill
  needs a named executable backstop. The ordering clause added in Step 4 is
  backstopped by the pin added in Step 8.
- Implementation pattern for the git-backed test:
  `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`,
  which builds a real `git init` fixture repo.
- Implementation pattern for injected git: `gitExecFile` in
  `packages/cli/src/validation/skills.ts:943-969`, which defaults to
  `execFileAsync` and is overridable through a dependencies object.
- `.oat/config.json` keys parity: not touched by this plan.
- Never run `oxfmt` on an OAT `state.md`.
- Git/PR convention: commit on the lane worktree branch. Do not push or open a
  PR; the wave fan-in owns that.

## Scope

### In scope

- `.agents/skills/oat-project-implement/references/phase-execution.md` — reorder
  the launch sequence so the baseline is captured after mandatory prelaunch
  journaling, and forbid a root commit into the child's checkout between capture
  and the child's base check.
- `.agents/skills/oat-project-implement/SKILL.md` — extend the "Never append
  while a dispatched child owns the worktree" rule at `:47-54` to the acceptance
  dispatch-record commit; `metadata.version` bump.
- `.agents/skills/oat-dispatch-subagents/SKILL.md` — state the ordering rule at
  the launch contract and document that the recorder stamps the observed
  baseline; `metadata.version` bump.
- `.agents/skills/oat-dispatch-subagents/references/record-schema.md` — document
  the new `oat.executionBaseline` evidence slot.
- `.agents/agents/oat-phase-implementer.md` — say that `phase_base_head` is the
  post-journal baseline and that a supplied `oat.executionBaseline` with
  `status: 'unobserved'` or `tree_clean: false` is not an authoritative
  baseline; keep the exact-equality check verbatim; top-level `version:` bump.
- `packages/cli/src/providers/identity/oat-dispatch-record.ts` — add the
  `executionBaseline` slot to `oatRecordSchema` and `initialOatRecord()`.
- `packages/cli/src/commands/project/dispatch/record.ts` — observe git at
  publish time and stamp the slot; add the injectable `gitExecFile` dependency.
- `packages/cli/src/commands/project/dispatch/index.ts` — wire the dependency.
- `packages/cli/src/providers/identity/oat-dispatch-record.test.ts`,
  `packages/cli/src/commands/project/dispatch/record.test.ts`, and one new
  git-backed regression file.
- `packages/cli/src/validation/skills.test.ts` — version pins.
- `.oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md` — tick the
  two #265 acceptance criteria and record the plan link. **Do not** change
  `status`, and do not run `oat backlog archive`.

### Out of scope

- GitHub issue #266 and every acceptance criterion that names it: terminal
  reconciliation, linked envelopes, append-only reconciliation events, and
  closeout detection for unresolved accepted dispatches. The item's triage split
  holds #266 back deliberately.
- Closing or archiving `BL-260906-harden-dispatch-launch`. Half a two-issue item
  is not a closable item.
- Introducing a mandatory `launch_status: planned` prelaunch revision. The enum
  member exists but no skill writes it; adding one is a separate behavioral
  change with its own review surface.
- Any change to the `expected_base_sha` semantics, the parallel-group base rule,
  or the recovery/continuation paths in `phase-execution.md:231-470`.
- Weakening `.agents/agents/oat-phase-implementer.md:344-347`. See the
  weaker-anywhere rule below.
- The lockstep public package version bump and the release gates — the wave
  fan-in owns both.

## Current state

`oat project dispatch record` is a validate-and-persist command. Given
`--project`, `recordProjectDispatch` (`record.ts:502`) parses the input once
(the comment at `:495-501` explains why parsing is deliberately non-idempotent),
reads the latest revision per request id (`readLatestRevisions`, `:413`),
refuses a generic-field redefinition (`:534-541`), collects related and trigger
records, and publishes a new revision file (`publishRevision`, `:457`). Before
bytes reach the journal it asserts no absolute path is present in identity
fields (`:475`) and enforces a whole-record size ceiling (`:476`). It touches
git nowhere.

The persisted record is `PersistedOatDispatchRecordV1` — the generic record
(`generic-dispatch-record.ts:195-262`, `.strict()` with a `superRefine` at
`:263`) extended with a namespaced `oat` block
(`oat-dispatch-record.ts:589-602`). The `oat` block's slots are seeded by
`initialOatRecord()` and filled from validated evidence events
(`oatDispatchEvidenceEventSchema`, `:620-662`). Caller-supplied evidence lands
in `oat`; recorder-observed facts have no home there yet, which is the gap this
plan fills.

### Weaker-anywhere rule

The phase-base check is a guard. Any base state that is **rejected** before this
change and **accepted** after it is a Critical regression, and issue #265's
third acceptance criterion says so directly ("A genuinely stale or unrelated
base mismatch is still rejected before any implementation edit"). Concretely:

- `.agents/agents/oat-phase-implementer.md:344-347` must keep "HEAD exactly
  equals `phase_base_head`" and "Never use ancestry from `expected_base_sha` as
  a substitute", byte-for-byte, and `skills.test.ts:3345-3347` must keep
  matching it.
- No clause may permit a descendant of `phase_base_head`, an ancestry check, or
  a "recent enough" tolerance. The fix moves _when_ the baseline is captured; it
  never relaxes _what_ is compared.
- The new `executionBaseline` evidence must be additive: a record without it
  stays valid, and its presence must never cause a base state to be accepted
  that would otherwise be rejected.

## Implementation steps

### 1. Reproduce the ordering defect against a real git repository

In a `mktemp -d` scratch directory, `git init` a repo containing a minimal OAT
project directory with a `state.md`. Capture `BASE_BEFORE=$(git rev-parse
HEAD)`. Run the built CLI to write a dispatch record into
`<project>/dispatch/`, `git add` and commit it, then capture
`HEAD_AFTER=$(git rev-parse HEAD)`. Assert `BASE_BEFORE != HEAD_AFTER`, and that
a check of the form `[ "$(git rev-parse HEAD)" = "$BASE_BEFORE" ]` — the exact
shape of `oat-phase-implementer.md:344` — fails.

**Verify:** the script prints two different SHAs and the equality check exits
non-zero. This is the red half of the regression in Step 7 and the evidence that
the reordering is necessary rather than cosmetic.

### 2. Add the `executionBaseline` slot to the namespaced evidence block

In `packages/cli/src/providers/identity/oat-dispatch-record.ts`:

1. Define an `executionBaselineSchema` as a discriminated union on `status`:
   - `{ status: 'observed', sha: /^[0-9a-f]{40}$/, tree_clean: boolean, observed_at: z.string().datetime() }`
   - `{ status: 'unobserved', reason: <bounded identifier>, observed_at: z.string().datetime() }`
     Both `.strict()`.
2. Add `executionBaseline: executionBaselineSchema.nullable().default(null)` to
   `oatRecordSchema` (`:589-598`) and `executionBaseline: null` to
   `initialOatRecord()` (`:668-677`). The `.default(null)` keeps every existing
   persisted record parseable; `oatPart` (`:686-692`) parses stored `oat` blocks
   and would otherwise reject them.

Do **not** add a generic field. The generic block is immutable across revisions
(`record.ts:378-383`, `:534-541`) and every generic field must be classified in
the mutability table asserted by `oat-dispatch-record.test.ts:550-560`.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/oat-dispatch-record.test.ts`
→ passes, including the mutability-coverage case, which must be unaffected
because no generic field was added.

### 3. Stamp the observed baseline in the recorder

In `packages/cli/src/commands/project/dispatch/record.ts`:

1. Add `gitExecFile` to the dependencies the module accepts, defaulting to the
   real `execFile`, following `packages/cli/src/validation/skills.ts:943-969`.
2. In `recordProjectDispatch`, when `input.projectPath !== null`, observe the
   repository containing the project: `git rev-parse HEAD` and
   `git status --porcelain`. Stamp
   `oat.executionBaseline = { status: 'observed', sha, tree_clean: <porcelain
output is empty>, observed_at }`. On any git failure — not a repository, git
   absent, non-zero exit — stamp
   `{ status: 'unobserved', reason, observed_at }` and continue. Recording is
   evidence collection; it must never become a new way for a dispatch to fail.
3. Stamp it on **every** published revision, so a later revision records the
   baseline as of its own write. The `oat` block is exempt from the generic
   immutability comparison (`genericPart` strips it at `record.ts:371-376`), so
   this does not collide with `sameGenericRecord`.
4. The stamp is recorder-owned. If the caller supplies `oat.executionBaseline`
   in its input, the recorder overwrites it; the value is an observation, not a
   claim. That is what makes the ordering auditable "without inferring
   provenance" (issue #265, fourth acceptance criterion).

Wire the dependency through `packages/cli/src/commands/project/dispatch/index.ts`
alongside the existing `ProjectDispatchCommandDependencies` members.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch`
→ passes, and a manual run against the Step 1 scratch repo produces a journal
file whose `oat.executionBaseline.sha` equals `git rev-parse HEAD` at write
time.

### 4. Reorder the phase launch sequence

In `.agents/skills/oat-project-implement/references/phase-execution.md`, rewrite
the numbered sequence at `:54-60` so that:

1. every mandatory prelaunch journal and bookkeeping write for this phase — the
   `implementation.md` run anchor and any `state.md` transition the launch
   requires — is written **and committed** first;
2. `PHASE_BASE_HEAD=$(git rev-parse HEAD)` is then recorded on a clean worktree
   (the existing step 4 text, moved, not reworded);
3. the Phase Scope is sent with `phase_base_head` and `expected_base_sha` as
   today.

Add an explicit clause immediately after the capture: no root commit may land in
the checkout the child will use between the capture of `PHASE_BASE_HEAD` and the
child's base verification. The acceptance dispatch record is still written the
instant the host returns, per
`.agents/skills/oat-dispatch-subagents/SKILL.md:142-146`; its **commit** is
deferred to the phase-outcome bookkeeping.

In `.agents/skills/oat-project-implement/SKILL.md`, extend the bullet at
`:51-54` so the deferral covers the dispatch record's commit as well as the
project-log append, and say it is the same rule stated at `:47-49`.

In `.agents/skills/oat-dispatch-subagents/SKILL.md`, add to the launch contract
that the caller resolves any execution baseline **after** its mandatory
prelaunch journaling has been committed, and that the recorder stamps the
baseline it observed into `oat.executionBaseline`.

Document the slot in
`.agents/skills/oat-dispatch-subagents/references/record-schema.md` next to the
existing `launch_status` examples (`:105`, `:150`, `:185`, `:222`, `:226`).

**Verify:** `grep -n 'PHASE_BASE_HEAD' .agents/skills/oat-project-implement/references/phase-execution.md`
→ the capture appears after the journaling step and before the scope send;
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
→ passes (pins updated in Step 8).

### 5. State the consumer side without weakening it

In `.agents/agents/oat-phase-implementer.md`, keep `:344-347` byte-for-byte and
add, adjacent to it: `phase_base_head` is the baseline the root resolved after
its mandatory launch journaling; when the dispatch record carries
`oat.executionBaseline`, a `status: 'unobserved'` or `tree_clean: false` value
means the baseline was not authoritative at journal time and the phase parks for
direction rather than proceeding on a guess.

**Verify:** `git diff .agents/agents/oat-phase-implementer.md` shows only
additions plus the `version:` line; the pinned regex at
`skills.test.ts:3345-3347` still matches.

### 6. Update the backlog item without closing it

In `.oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md`, tick the
two acceptance criteria that name issue #265 and leave the two that name #266
untouched. Add a dated note recording that #265 landed and that the item stays
open until #266 does. Leave `status: open`. Do not run `oat backlog archive`.

**Verify:** `grep -n 'status:' .oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md`
→ `status: open`; the two #266 criteria remain unticked.

### 7. Add the regression and its negative controls

See `## Test plan` for the exact cases. Add them, then run them against the
pre-fix code to confirm each goes red.

**Verify:** every new case fails on the pre-fix tree and passes on the post-fix
tree, with both exit codes recorded.

### 8. Bump the changed skills and move the pins

Bump once per changed skill: `oat-project-implement` `2.3.7` → `2.3.8`
(`metadata.version`); `oat-dispatch-subagents` `1.2.7` → `1.2.8`
(`metadata.version`); `oat-phase-implementer` `1.1.5` → `1.1.6` (**top-level**
`version:`, per `DR-260908-bundled-skills-declare`, which leaves agent roles
unmigrated). Then sweep each old literal in plain and regex-escaped form across
`packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests`, and move only
the hits that belong to the bumped file.

Expected pins: `2.3.7` at `skills.test.ts:1983`, `:2464`, `:2773`, `:2847`,
`:3339`, `:4547`, `:5870`, `:7953`; `1.2.7` at `:5947`, `:6106`; `1.1.5` at
`:3026`, `:3334`, `:6017`, `:7954` — and **not** at `:5950`, which pins an
unrelated adapter at the same literal. Add one pin asserting the new ordering
clause in `phase-execution.md`, so the standing claim has an executable backstop
(`DR-260906-standing-claims-in-skills-name`).

**Verify:**

```bash
for v in 2.3.7 1.2.7 1.1.5; do
  echo "== $v"
  grep -rn --fixed-strings "$v" packages/cli/src tools/smoke .agents/skills/*/tests || true
done
```

→ the only remaining `1.1.5` hit is `skills.test.ts:5950` (the adapter);
`2.3.7` and `1.2.7` have no hits. `pnpm run check:skill-bumps` → exit 0.

### 9. Run the lane gates

```bash
pnpm check                                          > /tmp/g1.log 2>&1; echo "exit=$?"
pnpm type-check                                     > /tmp/g2.log 2>&1; echo "exit=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force  > /tmp/g3.log 2>&1; echo "exit=$?"
pnpm run check:skill-bumps                          > /tmp/g4.log 2>&1; echo "exit=$?"
pnpm lint                                           > /tmp/g5.log 2>&1; echo "exit=$?"
pnpm format                                         > /tmp/g6.log 2>&1; echo "exit=$?"
pnpm oat:validate-skills                            > /tmp/g7.log 2>&1; echo "exit=$?"
```

**Verify:** every gate reports `exit=0` and `/tmp/g3.log` shows a real run — no
`cache hit, replaying logs`, no `>>> FULL TURBO`.

## Test plan

**New file:** `packages/cli/src/commands/project/dispatch/baseline-ordering.test.ts`,
built on the `git init` fixture pattern in
`packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`.

1. `the first authorized dispatch stays valid across journal-induced HEAD movement`
   — the regression issue #265 asks for. Build a temp git repo with a project
   directory; record `preJournalHead`; call `recordProjectDispatch` to write the
   launch journal; `git add` + `git commit` the journal file; record
   `postJournalHead`. Assert `preJournalHead !== postJournalHead`, that the
   baseline resolved _after_ the commit equals `postJournalHead`, and that the
   exact-equality check `HEAD === phase_base_head` — the shape at
   `oat-phase-implementer.md:344` — passes for the post-journal baseline.
   **Red control:** resolve the baseline before the journal commit (the pre-fix
   order); the same equality check must fail. Record both exit states.
2. `a genuinely stale base is still rejected` — the weaker-anywhere control.
   After the post-journal baseline is captured, make an unrelated commit, then
   run the same equality check. It must fail. **Red control:** this case must
   fail if anyone relaxes the check to an ancestry test — prove it by
   temporarily substituting `git merge-base --is-ancestor` and observing the
   case go green, then restore.
3. `records the observed baseline on a dirty tree as not clean` — write an
   uncommitted file, publish a revision, assert
   `oat.executionBaseline.tree_clean === false`. **Red control:** neutralize the
   `git status --porcelain` observation in Step 3; the case must fail.
4. `records an unobserved baseline outside a git repository` — publish into a
   project directory in a non-git temp dir; assert
   `oat.executionBaseline.status === 'unobserved'` and that the publish still
   succeeds. **Red control:** make the git failure throw; the case must fail.

**Changed cases**

- `packages/cli/src/providers/identity/oat-dispatch-record.test.ts:550-560`
  (`covers every generic dispatch field with an explicit mutability decision`) —
  must pass **unchanged**. If it needs editing, a generic field was added by
  mistake; revert to the `oat` slot. Add two adjacent cases: the new slot
  defaults to `null` for a record that omits it, and a stored record written
  before this change still parses.
- `packages/cli/src/commands/project/dispatch/record.test.ts` — add a case
  proving that a second revision of the same `request_id` carrying a **different**
  `oat.executionBaseline` is accepted while a changed generic field is still
  rejected with `Existing generic fields are immutable and cannot be redefined.`
  **Red control:** move the field into the generic block; the case must fail
  with that exact message.
- `packages/cli/src/validation/skills.test.ts` — pins at the eight `2.3.7`, two
  `1.2.7`, and four `1.1.5` sites listed in Step 8, plus one new assertion that
  `phase-execution.md` states the post-journal ordering. **Red control:** delete
  the ordering sentence from the skill; the new assertion must fail.

**Focused command**

`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch src/providers/identity/oat-dispatch-record.test.ts src/validation/skills.test.ts`
→ all cases pass.

**Full relevant suite**

`HOME=$(mktemp -d) pnpm exec turbo run test --force` → passes with no cache
replay.

## Done criteria

- [ ] `phase-execution.md` records `PHASE_BASE_HEAD` only after mandatory
      prelaunch journal commits, and forbids a root commit into the child's
      checkout between capture and the child's base check.
- [ ] `oat-project-implement/SKILL.md` defers the acceptance dispatch-record
      commit to the phase-outcome bookkeeping, alongside the project-log append.
- [ ] `oat.executionBaseline` exists in `oatRecordSchema` and
      `initialOatRecord()`, defaults to `null`, and is stamped by the recorder
      from observed git state on every published revision.
- [ ] No field was added to `genericDispatchRecordSchema`, and
      `oat-dispatch-record.test.ts:550-560` passes unchanged.
- [ ] The regression in `baseline-ordering.test.ts` case 1 is red on the pre-fix
      order and green on the post-fix order, with both exit codes recorded.
- [ ] The stale-base control (case 2) is red for an unrelated commit, and
      `.agents/agents/oat-phase-implementer.md:344-347` is byte-identical apart
      from adjacent additions.
- [ ] Three version bumps (`oat-project-implement`, `oat-dispatch-subagents` in
      `metadata.version`; `oat-phase-implementer` top-level) with all pins moved
      and `skills.test.ts:5950` left alone.
- [ ] `BL-260906-harden-dispatch-launch` has its two #265 criteria ticked, its
      two #266 criteria untouched, and `status: open`.
- [ ] `pnpm check`, `pnpm type-check`, forced `turbo run test`,
      `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each report `exit=0`.
- [ ] `git status --short` contains no unexplained or out-of-scope file.

## STOP conditions

Stop and report instead of improvising when:

1. the reordering cannot be expressed without changing what the phase-base check
   compares — the fix moves _when_, never _what_;
2. any change would make `.agents/agents/oat-phase-implementer.md:344-347`
   accept a base state it rejects today, including via an ancestry, descendant,
   or tolerance clause;
3. the `executionBaseline` slot cannot be added without touching
   `genericDispatchRecordSchema` — that path is closed by generic revision
   immutability and by the mutability-coverage case;
4. a stored dispatch record from before this change fails to parse;
5. observing git makes `oat project dispatch record` fail in any environment
   where it succeeds today — recording evidence must never become a launch
   blocker;
6. work drifts toward issue #266 — terminal outcomes, envelopes, reconciliation
   events, or closeout detection for unresolved dispatches;
7. anyone proposes closing or archiving `BL-260906-harden-dispatch-launch`;
8. the cited line anchors in `phase-execution.md`, `oat-phase-implementer.md`,
   or `record.ts` no longer match after the drift check;
9. a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `c9f2e147ac0674e73a60735e0c1727ccc6048756`;
- PR #190 lands — it rewrites `oat-project-implement/SKILL.md`,
  `phase-execution.md`, and `skills.test.ts`, invalidating most anchors here;
- issue #266 is planned or lands, changing the shared `oat` evidence block;
- a dependency named in `## Dependencies` changes state;
- any cited step number, line anchor, or section order in an in-scope file
  changes;
- a load-bearing claim cannot be reproduced — in particular that
  `packages/cli/src/commands/project/dispatch/` invokes git nowhere, and that
  `launch_status: planned` is written by no skill.

Executing inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate rather than re-stamping the authored
provenance.

## Wave execution

This plan runs as a **lane in wave 7**, in a worktree at
`.worktrees/wave-7/<lane>`, in **lane mode**: focused tests plus `pnpm check`,
`pnpm type-check`, forced `turbo run test`, `pnpm run check:skill-bumps`,
`pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. The wave fan-in owns
the lockstep public package version bump and the release gates
(`pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`);
this lane must not run them. A root review follows the lane.

Because this lane writes `packages/cli/src/validation/skills.test.ts`, it must be
serialized against the sibling lanes named in `## Dependencies`.

## Review focus

- **Weaker-anywhere on the phase-base check.** Diff
  `.agents/agents/oat-phase-implementer.md` and confirm `:344-347` is unchanged
  and that nothing added nearby creates an escape hatch. This is the criterion
  issue #265 states explicitly and the one a reordering fix is most likely to
  violate by accident.
- **Ordering, not tolerance.** Read the rewritten sequence in
  `phase-execution.md` and confirm the baseline is captured after the journal
  commit rather than the check being loosened to accept a moved `HEAD`.
- **Namespaced vs generic placement.** Confirm the baseline landed in the `oat`
  block and that `genericDispatchRecordSchema` is untouched; a generic field
  would be silently rejected on any second revision of the same request.
- **Recorder-owned evidence.** Confirm a caller-supplied
  `oat.executionBaseline` is overwritten rather than trusted; otherwise the
  audit trail is a claim, which is what the issue asks to eliminate.
- **Backward compatibility.** Confirm a record written before this change still
  parses, and that publishing outside a git repository still succeeds.
- **Scope discipline.** Confirm nothing in the diff addresses issue #266, and
  that the backlog item is updated but left open.
