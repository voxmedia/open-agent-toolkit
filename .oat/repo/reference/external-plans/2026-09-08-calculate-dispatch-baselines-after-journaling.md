---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
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
> The `Soft` rows record ordering only: this lane writes version pins in
> `packages/cli/src/validation/skills.test.ts`, as do seven other wave-7 lanes,
> so it is never composed into a parallel group with any of them.

## Outcome

A managed phase dispatch stops invalidating its own base. The root records
`PHASE_BASE_HEAD` only after every mandatory prelaunch journal commit has
landed, so the first authorized dispatch of a phase is valid at the moment the
child verifies it. The acceptance dispatch record is still written the instant
the host returns, but its commit is deferred to the phase-outcome bookkeeping —
the same rule `oat-project-implement` already applies to the project log and to
review appends — so no root commit lands in the child's checkout between
baseline capture and the child's base check. `oat project dispatch record`
stamps the `HEAD` it actually observed, from git, into the record's namespaced
`oat` evidence, so the ordering is auditable from the journal itself rather
than inferred from surrounding prose. A genuinely stale or unrelated base still
fails closed before any implementation edit: the phase implementer's
exact-equality check is not touched by this plan.

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
  (state OPEN, labels `bug`, `tracked-in-backlog`; re-read 2026-09-08). Its
  four acceptance criteria are quoted in `## Done criteria`.
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip (PR #273 merged 2026-09-08), also the merge-base; `HEAD`
  differs from it only by commits under `.oat/repo/`. Every source file this
  plan cites is byte-identical on the two.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty at the
  inspected `HEAD`. Other reviewers were rewriting sibling plans under
  `.oat/repo/reference/external-plans/` concurrently; none of those paths is a
  surface of this plan.

### The production occurrence this plan repairs

The defect is not hypothetical. The `lite-workflow-mode` project's log records
it at `.oat/projects/archived/lite-workflow-mode/implementation.md:1901-1910`
("p06 invalid-run abort before implementation"): expected phase base
`7e636cf2…`, accepted-run `HEAD` `8b985078…`, outcome `INVALID_RUN_ABORT` with
0/3 tasks executed — "The sole intervening commit recorded the p06 launch
journal, but the payload retained the pre-journal SHA. The canonical
implementer rejected the mismatch before editing." The retro at
`references/project-retro.md:143-147` and `:297-309` filed it as UP-01 → issue
#265. The child did exactly what its contract says; the root moved `HEAD`
under it.

### Where the baseline and the journaling actually live

The item and the issue both read as if the ordering bug sits in one place. It
does not, and the executor needs the true split before editing.

- **The baseline is captured in skill prose, not in TypeScript.**
  `.agents/skills/oat-project-implement/references/phase-execution.md:59` is
  step 4 of the phase launch sequence: `Record PHASE_BASE_HEAD=$(git rev-parse
HEAD) and require a clean worktree.` Step 3 (`:54-58`) precedes it: "Build the
  provider invocation before recording target, model/effort axes, selection
  reason, candidates, and formal dispatch stamp" — that recording is the
  prelaunch journal. Step 5 (`:60-100`) then sends the Phase Scope carrying
  `phase_base_head: {PHASE_BASE_HEAD}` (`:74`) and
  `expected_base_sha: {group base or PHASE_BASE_HEAD}` (`:77`). Nothing in
  steps 3–5 says when the step-3 journal is committed, and nothing forbids a
  root commit between step 4 and the child's check.
- **The bookkeeping commit is mandatory and root-owned.**
  `.agents/skills/oat-project-implement/SKILL.md:101-102`: "Bookkeeping commits
  are mandatory, not optional … you MUST commit the OAT tracking files … as a
  separate bookkeeping commit." That is the commit that moved `HEAD` in the
  p06 occurrence.
- **The acceptance journal is a CLI write plus a caller-owned commit.**
  `.agents/skills/oat-dispatch-subagents/SKILL.md:142-146` requires that
  "Immediately after the host returns, record either `launch_status: accepted`
  or `launch_status: blocked-before-start` in the generic dispatch record."
  `:180-187` shows the call —
  `oat project dispatch record --project "$PROJECT_PATH" --event-file - --json`
  — and states "The command validates and persists evidence only. It never
  launches a provider." The project-aware callers are
  `oat-project-implement/references/dispatch-and-dry-run.md:396-400` and
  `oat-project-dispatch-subagents/SKILL.md:157-167`.
- **The command writes files; it does not commit.**
  `packages/cli/src/commands/project/dispatch/index.ts:1-56` wires the command
  and `:116-119` calls `recordProjectDispatch({ projectPath, input })`;
  `packages/cli/src/commands/project/dispatch/record.ts:502-533`
  (`recordProjectDispatch`) resolves `dispatchDir = join(projectPath,
'dispatch')` and `record.ts:457-493` (`publishRevision`) writes
  `dispatch/<request-id>[@NNNN].json` through `publishContainedJsonRevision`.
  There is no `git` invocation anywhere in
  `packages/cli/src/commands/project/dispatch/` (the only match for `git` is
  the word "legitimately" in a comment at `record.ts:267`). The comment at
  `record.ts:470-474` states the intent plainly: "the journal is committed to
  a shared repository". The commit is the caller's, and it is what moves
  `HEAD`.
- **The child then checks exact equality.**
  `.agents/agents/oat-phase-implementer.md:343-348` (Mode: Implement, step 1
  "Verify Phase Base"): "Confirm the current worktree is clean and its HEAD
  exactly equals `phase_base_head`. When `expected_base_sha` is supplied,
  separately confirm that `phase_base_head` equals it or is an explicitly
  allowed descendant. Never use ancestry from `expected_base_sha` as a
  substitute for the exact `phase_base_head` check." That clause is pinned by
  `packages/cli/src/validation/skills.test.ts:3345-3347`, so it cannot be
  weakened without the pin failing. **This plan does not edit that file.**

So the failure is exactly: capture at `phase-execution.md:59` → root commits
the step-3 launch journal as mandatory bookkeeping → `HEAD` advances → the
child's `phase-implementer.md:343` equality check fails on a base that was
never stale in any meaningful sense.

### The repository already states the governing principle

`.agents/skills/oat-project-implement/SKILL.md:47-49`: "**Never append while a
dispatched child owns the worktree.** The tracked log dirties the tree that the
child's preflight and per-task commit checks require to be clean; each append is
committed by the bookkeeping that owns it." `:51-54` then applies it to the
dispatch record's _content_ — "After every accepted subagent dispatch, record
the acceptance in the generic dispatch record at
`$PROJECT_PATH/implementation.md#<run-anchor>` … Do not write the project log at
acceptance; append it with the phase-outcome entry after the child's report
returns" — and `:64-67` applies the same deferral to review-orchestration
appends ("appending when the reviewer returns dirties the tree before a fix
child is dispatched into it"). Neither says when the prelaunch journal or the
acceptance record's own **commit** lands. That gap is the defect. This plan
extends the existing rule rather than inventing a new one.

### Constraints the fix must respect

- `packages/cli/src/commands/project/dispatch/record.ts:378-383` —
  `sameGenericRecord` compares `JSON.stringify` of the whole generic part, and
  `record.ts:534-541` throws `Existing generic fields are immutable and cannot
be redefined.` So a _generic_ field added on a later revision of the same
  `request_id` is rejected. An observation that must be stamped at journal time
  therefore cannot live in the generic block.
- `packages/cli/src/providers/identity/oat-dispatch-record.test.ts:550-560`
  (`covers every generic dispatch field with an explicit mutability decision`)
  asserts that `Object.keys(genericDispatchRecordSchema.innerType().shape)`
  equals `IMMUTABLE_FALLBACK_CONTROL_FIELDS ∪ MUTABLE_FALLBACK_CONTROL_FIELDS`.
  Any new generic field must be classified there or this case fails.
- `packages/cli/src/providers/identity/oat-dispatch-record.ts:589-598` —
  `oatRecordSchema` is the namespaced evidence block: `schemaVersion`,
  `canonicalRole`, `preStartRejection`, `fallbackClaim` (already
  `.nullable().default(null)`, the precedent for an additive slot), `fallback`,
  `runtimeObservation`, `.strict()`. `initialOatRecord()` (`:668-677`) seeds it,
  `genericPart` (`:679-684`) strips it, and `oatPart` (`:686-692`) re-parses a
  stored block with `oatRecordSchema.parse`, so an additive slot must carry a
  default or every existing journal file stops parsing. `oat` is exempt from
  generic revision immutability and from the mutability-coverage case. This is
  the correct home for recorder-observed evidence.
- `.agents/skills/oat-dispatch-subagents/SKILL.md:147-149` — "Preserve the exact
  target and controls … Namespaced evidence cannot redefine any generic field."
  The observed head defines no generic field, so it is admissible namespaced
  evidence.
- `packages/cli/src/providers/identity/generic-dispatch-record.ts:237` —
  `launch_status: z.enum(['planned', 'accepted', 'blocked-before-start'])`. The
  `planned` value exists in the schema but **no skill in `.agents/skills` ever
  writes it** (verified: `grep -rn "launch_status" .agents/skills` returns only
  `accepted` and `blocked-before-start`, in
  `oat-dispatch-subagents/SKILL.md:143-144` and
  `references/record-schema.md:105,150,185,222,226`). This plan does not
  introduce a mandatory `planned` revision; it is recorded here only so the
  executor does not mistake the unused enum member for an existing prelaunch
  journaling step.
- **Host model.** The launch contract's "immediately after the host returns"
  is written for hosts that return when the child finishes (a foreground
  Claude Code `Agent` call, `codex exec`). For such hosts the acceptance record
  is written after the child's work, so deferring only its commit is
  sufficient. A host that returns a handle while the child is still live and
  sharing the root's checkout is a different launch shape; this plan records
  it as a STOP condition rather than redesigning the acceptance contract.

## Dependencies

| Type                  | Dependency                                                                                                                           | Required state                                                                                                                              | Current state                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Soft ordering         | [Repair stray fences in lifecycle skills](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md)                                   | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts` version pins. Re-anchor pins on merge.                 | Authored in the same wave; the composer serializes them.                                                |
| Soft ordering         | [Tighten the skill version validators](./2026-09-08-tighten-the-skill-version-validators.md)                                         | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                               | Authored in the same wave.                                                                              |
| Soft ordering         | [Read stdin in finalize-synced-archive](./2026-09-08-read-stdin-in-finalize-synced-archive.md)                                       | Never in one parallel group; both write `skills.test.ts` pins. Re-anchor on merge.                                                          | Authored in the same wave.                                                                              |
| Soft ordering         | [Make the completion seal idempotent](./2026-09-08-make-the-completion-seal-idempotent.md)                                           | Never in one parallel group; both write `skills.test.ts` pins. Re-anchor on merge.                                                          | Authored in the same wave.                                                                              |
| Soft ordering         | [Reconcile the oat doctor example](./2026-09-08-reconcile-the-oat-doctor-example.md)                                                 | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                               | Authored in the same wave.                                                                              |
| Soft ordering         | [Keep plan writes on the caller's model](./2026-09-08-keep-plan-writes-on-the-callers-model.md)                                      | Never in one parallel group; both write `skills.test.ts` pins. Re-anchor on merge.                                                          | Authored in the same wave.                                                                              |
| Soft ordering         | [Correct skill authoring facts](./2026-09-08-correct-skill-authoring-facts.md)                                                       | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                               | Authored in the same wave.                                                                              |
| Soft adjacency        | GitHub issue [#266](https://github.com/voxmedia/open-agent-toolkit/issues/266), the other half of `BL-260906-harden-dispatch-launch` | Stays out of this lane entirely. The backlog item closes only when both halves land, so this lane updates the item but must not archive it. | Not admitted to a wave; the item's triage split holds it back pending a producer and an outcome matrix. |
| Satisfied predecessor | `DR-260906-one-version-bump-per-changed`                                                                                             | Accepted, so a later lane in the same PR carries an already-bumped skill value and moves no pin.                                            | Accepted.                                                                                               |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                | Affected | Files in common                                                                                                                                                                                     | Required update                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #190 (ReviewPlan Stage A compatibility release, OPEN draft) lands | Major    | `.agents/skills/oat-project-implement/SKILL.md`, `.agents/skills/oat-project-implement/references/phase-execution.md`, `packages/cli/src/validation/skills.test.ts` (all verified in its file list) | Re-derive `phase-execution.md:54-60`, `:74`, `:77` and `oat-project-implement/SKILL.md:47-54` before editing, and re-read the `2.3.7` pins. Do not apply this plan's line numbers unchecked.                                       |
| PR #273 (provider-neutral remote project management)                 | None     | none — its files were `oat-doctor/SKILL.md`, `oat-pjm-remote/**`, and the pjm remote command tree                                                                                                   | **Merged 2026-09-08 as `7d70ac307`.** The drift check from the prior baseline shows no in-scope file changed.                                                                                                                      |
| PR #125 (oat-brainstorm visual companion, OPEN) lands                | None     | none                                                                                                                                                                                                | No update.                                                                                                                                                                                                                         |
| Issue #266 is planned and lands                                      | Minor    | `packages/cli/src/providers/identity/oat-dispatch-record.ts`, `record.ts`                                                                                                                           | #266 adds a terminal-reconciliation slot to the same `oat` evidence block. Whichever lands second re-reads `oatRecordSchema` and `initialOatRecord()` before extending them; the two slots are independent and must not be merged. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..HEAD -- \
  .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-implement/references/phase-execution.md \
  .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md \
  .agents/skills/oat-dispatch-subagents/SKILL.md \
  .agents/skills/oat-dispatch-subagents/references/record-schema.md \
  .agents/agents/oat-phase-implementer.md \
  packages/cli/src/commands/project/dispatch/index.ts \
  packages/cli/src/commands/project/dispatch/record.ts \
  packages/cli/src/commands/project/dispatch/record.test.ts \
  packages/cli/src/providers/identity/oat-dispatch-record.ts \
  packages/cli/src/providers/identity/oat-dispatch-record.test.ts \
  packages/cli/src/providers/identity/generic-dispatch-record.ts \
  packages/cli/src/validation/skills.test.ts \
  .oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md
```

Expected at the authored commit: empty output. Any non-empty result means a
cited anchor may have moved; re-locate it before editing.
`oat-phase-implementer.md`, `dispatch-and-dry-run.md`, and
`generic-dispatch-record.ts` are read-only anchors here; they are in the diff
so a change to the check this plan relies on is noticed. Executing inside a
wave, run the same diff from the actual execution `HEAD` after predecessor
lanes integrate.

## Repository conventions

- Build: `pnpm build` → all packages build; required before `pnpm test:smoke`
  and `pnpm test:release`, and before running the built CLI in Step 1.
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
  This plan bumps two skills and **no** agent role.
- Locating pins: search the **old version literal** across `packages/cli/src`,
  `tools/smoke`, and `.agents/skills/*/tests`, then move only the hits that
  belong to the file you bumped. `1.1.5` is a live example of why the sweep is
  by literal, not by name: it pins both `.agents/agents/oat-phase-implementer.md`
  and the unrelated `oat-project-dispatch-subagents` adapter
  (`skills.test.ts:5950`); this plan moves neither.
- `DR-260906-standing-claims-in-skills-name`: a standing claim added to a skill
  needs a named executable backstop. The ordering clause added in Step 4 is
  backstopped by the pin added in Step 8.
- Implementation pattern for the git-backed test:
  `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
  (`git init -q .` fixtures at `:2338`, `:2836`, `:2980`, `:4304`).
- Implementation pattern for injected git: `gitExecFile` in
  `packages/cli/src/validation/skills.ts:948`, which defaults to
  `execFileAsync = promisify(execFile)` (`:1`, `:4`, `:76`) and is overridable
  through a dependencies object.
- Never run `oxfmt` on an OAT `state.md`.
- Git/PR convention: commit on the lane worktree branch. Do not push or open a
  PR; the wave fan-in owns that.

## Scope

### In scope

- `.agents/skills/oat-project-implement/references/phase-execution.md` — reorder
  the launch sequence so the baseline is captured after mandatory prelaunch
  journaling has been committed, and forbid a root commit into the child's
  checkout between capture and the child's base check.
- `.agents/skills/oat-project-implement/SKILL.md` — extend the "Never append
  while a dispatched child owns the worktree" rule at `:47-54` to the acceptance
  dispatch-record commit; `metadata.version` bump.
- `.agents/skills/oat-dispatch-subagents/SKILL.md` — state the ordering rule at
  the launch contract and document that the recorder stamps the observed head;
  `metadata.version` bump.
- `.agents/skills/oat-dispatch-subagents/references/record-schema.md` — document
  the new `oat.observedHead` evidence slot in the `## Record` section (`:113`).
- `packages/cli/src/providers/identity/oat-dispatch-record.ts` — add the
  `observedHead` slot to `oatRecordSchema` and `initialOatRecord()`.
- `packages/cli/src/commands/project/dispatch/record.ts` — observe git at
  publish time and stamp the slot; accept an injectable `gitExecFile`.
- `packages/cli/src/providers/identity/oat-dispatch-record.test.ts`,
  `packages/cli/src/commands/project/dispatch/record.test.ts`, and one new
  git-backed regression file.
- `packages/cli/src/validation/skills.test.ts` — version pins and one new
  ordering-clause pin.
- `.oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md` — tick the
  two #265 acceptance criteria. **Do not** change `status`, and do not run
  `oat backlog archive`.

### Out of scope

- `.agents/agents/oat-phase-implementer.md`. The child never reads the JSON
  journal — it receives the Phase Scope — so a consumer clause about the new
  slot would be unenforceable prose, and the glossary line at `:34`
  ("root-recorded HEAD before phase dispatch") stays true after the reorder.
  Leaving the file untouched also keeps the exact-equality check byte-identical
  by construction, avoids an agent-role bump, and keeps this lane clear of the
  agent-role gate the `tighten-the-skill-version-validators` lane adds.
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
  or the recovery/continuation paths in `phase-execution.md:127-470`.
- Redesigning the acceptance contract for hosts that return before the child
  finishes while sharing the root's checkout (see the host-model constraint and
  STOP condition 6).
- `packages/cli/src/commands/project/dispatch/index.ts` — it already passes
  only `{ projectPath, input }` at `:116-119` and needs no change when the
  default `gitExecFile` is resolved inside `record.ts`.
- The lockstep public package version bump and the release gates — the wave
  fan-in owns both.

## Current state

`oat project dispatch record` is a validate-and-persist command. Given
`--project`, `recordProjectDispatch` (`record.ts:502`, input
`{ projectPath, input, raceBarriers? }` — there is no dependencies parameter
today) parses the input once (the comment at `:495-501` explains why parsing is
deliberately non-idempotent), reads the latest revision per request id
(`readLatestRevisions`, `:413`), refuses a generic-field redefinition
(`:534-541`), collects related and trigger records, and publishes a new
revision file (`publishRevision`, `:457`). Before bytes reach the journal it
asserts no absolute path is present in identity fields (`:475`) and enforces a
whole-record size ceiling (`:476`). It touches git nowhere.

The persisted record is `PersistedOatDispatchRecordV1` — the generic record
(`generic-dispatch-record.ts:195-262`, `.strict()` with a `superRefine` at
`:263`) extended with a namespaced `oat` block
(`oat-dispatch-record.ts:589-602`). The `oat` block's slots are seeded by
`initialOatRecord()` and filled from validated evidence events
(`oatDispatchEvidenceEventSchema`, `:620-662`). Caller-supplied evidence lands
in `oat`; recorder-observed facts have no home there yet, which is the gap this
plan fills. `oat-dispatch-record.test.ts:760-800` and `:940-980` construct
`oat` blocks inline as parse-rejection fixtures; because the new slot defaults,
those literals keep parsing without edits.

### Weaker-anywhere rule

The phase-base check is a guard. Any base state that is **rejected** before this
change and **accepted** after it is a Critical regression, and issue #265's
third acceptance criterion says so directly ("A genuinely stale or unrelated
base mismatch is still rejected before any implementation edit"). Concretely:

- `.agents/agents/oat-phase-implementer.md` is not in the diff at all
  (`git diff --quiet HEAD -- .agents/agents/oat-phase-implementer.md` exits 0),
  and `skills.test.ts:3345-3347` keeps matching it.
- No clause added to `phase-execution.md` or either `SKILL.md` may permit a
  descendant of `phase_base_head`, an ancestry check, or a "recent enough"
  tolerance. The fix moves _when_ the baseline is captured; it never relaxes
  _what_ is compared.
- The new `observedHead` evidence must be additive: a record without it stays
  valid, and its presence must never cause a base state to be accepted that
  would otherwise be rejected.

## Implementation steps

### 1. Reproduce the ordering defect against a real git repository

In a `mktemp -d` scratch directory, `git init` a repo containing a minimal OAT
project directory with a `state.md`. Capture `BASE_BEFORE=$(git rev-parse
HEAD)`. Run the built CLI
(`node packages/cli/dist/index.js project dispatch record --project <dir> --event-file <event.json> --json`,
after `pnpm build`) to write a dispatch record into `<project>/dispatch/`,
`git add` and commit it, then capture `HEAD_AFTER=$(git rev-parse HEAD)`.
Assert `BASE_BEFORE != HEAD_AFTER`, and that a check of the form
`[ "$(git rev-parse HEAD)" = "$BASE_BEFORE" ]` — the exact shape of
`oat-phase-implementer.md:343` — fails. Use a valid record and event; the
`## Record` example in `record-schema.md:113` is the shape.

**Verify:** the script prints two different SHAs and the equality check exits
non-zero. This is the red half of the regression in Step 7 and the synthetic
twin of the p06 occurrence cited above.

### 2. Add the `observedHead` slot to the namespaced evidence block

In `packages/cli/src/providers/identity/oat-dispatch-record.ts`:

1. Define an `observedHeadSchema` as a discriminated union on `status`:
   - `{ status: 'observed', sha: z.string().regex(/^[0-9a-f]{40}$/), tree_clean: z.boolean(), observed_at: z.string().datetime() }`
   - `{ status: 'unobserved', reason: z.string().min(1).max(200), observed_at: z.string().datetime() }`
     (the module's other free-text slots use `z.string().min(1)`, e.g. `:259`;
     the cap keeps a git error message from bloating the journal)
     Both `.strict()`.
2. Add `observedHead: observedHeadSchema.nullable().default(null)` to
   `oatRecordSchema` (`:589-598`), following the `fallbackClaim` precedent on
   the line above it, and `observedHead: null` to `initialOatRecord()`
   (`:668-677`). The `.default(null)` keeps every existing persisted record
   parseable through `oatPart` (`:686-692`).

The slot's meaning is precise and narrow: **the `HEAD` of the repository
containing the project at the moment this revision was written, and whether
its tree was clean.** It is not the child's base; for a foreground host the
acceptance revision is written after the child finishes, so `sha` will
normally be the child's last task commit. What it makes auditable is the
journal-write ordering: a revision whose `sha` equals the phase base proves the
write did not precede capture, and a revision whose `sha` is a descendant of
the base proves the child ran before the journal was written.

Do **not** add a generic field. The generic block is immutable across revisions
(`record.ts:378-383`, `:534-541`) and every generic field must be classified in
the mutability table asserted by `oat-dispatch-record.test.ts:550-560`.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/oat-dispatch-record.test.ts`
→ passes, including the mutability-coverage case, which must be unaffected
because no generic field was added.

### 3. Stamp the observed head in the recorder

In `packages/cli/src/commands/project/dispatch/record.ts`:

1. Add an optional `gitExecFile` member to the `recordProjectDispatch` input
   object (beside `raceBarriers`, `:502-506`), typed like
   `ValidateOatSkillsDependencies['gitExecFile']` in `skills.ts`, defaulting to
   `promisify(execFile)` from `node:child_process`/`node:util` as
   `skills.ts:1,4,76` does. `index.ts` passes nothing and needs no change.
2. In `recordProjectDispatch`, when `input.projectPath !== null`, observe the
   repository containing the project with `cwd: projectPath`:
   `git rev-parse HEAD` and `git status --porcelain`. Stamp
   `oat.observedHead = { status: 'observed', sha, tree_clean: <porcelain
output is empty>, observed_at }`. On any git failure — not a repository, git
   absent, non-zero exit, unparsable SHA — stamp
   `{ status: 'unobserved', reason, observed_at }` and continue. Recording is
   evidence collection; it must never become a new way for a dispatch to fail.
3. Stamp it on **every** published revision, so a later revision records the
   head as of its own write. The `oat` block is exempt from the generic
   immutability comparison (`genericPart` strips it at `record.ts:371-376`), so
   this does not collide with `sameGenericRecord`.
4. The stamp is recorder-owned. If the caller's input carries an
   `oat.observedHead`, the recorder overwrites it; the value is an observation,
   not a claim. That is what makes the ordering auditable "without inferring
   provenance" (issue #265, fourth acceptance criterion).

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch`
→ passes, and a manual run against the Step 1 scratch repo produces a journal
file whose `oat.observedHead.sha` equals `git rev-parse HEAD` at write time.

### 4. Reorder the phase launch sequence

In `.agents/skills/oat-project-implement/references/phase-execution.md`, rewrite
the numbered sequence at `:54-60` so that:

1. every mandatory prelaunch journal and bookkeeping write for this phase — the
   step-3 dispatch stamp and run anchor in `implementation.md`, and any
   `state.md` transition the launch requires — is written **and committed**
   first, as the mandatory bookkeeping commit `SKILL.md:101-102` already
   requires;
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
project-log append, and say it is the same rule stated at `:47-49` and applied
at `:64-67`.

In `.agents/skills/oat-dispatch-subagents/SKILL.md`, add to the launch contract
(`:140-149`) that the caller resolves any execution baseline **after** its
mandatory prelaunch journaling has been committed, and that the recorder stamps
the head it observed into `oat.observedHead`.

Document the slot in
`.agents/skills/oat-dispatch-subagents/references/record-schema.md` in the
`## Record` section (`:113`), next to the existing `launch_status` examples
(`:150`, `:185`), with both the `observed` and `unobserved` shapes.

**Verify:** `grep -n 'PHASE_BASE_HEAD' .agents/skills/oat-project-implement/references/phase-execution.md`
→ the capture appears after the journaling-and-commit step and before the
scope send;
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
→ passes (pins updated in Step 8).

### 5. Confirm the consumer side is untouched

Run `git diff --quiet HEAD -- .agents/agents/oat-phase-implementer.md`. This
plan makes no edit there (see `## Scope`); the step exists so the executor
proves it rather than assumes it.

**Verify:** exit 0, and
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t 'phase-implementer'`
still passes the `:3345-3347` pin.

### 6. Update the backlog item without closing it

In `.oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md`, tick the
two acceptance criteria that name issue #265 and leave the two that name #266
untouched. Add a dated note recording that #265 landed and that the item stays
open until #266 does. Leave `status: open`. Do not run `oat backlog archive`.
The `external_plans` link to this plan is already present; do not duplicate it.

**Verify:** `grep -n 'status:' .oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md`
→ `status: open`; the two #266 criteria remain unticked.

### 7. Add the regression and its negative controls

See `## Test plan` for the exact cases. Add them, then run them against the
pre-fix code to confirm each goes red.

**Verify:** every new case fails on the pre-fix tree and passes on the post-fix
tree, with both exit codes recorded.

### 8. Bump the changed skills and move the pins

Bump once per changed skill: `oat-project-implement` `2.3.7` → `2.3.8` and
`oat-dispatch-subagents` `1.2.7` → `1.2.8`, both in `metadata.version`. No agent
role changes. Then sweep each old literal in plain and regex-escaped form across
`packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests`, and move only
the hits that belong to the bumped file.

Expected pins (verified at the inspected `HEAD`): `2.3.7` at
`skills.test.ts:1983`, `:2464`, `:2773`, `:2847`, `:3339`, `:4547`, `:5870`,
`:7953`; `1.2.7` at `:5947`, `:6106`. `1.1.5` is **not** swept: this plan does
not bump `oat-phase-implementer`. Add one pin asserting the new ordering clause
in `phase-execution.md` (a regex over "PHASE_BASE_HEAD" following the
journal-commit sentence), so the standing claim has an executable backstop
(`DR-260906-standing-claims-in-skills-name`).

**Verify:**

```bash
for v in 2.3.7 1.2.7; do
  echo "== $v"
  grep -rn --fixed-strings "$v" packages/cli/src tools/smoke .agents/skills/*/tests || true
done
```

→ no hits. `pnpm run check:skill-bumps` → exit 0 with two changed skills.

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
   `oat-phase-implementer.md:343` — passes for the post-journal baseline.
   **Red control:** resolve the baseline before the journal commit (the pre-fix
   order); the same equality check must fail. Record both exit states.
2. `a genuinely stale base is still rejected` — the weaker-anywhere control.
   After the post-journal baseline is captured, make an unrelated commit, then
   run the same equality check. It must fail. **Red control:** this case must
   fail if anyone relaxes the check to an ancestry test — prove it by
   temporarily substituting `git merge-base --is-ancestor` and observing the
   case go green, then restore.
3. `records the observed head on a dirty tree as not clean` — write an
   uncommitted file, publish a revision, assert
   `oat.observedHead.tree_clean === false`. **Red control:** neutralize the
   `git status --porcelain` observation in Step 3; the case must fail.
4. `records an unobserved head outside a git repository` — publish into a
   project directory in a non-git temp dir; assert
   `oat.observedHead.status === 'unobserved'` and that the publish still
   succeeds. **Red control:** make the git failure throw; the case must fail.
5. `overwrites a caller-supplied observedHead` — pass an input whose `oat`
   carries a fabricated `observedHead`; assert the persisted value is the
   recorder's. **Red control:** skip the overwrite; the case must fail.

**Changed cases**

- `packages/cli/src/providers/identity/oat-dispatch-record.test.ts:550-560`
  (`covers every generic dispatch field with an explicit mutability decision`) —
  must pass **unchanged**. If it needs editing, a generic field was added by
  mistake; revert to the `oat` slot. Add two adjacent cases: the new slot
  defaults to `null` for a record that omits it, and a stored record written
  before this change still parses.
- `packages/cli/src/commands/project/dispatch/record.test.ts` — add a case
  proving that a second revision of the same `request_id` carrying a **different**
  `oat.observedHead` is accepted while a changed generic field is still
  rejected with `Existing generic fields are immutable and cannot be redefined.`
  Existing cases in this file publish into non-git temp dirs and now see
  `status: 'unobserved'`; any that `toEqual` a whole `oat` block gain the new
  key. **Red control:** move the field into the generic block; the case must
  fail with that exact message.
- `packages/cli/src/validation/skills.test.ts` — pins at the eight `2.3.7` and
  two `1.2.7` sites listed in Step 8, plus one new assertion that
  `phase-execution.md` states the post-journal ordering. **Red control:** delete
  the ordering sentence from the skill; the new assertion must fail.

**Focused command**

`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch src/providers/identity/oat-dispatch-record.test.ts src/validation/skills.test.ts`
→ all cases pass.

**Full relevant suite**

`HOME=$(mktemp -d) pnpm exec turbo run test --force` → passes with no cache
replay.

## Done criteria

Issue #265's four acceptance criteria, mapped:

- [ ] "The accepted execution baseline is calculated after every required
      launch-journal commit" — `phase-execution.md` records `PHASE_BASE_HEAD`
      only after mandatory prelaunch journal commits, and forbids a root commit
      into the child's checkout between capture and the child's base check;
      `oat-project-implement/SKILL.md` defers the acceptance dispatch-record
      commit to the phase-outcome bookkeeping.
- [ ] "A regression test advances Git `HEAD` through mandatory launch
      journaling and proves the first authorized dispatch remains valid" —
      `baseline-ordering.test.ts` case 1 is red on the pre-fix order and green
      on the post-fix order, with both exit codes recorded.
- [ ] "A genuinely stale or unrelated base mismatch is still rejected before
      any implementation edit" — case 2 is red for an unrelated commit, and
      `.agents/agents/oat-phase-implementer.md` is not in the diff.
- [ ] "Dispatch and journal receipts make the baseline ordering auditable
      without inferring provenance" — `oat.observedHead` exists in
      `oatRecordSchema` and `initialOatRecord()`, defaults to `null`, is stamped
      by the recorder from observed git state on every published revision, and
      overrides any caller-supplied value (case 5).
- [ ] No field was added to `genericDispatchRecordSchema`, and
      `oat-dispatch-record.test.ts:550-560` passes unchanged.
- [ ] Two version bumps (`oat-project-implement`, `oat-dispatch-subagents` in
      `metadata.version`) with all ten pins moved and no `1.1.5` pin touched.
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
2. any change would touch `.agents/agents/oat-phase-implementer.md`, or would
   make its `:343-348` check accept a base state it rejects today, including via
   an ancestry, descendant, or tolerance clause;
3. the `observedHead` slot cannot be added without touching
   `genericDispatchRecordSchema` — that path is closed by generic revision
   immutability and by the mutability-coverage case;
4. a stored dispatch record from before this change fails to parse;
5. observing git makes `oat project dispatch record` fail in any environment
   where it succeeds today — recording evidence must never become a launch
   blocker;
6. the reordered sequence would only hold for a host that returns after the
   child finishes, and the executor finds a project-aware launch path that
   returns a live handle into a shared checkout — that is an acceptance-contract
   redesign, not this plan;
7. work drifts toward issue #266 — terminal outcomes, envelopes, reconciliation
   events, or closeout detection for unresolved dispatches;
8. anyone proposes closing or archiving `BL-260906-harden-dispatch-launch`;
9. the cited line anchors in `phase-execution.md`, `oat-project-implement/SKILL.md`,
   or `record.ts` no longer match after the drift check;
10. a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

**STOP recorded 2026-09-09 (wave-7 p16; the lane parked without a commit — this plan needs re-planning as a decision, not adaptation):** Step 3 prescribes an optional `gitExecFile` seam in `packages/cli/src/commands/project/dispatch/record.ts` defaulting to `promisify(execFile)`; the recorder graph carries an enforced architectural guard, `record.test.ts:1879-1902` ("launches no provider: the recorder graph cannot start a process"; the regex bans `child_process`, `execFile`, `spawn`, `fetch` in `record.ts`, `index.ts`, and the identity modules), and the plan's own Step 3 verify gate fails on the plan's own edit (three-way control: base green; Step 2 alone green; Steps 2 + 3 red at `:1901`). This plan's `## Current state` ("it touches git nowhere") records the symptom and misses the guard. No implementation satisfies both texts: the command layer is in the same guard list; an unlisted new module evades the guard's stated subject; reading `.git/HEAD` cannot produce the required `tree_clean`; caller-supplied observation is excluded by Step 3.4 and issue #265. The documented contract says "never launches a provider" while the test enforces "cannot start a process" — whether a narrowly audited git seam is admissible is an architecture/security decision this plan neither analyzes nor authorizes, and no STOP condition here covers the conflict. Disposition: parked; the partial Steps 2–3 patch and a real pre-fix journal fixture are preserved at `.oat/projects/shared/wave-7-execution/parked/wave-7-p16/`; `BL-260906-harden-dispatch-launch` stays open with both halves. Further defects for the re-plan: test-plan case 5 is unreachable as written (`genericDispatchRecordSchema` is `.strict()`, so an `oat` key on the input is rejected; the reachable carrier is the persisted revision through `augmentDispatchRecord`); the `oat` block is uniformly camelCase (`observedAt` already exists), so `tree_clean` / `observed_at` should be settled deliberately; a plan that adds a capability to a module must grep that module's own test file for architectural guards.

Revalidate against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
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
serialized against the seven sibling lanes named in `## Dependencies`. It edits
no `.agents/agents/*.md` file, so the agent-role gate introduced by the
`tighten-the-skill-version-validators` lane does not apply to it.

## Review focus

- **Weaker-anywhere on the phase-base check.** Confirm
  `.agents/agents/oat-phase-implementer.md` is absent from the diff and that
  nothing added to `phase-execution.md` or either `SKILL.md` creates an escape
  hatch. This is the criterion issue #265 states explicitly and the one a
  reordering fix is most likely to violate by accident.
- **Ordering, not tolerance.** Read the rewritten sequence in
  `phase-execution.md` and confirm the baseline is captured after the journal
  commit rather than the check being loosened to accept a moved `HEAD`.
- **Namespaced vs generic placement.** Confirm the slot landed in the `oat`
  block and that `genericDispatchRecordSchema` is untouched; a generic field
  would be silently rejected on any second revision of the same request.
- **Recorder-owned evidence.** Confirm a caller-supplied `oat.observedHead` is
  overwritten rather than trusted (case 5); otherwise the audit trail is a
  claim, which is what the issue asks to eliminate.
- **Naming honesty.** Confirm the slot is documented as "the head observed at
  journal-write time", not as the child's baseline; the two coincide only for
  a prelaunch revision.
- **Backward compatibility.** Confirm a record written before this change still
  parses, and that publishing outside a git repository still succeeds.
- **Scope discipline.** Confirm nothing in the diff addresses issue #266, and
  that the backlog item is updated but left open.

## Execution record (2026-09-09, wave 7)

Parked as wave-7 p16 (PR #286 `wave-7-execution`, CLI 0.2.67): not executed. not delivered — the plan's Step 3 git seam is forbidden by the recorder graph's architectural no-process guard; partial Steps 2–3 preserved at `parked/wave-7-p16/` (since 2026-09-09 restored at `.oat/repo/reference/parked/wave-7-p16/`; the wrapper path was archived away); the item returns to planning as a decision. The STOP is recorded above in `## Revalidation Before Execution`; `BL-260906-harden-dispatch-launch` stays open with both halves and a Notes entry; this plan re-enters a later wave only after a decision on where the recorder's git seam may live.
