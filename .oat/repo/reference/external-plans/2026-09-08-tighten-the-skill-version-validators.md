---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260906-extend-check-skill-bumps.md
  - .oat/repo/pjm/backlog/items/BL-260908-report-a-changed-skill-with-no.md
  - .oat/repo/pjm/backlog/items/BL-260908-retire-the-top-level-skill.md
oat_external_plan_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_main_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-extend-check-skill-bumps
  - BL-260908-report-a-changed-skill-with-no
  - BL-260908-retire-the-top-level-skill
oat_issue_url: null
created: '2026-09-08T21:21:53Z'
---

# Close the three version-validator gaps: agent roles, unresolvable versions, and the alias promotion

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> One `Soft` row records that this lane writes
> `packages/cli/src/validation/skills.ts` and `skills.test.ts` and must not
> share a wave-7 parallel group with the other lanes that write the same files.

## Outcome

Three enforcement gaps in the same two functions close together, so the version
contract stops passing by omission.

- **Clause A.** `pnpm run check:skill-bumps` diffs `.agents/agents/*.md`
  alongside `.agents/skills/*/SKILL.md`, applying the same one-bump-per-PR rule
  to canonical agent roles. Agent roles keep declaring a top-level `version:`
  per `DR-260908-bundled-skills-declare`, so the gate accepts either declaration
  shape and its finding text names `metadata.version` as the canonical spelling
  without demanding it of agents. Root `AGENTS.md:11` and the docs section that
  restates the rule are corrected in the same PR.
- **Clause B.** A changed file with no frontmatter block, or with a frontmatter
  block that declares no resolvable version (a `metadata:` map with no `version`
  child, now the shape bundled skills use), produces a blocking finding from
  **both** `validateChangedSkillVersionBumps` and the structural
  `validateOatSkills` pass, instead of falling through a silent `continue`.
- **Clause C.** The `skill-version-alias` finding is reported at `error`
  severity, executing step 1 of the retirement schedule fixed by
  `DR-260908-bundled-skills-declare`. This is the first validator-changing
  release after CLI 0.2.65, which is exactly the release the decision names.

After this change, the state that made all three gaps invisible — "no version
found, so skip" — no longer exists in either validator.

## Source and live evidence

- Source backlog item:
  [BL-260906-extend-check-skill-bumps — Extend check:skill-bumps to canonical agent files](../../pjm/backlog/items/BL-260906-extend-check-skill-bumps.md)
- Source backlog item:
  [BL-260908-report-a-changed-skill-with-no — Report a changed skill with no frontmatter block in the bump validator](../../pjm/backlog/items/BL-260908-report-a-changed-skill-with-no.md)
- Source backlog item:
  [BL-260908-retire-the-top-level-skill — Retire the top-level skill version alias on the recorded schedule](../../pjm/backlog/items/BL-260908-retire-the-top-level-skill.md)
  — step 1 only; see its "Split (2026-09-08 triage)" section.
- Related decisions:
  [DR-260906-one-version-bump-per-changed](../decisions/DR-260906-one-version-bump-per-changed.md),
  [DR-260908-bundled-skills-declare](../decisions/DR-260908-bundled-skills-declare.md)
- Inspected `HEAD`: `c9f2e147ac0674e73a60735e0c1727ccc6048756`
- Comparison baseline: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the fetched
  `origin/main` tip, identical to the inspected `HEAD` because the planning
  branch is at `origin/main`.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty when this plan
  was started; sibling plan authors later added untracked files under
  `.oat/repo/reference/external-plans/` and modified
  `.oat/repo/pjm/backlog/items/BL-260908-correct-the-factual-skill.md`. Neither
  path is a surface of this plan.

### Why these three are one plan

They are inseparable, not merely thematic. Clauses A and B both change
`listChangedSkillFiles` / `collectChangedSkillVersionBumpFindings` in
`packages/cli/src/validation/skills.ts`; clauses B and C both change
`collectSkillVersionSourceFindings` in the same file; and all three land in the
same `skills.test.ts` cases. Splitting them would mean three PRs re-editing the
same twenty lines and three separate reversions of the same fixtures. Clause C
additionally has a release-relative deadline that only a validator-changing
release can satisfy — and clauses A and B are what make this release one.

### Verified evidence

**Clause A — the gate's pathspec**

- `packages/cli/src/validation/skills.ts:943-969` — `listChangedSkillFiles` runs
  `git diff --name-only --diff-filter=ACMR <baseRef>...HEAD -- .agents/skills/*/SKILL.md`.
  The pathspec at `:957` is the only inclusion rule; `.agents/agents/*.md` is
  never diffed.
- `packages/cli/src/validation/skills.ts:1100-1124` —
  `validateChangedSkillVersionBumps` calls that function and passes its output
  straight to the collector, so the pathspec is the gate's entire surface.
- `packages/cli/src/commands/internal/validate-skill-version-bumps.ts:59-64` —
  the wrapper sets `process.exitCode = 1` on any finding regardless of severity.
  `package.json:29` binds `check:skill-bumps` to
  `oat internal validate-skill-version-bumps --base-ref origin/main`.
