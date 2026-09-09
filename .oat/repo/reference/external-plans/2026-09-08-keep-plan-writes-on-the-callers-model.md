---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260908-keep-external-plan-writes.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260908-keep-external-plan-writes
oat_issue_url: null
created: '2026-09-08T21:33:45Z'
---

# Keep external-plan writes on the caller's model class in oat-repo-improve

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. This plan edits
> two lifecycle skills' prose and one docs page and adds one contract case plus
> one moved version pin; it changes no code path. It runs as a wave-7 lane in
> lane mode (see `## Repository conventions`); the wave fan-in owns the
> lockstep bump and the release gates. A root review follows the lane.

## Outcome

`oat-repo-improve` states, in the step that selects the orchestration tier
and again in its success criteria, that external-plan writes are never
delegated below the caller's own model class: reconnaissance lanes may run on
cheaper classes, plan authoring may not, and a parallelized author subagent
must run on the caller's model with the caller reviewing every plan before
publication or wave composition. `oat-wave-execute` carries the same rule for
the plan amendments it authors at wave boundaries — the Drift Refresh Record
entries and any reconciliation, including after a tripped STOP, that amends a
plan's mechanism. The docs page that describes the delegation boundary says
the same. A contract test pins the operative sentences by content so the rule
cannot drift out of the skills silently
(`DR-260906-standing-claims-in-skills-name`).

## Source and live evidence

