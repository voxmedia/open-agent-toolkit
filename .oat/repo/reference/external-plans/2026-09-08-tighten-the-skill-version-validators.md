---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/archived/BL-260906-extend-check-skill-bumps.md
  - .oat/repo/pjm/backlog/archived/BL-260908-report-a-changed-skill-with-no.md
  - .oat/repo/pjm/backlog/items/BL-260908-retire-the-top-level-skill.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-extend-check-skill-bumps
  - BL-260908-report-a-changed-skill-with-no
  - BL-260908-retire-the-top-level-skill
oat_issue_url: null
created: '2026-09-08T21:21:53Z'
---

# Close the version-validator gaps: agent roles, unresolvable versions, the alias promotion, and scripts-only skill changes

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> The `Soft` rows record ordering only: this lane writes
> `packages/cli/src/validation/skills.ts`, `skills.test.ts`, and root
> `AGENTS.md`, each of which at least one other wave-7 lane also writes, so it
> is never composed into a parallel group with any of them.

## Outcome

Four enforcement gaps in the same two functions close together, so the version
contract stops passing by omission.

- **Clause A.** `pnpm run check:skill-bumps` diffs `.agents/agents/*.md`
  alongside canonical skills, applying the same one-bump-per-PR rule to
  canonical agent roles. Agent roles keep declaring a top-level `version:` per
  `DR-260908-bundled-skills-declare`, so the gate accepts either declaration
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
  `DR-260908-bundled-skills-declare`. CLI 0.2.66 (PR #273) shipped without a
  validator change, so the wave-7 release this lane lands in is the first
  validator-changing release after 0.2.65 — exactly the release the decision
  names.
- **Clause D.** The gate treats a change to any bundled file of a skill —
  `scripts/`, `references/`, or any other path under
  `.agents/skills/<name>/` except `tests/` — as a change to that skill, and
  requires the owning `SKILL.md` to bump. Today the pathspec is
  `.agents/skills/*/SKILL.md` alone, so a scripts-only change ships to every
  `oat tools install` consumer under an unchanged version. This clause was
  found while planning a sibling lane and is encoded here because it is the
  same pathspec edit as clause A.

After this change, the state that made these gaps invisible — "no version
found, so skip" and "not in the pathspec, so not a change" — no longer exists
in either validator.

## Source and live evidence

- Source backlog item:
  [BL-260906-extend-check-skill-bumps — Extend check:skill-bumps to canonical agent files](../../pjm/backlog/archived/BL-260906-extend-check-skill-bumps.md)
- Source backlog item:
  [BL-260908-report-a-changed-skill-with-no — Report a changed skill with no frontmatter block in the bump validator](../../pjm/backlog/archived/BL-260908-report-a-changed-skill-with-no.md)
- Source backlog item:
  [BL-260908-retire-the-top-level-skill — Retire the top-level skill version alias on the recorded schedule](../../pjm/backlog/items/BL-260908-retire-the-top-level-skill.md)
  — step 1 only; see its "Split (2026-09-08 triage)" section.
- Related decisions:
  [DR-260906-one-version-bump-per-changed](../decisions/DR-260906-one-version-bump-per-changed.md),
  [DR-260908-bundled-skills-declare](../decisions/DR-260908-bundled-skills-declare.md)
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

### Why these are one plan

They are inseparable, not merely thematic. Clauses A and D are the same edit to
`listChangedSkillFiles` in `packages/cli/src/validation/skills.ts`; clause B
changes the collector that consumes its output; clauses B and C both change
`collectSkillVersionSourceFindings` in the same file; and all four land in the
same `skills.test.ts` describe block. Splitting them would mean four PRs
re-editing the same thirty lines and four separate reversions of the same
fixtures. Clause C additionally has a release-relative deadline that only a
validator-changing release can satisfy — and clauses A, B, and D are what make
this release one.

### Verified evidence

**Clauses A and D — the gate's pathspec**

- `packages/cli/src/validation/skills.ts:943-969` — `listChangedSkillFiles` runs
  `git diff --name-only --diff-filter=ACMR <baseRef>...HEAD -- .agents/skills/*/SKILL.md`.
  The pathspec at `:957` is the only inclusion rule; `.agents/agents/*.md` is
  never diffed, and neither is any file under a skill directory other than
  `SKILL.md`.
- `packages/cli/src/validation/skills.ts:1100-1123` —
  `validateChangedSkillVersionBumps` calls that function (`:1106`) and passes
  its output straight to the collector, so the pathspec is the gate's entire
  surface. `:1007-1009` then skips any file whose base and current content are
  identical — which is every `SKILL.md` of a skill whose only change is under
  `scripts/` or `references/`.
- `packages/cli/scripts/bundle-assets.sh:48-49` — the bundle copies each skill
  directory with `cp -RL` (dereferencing symlinks) and then removes `tests/`.
  So `scripts/` and `references/` ship to consumers and `tests/` does not,
  which is the boundary clause D uses. At the inspected `HEAD`, 10 skill
  directories have `scripts/` and 34 have `references/`.
- `DR-260906-one-version-bump-per-changed` states the rule as "one frontmatter
  version bump per changed canonical **skill**", and the wave lanes already
  read it that way: `2026-09-08-read-stdin-in-finalize-synced-archive.md` bumps
  `oat-project-complete` for a `scripts/` change and
  `2026-09-08-repair-stray-fences-in-lifecycle-skills.md` bumps three skills
  for `references/` changes. The gate is the only reader that disagrees.
- `packages/cli/src/commands/internal/validate-skill-version-bumps.ts:59-64` —
  the wrapper sets `process.exitCode = 1` on any finding regardless of severity.
  `:42`, `:78`, `:82`, `:108`, `:112` say "canonical skill(s)" in user-facing
  text. `package.json:29` binds `check:skill-bumps` to
  `oat internal validate-skill-version-bumps --base-ref origin/main`.
- `ls .agents/agents` → five canonical roles: `oat-codebase-mapper.md`,
  `oat-phase-implementer.md`, `oat-reviewer.md`, `recon-worker.md`,
  `skeptical-evaluator.md`. `.agents/agents/oat-phase-implementer.md:1-6`
  declares a **top-level** `version: 1.1.5`, not `metadata.version`.
  `bundle-assets.sh:54` ships them.
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
  `metadata.version`. `AGENTS.md:12` (PR-scoped, not edit-scoped) already
  generalizes and stays.
- `apps/oat-docs/docs/contributing/skills.md:229-241` ("The version is gated")
  restates the rule as "Changing any canonical skill's `SKILL.md`". The
  paragraph already says the gate reads the resolved version whichever shape
  declares it, and explains why the deprecation warning is kept out of the
  gate; both sentences stay.
- Live confirmation of the gate's current output shape:
  `node packages/cli/dist/index.js internal validate-skill-version-bumps --base-ref origin/main --json`
  on the planning branch returns
  `{"status":"ok","baseRef":"origin/main","validatedSkillCount":0,"findings":[]}`.

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
  `pushUniqueFinding` (`:704-717`, dedupes by `file + code + message` so the
  structural pass and the bump collector can both emit the same finding without
  doubling it), `unusableVersionFinding` (`:727-735`,
  `code: 'skill-version-unusable'`), `uncomparableBaseFinding` (`:737-755`),
  `uncomparableBaseConflictFinding` (`:757-768`), and `versionConflictFinding`
  (`:769-779`).

**Clause C — the alias severity and its schedule**

- `packages/cli/src/validation/skills.ts:1186-1193` — `if (resolved.source ===
'top-level')` pushes `{ code: 'skill-version-alias', severity: 'warning', … }`
  (`severity` at `:1190`).
- `packages/cli/src/validation/skills.ts:1126-1136` — the function comment
  records that the alias finding is a warning, that `validate-oat-skills.ts`
  treats warnings as non-blocking, and that neither this finding nor
  `skill-version-conflict` is produced by the bump validator.
- `packages/cli/src/validation/skills.ts:1046-1050` — the bump collector's
  comment confirms the alias warning "stays in structural validation and never
  reaches this result". So promoting the severity cannot make `check:skill-bumps`
  fail on a bundled skill; it changes `oat:validate-skills` only.
- `packages/cli/package.json:3` — `"version": "0.2.66"`. PR #273 took the
  lockstep from 0.2.65 to 0.2.66 without touching
  `packages/cli/src/validation/skills.ts` (verified:
  `git diff --stat c9f2e147a..7d70ac307 -- packages/cli/src/validation/skills.ts`
  is empty). `DR-260908` schedules step 1 for "the first release after 0.2.65
  that changes the validator"; that release has not happened yet. This lane
  changes the validator, and the wave fan-in bumps the lockstep to the next
  version, so the wave-7 release is that release.
- **Live confirmation that the bundled tree is clean:** after
  `pnpm --filter @open-agent-toolkit/cli build`,
  `node packages/cli/dist/index.js internal validate-oat-skills --json` at the
  inspected `HEAD` returns
  `{"status":"ok","validatedSkillCount":65,"findings":[]}` (65, not 64: PR #273
  added `oat-pjm-remote`). Zero alias findings, so promoting `warning` →
  `error` produces no findings on `.agents/skills` and satisfies the item's
  second acceptance criterion by construction. Re-run this during the drift
  check; a non-empty `findings` array is STOP condition 1.
- Assertions that pin the current severity and must move:
  `packages/cli/src/validation/skills.test.ts:144` (the `aliasWarning` helper),
  `:1169`, `:9119-9120` (`severity: 'warning'` inside a `skill-version-alias`
  object), and
  `packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts:368`,
  whose surrounding comment at `:347-350` explains why the alias finding is not
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

| Type                  | Dependency                                                                                                     | Required state                                                                                                                                            | Current state                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Soft ordering         | [Repair stray fences in lifecycle skills](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md)             | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts`. Re-anchor pins and insertion points on merge.                       | Authored in the same wave; the composer serializes them.                 |
| Soft ordering         | [Calculate dispatch baselines after journaling](./2026-09-08-calculate-dispatch-baselines-after-journaling.md) | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                                             | Authored in the same wave.                                               |
| Soft ordering         | [Read stdin in finalize-synced-archive](./2026-09-08-read-stdin-in-finalize-synced-archive.md)                 | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                                             | Authored in the same wave.                                               |
| Soft ordering         | [Make the completion seal idempotent](./2026-09-08-make-the-completion-seal-idempotent.md)                     | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                                             | Authored in the same wave.                                               |
| Soft ordering         | [Reconcile the oat doctor example](./2026-09-08-reconcile-the-oat-doctor-example.md)                           | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                                             | Authored in the same wave.                                               |
| Soft ordering         | [Keep plan writes on the caller's model](./2026-09-08-keep-plan-writes-on-the-callers-model.md)                | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                                             | Authored in the same wave.                                               |
| Soft ordering         | [Correct skill authoring facts](./2026-09-08-correct-skill-authoring-facts.md)                                 | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                                             | Authored in the same wave.                                               |
| Soft ordering         | [Cover skill and script tests in repo gates](./2026-09-08-cover-skill-and-script-tests-in-repo-gates.md)       | Never in one parallel group; both write root `AGENTS.md` (this lane `:11`, that lane `:28-34`, `:67-68`, `:103-104`). Whichever merges second re-anchors. | Authored in the same wave.                                               |
| Soft ordering         | `BL-260908-remove-the-top-level-skill` (step 2 of the alias retirement)                                        | Must land **one release after** this one, and only after the agent-role migration question is settled.                                                    | Not admitted to a wave; blocked on this lane by the decision's schedule. |
| Satisfied predecessor | `DR-260908-bundled-skills-declare`                                                                             | Accepted, and the 82-skill migration shipped in CLI 0.2.65.                                                                                               | Accepted; verified live — `validate-oat-skills` returns zero findings.   |
| Satisfied predecessor | `DR-260906-one-version-bump-per-changed`                                                                       | Accepted, so a later lane in the same PR carries an already-bumped value.                                                                                 | Accepted.                                                                |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                                       | Affected | Files in common                                                                                               | Required update                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #190 (ReviewPlan Stage A compatibility release, OPEN draft) lands                        | Moderate | `packages/cli/src/validation/skills.test.ts` and `.agents/agents/oat-reviewer.md` (verified in its file list) | Re-locate the alias-severity assertions and the `:9011` describe block before editing; the file is large and its anchors move easily. Its `oat-reviewer.md` edit must carry a top-level bump once clause A is merged. |
| PR #273 (provider-neutral remote project management)                                        | None     | none — its files were `oat-doctor/SKILL.md`, `oat-pjm-remote/**`, and the pjm remote command tree             | **Merged 2026-09-08 as `7d70ac307`;** lockstep now 0.2.66 with no validator change. The drift check from the prior baseline shows no in-scope file changed.                                                           |
| PR #125 (oat-brainstorm visual companion, OPEN) lands                                       | None     | none                                                                                                          | No update.                                                                                                                                                                                                            |
| Any PR edits an `.agents/agents/*.md` role, or a skill's `scripts/`/`references/`, unbumped | Minor    | `.agents/agents/*.md`, `.agents/skills/*/**`                                                                  | Once clauses A and D merge, that PR's `check:skill-bumps` starts failing. Expected and correct; do not weaken the gate to accommodate it.                                                                             |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..HEAD -- \
  packages/cli/src/validation/skills.ts \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/commands/internal/validate-skill-version-bumps.ts \
  packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts \
  packages/cli/src/commands/shared/frontmatter.ts \
  packages/cli/scripts/bundle-assets.sh \
  AGENTS.md \
  apps/oat-docs/docs/contributing/skills.md \
  .agents/agents \
  .oat/repo/pjm/backlog/archived/BL-260906-extend-check-skill-bumps.md \
  .oat/repo/pjm/backlog/archived/BL-260908-report-a-changed-skill-with-no.md \
  .oat/repo/pjm/backlog/items/BL-260908-retire-the-top-level-skill.md
```

Expected at the authored commit: empty output. Also re-run
`node packages/cli/dist/index.js internal validate-oat-skills --json` (after
`pnpm build`) and confirm `findings` is still `[]` before promoting the alias
severity, and confirm `packages/cli/package.json` is still `0.2.66` — a higher
version that already changed `skills.ts` means another release claimed the
schedule slot. Executing inside a wave, run the same diff from the actual
execution `HEAD` after predecessor lanes integrate.

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
  This plan changes **no** file under `.agents/skills` or `.agents/agents`, so
  it needs no skill or agent bump — but confirm that with
  `pnpm run check:skill-bumps` rather than by assumption, because the gate's own
  surface widens in Step 1.
- Locating pins, when a bump does become necessary: search the **old version
  literal** across `packages/cli/src`, `tools/smoke`, and
  `.agents/skills/*/tests`, then move only the hits belonging to the bumped file.
- Editing `apps/oat-docs/docs/**` counts as shipped CLI functionality for
  release policy; the lockstep public package bump is owned by the wave fan-in,
  not by this lane. `skills.test.ts:2417-2450` reads
  `contributing/skills.md` for its gate-review migration wording; the edit at
  `:229-241` does not touch that wording and the case must stay green.
- Never run `oxfmt` on an OAT `state.md`.
- Implementation pattern for tests: the `skill version resolution across both
validators` describe block at `packages/cli/src/validation/skills.test.ts:9011`,
  with its `createRoot`, `skillContent`, `createSkillFile`, and
  `changedSkillGit` helpers (`:9021-9060`). `changedSkillGit` fakes
  `gitExecFile` by returning a fixed `git diff` stdout and a fixed
  `git show` body, so a new fixture needs no real repository; clause D fixtures
  return a `scripts/…` path from `git diff` and identical `SKILL.md` bodies
  from `git show` and disk.
- Git/PR convention: commit on the lane worktree branch. Do not push or open a
  PR; the wave fan-in owns that.

## Scope

### In scope

- `packages/cli/src/validation/skills.ts` — `listChangedSkillFiles` pathspec
  and result shape (`:943-969`); the identical-content skip (`:1007-1009`);
  the two silent `continue`s in `collectChangedSkillVersionBumpFindings`
  (`:1011-1016` → `:1075-1077`) and in `collectSkillVersionSourceFindings`
  (`:1153-1156`, `:1176-1179`); the `skill-version-alias` severity (`:1190`);
  two new finding helpers beside `:694-779`; the comparison messages at
  `:1080-1083` and `:1092-1095`; the function comments at `:1018-1023`,
  `:1046-1050`, and `:1126-1136`.
- `packages/cli/src/commands/internal/validate-skill-version-bumps.ts` —
  user-facing wording at `:42`, `:78`, `:82`, `:108`, `:112` that says "skills"
  where it now also means agent roles. The JSON key `validatedSkillCount`
  stays, so no consumer contract moves.
- `packages/cli/src/validation/skills.test.ts` and
  `packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts` —
  changed and new cases.
- `AGENTS.md:11` — the path set and the field name.
- `apps/oat-docs/docs/contributing/skills.md:229-241` — the same correction in
  the docs restatement.
- The three source backlog items — acceptance criteria only; their
  `external_plans` links to this plan already exist.

### Out of scope

- `packages/cli/src/commands/shared/frontmatter.ts` and `resolveSkillVersion`.
  Removing the top-level read is step 2, owned by
  `BL-260908-remove-the-top-level-skill`, and it must land a release later.
- Migrating `.agents/agents/*.md` to `metadata.version`.
  `DR-260908-bundled-skills-declare` deliberately leaves agent roles unmigrated
  and says their migration is a separate decision. Clause A gives them an
  enforcement surface; it does not change their declaration shape.
- Bumping any skill or agent role. This lane edits none.
- The five frontmatter-walk copies and the `.inf` key-normalization defect
  recorded in `BL-260908-retire-the-top-level-skill`'s Notes. Both are attached
  to step 2.
- `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` fixtures — they
  move with a resolver precedence change, and this plan makes none.
- Extending `collectSkillVersionSourceFindings` (and therefore the alias finding)
  to `.agents/agents`. That would make every agent role an `error` the moment
  clause C lands, which contradicts `DR-260908-bundled-skills-declare`.
- Two known residual gaps of clause D, recorded rather than closed: a change
  to a symlink **target** under `.agents/docs/` ships through `cp -RL` but
  never appears under `.agents/skills` in `git diff`; and a pure deletion of a
  sibling file is excluded by `--diff-filter=ACMR`, kept for parity with the
  current gate. File both as a follow-up backlog note in Step 7.
- `packages/cli/scripts/bundle-assets.sh` — read as evidence for the
  `tests/` boundary; not edited.
- The lockstep public package version bump and the release gates — the wave
  fan-in owns both.

## Current state

`packages/cli/src/validation/skills.ts` hosts two independent validators.

`validateChangedSkillVersionBumps` (`:1100-1123`) is the `check:skill-bumps`
gate. It lists changed files by git pathspec, then
`collectChangedSkillVersionBumpFindings` (`:990-1098`) reads current and base
content, skips a file whose base content is missing or identical
(`:1007-1009`), parses both frontmatter blocks, guards four uncomparable states
(malformed current, unusable current, malformed base, unusable base —
`:1024-1039`), guards two conflict states (`:1051-1070`), and only then
compares versions (`:1079-1096`). Its wrapper fails the gate on **any**
finding, whatever the severity, which is why the alias warning is deliberately
kept out of it.

`validateOatSkills` (`:1197-…`) is the structural `oat:validate-skills` pass. It
runs `collectSkillVersionSourceFindings` (`:1137-1195`) over **every** skill
directory — not just `oat-*`, as the comment at `:1126-1136` explains — and then
an `oat-*`-only structural loop that reports a missing `SKILL.md` (`:1222`) and
a missing frontmatter block (`:1228-1231`).

Between them, five states currently exit without a finding:

| State                                                | Bump validator                        | Structural validator        |
| ---------------------------------------------------- | ------------------------------------- | --------------------------- |
| No frontmatter block, `oat-*` skill                  | silent `continue` (`:1007`/`:1075`)   | reported (`:1228`)          |
| No frontmatter block, non-`oat-*` skill              | silent `continue`                     | silent `continue` (`:1154`) |
| Frontmatter present, no resolvable version           | silent `continue` (`:1075`)           | silent `continue` (`:1177`) |
| Changed `.agents/agents/*.md`, unbumped              | never diffed (`:957`)                 | out of the walk by design   |
| Changed `scripts/` or `references/`, `SKILL.md` same | never diffed (`:957`); skip (`:1007`) | not a structural concern    |

Clause A closes row 4, clause B closes rows 1–3, clause D closes row 5, and
clause C changes the severity of a finding that is currently emitted but
non-blocking.

### Weaker-anywhere rule

Both functions are validators. Any input that is **rejected** today and
**accepted** after this change is a Critical regression, and it applies in both
directions here because clauses A and D widen an input set while clauses B and
C tighten outcomes. Specifically:

- Every finding emitted today must still be emitted, with the same `code`, for
  the same input. The four uncomparable-state guards (`:1024-1039`) and the two
  conflict guards (`:1051-1070`) must keep firing first, before any new
  no-version finding, so their more specific messages are not masked by a
  generic one.
- Widening the pathspec must not drop `.agents/skills/*/SKILL.md`. A pathspec
  typo that silently narrowed the skills half would be exactly the class of
  defect these items exist to prevent; control A3 proves it did not happen.
- The identical-content skip at `:1007-1009` survives for the one case it was
  written for — the owning file itself listed with unchanged bytes (a rename or
  mode change). It must **not** survive when a sibling path changed; that is
  clause D's whole point, and control D1 proves it.
- Promoting `skill-version-alias` to `error` must not route it into the bump
  validator, whose wrapper fails on any finding: an alias-declaring third-party
  skill would then fail the bump gate for a reason unrelated to bumping. The
  separation documented at `:1046-1050` must hold, and control C2 proves it.
- An agent role declaring a top-level `version:` must remain **accepted** by the
  new gate. Clause A adds enforcement, not a migration.
- A `tests/`-only change must remain **accepted** (control D2): tests do not
  ship, and a gate that demanded a bump for them would train maintainers to
  bump reflexively.

## Implementation steps

### 1. Widen the bump gate's pathspec to skill directories and agent roles

In `packages/cli/src/validation/skills.ts`, replace `listChangedSkillFiles`
(`:943-969`) with `listChangedVersionedFiles`, returning
`{ file: string; changedPaths: string[] }[]` where `file` is the owning
versioned file (repo-relative) and `changedPaths` are the diffed paths that
map to it:

1. Run `git diff --name-only --diff-filter=ACMR <baseRef>...HEAD -- .agents/skills .agents/agents/*.md`.
   Keep `--diff-filter=ACMR` and `<baseRef>...HEAD` unchanged.
2. For each `.agents/skills/<name>/<rest>` path: drop it when `<rest>` starts
   with `tests/`; otherwise map it to `.agents/skills/<name>/SKILL.md`. When
   that `SKILL.md` does not exist in the working tree (the skill was removed or
   renamed away), drop the path — there is nothing to bump.
3. For each `.agents/agents/<role>.md` path: map it to itself. A nested
   directory would not match `.agents/agents/*.md`, which is the intended
   bound; do not filter the five roles further.
4. Group by owning file, dedupe, sort by owning file, and return.

Update the single call site at `:1106` and make `validatedSkillCount` the
number of owning files.

**Verify:**

```bash
pnpm build
node packages/cli/dist/index.js internal validate-skill-version-bumps \
  --base-ref origin/main --json
```

→ `validatedSkillCount` counts owning files, including any changed
`.agents/agents/*.md` and any skill whose `scripts/` or `references/` changed
in the current branch's diff, and `status` is `ok` when every owning file is
bumped.

### 2. Consume the new shape in the collector and restate the criterion against `metadata.version`

In `collectChangedSkillVersionBumpFindings` (`:990-1098`), iterate the
`{ file, changedPaths }` entries:

1. Keep `if (baseContent === null) continue;` — a new file has nothing to
   compare.
2. Narrow the identical-content skip at `:1007-1009` to
   `baseContent === currentContent && changedPaths.length === 1 && changedPaths[0] === file`.
   An owning file whose bytes are unchanged but whose siblings changed falls
   through to the version comparison and is reported as "still X".
3. Update the two comparison messages at `:1080-1083` and `:1092-1095` so they
   name `metadata.version` as the canonical declaration, say that an agent
   role may declare a top-level `version:`, and — when `changedPaths` does not
   include the owning file — list the changed sibling paths relative to the
   skill directory (for example `changed: scripts/finalize-synced-archive.mjs`),
   so a scripts-only failure says what changed. Keep the `${baseRef}`
   interpolation and the `(still X)` / `(base X, current Y)` value reporting;
   those are what make a failure actionable.

The resolution logic itself needs no change: `resolveSkillVersion` already
accepts both shapes and reports a conflict when they disagree
(`versionConflictFinding`, `:769-779`), and that conflict path is already
guarded at `:1051-1070`. An agent that later gained a conflicting pair would be
reported, which is correct.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
→ passes; the new agent and scripts-only fixture cases from the Test plan
assert the new message text.

### 3. Fix the stale rule text in `AGENTS.md`, the docs, and the wrapper

`AGENTS.md:11` currently reads: "When a PR changes a canonical skill at
`.agents/skills/*/SKILL.md`, increase that skill's frontmatter `version:` in the
same PR." Replace it with wording that (a) says a change to any bundled file of
a canonical skill — `.agents/skills/<name>/**` except `tests/` — requires that
skill's `metadata.version` to increase, and (b) says a change to a canonical
agent role under `.agents/agents/*.md` requires that file's top-level
`version:` to increase, per `DR-260908-bundled-skills-declare`. Leave
`AGENTS.md:12` (the PR-scoped, not edit-scoped, sentence) intact — it already
generalizes.

Apply the same correction to `apps/oat-docs/docs/contributing/skills.md:229-241`
("The version is gated"): "Changing any canonical skill's `SKILL.md`" becomes
the directory rule, and a sentence names agent roles. Keep the existing
sentences explaining that the gate reads the resolved version and why the
deprecation warning is not part of the bump gate; clause C does not change
that separation.

In `packages/cli/src/commands/internal/validate-skill-version-bumps.ts`, adjust
the strings at `:42`, `:78`, `:82`, `:108`, `:112` so "canonical skill(s)"
reads "canonical skills and agent roles" where the count or description now
covers both.

**Verify:** `pnpm check` → markdownlint passes over `apps/oat-docs/docs`;
`grep -n 'frontmatter \`version:\`' AGENTS.md`returns nothing;`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t 'migration without provider target pins'`
still passes.

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
   (`:737-755`) with a matching new reason, so the message says the base
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
   already fires with a different message, so `pushUniqueFinding` will not
   dedupe it. Decide which one the corpus reports for an `oat-*` skill and keep
   exactly one per file — the simplest is to have the `oat-*` loop skip its
   own missing-block finding when the version-source pass already reported
   `skill-frontmatter-missing` for that path.
2. Replace `if (!resolved) { continue; }` (`:1176-1179`) with
   `missingVersionFinding` through `pushUniqueFinding`.
3. Change `severity: 'warning'` to `severity: 'error'` at `:1190`, and update
   the function comment at `:1126-1136`, which currently states the alias is a
   warning and that `validate-oat-skills.ts` treats warnings as non-blocking.
   Record in the comment that this is step 1 of the retirement schedule fixed by
   `DR-260908-bundled-skills-declare`, that the bundled tree was verified clean
   (65 skills, zero findings) when it landed, and that step 2 (removing the
   resolver's top-level read) is owned by
   `BL-260908-remove-the-top-level-skill` and must not be done here.

**Verify:**

```bash
pnpm build
node packages/cli/dist/index.js internal validate-oat-skills --json
```

→ `{"status":"ok","validatedSkillCount":65,"findings":[]}` (the count moves if
a sibling lane added a skill; the empty `findings` is what matters). A
non-empty `findings` array means the bundled tree is not clean and clause C's
schedule precondition has failed — STOP condition 1.

### 6. Prove every clause can fail, with separate controls

Run each control in the working tree, capture the exact command and exit code,
then restore. These are the reproduction-grade negative controls the three items
require; each clause gets its own, and none of them may be a variation of
another. For the live controls, work on a throwaway branch in the lane
worktree so `origin/main...HEAD` sees the edit, and restore with
`git checkout -- <path>`.

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
- B4. Live control on the real gate: on the throwaway branch, add a fixture
  skill with a `metadata:` map and no `version` child, commit it, and run
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

**Clause D**

- D1. Live control: add a trailing comment line to
  `.agents/skills/oat-project-complete/scripts/finalize-synced-archive.mjs`
  (or any file under a skill's `scripts/`) without touching its `SKILL.md`,
  commit on the throwaway branch, and run `pnpm run check:skill-bumps`.
  Expected: exit 1, with a finding on
  `.agents/skills/oat-project-complete/SKILL.md` that names the changed
  `scripts/…` path. On the pre-fix tree the same edit exits 0 — record both.
- D2. Tests-boundary control: make the same kind of edit to
  `.agents/skills/oat-pjm-remote/tests/contract.test.mjs` only. Expected: exit
  0 on both trees. This proves `tests/` stays outside the gate.

**Verify:** all thirteen controls recorded with command, exit code, and the
finding code that fired; the throwaway branch is deleted and the tree is
restored and green afterwards.

### 7. Update the three backlog items

- `BL-260906-extend-check-skill-bumps` — tick all three acceptance criteria.
- `BL-260908-report-a-changed-skill-with-no` — tick all three.
- `BL-260908-retire-the-top-level-skill` — tick the two step-1 criteria only.
  Leave the step-2 criteria and the "Before step 2, the agent roles …" criterion
  unticked, leave `status: open`, and add a dated note that step 1 landed in the
  first validator-changing release after 0.2.65 (0.2.66 shipped without one)
  and that clause A gave agent roles an enforcement surface while they still
  declare the top-level field — which `BL-260908-remove-the-top-level-skill`
  must account for.
- In `BL-260906-extend-check-skill-bumps`, add a dated note recording clause D
  and its two residual gaps (symlink targets under `.agents/docs`; sibling
  deletions excluded by `ACMR`) so a maintainer can file them if they matter.

All three items already carry the `external_plans` link to this plan; do not
add it again. Archiving is a wave-fan-in or maintainer decision, not this
lane's: only the first two items are fully satisfied here.

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
`.agents/agents/*.md` and every skill directory; this lane changed none of
them, so its count is 0.

## Test plan

All cases go in the `skill version resolution across both validators` describe
block at `packages/cli/src/validation/skills.test.ts:9011`, reusing
`createRoot`, `skillContent`, `createSkillFile`, and `changedSkillGit`
(`:9021-9060`), except where noted.

**New cases — clause A**

1. `reports a changed agent role whose version did not move` — extend
   `changedSkillGit` (or add a `changedAgentGit` sibling) to return
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
    and its comment at `:347-350` — the alias finding stays out of the bump
    result. Assert the promoted severity where the fixture constructs the
    finding, and keep the case that proves the bump validator emits none. Red
    control: C2.
12. `keeps the bundled tree free of alias findings` — a corpus case asserting
    `validateOatSkills` over the real `.agents/skills` returns zero
    `skill-version-alias` findings, so a regression that reintroduced the alias
    would fail here rather than in CI's `oat:validate-skills` step. Red control:
    C3, plus temporarily adding a top-level `version:` to one bundled skill.

**New cases — clause D**

13. `reports a skill whose scripts changed while SKILL.md did not` — the fake
    `git diff` returns `.agents/skills/oat-fixture/scripts/run.mjs`; `git show`
    and disk hold identical `SKILL.md` bytes. Assert one finding on
    `.agents/skills/oat-fixture/SKILL.md` whose message contains
    `scripts/run.mjs`. Red control: D1.
14. `ignores a tests-only change` — the fake diff returns
    `.agents/skills/oat-fixture/tests/contract.test.mjs` only. Assert zero
    findings and `validatedSkillCount === 0`. Red control: D2.
15. `keeps the identical-content skip for the owning file alone` — the fake
    diff returns only `.agents/skills/oat-fixture/SKILL.md` with identical
    bytes on both sides. Assert zero findings, preserving today's rename/mode
    behavior. Red control: remove the `changedPaths` guard from Step 2 item 2 —
    the case must fail.

**Focused command**

`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/internal/validate-skill-version-bumps.test.ts`
→ all cases pass.

**Full relevant suite**

`HOME=$(mktemp -d) pnpm exec turbo run test --force` → passes with no cache
replay. Then `pnpm run check:skill-bumps` and `pnpm oat:validate-skills`
separately, because Turborepo replay can hide a real failure in either.

## Done criteria

- [ ] `listChangedVersionedFiles` diffs `.agents/skills` (mapped to owning
      `SKILL.md`, `tests/` excluded) and `.agents/agents/*.md`, and control A3
      proves the skills half survived.
- [ ] An unbumped `.agents/agents/*.md` edit makes `pnpm run check:skill-bumps`
      exit 1 (control A1), and a top-level bump makes it exit 0 (control A2).
- [ ] A scripts-only skill edit makes `pnpm run check:skill-bumps` exit 1 with
      the changed path named (control D1); a tests-only edit exits 0 (control
      D2).
- [ ] The bump criterion text names `metadata.version` and states that agent
      roles may declare a top-level `version:`.
- [ ] `AGENTS.md:11` and
      `apps/oat-docs/docs/contributing/skills.md:229-241` both state the
      directory rule for skills and the top-level rule for agent roles, and
      `pnpm check`'s markdownlint step passes.
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
- [ ] Thirteen controls recorded, each with its command, exit code, and the
      finding code that fired.
- [ ] `resolveSkillVersion` in `packages/cli/src/commands/shared/frontmatter.ts`
      is unchanged, no `.agents/agents/*.md` file was migrated to
      `metadata.version`, and no file under `.agents/skills` or `.agents/agents`
      changed.
- [ ] The three backlog items are updated; `BL-260908-retire-the-top-level-skill`
      remains `status: open` with its step-2 criteria unticked; clause D's
      residual gaps are noted.
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
   `.agents/skills/*/SKILL.md` half in any way control A3 can detect, or
   control D2 shows a `tests/`-only change being reported;
5. making the gate pass for an agent role requires migrating it to
   `metadata.version` — that contradicts `DR-260908-bundled-skills-declare`,
   which reserves the migration for a separate decision;
6. work drifts toward step 2: editing `resolveSkillVersion`, deleting the alias
   branch, collapsing the five frontmatter-walk copies, or normalizing `.inf`
   key spellings;
7. `packages/cli/package.json` is above `0.2.66` at execution time and the
   intervening release changed `skills.ts` — the schedule slot was claimed;
   re-read `DR-260908` before promoting;
8. any of the thirteen controls fails to go red pre-fix or green post-fix;
9. cited line anchors in `skills.ts` or `skills.test.ts` no longer match after
   the drift check;
10. a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

**Correction applied 2026-09-09 (wave-7 p13 execution; no requirement change — six plan-internal inconsistencies verified by the root review):** (1) `validateSkillVersionBumps` has two call sites, not "the single call site at `:1106`" — the second is inside `validateOatSkills` when `baseRef` is set; both are updated. (2) Control B4's literal variant (a brand-new versionless skill) cannot exit 1, because `baseContent === null` is the deliberate new-file skip Step 2 keeps; the modification variant is the load-bearing control. (3) Step 5's dedupe assumes the version-source pass runs before the `oat-*` loop; the real order is the reverse, so the dedupe is implemented in the working direction. (4) Step 4's literal guard placement (right after `currentBlock`) would have changed `skill-frontmatter-unreadable` into `skill-frontmatter-missing` on a malformed-current fixture — a STOP 3 violation; the guard sits at the two `continue`s as Step 4 item 4 and the Review focus say. (5) A git pathspec `*` crosses `/`, so the old `.agents/skills/*/SKILL.md` already matched a nested `SKILL.md`; the widened pathspec keeps a nested `SKILL.md` version-checked (it maps to itself and its owner) except under `tests/`. (6) The `## Weaker-anywhere rule` requires both "every finding emitted today must still be emitted" and "a `tests/`-only change must remain accepted"; those cannot both hold for a `SKILL.md` nested under `<skill>/tests/`, which the old pathspec matched. The plan's `tests/` boundary (Step 1.2, control D2, STOP 4) governs: such a file is no longer version-checked. The review proved the input set is empty at base, head, and `origin/main`, that `bundle-assets.sh:49` removes `tests/` before any consumer sees it, and that the lost enforcement was a false positive; the narrowing is recorded on `BL-260906-extend-check-skill-bumps` beside the two residual gaps. A second reject-ward exception the review found: a changed sibling whose owning `SKILL.md` is absent from the working tree went from exit 2 (`ENOENT`) to exit 0 — plan-mandated, test-pinned, not CI-reachable. Also: the plan's prescribed focused test command misses three consumer fixtures that clause B forces (`commands.integration.test.ts`, `validate-oat-skills.test.ts`, `help-snapshots.test.ts`); only the full forced run finds them.

Revalidate against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- the CLI's lockstep version moves past `0.2.66` in a release that changed the
  validator — clause C's "first validator-changing release after 0.2.65" would
  then have been claimed by that release, and the schedule needs re-reading
  against `DR-260908-bundled-skills-declare`;
- a bundled skill regains a top-level `version:` — re-run the live
  `validate-oat-skills` check before promoting the severity;
- an `.agents/agents/*.md` role is migrated to `metadata.version` by another
  change — clause A's "accept either shape" wording then needs re-reading;
- `packages/cli/scripts/bundle-assets.sh` changes what it ships or strips —
  clause D's `tests/` boundary follows the bundle, not the other way round;
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

Three wave-level consequences the fan-in must know:

1. Once this lane merges, every subsequent PR that edits an `.agents/agents/*.md`
   role needs a top-level version bump. No other wave-7 lane edits an agent
   role after the dispatch-baseline lane was narrowed, but PR #190 does
   (`oat-reviewer.md`) and will need one when it lands.
2. Once this lane merges, every PR that edits `scripts/` or `references/` under
   a skill needs that skill's `metadata.version` bump. The wave-7 lanes that
   do so already bump (`read-stdin-in-finalize-synced-archive`,
   `make-the-completion-seal-idempotent`, `repair-stray-fences-in-lifecycle-skills`,
   `correct-skill-authoring-facts`); the fan-in must run
   `pnpm run check:skill-bumps` on the integrated wave branch **after** this
   lane is in, not only per lane, because the gate's surface is wider than the
   one each earlier lane ran against.
3. This lane edits `apps/oat-docs/docs/**`, which counts as shipped CLI
   functionality for release policy, so the lockstep bump at fan-in is required
   whether or not any other lane triggers it.

A root review follows the lane. Because this lane writes
`packages/cli/src/validation/skills.ts`, `skills.test.ts`, and root
`AGENTS.md`, it must be serialized against the sibling lanes named in
`## Dependencies`.

## Review focus

- **Weaker-anywhere in both directions.** Diff `collectChangedSkillVersionBumpFindings`
  and `collectSkillVersionSourceFindings` and confirm every pre-existing guard
  fires in the same order with the same `code`. The new findings are added at
  the two `continue`s, not in front of the specific diagnoses.
- **The pathspec and the mapping.** Read the `git diff` argument list and the
  owning-file mapping literally. A mis-typed pathspec that silently narrowed the
  skills half, or a mapping that dropped `SKILL.md` edits, would reproduce the
  exact defect class these items exist to close; controls A3 and D1 are the
  only things that catch it. Confirm `tests/` is the only excluded directory.
- **Decision conformance.** Confirm the gate accepts an agent role's top-level
  `version:` and that no `.agents/agents/*.md` file was migrated;
  `DR-260908-bundled-skills-declare` reserves that migration for a separate
  decision.
- **Schedule conformance.** Confirm the live `validate-oat-skills` run recorded
  in the drift check returned zero findings before the promotion, that
  `package.json` was still `0.2.66`, and that the code comment records the
  schedule so a future reader can see why the severity moved.
- **Bump-gate isolation.** Confirm control C2 exists and would fail if the alias
  finding started reaching the bump validator; the wrapper fails on any finding,
  so a leak would break every third-party skill that still declares the alias.
- **Step-2 containment.** Confirm `resolveSkillVersion` is untouched and that
  nothing in the diff anticipates `BL-260908-remove-the-top-level-skill`. Note in
  the review that clause A creates a new dependency for that item: agent roles
  now have an enforcement surface while still declaring the top-level field.
- **Separate controls.** Confirm the thirteen controls are genuinely distinct —
  four clauses, no shared fixture standing in for another clause's proof.

## Execution record (2026-09-09, wave 7)

Executed as wave-7 p13 (PR #286 `wave-7-execution`, CLI 0.2.67; lane commit(s) `5846efdb0` → integration `9e6683b20`): the skill version validators close their gaps: agent roles under `.agents/agents/*.md` are version-gated, an unresolvable version is a finding instead of a silent pass, the top-level `version:` alias promotion is a structural error while the bump gate still accepts an alias-only skill with a valid bump, and `check:skill-bumps` covers whole skill directories (`scripts/`, `references/`, everything but `tests/`) with `-z`/NUL-safe path handling; `AGENTS.md`'s bump rule and the contributing docs say so. Verification: forced check/type-check/test `Cached: 0`; check:skill-bumps (9 owning files, 0 findings); lint; format; validate-skills (83 directories clean); sixteen controls against a pre-fix CLI snapshot; two Codex rounds (R1 1C/2I/2M/1m fixed; R2 one Critical rejected as a plan-licensed narrowing, 1M/2m fixed); root review PASS with findings (0/0/1M/3m; a 30-shape base-vs-head battery through real `git init` fixtures; the narrowing adjudicated licensed; the literal Step-4 guard placement shown to violate STOP 3). Deviations: a `SKILL.md` nested under `<skill>/tests/` is no longer version-checked (plan boundary; input set empty; recorded on the item); an absent-owning-`SKILL.md` sibling exits 0 instead of 2 (plan-mandated, pinned); three test fixtures outside the plan's list (clause B's forced propagation); six plan-internal inconsistencies recorded by a dated correction.