- `ls .agents/agents` → five canonical roles: `oat-codebase-mapper.md`,
  `oat-phase-implementer.md`, `oat-reviewer.md`, `recon-worker.md`,
  `skeptical-evaluator.md`. `.agents/agents/oat-phase-implementer.md:1-6`
  declares a **top-level** `version: 1.1.5`, not `metadata.version`.
- `DR-260908-bundled-skills-declare` states this explicitly: "Agent roles under
  `.agents/agents` carry the same top-level field but fall outside both
  enforcement surfaces: the alias warning walks only `.agents/skills`, and the
  bump gate's diff pathspec is `.agents/skills/*/SKILL.md`. They emit no warning
  and break no test." Its Decision section adds: "Agent roles under
  `.agents/agents` are deliberately not migrated. They migrate when their own
  enforcement surface exists, which is a separate decision." So the gate must
  accept a top-level declaration for an agent; requiring `metadata.version`
  there would contradict an accepted decision.
- Today an unbumped agent edit is caught only by the explicit pins in
  `packages/cli/src/validation/skills.test.ts` (`:3026`, `:3334`, `:6017`,
  `:7954` for `oat-phase-implementer.md`) — a per-file allowlist, not a gate.
- `AGENTS.md:11` — "When a PR changes a canonical skill at
  `.agents/skills/*/SKILL.md`, increase that skill's frontmatter `version:` in
  the same PR." Both halves are stale: the path set is narrower than the gate
  will be, and "frontmatter `version:`" names the deprecated alias rather than
  `metadata.version`.
- `apps/oat-docs/docs/contributing/skills.md:229-241` ("The version is gated")
  restates the same rule for `SKILL.md` only.

**Clause B — the silent fall-throughs**

- `packages/cli/src/validation/skills.ts:1011-1016` — the bump collector reads
  `getFrontmatterBlock(currentContent)` and computes
  `parsedCurrent = currentBlock === null ? null : parseSkillFrontmatter(currentBlock)`,
  with the same shape for the base side. A file with no `--- … ---` block yields
  `null`, which is not `malformed` and not `unusableVersionDeclaration`, so it
  skips every guard at `:1024-1039`.
- `packages/cli/src/validation/skills.ts:1041-1044` — `resolvedCurrent` is
  `null` for a `null` parse, and `resolveSkillVersion` returns no version for a
  `metadata:` map with no `version` child.
- `packages/cli/src/validation/skills.ts:1072-1077` — `if (!currentVersion ||
!baseVersion) { continue; }`. This is the silent exit for both states. The
  comment at `:1018-1023` documents why _malformed_ and _unusable_ declarations
  must not reach it, and the two states in this clause reach it anyway.
- `packages/cli/src/validation/skills.ts:1153-1156` — the structural
  version-source pass has the same shape: `if (block === null) { continue; }`.
  `:1176-1179` — `const resolved = resolveSkillVersion(parsed); if (!resolved)
{ continue; }`.
- `packages/cli/src/validation/skills.ts:1226-1231` — the `oat-*` structural
  loop _does_ report `Missing frontmatter block (--- ... ---)`, so a missing
  block is caught today for `oat-*` skills in `validateOatSkills` only. It is
  **not** caught for a non-`oat-*` skill, and it is caught by neither validator
  for the bump gate. The item's claim that the state "is still skipped silently
  by `validateChangedSkillVersionBumps`" is accurate; its implied claim that the
  structural validator is silent too is accurate only for non-`oat-*` skills and
  for the no-resolvable-version case.
- Existing finding helpers to match: `unreadableFrontmatterFinding`
  (`:694-702`, `code: 'skill-frontmatter-unreadable'`, `severity: 'error'`),
  `unusableVersionFinding` (`:727-735`, `code: 'skill-version-unusable'`),
  `versionConflictFinding` (`:769-779`), `uncomparableBaseFinding`
  (`:737-768`), and `pushUniqueFinding` (`:704-717`), which dedupes by
  `file + code + message` so the structural pass and the bump collector can both
  emit the same finding without doubling it.

**Clause C — the alias severity and its schedule**

- `packages/cli/src/validation/skills.ts:1186-1193` — `if (resolved.source ===
'top-level')` pushes `{ code: 'skill-version-alias', severity: 'warning', … }`.
- `packages/cli/src/validation/skills.ts:1126-1136` — the function comment
  records that the alias finding is a warning, that `validate-oat-skills.ts`
  treats warnings as non-blocking, and that neither this finding nor
  `skill-version-conflict` is produced by the bump validator.
- `packages/cli/src/validation/skills.ts:1046-1050` — the bump collector's
  comment confirms the alias warning "stays in structural validation and never
  reaches this result". So promoting the severity cannot make `check:skill-bumps`
  fail on a bundled skill; it changes `oat:validate-skills` only.
- `packages/cli/package.json:3` — `"version": "0.2.65"`. `DR-260908` schedules
  step 1 for "the first release after 0.2.65 that changes the validator". This
  lane changes the validator, and the wave fan-in bumps the lockstep to the next
  version, so this release is that release.
- **Live confirmation that the bundled tree is clean:**
  `node packages/cli/dist/index.js internal validate-oat-skills --json` at the
  inspected `HEAD` returns
  `{"status":"ok","validatedSkillCount":64,"findings":[]}`. Zero alias findings,
  so promoting `warning` → `error` produces no findings on `.agents/skills` and
  satisfies the item's second acceptance criterion by construction. Re-run this
  during the drift check; a non-empty `findings` array is STOP condition 5.