- Source backlog item:
  [BL-260908-keep-external-plan-writes — Keep external-plan writes on the caller's model class in oat-repo-improve](../../pjm/backlog/items/BL-260908-keep-external-plan-writes.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — branch
  `wave-7-plans`, the tree whose content this plan read; every anchor below was
  re-verified there on 2026-09-08 after the branch was rebased onto the merged
  PR #273.
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the
  fetched `origin/main` tip (PR #273's merge commit), which is also the
  merge-base with `wave-7-plans`; the branch differs from it only by the wave-7
  plan files and the program ledger.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- Verified evidence:
  - `.agents/skills/oat-repo-improve/SKILL.md:135-137` — Step 2 ends "The
    caller retains decomposition, synthesis, user dialogue, source
    verification, candidate selection, and all plan writes." Nothing in the
    step names a model class for plan writes; the tier bullets at `:145-147`
    speak only of read-only reconnaissance lanes.
  - `.agents/skills/oat-repo-improve/SKILL.md:333-348` — `## Success Criteria`
    (heading at `:333`, fourteen bullets ending at `:348`) contains no line
    about who writes plans or on what model class.
  - `.agents/skills/oat-repo-improve/SKILL.md:9-11` — `metadata.version:
2.1.4`; the frontmatter carries no column-0 `version:` key.
  - `.agents/skills/oat-wave-execute/SKILL.md:163-186` — Step 2 ("Wave-boundary
    drift refresh (recon dispatch)") dispatches "ONE economical recon subagent
    (read-only)" (`:165`) and ends with the reconciliation contract paragraph
    (`:179-186`), which names the "Drift Refresh Record" (`:183`) as where a
    reconciliation is recorded exactly once. Nothing in the skill says on
    which model class those entries are authored. The phrase `Refresh applied`
    does **not** occur anywhere in the skill; the record's name is the only
    vocabulary to anchor on. `:50-53` ("The orchestrator owns (judgment —
    never delegate to this skill or to workers)") lists composition, review
    dispositions, claim verification, merge order, synthesis, and user
    checkpoints — not plan amendments. `metadata.version: 1.9.1` (`:8-9`).
  - `apps/oat-docs/docs/workflows/skills/repo-improve.md:70-77` — the
    `## Orchestration` section opens "Full repository audits use bounded
    read-only reconnaissance while the root agent retains classification,
    vetting, prioritization, cross-lane synthesis, and plan writing." No
    model-class statement. No test under `packages/cli/src` or `tools` pins
    this page (`grep -rn "workflows/skills/repo-improve" packages/cli/src tools`
    is empty); it is covered by markdownlint through `pnpm check` only.
  - `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
    — `SKILLS_DIR` (`:38`) and `REPO_IMPROVE_SKILL` (`:95`) are file-level
    constants; `it('binds repo-improve dispatch and orchestration references
independently')` is at `:2584` and `it('requires plan readiness to be
evaluated separately from execution readiness')` at `:2611`, both using
    `toContain`/`toMatch` on the raw file. No constant or case references
    `oat-wave-execute/SKILL.md`; the only `oat-wave-execute` mention (`:1502`)
    is a fixture README path. No case pins the caller-retains sentence.
  - `packages/cli/src/validation/skills.test.ts:6107` — the version pin
    `['.agents/skills/oat-repo-improve/SKILL.md', '2.1.4']` inside
    `it('pins portable utility-pack callers to installed-root sibling reads')`
    (`:6104`). `grep -rn "1\.9\.1" packages/cli/src tools/smoke .agents/skills`
    returns only `oat-wave-execute/SKILL.md:9` itself: no pin exists for that
    skill.
  - `.claude/skills/oat-repo-improve` and `.claude/skills/oat-wave-execute` are
    symlinks to `../../.agents/skills/<name>`; `.cursor/skills` and
    `.codex/skills` do not exist in the repository. A prose change to either
    skill therefore needs no `oat sync` to reach the provider views.
  - `pnpm run check:skill-bumps` prints
    `OK: validated N changed canonical skill version bump checks against origin/main`
    on success with changed skills, and
    `OK: 0 canonical skills changed relative to origin/main - nothing to validate`
    when none changed (`packages/cli/src/commands/internal/validate-skill-version-bumps.ts:78,82`).
  - The regex assertions in step 1 were probed against the live files on
    2026-09-08: every new assertion is false on the current skills, true on the
    proposed prose (including when the inserted sentences are hard-wrapped at
    80 columns), and removing only the "never delegated below" sentence turns
    exactly that assertion false again.
  - Incident evidence (2026-09-08): a Fable session running this skill from
    memory delegated the sixteen wave-7 plan writes to Opus subagents; the
    operator's stated purpose of the skill ("have the smartest possible model
    write the plans") was met only by a same-model review pass with rewrite
    authority afterwards.

## Dependencies

| Type             | Dependency                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Required state                                                                                                                                                                                                                                                                                                                                                                                                                           | Current state                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Satisfied policy | `DR-260906-standing-claims-in-skills-name`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Accepted; every standing claim added here names its executable backstop by test title, never by line number.                                                                                                                                                                                                                                                                                                                             | Accepted. Record present at `.oat/repo/reference/decisions/DR-260906-standing-claims-in-skills-name.md`; the backstop is the contract case added in step 1. |
| Satisfied policy | `DR-260906-one-version-bump-per-changed`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Accepted; one `metadata.version` bump per changed skill in the final PR diff, carried across lanes.                                                                                                                                                                                                                                                                                                                                      | Accepted. Verified at `.oat/repo/reference/decisions/DR-260906-one-version-bump-per-changed.md`.                                                            |
| Soft ordering    | [Repair stray fences in lifecycle skills](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Never in one parallel group with this lane. It bumps `oat-repo-improve` `2.1.4` → `2.1.5` (a `references/plan-template.md` fence repair) and moves the `skills.test.ts:6107` pin — the same bump and pin this plan takes. Whichever lane merges second finds `2.1.5` already on the base, takes **no** second bump, moves no pin, and records in the wave's Drift Refresh Record that the earlier lane owns the `oat-repo-improve` bump. | Planned, unexecuted; serialized by wave composition.                                                                                                        |
| Soft ordering    | Every other wave-7 lane that writes `packages/cli/src/validation/skills.test.ts`: [Correct skill authoring facts](./2026-09-08-correct-skill-authoring-facts.md), [Read stdin in finalize-synced-archive](./2026-09-08-read-stdin-in-finalize-synced-archive.md), [Make the completion seal idempotent](./2026-09-08-make-the-completion-seal-idempotent.md), [Reconcile the oat doctor example](./2026-09-08-reconcile-the-oat-doctor-example.md), [Tighten the skill version validators](./2026-09-08-tighten-the-skill-version-validators.md), [Calculate dispatch baselines after journaling](./2026-09-08-calculate-dispatch-baselines-after-journaling.md) | Never in one parallel group with this lane; whichever merges later re-anchors the `:6107` pin by the literal it expects to find and its own insertions by neighbouring test title. None of these lanes bumps `oat-repo-improve` or `oat-wave-execute`, so no bump value is shared with them.                                                                                                                                             | Planned, unexecuted; serialized by wave composition.                                                                                                        |
| Soft ordering    | [Harden the external-plan readiness contract](./2026-09-08-harden-the-external-plan-readiness-contract.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Never in one parallel group with this lane; both write `skills-bundled-docs-contract.test.ts` (that plan edits the readiness helpers and `WAVE_STATUSES`; this one adds one case beside `:2584`). Whichever merges second re-anchors by the `binds repo-improve dispatch and orchestration references independently` title. Its corpus control also sweeps this plan file.                                                               | Planned, unexecuted; serialized by wave composition.                                                                                                        |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                                                     | Affected | Files in common                                                                                                            | Required update                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #273 (remote project management) — **merged 2026-09-08** as `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` | None     | none of this plan's five write surfaces (`gh api --paginate .../pulls/273/files` intersects only `help-snapshots.test.ts`) | Already absorbed: the inspected `HEAD` sits on top of it. No update.                                                                                                                |
| PR #190 (ReviewPlan Stage A) lands                                                                        | Minor    | `packages/cli/src/validation/skills.test.ts` (verified in its file list); `apps/oat-docs/docs/**` broadly                  | Re-anchor the `:6107` pin by the `2.1.4` literal and `repo-improve.md:70-77` by the `## Orchestration` heading; no contract change.                                                 |
| PR #125 (brainstorm companion) lands                                                                      | None     | none                                                                                                                       | No update.                                                                                                                                                                          |
| Wave-7 lane `repair-stray-fences-in-lifecycle-skills` merges                                              | Major    | `.agents/skills/oat-repo-improve/SKILL.md` (version only), `packages/cli/src/validation/skills.test.ts:6107`               | `oat-repo-improve` already reads `2.1.5` and the pin already moved: skip the bump and pin move in step 2, edit the prose only, and note the bump owner in the Drift Refresh Record. |
| Wave-7 lane `harden-the-external-plan-readiness-contract` merges                                          | Minor    | `skills-bundled-docs-contract.test.ts`                                                                                     | Re-anchor the step-1 insertion beside the `binds repo-improve dispatch and orchestration references independently` case by title.                                                   |
| Any other wave-7 `skills.test.ts` writer merges                                                           | Minor    | `packages/cli/src/validation/skills.test.ts`                                                                               | Re-anchor `:6107` by literal; nothing else is shared.                                                                                                                               |

## Drift check

Run before editing:

```bash
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..HEAD -- \
  .agents/skills/oat-repo-improve/SKILL.md \
  .agents/skills/oat-wave-execute/SKILL.md \
  apps/oat-docs/docs/workflows/skills/repo-improve.md \
  packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts \
  packages/cli/src/validation/skills.test.ts
```

`HEAD` here is the execution base (inside a wave lane, the integration branch
after predecessor lanes merged); from the planning branch itself the command
is trivially empty, so also run it with `..origin/main`. Expected: no output,
or only the sibling wave-7 lanes named in `## Dependencies` (re-anchor and
continue). A change to the caller-retains sentence at
`oat-repo-improve/SKILL.md:135-137` or to the reconciliation-contract paragraph
at `oat-wave-execute/SKILL.md:179-186` from any other source is a STOP.

## Repository conventions

- Test (focused): `pnpm --filter @open-agent-toolkit/cli exec vitest run <path> [-t <title>]` → the named cases pass.
- Test (forced full, no Turborepo replay): `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root; a run that prints `cache hit, replaying logs` or `>>> FULL TURBO` executed nothing.
- Version-bump gate: `pnpm run check:skill-bumps` (fetch `origin/main` first) → `OK: validated N changed canonical skill version bump checks against origin/main`.
- One `metadata.version` bump per changed skill per PR, PR-scoped and carried across lanes (`DR-260906-one-version-bump-per-changed`); locate pins by the **old version literal** (plain and regex-escaped) across `packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests` — `oat-repo-improve` `2.1.4` is pinned at `packages/cli/src/validation/skills.test.ts:6107`; `oat-wave-execute` `1.9.1` has no pin. The top-level `version:` key is gone since CLI 0.2.65; keep bumps under `metadata:`.
- Standing claims in skills name their executable backstop by file and test title, never by line number (`DR-260906-standing-claims-in-skills-name`); this plan's backstop is the contract case it adds.
- `pnpm exec oxfmt --write` on every Markdown and TypeScript file written; `proseWrap` is `preserve`, so oxfmt does not reflow the inserted sentences — wrap them by hand at 80 columns to match the surrounding paragraphs.
- `pnpm test:skills`, `pnpm lint`, and `pnpm format` cover `.agents/skills` and are not run by CI's `pnpm check` — run them in the lane.
- Docs pages under `apps/oat-docs/docs` run markdownlint through `pnpm check`.
- Provider views for both skills are symlinks; do **not** run `oat sync` at any scope inside the lane (`--scope all` also rewrites the invoking user's home-scope provider directories).
- Git/PR convention: do not push or open a PR from this lane. The wave fan-in owns the lockstep public-package bump and the release gates.

**Lane-mode verification.** This plan runs as a **lane** in wave 7, in a
worktree at `.worktrees/wave-7/<lane>`, with a root review after. Lane mode
means: the focused tests named in `## Test plan`, plus `pnpm check`,
`pnpm type-check`, a forced `turbo run test`, `pnpm run check:skill-bumps`,
`pnpm lint`, `pnpm format`, `pnpm oat:validate-skills`, and `pnpm test:skills`.
The lane does **not** bump the five lockstep public package versions and does
**not** run `pnpm release:check-versions`, `pnpm release:validate`, or
`pnpm build:docs` — the wave fan-in owns the lockstep bump and the release
gates. Capture each gate's exit code explicitly, for example
`pnpm check > gate.log 2>&1; echo "exit=$?"`; never derive success from a
pipeline whose last stage is a pager or filter.

## Scope

### In scope

- `.agents/skills/oat-repo-improve/SKILL.md` — Step 2 (after the caller-retains sentence), one Success Criteria bullet, `metadata.version` `2.1.4` → `2.1.5`.
- `.agents/skills/oat-wave-execute/SKILL.md` — Step 2, one sentence after the reconciliation-contract paragraph; `metadata.version` `1.9.1` → `1.9.2`.
- `apps/oat-docs/docs/workflows/skills/repo-improve.md` — `## Orchestration`, one sentence.
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts` — one new case beside `binds repo-improve dispatch and orchestration references independently`, plus one constant.
- `packages/cli/src/validation/skills.test.ts` — the `:6107` pin, `2.1.4` → `2.1.5`.

### Out of scope

- Any dispatch-machinery change: the rule is prose plus a pin; no CLI enforces it (a dispatch record's `model_selector` could pin it later — a follow-up, not this plan).
- `subagent-orchestration`'s class ladder and `oat-dispatch-subagents`.
- `oat-wave-execute`'s `## Ownership Boundary` list at `:50-53` — the rule lands once, in Step 2 where the recon dispatch and the reconciliation contract already live; duplicating it in the ownership list would create a second sentence to keep in sync.
- `apps/oat-docs/docs/workflows/wave-workflows.md` — its "the orchestrator retains judgment" sentence (`:23`) is not a delegation-boundary description; the item names only the `repo-improve` page.
- The wave-7 plan batch itself (already reviewed on the caller's model).

## Current state

Verified at `a594614024725979ebf24bd9a34b3565c30fbffb`:

- `oat-repo-improve/SKILL.md:135-137` reserves plan writes for "the caller"
  but the same skill's tier bullets (`:145-147`) and the docs page (`:72-77`)
  describe delegation only in terms of reconnaissance, so a reader who
  parallelizes authoring has no rule about the author subagent's model class.
- `oat-wave-execute/SKILL.md:163-186` names an "economical recon subagent" for
  the drift refresh and defines the reconciliation contract; the Drift Refresh
  Record entries that reconciliation produces — including after a tripped STOP
  (`:179-180`, "A tripped STOP parks that lane at plan time (recorded in the
  wrapper plan…)") — are authored by the orchestrator with no model-class
  statement.
- `skills-bundled-docs-contract.test.ts:2584-2620` pins two other
  `oat-repo-improve` sentences with `toContain`/`toMatch` on the raw file; no
  case names the caller-retains sentence, so rewording it today fails nothing.
- The current skill text contains no straight apostrophe in the phrases the
  new assertions match (`caller's` does not occur), and no curly apostrophe
  anywhere; the new prose uses straight apostrophes (U+0027) throughout so the
  assertions below match literally.

## Implementation steps

### 1. Write the contract pin first (RED)

In `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`,
add beside `REPO_IMPROVE_SKILL` (`:95`) the constant
`const WAVE_EXECUTE_SKILL = join(SKILLS_DIR, 'oat-wave-execute', 'SKILL.md');`.
Then add one case directly after
`it('binds repo-improve dispatch and orchestration references independently')`
(`:2584`), named exactly
`keeps external-plan writes on the caller's model class`. It reads both
skills, collapses whitespace so hard-wrapped sentences match, and asserts the
following. The regexes are the contract; copy them literally:

```ts
it("keeps external-plan writes on the caller's model class", () => {
  const collapse = (text: string): string => text.replace(/\s+/g, ' ');
  const repoImprove = collapse(readFileSync(REPO_IMPROVE_SKILL, 'utf8'));
  const waveExecute = collapse(readFileSync(WAVE_EXECUTE_SKILL, 'utf8'));

  // (a) the existing caller-retains sentence, pinned so it cannot be reworded
  expect(repoImprove).toMatch(
    /The caller retains decomposition, synthesis, user dialogue, source verification, candidate selection, and all plan writes\./,
  );
  // (b) the operative rule
  expect(repoImprove).toMatch(
    /Plan writes are never delegated below the caller's own model class\./,
  );
  // (c) parallel authoring stays same-model and caller-reviewed
  expect(repoImprove).toMatch(
    /If authoring is parallelized, the author subagent runs on the same model as the caller, and the caller reviews every plan before publication or wave composition\./,
  );
  // (d) reconnaissance may be cheaper; plan writes may not
  expect(repoImprove).toMatch(
    /Reconnaissance lanes may run on cheaper classes; plan writes may not\./,
  );
  // (e) the claim names this case as its backstop (DR-260906)
  expect(repoImprove).toMatch(
    /`keeps external-plan writes on the caller's model class` case in `packages\/cli\/src\/commands\/init\/tools\/shared\/skills-bundled-docs-contract\.test\.ts`/,
  );
  // (f) the success criterion
  expect(repoImprove).toMatch(/Plan writes stay on the caller's model class/);
  // (g) oat-wave-execute mirrors the rule for the amendments it authors
  expect(waveExecute).toMatch(
    /are plan writes and stay on the orchestrator's own model class/,
  );
});
```

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t "caller's model class"` → `1 failed`, failing on assertion (b) (assertion (a) passes on the current text); record the failure line in the PR body.

### 2. Amend `oat-repo-improve` (GREEN for (a)–(f))

In Step 2, directly after "The caller retains decomposition, synthesis, user
dialogue, source verification, candidate selection, and all plan writes.",
append to the same paragraph, hand-wrapped at 80 columns:

> Plan writes are never delegated below the caller's own model class. If
> authoring is parallelized, the author subagent runs on the same model as
> the caller, and the caller reviews every plan before publication or wave
> composition. Reconnaissance lanes may run on cheaper classes; plan writes
> may not. The executable backstop is the
> `keeps external-plan writes on the caller's model class` case in
> `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`.

Add as the last `## Success Criteria` bullet (after "Final guidance
distinguishes direct execution from optional `oat-project-import-plan`
handoff."):

> - Plan writes stay on the caller's model class: a parallelized author
>   subagent runs on the caller's model and the caller reviews every plan
>   before publication or wave composition.

Bump `metadata.version` `2.1.4` → `2.1.5` and move the pin at
`packages/cli/src/validation/skills.test.ts:6107` (locate by the literal
`'2.1.4'` inside `it('pins portable utility-pack callers to installed-root
sibling reads')`; confirm with `grep -rn --fixed-strings "2.1.4" packages/cli/src tools/smoke .agents/skills/*/tests`
that no other pin exists). If the stray-fences lane already landed in this PR,
the skill reads `2.1.5` and the pin already moved: edit the prose only.

**Verify:** the step-1 case now fails only on assertion (g); `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "installed-root sibling reads"` → pass; `git fetch origin main --quiet && pnpm run check:skill-bumps` → `OK: validated 1 changed canonical skill version bump checks against origin/main` (or `2` if the stray-fences lane's bumps are already on the base — the count is the number of changed skills in the PR diff, not this lane's).

### 3. Amend `oat-wave-execute` (GREEN for (g))

In Step 2, directly after the reconciliation-contract paragraph that ends
"(wave-4 evidence)." (`:186`), add one paragraph, hand-wrapped at 80 columns:

> Recon is delegated; the Drift Refresh Record entries and any reconciliation
> that amends a plan's mechanism — including after a tripped STOP — are plan
> writes and stay on the orchestrator's own model class, the same rule
> `oat-repo-improve` applies to external-plan writes.

Bump `metadata.version` `1.9.1` → `1.9.2` (no pin to move; confirm with
`grep -rn --fixed-strings "1.9.1" packages/cli/src tools/smoke .agents/skills/*/tests`
→ empty).

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t "caller's model class"` → `1 passed`; `pnpm run check:skill-bumps` → `OK: validated 2 changed canonical skill version bump checks against origin/main` (plus any sibling-lane skills already on the base).

### 4. Update the docs page

In `apps/oat-docs/docs/workflows/skills/repo-improve.md` `## Orchestration`,
extend the first paragraph (which ends "…and plan writing.") with one
sentence: "Plan writes never move below the caller's model class — a
parallelized author runs on the caller's model and every plan is
caller-reviewed before publication or wave composition; the
`keeps external-plan writes on the caller's model class` case in
`skills-bundled-docs-contract.test.ts` is the backstop."

**Verify:** `pnpm check > check.log 2>&1; echo "exit=$?"` → `exit=0` (markdownlint over the docs app included); `git status --short` lists exactly the three prose files and the two test files.

### 5. Format and lane gates

**Format (write/fix, before verification):**

```bash
pnpm exec oxfmt --write \
  .agents/skills/oat-repo-improve/SKILL.md \
  .agents/skills/oat-wave-execute/SKILL.md \
  apps/oat-docs/docs/workflows/skills/repo-improve.md \
  packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts \
  packages/cli/src/validation/skills.test.ts
```

**Verify:** lane mode, exit codes captured one per line:

```bash
pnpm check                > check.log   2>&1; echo "check=$?"
pnpm type-check           > tc.log      2>&1; echo "type-check=$?"
pnpm lint                 > lint.log    2>&1; echo "lint=$?"
pnpm format               > format.log  2>&1; echo "format=$?"
pnpm oat:validate-skills  > vs.log      2>&1; echo "validate-skills=$?"
pnpm test:skills          > skills.log  2>&1; echo "test-skills=$?"
pnpm run check:skill-bumps > bumps.log  2>&1; echo "skill-bumps=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force > test.log 2>&1; echo "test=$?"
```

→ every echoed status is `0`; `test.log` contains neither
`cache hit, replaying logs` nor `>>> FULL TURBO`. Do not run `oat sync`:
both skills' provider views are symlinks and `git status` must show no
provider-view change.

## Test plan

- **New:** `skills-bundled-docs-contract.test.ts` —
  `keeps external-plan writes on the caller's model class`. Structural
  pattern: the adjacent `binds repo-improve dispatch and orchestration
references independently` case (raw-file `toContain`/`toMatch`), with a
  whitespace collapse added so hand-wrapped sentences match. Regression
  proved: the model-class rule being reworded or deleted from either skill.
  Red at step 1 (assertion (b) fails on the current text), green after steps
  2–3. **Neutralization control after landing**, in a throwaway worktree:
  `SCRATCH=$(mktemp -d) && git worktree add "$SCRATCH/probe" HEAD`; inside it,
  delete only the sentence "Plan writes are never delegated below the
  caller's own model class." from `oat-repo-improve/SKILL.md`, re-run the
  focused command, and confirm the case fails on assertion (b) and on nothing
  else; then delete the `oat-wave-execute` sentence instead and confirm the
  failure moves to (g). Discard the probe with `git worktree remove`; never
  `rm -rf` a variable path. Report both results.
- **Existing, must stay green:** `skills.test.ts` `pins portable utility-pack
callers to installed-root sibling reads` (the `:6107` pin, now `2.1.5`), and
  the corpus sweeps in the same file (every skill resolves
  `source === 'metadata'`; no column-0 `version:`).
- **Existing, must stay green:** the readiness sweep in
  `skills-bundled-docs-contract.test.ts` (`every current external plan is
accepted under its date-selected mode`), which reads this plan file.
- **Full relevant suite:** `HOME=$(mktemp -d) pnpm exec turbo run test --force` → all packages pass with no cache replay.

## Done criteria

- [ ] `oat-repo-improve/SKILL.md` Step 2 and Success Criteria state that plan writes are never delegated below the caller's model class, that a parallelized author subagent is same-model and caller-reviewed before publication or wave composition, and that reconnaissance may run cheaper — naming the contract case as the backstop by title, with no line number.
- [ ] `oat-wave-execute/SKILL.md` Step 2 states that Drift Refresh Record entries and post-STOP reconciliations that amend a plan's mechanism are plan writes on the orchestrator's own model class.
- [ ] `repo-improve.md`'s `## Orchestration` section carries the rule and names the backstop.
- [ ] The contract case exists, was red before the prose landed (assertion (b)), is green after, and both neutralization controls fail on exactly the expected assertion.
- [ ] `oat-repo-improve` reads `2.1.5` with its `skills.test.ts` pin moved (or, if the stray-fences lane merged first, unchanged by this lane); `oat-wave-execute` reads `1.9.2`; `check:skill-bumps` exits `0`.
- [ ] Lane gates green with captured exit codes; `git status --short` shows exactly the five in-scope files and no provider-view change.

## STOP conditions

- The caller-retains sentence at `oat-repo-improve/SKILL.md:135-137` is absent or reworded on the execution base — re-anchor only if the meaning is intact; otherwise STOP and report.
- The reconciliation-contract paragraph at `oat-wave-execute/SKILL.md:179-186` is absent or no longer names the Drift Refresh Record — the wave-execute sentence would have nothing to attach to; STOP and report.
- `oat-repo-improve` or `oat-wave-execute` was already bumped in the same PR by a sibling lane and the value on the base is **lower** than this plan's target (for example `2.1.5` expected but a higher or malformed value found) — do not bump twice; coordinate the single bump at the fan-in and STOP the lane's own bump step.
- A pin for either skill's version exists somewhere the grep in step 2 did not cover (a new pin site) — STOP and report the site rather than guessing.
- Assertion (a) fails at step 1 — the pinned sentence has moved and every later assertion is anchored on stale text.
- A named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Re-run the drift check against the wave-7 execution base after predecessor
lanes integrate; re-anchor `:135-137`, `:179-186`, `:70-77`, `:2584`, `:95`,
and `:6107` by content, not by number. Revalidate if `oat-repo-improve` or
`oat-wave-execute` changes version before this lane runs (the stray-fences
lane is expected to), if PR #190 lands and moves the docs page or
`skills.test.ts`, or if `origin/main` advances materially from
`7d70ac307717b95917b8f92aa3fb9f236d1f75ba`.

**Correction applied 2026-09-09 (wave-7 p20 execution; wave-close pass; no requirement change):** (1) steps 2–3 ask for the `pnpm run check:skill-bumps` count to rise before the commit exists; it cannot — `listChangedVersionedFiles` (`packages/cli/src/validation/skills.ts:1134`, the diff at `:1152`) enumerates paths from `git diff --name-only … ${baseRef}...HEAD` and reads the version values from the working tree, so an uncommitted bump on a file absent from the committed changed set is invisible (the review's probe: `HEAD` at 1.9.1 with an uncommitted 1.9.2 → exit 0). The bump control is run after committing, on a throwaway branch, where it fails exactly as the plan expects (`… must bump its version relative to origin/main (still 1.9.1)`). (2) The success string quoted in `## Source and live evidence` is stale: the gate now prints `OK: validated N changed canonical skill and agent role version bump checks against origin/main` (it covers `.agents/agents/*.md` since p13). (3) The `:2584` and `:6107` citations were stale as pre-declared (p17 moved the contract case to `:2913`, the pin to `:6246`); re-anchored by content. (4) `packages/cli/src/validation/skills.test.ts` was not edited: the `oat-repo-improve` pin already read `2.1.5` (p10's PR-scoped bump) per this plan's Landing-event row, and `1.9.1` has no pin anywhere. Executed at `44421c0ef`, merged as `f6ccdab52` — the wave's last lane.

## Review focus

- The added sentences say exactly what the operator asked for and no more: no new dispatch machinery, no claim that a CLI enforces the rule.
- The contract case pins meaning, not line numbers, and tolerates hand wrapping; the regexes in the plan are copied literally, not paraphrased, because they were probed against the proposed prose.
- One bump per skill in the final PR diff; the `:6107` pin moved exactly once across the stray-fences lane and this one; no second bump.
- The `oat-wave-execute` sentence anchors on the "Drift Refresh Record" — the skill's real vocabulary — and not on a phrase the skill does not use.
- Weaker-anywhere does not apply (no validator, guard, or reader changes).