- Assertions that pin the current severity and must move:
  `packages/cli/src/validation/skills.test.ts:144`, `:1169`, `:9119-9120`
  (`severity: 'warning'` inside a `skill-version-alias` object), and
  `packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts:368`,
  whose surrounding comment at `:350` explains why the alias finding is not
  routed through the bump validator.
- `DR-260908-bundled-skills-declare` requires that
  `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` fixtures move
  "in the same change as any resolver precedence change". Step 1 changes a
  finding's severity, not `resolveSkillVersion`'s precedence, so those fixtures
  stay untouched. Confirm this in review rather than assuming it.
- Step 2 of `BL-260908-retire-the-top-level-skill` — removing the top-level read
  from `resolveSkillVersion` — moved to `BL-260908-remove-the-top-level-skill`
  and is out of scope. Note the coupling: clause A gives agent roles their first
  enforcement surface while they still declare the top-level field, so removing
  the resolver's top-level read would break the gate this plan creates. The
  removal item must migrate the agent roles first or scope the removal to
  skills.

## Dependencies

| Type                  | Dependency                                                                                                                                                                             | Required state                                                                                         | Current state                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Soft ordering         | Every other wave-7 lane that writes `packages/cli/src/validation/skills.ts` or `skills.test.ts` — the stray-fence lane, the dispatch-baseline lane, the doctor lane, and the seal lane | Never composed into one parallel group with this lane.                                                 | Recorded; the wave composer serializes them.                             |
| Soft ordering         | `BL-260908-remove-the-top-level-skill` (step 2 of the alias retirement)                                                                                                                | Must land **one release after** this one, and only after the agent-role migration question is settled. | Not admitted to a wave; blocked on this lane by the decision's schedule. |
| Satisfied predecessor | `DR-260908-bundled-skills-declare`                                                                                                                                                     | Accepted, and the 82-skill migration shipped in CLI 0.2.65.                                            | Accepted; verified live — `validate-oat-skills` returns zero findings.   |
| Satisfied predecessor | `DR-260906-one-version-bump-per-changed`                                                                                                                                               | Accepted, so a later lane in the same PR carries an already-bumped value.                              | Accepted.                                                                |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                                     | Affected | Files in common                                                                         | Required update                                                                                                                                                |
| ----------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #190 (ReviewPlan Stage A compatibility release, OPEN draft) lands                      | Moderate | `packages/cli/src/validation/skills.test.ts`                                            | Re-locate the four `severity: 'warning'` alias assertions and any new bump-validator cases before editing; the file is large and its line anchors move easily. |
| PR #273 (provider-neutral remote project management, OPEN) lands                          | None     | none — it touches `oat-doctor/SKILL.md`, `oat-pjm-remote/**`, and its own contract test | No update. Reconfirm with `gh api --paginate repos/voxmedia/open-agent-toolkit/pulls/273/files --jq '.[].filename'`.                                           |
| PR #125 (oat-brainstorm visual companion, OPEN) lands                                     | None     | none                                                                                    | No update.                                                                                                                                                     |
| Any PR edits an `.agents/agents/*.md` role without a version bump while this lane is open | Minor    | `.agents/agents/*.md`                                                                   | Once clause A merges, that PR's `check:skill-bumps` starts failing. Expected and correct; do not weaken the gate to accommodate it.                            |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat c9f2e147ac0674e73a60735e0c1727ccc6048756..origin/main -- \
  packages/cli/src/validation/skills.ts \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/commands/internal/validate-skill-version-bumps.ts \
  packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts \
  packages/cli/src/commands/shared/frontmatter.ts \
  AGENTS.md \
  apps/oat-docs/docs/contributing/skills.md \
  .agents/agents \
  .oat/repo/pjm/backlog/items/BL-260906-extend-check-skill-bumps.md \
  .oat/repo/pjm/backlog/items/BL-260908-report-a-changed-skill-with-no.md \
  .oat/repo/pjm/backlog/items/BL-260908-retire-the-top-level-skill.md
```

Expected at the authored commit: empty output. Also re-run
`node packages/cli/dist/index.js internal validate-oat-skills --json` (after
`pnpm build`) and confirm `findings` is still `[]` before promoting the alias
severity. Executing inside a wave, run the same diff from the actual execution
`HEAD` after predecessor lanes integrate.

## Repository conventions

- Build: `pnpm build` → all packages build; required before `pnpm test:smoke`
  and `pnpm test:release`, and before running the built CLI for the live checks
  in this plan.
- Typecheck: `pnpm type-check` → passes.
- Focused test: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/internal/validate-skill-version-bumps.test.ts`
  → all cases pass.
- Lane gates (lane mode, see "Wave execution"): `pnpm check`, `pnpm type-check`,
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
  `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`,
  `pnpm oat:validate-skills`.
- `pnpm check` is the only gate that runs markdownlint over
  `apps/oat-docs/docs`, so it is mandatory here.
- Skill versioning: one `metadata.version` bump per changed canonical skill per
  PR; the top-level `version:` key is gone from bundled skills since CLI 0.2.65.
  This plan changes **no** `.agents/skills/*/SKILL.md`, so it needs no skill
  bump — but confirm that with `pnpm run check:skill-bumps` rather than by
  assumption, because the gate's own surface widens in Step 1.
- Locating pins, when a bump does become necessary: search the **old version
  literal** across `packages/cli/src`, `tools/smoke`, and
  `.agents/skills/*/tests`, then move only the hits belonging to the bumped file.
- Editing `apps/oat-docs/docs/**` counts as shipped CLI functionality for
  release policy; the lockstep public package bump is owned by the wave fan-in,
  not by this lane.
- Never run `oxfmt` on an OAT `state.md`.
- Implementation pattern for tests: the `skill version resolution across both
validators` describe block at `packages/cli/src/validation/skills.test.ts:9011`,
  with its `createRoot`, `skillContent`, `createSkillFile`, and
  `changedSkillGit` helpers (`:9021-9060`). `changedSkillGit` fakes
  `gitExecFile` by returning a fixed `git diff` stdout and a fixed
  `git show` body, so a new fixture needs no real repository.
- `.oat/config.json` keys parity: not touched by this plan.
- Git/PR convention: commit on the lane worktree branch. Do not push or open a
  PR; the wave fan-in owns that.

## Scope

### In scope

- `packages/cli/src/validation/skills.ts` — `listChangedSkillFiles` pathspec
  (`:957`); the two silent `continue`s in
  `collectChangedSkillVersionBumpFindings` (`:1011-1016` → `:1075-1077`) and in
  `collectSkillVersionSourceFindings` (`:1153-1156`, `:1176-1179`); the
  `skill-version-alias` severity (`:1190`); two new finding helpers beside
  `:694-779`; the function comments at `:1018-1023`, `:1046-1050`, and
  `:1126-1136`.
- `packages/cli/src/commands/internal/validate-skill-version-bumps.ts` —
  user-facing wording that says "skills" where it now also means agent roles.
  The JSON key `validatedSkillCount` stays, so no consumer contract moves.
- `packages/cli/src/validation/skills.test.ts` and
  `packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts` —
  changed and new cases.
- `AGENTS.md:11` — the path set and the field name.
- `apps/oat-docs/docs/contributing/skills.md:229-241` — the same correction in
  the docs restatement.
- The three source backlog items — acceptance criteria and `external_plans`.

### Out of scope

- `packages/cli/src/commands/shared/frontmatter.ts` and `resolveSkillVersion`.
  Removing the top-level read is step 2, owned by
  `BL-260908-remove-the-top-level-skill`, and it must land a release later.
- Migrating `.agents/agents/*.md` to `metadata.version`.
  `DR-260908-bundled-skills-declare` deliberately leaves agent roles unmigrated
  and says their migration is a separate decision. Clause A gives them an
  enforcement surface; it does not change their declaration shape.
- The five frontmatter-walk copies and the `.inf` key-normalization defect
  recorded in `BL-260908-retire-the-top-level-skill`'s Notes. Both are attached
  to step 2.
- `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` fixtures — they
  move with a resolver precedence change, and this plan makes none.
- Extending `collectSkillVersionSourceFindings` (and therefore the alias finding)
  to `.agents/agents`. That would make every agent role an `error` the moment
  clause C lands, which contradicts `DR-260908-bundled-skills-declare`.
- The lockstep public package version bump and the release gates — the wave
  fan-in owns both.

## Current state

`packages/cli/src/validation/skills.ts` hosts two independent validators.

`validateChangedSkillVersionBumps` (`:1100-1124`) is the `check:skill-bumps`
gate. It lists changed files by git pathspec, then
`collectChangedSkillVersionBumpFindings` (`:990-1098`) reads current and base
content, parses both frontmatter blocks, guards four uncomparable states
(malformed current, unusable current, malformed base, unusable base — `:1024-1039`),
guards two conflict states (`:1051-1070`), and only then compares versions
(`:1079-1096`). Its wrapper fails the gate on **any** finding, whatever the
severity, which is why the alias warning is deliberately kept out of it.

`validateOatSkills` (`:1197-…`) is the structural `oat:validate-skills` pass. It
runs `collectSkillVersionSourceFindings` (`:1137-1195`) over **every** skill
directory — not just `oat-*`, as the comment at `:1126-1136` explains — and then
an `oat-*`-only structural loop that reports a missing `SKILL.md` (`:1222`) and
a missing frontmatter block (`:1228-1231`).

Between them, four states currently exit without a finding:

| State                                      | Bump validator                      | Structural validator        |
| ------------------------------------------ | ----------------------------------- | --------------------------- |
| No frontmatter block, `oat-*` skill        | silent `continue` (`:1007`/`:1075`) | reported (`:1228`)          |
| No frontmatter block, non-`oat-*` skill    | silent `continue`                   | silent `continue` (`:1154`) |
| Frontmatter present, no resolvable version | silent `continue` (`:1075`)         | silent `continue` (`:1177`) |
| Changed `.agents/agents/*.md`, unbumped    | never diffed (`:957`)               | out of the walk by design   |

Clause A closes row 4, clause B closes rows 1–3, and clause C changes the
severity of a finding that is currently emitted but non-blocking.

### Weaker-anywhere rule

Both functions are validators. Any input that is **rejected** today and
**accepted** after this change is a Critical regression, and it applies in both
directions here because clause A widens an input set while clauses B and C
tighten outcomes. Specifically:

- Every finding emitted today must still be emitted, with the same `code`, for
  the same input. The four uncomparable-state guards (`:1024-1039`) and the two
  conflict guards (`:1051-1070`) must keep firing first, before any new
  no-version finding, so their more specific messages are not masked by a
  generic one.
- Widening the pathspec must not drop `.agents/skills/*/SKILL.md`. A pathspec
  typo that silently narrowed the skills half would be exactly the class of
  defect these items exist to prevent; Step 6's control proves it did not
  happen.
- Promoting `skill-version-alias` to `error` must not route it into the bump
  validator, whose wrapper fails on any finding: an alias-declaring third-party
  skill would then fail the bump gate for a reason unrelated to bumping. The
  separation documented at `:1046-1050` must hold, and Step 6 proves it.
- An agent role declaring a top-level `version:` must remain **accepted** by the
  new gate. Clause A adds enforcement, not a migration.

## Implementation steps

### 1. Widen the bump gate's pathspec to canonical agent roles

In `packages/cli/src/validation/skills.ts`, change `listChangedSkillFiles`
(`:943-969`) to pass two pathspecs to `git diff`: the existing
`.agents/skills/*/SKILL.md` and a new `.agents/agents/*.md`. Keep the
`--diff-filter=ACMR` and `<baseRef>...HEAD` arguments unchanged. Rename the
function to something that describes both inputs (for example
`listChangedVersionedFiles`) and update its single call site at `:1106`.

Do not filter the agent list further. All five files under `.agents/agents` are
canonical roles; a nested directory would not match `.agents/agents/*.md`, which
is the intended bound.

**Verify:**

```bash
pnpm build
git -C "$(mktemp -d)" --version >/dev/null   # sanity: git available
node packages/cli/dist/index.js internal validate-skill-version-bumps \
  --base-ref origin/main --json
```

→ `validatedSkillCount` includes any changed `.agents/agents/*.md` file in the
current branch's diff, and `status` is `ok` when every changed file is bumped.

### 2. Restate the bump criterion against `metadata.version`, accepting both shapes for agents

In `collectChangedSkillVersionBumpFindings`, update the two comparison messages
at `:1080-1083` and `:1092-1095` so they name `metadata.version` as the
canonical declaration and say that an agent role may declare a top-level
`version:`. Keep the `${baseRef}` interpolation and the `(still X)` /
`(base X, current Y)` value reporting; those are what make a failure
actionable.

The resolution logic itself needs no change: `resolveSkillVersion` already
accepts both shapes and reports a conflict when they disagree
(`versionConflictFinding`, `:769-779`), and that conflict path is already
guarded at `:1051-1070`. An agent that later gained a conflicting pair would be
reported, which is correct.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
→ passes; the new agent fixture cases from the Test plan assert the new message
text.

### 3. Fix the stale rule text in `AGENTS.md` and the docs

`AGENTS.md:11` currently reads: "When a PR changes a canonical skill at
`.agents/skills/*/SKILL.md`, increase that skill's frontmatter `version:` in the
same PR." Replace it with wording that (a) names both path sets, (b) says
skills declare `metadata.version`, and (c) says canonical agent roles under
`.agents/agents/*.md` declare a top-level `version:` per
`DR-260908-bundled-skills-declare`. Leave `AGENTS.md:12` (the PR-scoped, not
edit-scoped, sentence) intact — it already generalizes.

Apply the same correction to `apps/oat-docs/docs/contributing/skills.md:229-241`
("The version is gated"). Keep the existing paragraph explaining why the
deprecation warning is not part of the bump gate; clause C does not change that
separation.

**Verify:** `pnpm check` → markdownlint passes over `apps/oat-docs/docs`, and
`grep -n 'frontmatter \`version:\`' AGENTS.md` returns nothing.

### 4. Make an unreadable or unresolvable version blocking in the bump validator

In `collectChangedSkillVersionBumpFindings`, replace the silent exits:

1. After computing `currentBlock` (`:1011`), if it is `null`, push a new
   `missingFrontmatterFinding(skillPath)` — `code:
'skill-frontmatter-missing'`, `severity: 'error'`, message naming the file
   and saying a changed canonical skill or agent role must declare a version —
   through `pushUniqueFinding`, then `continue`. A file with no frontmatter
   cannot carry a version, so it fails rather than passing by omission.
2. After the conflict guards, when `resolvedCurrent` yields no version, push a
   new `missingVersionFinding(skillPath)` — `code: 'skill-version-missing'`,
   `severity: 'error'`, message naming `metadata.version` (and the top-level
   alias for agent roles) — then `continue`. This is the `metadata:`-map-with-no-
   `version`-child state the item's second acceptance criterion names.
3. Keep the base-side behavior asymmetric and deliberate: a **base** with no
   frontmatter or no resolvable version is a comparison problem, not a current-
   state defect. Report it through the existing `uncomparableBaseFinding` shape
   (`:737-768`) with the matching new reason, so the message says the base
   cannot be compared rather than accusing the current file.
4. Order matters. The malformed and unusable guards at `:1024-1039` and the
   conflict guards at `:1051-1070` must still run **first**, so their specific
   diagnoses are not replaced by a generic "no version" message. The
   weaker-anywhere rule turns a reordering into a Critical finding.
5. Update the comment at `:1018-1023` so it describes the closed set rather than
   only the two states it currently names.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
→ the new cases from the Test plan pass; the four pre-existing uncomparable-state
cases still report their original codes.

### 5. Make the same states blocking in the structural validator, and promote the alias

In `collectSkillVersionSourceFindings` (`:1137-1195`):

1. Replace `if (block === null) { continue; }` (`:1153-1156`) with the same
   `missingFrontmatterFinding` through `pushUniqueFinding`. This closes the gap
   for non-`oat-*` skills; for `oat-*` skills the existing `:1228` finding
   already fires and `pushUniqueFinding` prevents a duplicate only when the
   `code` and `message` match — verify which of the two the corpus reports and
   keep exactly one per file.
2. Replace `if (!resolved) { continue; }` (`:1176-1179`) with
   `missingVersionFinding` through `pushUniqueFinding`.
3. Change `severity: 'warning'` to `severity: 'error'` at `:1190`, and update
   the function comment at `:1126-1136`, which currently states the alias is a
   warning and that `validate-oat-skills.ts` treats warnings as non-blocking.
   Record in the comment that this is step 1 of the retirement schedule fixed by
   `DR-260908-bundled-skills-declare`, that the bundled tree was verified clean
   when it landed, and that step 2 (removing the resolver's top-level read) is
   owned by `BL-260908-remove-the-top-level-skill` and must not be done here.

**Verify:**

```bash
pnpm build
node packages/cli/dist/index.js internal validate-oat-skills --json
```

→ `{"status":"ok", …, "findings":[]}`. A non-empty `findings` array means the
bundled tree is not clean and clause C's schedule precondition has failed — STOP
condition 5.

### 6. Prove every clause can fail, with separate controls

Run each control in the working tree, capture the exact command and exit code,
then restore. These are the reproduction-grade negative controls the three items
require; each clause gets its own, and none of them may be a variation of
another.

**Clause A**

- A1. Edit `.agents/agents/oat-codebase-mapper.md` (a whitespace-only body
  change is enough) without touching its `version:`. Run
  `pnpm run check:skill-bumps`. Expected: exit 1 naming that file. On the
  pre-fix tree the same edit exits 0 — record both.
- A2. Bump that file's top-level `version:` and re-run. Expected: exit 0. This
  proves the gate accepts an agent's top-level declaration and does not demand
  `metadata.version`.
- A3. Pathspec-narrowing control: edit a `.agents/skills/*/SKILL.md` without a
  bump and confirm the gate still exits 1. This proves the widened pathspec did
  not drop the original half.

**Clause B**

- B1. In a fixture, delete the frontmatter block from a changed skill. Expected:
  `validateChangedSkillVersionBumps` reports `skill-frontmatter-missing`; on the
  pre-fix tree it reports nothing.
- B2. In a fixture, give a changed skill a `metadata:` map with no `version`
  child. Expected: `skill-version-missing` from the bump validator; nothing
  pre-fix.
- B3. Repeat B1 and B2 against `validateOatSkills` for a **non-`oat-*`** skill
  directory, where the `:1228` structural loop does not apply. Expected: a
  finding post-fix, silence pre-fix.
- B4. Live control on the real gate: create a temp branch, add a fixture skill
  with a `metadata:` map and no `version` child, and run
  `pnpm run check:skill-bumps`. Expected: exit 1. This is the item's third
  acceptance criterion, and it must be run against the real command, not only
  the unit fixture.
- B5. Masking control: with B1's fixture, also make the frontmatter malformed.
  Expected: the pre-existing `skill-frontmatter-unreadable` code, not the new
  `skill-frontmatter-missing`. This proves the guard order in Step 4 item 4.

**Clause C**

- C1. In a fixture, declare a skill's version through the top-level alias.
  Expected: `validateOatSkills` reports `skill-version-alias` with `severity:
'error'` and `oat internal validate-oat-skills` exits non-zero; pre-fix it
  exits 0 with a warning.
- C2. Bump-gate isolation control: make that same aliased skill a _changed_
  skill with a proper bump and run `validateChangedSkillVersionBumps`. Expected:
  **no** finding, so `check:skill-bumps` still exits 0. This proves the
  promotion did not leak into the gate that fails on any finding.
- C3. Bundled-tree control: `oat internal validate-oat-skills` over the real
  `.agents/skills` exits 0 with zero findings, which is what makes the schedule
  precondition true.

**Verify:** all eleven controls recorded with command, exit code, and the finding
code that fired; the tree is restored and green afterwards.

### 7. Update the three backlog items

- `BL-260906-extend-check-skill-bumps` — tick all three acceptance criteria and
  add the plan path to `external_plans`.
- `BL-260908-report-a-changed-skill-with-no` — tick all three.
- `BL-260908-retire-the-top-level-skill` — tick the two step-1 criteria only.
  Leave the step-2 criteria and the "Before step 2, the agent roles …" criterion
  unticked, leave `status: open`, and add a dated note that step 1 landed in the
  first validator-changing release after 0.2.65 and that clause A gave agent
  roles an enforcement surface while they still declare the top-level field —
  which `BL-260908-remove-the-top-level-skill` must account for.

Archiving is a wave-fan-in or maintainer decision, not this lane's: only the
first two items are fully satisfied here.

**Verify:** `grep -n 'status:' ` on all three → the first two may be closed by
the fan-in; the third is `status: open` with its step-2 criteria unticked.

### 8. Run the lane gates

```bash
pnpm check                                          > /tmp/g1.log 2>&1; echo "exit=$?"
pnpm type-check                                     > /tmp/g2.log 2>&1; echo "exit=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force  > /tmp/g3.log 2>&1; echo "exit=$?"
pnpm run check:skill-bumps                          > /tmp/g4.log 2>&1; echo "exit=$?"
pnpm lint                                           > /tmp/g5.log 2>&1; echo "exit=$?"
pnpm format                                         > /tmp/g6.log 2>&1; echo "exit=$?"
pnpm oat:validate-skills                            > /tmp/g7.log 2>&1; echo "exit=$?"
```

**Verify:** every gate reports `exit=0`, `/tmp/g3.log` shows a real run (no
`cache hit, replaying logs`, no `>>> FULL TURBO`), and `/tmp/g7.log` shows zero
findings. Note that `pnpm run check:skill-bumps` now also validates
`.agents/agents/*.md`; if this lane changed none of them, its count is unchanged
from the skills half alone.

## Test plan

All cases go in the `skill version resolution across both validators` describe
block at `packages/cli/src/validation/skills.test.ts:9011`, reusing
`createRoot`, `skillContent`, `createSkillFile`, and `changedSkillGit`
(`:9021-9060`), except where noted.

**New cases — clause A**

1. `reports a changed agent role whose version did not move` — extend
   `changedSkillGit` (or add an `changedAgentGit` sibling) to return
   `.agents/agents/oat-fixture.md` from `git diff` and an identical-version base
   from `git show`. Assert one finding naming that file. Red control: A1.
2. `accepts a changed agent role that declares a bumped top-level version` —
   same fixture with a moved top-level `version:`. Assert zero findings. Red
   control: A2 — and this case must fail if anyone makes the gate demand
   `metadata.version` for agents, which would contradict
   `DR-260908-bundled-skills-declare`.
3. `still reports a changed skill after the pathspec widened` — an existing
   assertion re-stated against the renamed function. Red control: A3.

**New cases — clause B**

4. `reports a changed skill with no frontmatter block` — bump validator, code
   `skill-frontmatter-missing`. Red control: B1.
5. `reports a changed skill whose metadata map declares no version` — bump
   validator, code `skill-version-missing`. Red control: B2.
6. `reports a non-oat skill with no frontmatter block in structural validation`
   — `validateOatSkills` over a `create-*`-style directory. Red control: B3.
7. `reports a non-oat skill whose metadata map declares no version in structural
validation`. Red control: B3.
8. `prefers the malformed diagnosis over the missing-version diagnosis` — the
   masking control. Red control: B5.
9. `reports an uncomparable base separately from a current-state defect` —
   a base with no frontmatter and a bumped, well-formed current file; assert the
   `uncomparableBaseFinding` message rather than a current-file accusation.

**Changed cases — clause C**

10. `packages/cli/src/validation/skills.test.ts:144`, `:1169`, `:9119-9120` —
    `severity: 'warning'` → `'error'` in the `skill-version-alias` expectations.
    Red control: C1.
11. `packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts:368`
    and its comment at `:350` — the alias finding stays out of the bump result.
    Assert the promoted severity where the fixture constructs the finding, and
    keep the case that proves the bump validator emits none. Red control: C2.
12. `keeps the bundled tree free of alias findings` — a corpus case asserting
    `validateOatSkills` over the real `.agents/skills` returns zero
    `skill-version-alias` findings, so a regression that reintroduced the alias
    would fail here rather than in CI's `oat:validate-skills` step. Red control:
    C3, plus temporarily adding a top-level `version:` to one bundled skill.

**Focused command**

`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/internal/validate-skill-version-bumps.test.ts`
→ all cases pass.

**Full relevant suite**

`HOME=$(mktemp -d) pnpm exec turbo run test --force` → passes with no cache
replay. Then `pnpm run check:skill-bumps` and `pnpm oat:validate-skills`
separately, because Turborepo replay can hide a real failure in either.

## Done criteria

- [ ] `listChangedVersionedFiles` diffs both `.agents/skills/*/SKILL.md` and
      `.agents/agents/*.md`, and control A3 proves the skills half survived.
- [ ] An unbumped `.agents/agents/*.md` edit makes `pnpm run check:skill-bumps`
      exit 1 (control A1), and a top-level bump makes it exit 0 (control A2).
- [ ] The bump criterion text names `metadata.version` and states that agent
      roles may declare a top-level `version:`.
- [ ] `AGENTS.md:11` and
      `apps/oat-docs/docs/contributing/skills.md:229-241` both name the two path
      sets and the correct field for each, and `pnpm check`'s markdownlint step
      passes.
- [ ] A changed file with no frontmatter block, and one whose frontmatter
      declares no resolvable version, each produce a blocking finding from
      **both** `validateChangedSkillVersionBumps` and `validateOatSkills`
      (controls B1–B3), and the real `check:skill-bumps` exits 1 for the
      metadata-map case (control B4).
- [ ] The four pre-existing uncomparable-state guards and the two conflict
      guards still fire first, proven by control B5.
- [ ] `skill-version-alias` is `severity: 'error'`, the bundled tree still
      returns zero findings from `oat internal validate-oat-skills` (control
      C3), and the finding still never reaches the bump validator (control C2).
- [ ] Eleven controls recorded, each with its command, exit code, and the
      finding code that fired.
- [ ] `resolveSkillVersion` in `packages/cli/src/commands/shared/frontmatter.ts`
      is unchanged, and no `.agents/agents/*.md` file was migrated to
      `metadata.version`.
- [ ] The three backlog items are updated; `BL-260908-retire-the-top-level-skill`
      remains `status: open` with its step-2 criteria unticked.
- [ ] `pnpm check`, `pnpm type-check`, forced `turbo run test`,
      `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each report `exit=0`.
- [ ] `git status --short` contains no unexplained or out-of-scope file.

## STOP conditions

Stop and report instead of improvising when:

1. `node packages/cli/dist/index.js internal validate-oat-skills --json` returns
   a non-empty `findings` array **before** clause C is applied — the bundled
   tree is not clean, so `DR-260908`'s schedule precondition for step 1 is not
   met and the promotion must not land;
2. promoting the alias severity causes any `skill-version-alias` finding to
   appear in a `validateChangedSkillVersionBumps` result — the separation at
   `skills.ts:1046-1050` has broken and `check:skill-bumps` would start failing
   third-party skills for the wrong reason;
3. closing the no-version fall-through changes the code reported for any input
   that already produced a finding — that is the weaker-anywhere boundary in
   the direction of masking;
4. widening the pathspec drops, reorders, or reshapes the
   `.agents/skills/*/SKILL.md` half in any way control A3 can detect;
5. making the gate pass for an agent role requires migrating it to
   `metadata.version` — that contradicts `DR-260908-bundled-skills-declare`,
   which reserves the migration for a separate decision;
6. work drifts toward step 2: editing `resolveSkillVersion`, deleting the alias
   branch, collapsing the five frontmatter-walk copies, or normalizing `.inf`
   key spellings;
7. any of the eleven controls fails to go red pre-fix or green post-fix;
8. cited line anchors in `skills.ts` or `skills.test.ts` no longer match after
   the drift check;
9. a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `c9f2e147ac0674e73a60735e0c1727ccc6048756`;
- the CLI's lockstep version moves past `0.2.65` in a release that already
  changed the validator — clause C's "first validator-changing release after
  0.2.65" would then have been claimed by that release, and the schedule needs
  re-reading against `DR-260908-bundled-skills-declare`;
- a bundled skill regains a top-level `version:` — re-run the live
  `validate-oat-skills` check before promoting the severity;
- an `.agents/agents/*.md` role is migrated to `metadata.version` by another
  change — clause A's "accept either shape" wording then needs re-reading;
- PR #190 lands, moving `skills.test.ts` anchors;
- a dependency named in `## Dependencies` changes state;
- any cited line anchor or section order in an in-scope file changes.

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
this lane must not run them.

Two wave-level consequences the fan-in must know:

1. Once this lane merges, every subsequent PR that edits an `.agents/agents/*.md`
   role needs a version bump. Sibling lanes editing an agent role in the same
   wave — the dispatch-baseline lane edits
   `.agents/agents/oat-phase-implementer.md` — must bump it, and per
   `DR-260906-one-version-bump-per-changed` only one lane owns that bump.
2. This lane edits `apps/oat-docs/docs/**`, which counts as shipped CLI
   functionality for release policy, so the lockstep bump at fan-in is required
   whether or not any other lane triggers it.

A root review follows the lane. Because this lane writes
`packages/cli/src/validation/skills.ts` and `skills.test.ts`, it must be
serialized against the sibling lanes named in `## Dependencies`.

## Review focus

- **Weaker-anywhere in both directions.** Diff `collectChangedSkillVersionBumpFindings`
  and `collectSkillVersionSourceFindings` and confirm every pre-existing guard
  fires in the same order with the same `code`. The new findings are added at
  the two `continue`s, not in front of the specific diagnoses.
- **The pathspec.** Read the `git diff` argument list literally. A single
  mis-typed pathspec that silently narrowed the skills half would reproduce the
  exact defect class these items exist to close, and only control A3 catches it.
- **Decision conformance.** Confirm the gate accepts an agent role's top-level
  `version:` and that no `.agents/agents/*.md` file was migrated;
  `DR-260908-bundled-skills-declare` reserves that migration for a separate
  decision.
- **Schedule conformance.** Confirm the live `validate-oat-skills` run recorded
  in the drift check returned zero findings before the promotion, and that the
  code comment records the schedule so a future reader can see why the severity
  moved.
- **Bump-gate isolation.** Confirm control C2 exists and would fail if the alias
  finding started reaching the bump validator; the wrapper fails on any finding,
  so a leak would break every third-party skill that still declares the alias.
- **Step-2 containment.** Confirm `resolveSkillVersion` is untouched and that
  nothing in the diff anticipates `BL-260908-remove-the-top-level-skill`. Note in
  the review that clause A creates a new dependency for that item: agent roles
  now have an enforcement surface while still declaring the top-level field.
- **Separate controls.** Confirm the eleven controls are genuinely distinct —
  three clauses, no shared fixture standing in for another clause's proof.
