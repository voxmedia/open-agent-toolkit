---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/archived/BL-260906-cover-skill-test-files-under.md
  - .oat/repo/pjm/backlog/archived/BL-260906-run-scripts-worktree-init-test.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-cover-skill-test-files-under
  - BL-260906-run-scripts-worktree-init-test
oat_issue_url: null
created: '2026-09-08T21:19:08Z'
---

# Put skill-asset formatting and the worktree-init test inside the gates CI actually runs

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> The change is confined to three root-level files, adds no dependency, and both
> newly-gated surfaces are verified clean at the planning `HEAD` (which sits on
> PR #273's merge commit), so wiring them in cannot turn CI red on pre-existing
> debt. One sibling wave-7 lane also edits `AGENTS.md` (a different paragraph);
> the two must never share a parallel group.

## Outcome

Two verification surfaces that exist but are gated by nothing become gated by
the two commands CI runs. `pnpm check` gains the `oxfmt` coverage that only
`pnpm format` had, so a mis-formatted `.agents/skills/**` or `tools/smoke/**`
asset — a skill test `.mjs` in particular — fails the gate CI runs first
instead of passing it.
`.lintstagedrc.mjs` gains an `.mjs`/`.cjs` task, so the same file is
auto-formatted at commit instead of silently drifting. `pnpm test` gains a
`test:scripts` entry that runs `scripts/worktree/init.test.mjs`, the journal
contract test for the direct-registration path `scripts/worktree/init.sh` uses,
which no gate executes today. `AGENTS.md`'s two paragraphs describing the old
coverage gap are rewritten to describe the new, narrower one. Each wiring is
proved by a deliberate failing control that the gate catches.

## Source and live evidence

- Related backlog items:
  - [BL-260906-cover-skill-test-files-under](../../pjm/backlog/archived/BL-260906-cover-skill-test-files-under.md)
  - [BL-260906-run-scripts-worktree-init-test](../../pjm/backlog/archived/BL-260906-run-scripts-worktree-init-test.md)
- Why one plan covers both: they are wired into the same two root scripts and
  share one `AGENTS.md` paragraph, so they cannot be verified or reviewed
  independently. The first is "Cover skill test files under `.agents/skills` in
  `pnpm check` and lint-staged"; the second is "Run
  `scripts/worktree/init.test.mjs` under a repository gate".
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip, which is PR #273's merge commit. `HEAD` is that tip plus
  commits that touch only `.oat/repo/reference/external-plans/` and
  `.oat/repo/pjm/backlog/` (`git diff --name-only origin/main..HEAD` lists
  nothing else), so every citation below is a citation of `origin/main`.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- Verified evidence:
  - `.github/workflows/ci.yml:30-52` — CI's only gate steps are `pnpm check`,
    `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`,
    `pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`.
    Neither `pnpm lint` nor `pnpm format` is among them.
  - `package.json:12` — `"check": "turbo run check && pnpm oat:validate-skills"`.
    No `oxfmt` invocation over `.agents/skills`.
  - `package.json:20` — `"format"` is `turbo run format` plus
    `pnpm exec oxfmt --check '.agents/skills/**/*.{md,mjs,js,cjs}'
'apps/oat-docs/docs/**/*.md' 'tools/smoke/**/*.{mjs,md,json}'`. That trailing
    `oxfmt --check` is the entire coverage CI is missing.
  - `packages/cli/package.json:32` `"check"` is
    `oxlint . && oxlint --type-aware … && oxfmt --check .`, so `turbo run check`
    already subsumes each workspace package's `format` script (`:34`).
    `apps/oat-docs/package.json:11` `"check"` is
    `oxfmt --check 'docs/**/*.md' && markdownlint-cli2 'docs/**/*.md'`, so the
    `apps/oat-docs/docs/**/*.md` third of the root glob is _already_ inside
    `pnpm check` through `turbo run check`. The surfaces `pnpm check` misses
    today are therefore exactly `.agents/skills/**/*.{md,mjs,js,cjs}` and
    `tools/smoke/**/*.{mjs,md,json}`; the docs glob is retained in the shared
    script only so the list stays byte-identical to `"format"`'s and has a
    single definition. Adding that one command to `check` makes `check` a
    strict superset of `format`.
  - `package.json:33-34` — `"test"` is
    `turbo run test && pnpm test:smoke && pnpm test:skills && pnpm test:release`,
    and `"test:smoke"` is
    `node --test tools/smoke/*/*.test.mjs tools/smoke/*/*/*.test.mjs`. Neither
    glob reaches `scripts/`.
  - `pnpm-workspace.yaml` lists only `apps/*` and `packages/*`, so `scripts/` is
    not a workspace package and `turbo run test` never sees it.
  - `scripts/worktree/init.test.mjs` exists (11.7 KB, one `node:test` case at
    `:148`, `isolates nested smoke bootstrap from normal worktree
initialization`) and imports
    `tools/smoke/runner/cleanup.mjs` and `tools/smoke/runner/provision.mjs`
    (`:18-19`). It resolves the repository root from `import.meta.dirname`
    (`:22`), so it is invocable from the repository root, and its host
    repository is created under `mkdtemp(join(tmpdir(), 'oat-smoke-init-'))`
    (`:59`), so it never registers a worktree against the checkout's own
    `.git`. **Run live at this `HEAD` by both the drafting and the reviewing
    author: `node --test scripts/worktree/init.test.mjs` → exit 0, `# pass 1`,
    `# fail 0`, about 1.5 s wall clock, and `git status --porcelain` was empty
    afterwards.**
  - **`node --test` glob semantics on Node `22.17.0` (`.nvmrc`), verified
    live:** `node --test 'scripts/nope/*.test.mjs'` (a pattern that matches
    nothing, quoted or shell-expanded) exits **0** and runs zero tests, while
    `node --test scripts/nonexistent.test.mjs` (an explicit path that does not
    exist) prints `Could not find 'scripts/nonexistent.test.mjs'` and exits
    **1**. A `test:scripts` script must therefore name the file explicitly, as
    `test:release` already does, so a deleted or renamed test cannot pass
    vacuously. This also fixes the shape of the negative control: a scratch
    file dropped beside the real test would not be matched by an explicit
    path, so the deliberate failure is injected into the real test and
    reverted.
  - `.lintstagedrc.mjs:1-15` — three tasks: `'*.{ts,tsx,js,jsx}'`, `'*.json'`,
    `'*.md'`. There is no `*.mjs` or `*.cjs` entry, so a staged
    `.agents/skills/*/tests/*.test.mjs` is neither linted nor formatted at
    commit. 44 such files exist.
  - **Why the gate is `pnpm check` and not lint-staged alone.** lint-staged
    runs only inside a local commit hook, is skipped by `git commit
--no-verify`, never runs in CI (`.github/workflows/ci.yml` installs and runs
    scripts; it does not install hooks), and cannot see a file that was
    formatted incorrectly by a tool other than the hook. The source item's
    second criterion names `pnpm check` explicitly. So lint-staged is the
    convenience layer that keeps the gate quiet, and `pnpm check` is the gate;
    this plan wires both.
  - `AGENTS.md:28-34` — the paragraph asserting that "Only `pnpm lint` and
    `pnpm format` apply their respective lint/format coverage to `tools/smoke`
    and `.agents/skills/**/*.md`". `AGENTS.md:103-104` — "CI runs neither
    `pnpm lint` nor `pnpm format`. Run both whenever a change touches
    `tools/smoke` or `.agents/skills`, since nothing else covers them." Both
    become inaccurate once `check` gains the `oxfmt` glob and must be rewritten,
    not merely appended to.
  - **Both newly-gated surfaces are clean today**, so the wiring cannot turn CI
    red on pre-existing debt:
    - `pnpm exec oxfmt --check '.agents/skills/**/*.{md,mjs,js,cjs}'` → exit 0,
      316 files.
    - `pnpm exec oxfmt --check 'tools/smoke/**/*.{mjs,md,json}'` → exit 0,
      81 files (PR #273's new `tools/smoke/pjm-remote/no-secret-output.test.mjs`
      included).
    - `pnpm exec oxfmt --check '**/*.{mjs,cjs}'` → exit 0, 176 files (so a
      repository-wide lint-staged `.mjs` formatting task has nothing to churn).
    - `node --test scripts/worktree/init.test.mjs` → exit 0.
    - `pnpm exec oxlint tools/smoke .agents/skills` → exit 0, 0 warnings,
      0 errors, 157 files (recorded for the deferred follow-up below; this plan
      does not wire oxlint).
- Corrections to the source items' claims:
  - `BL-260906-cover-skill-test-files-under` says `pnpm check` "does not" cover
    `.agents/skills/**/*.mjs` — verified true. It also says a skill test edit
    "is not auto-formatted at commit" — verified true via `.lintstagedrc.mjs`.
  - `BL-260906-run-scripts-worktree-init-test` says the test "is executed by no
    gate" — verified true. Its acceptance criterion asks for CI coverage
    "verified by a deliberate failure in a scratch branch"; this plan satisfies
    that with a local deliberate failure instead, because the wave workflow does
    not authorize pushing a scratch branch (see the `## Test plan` rationale:
    `.github/workflows/ci.yml:36-37` runs exactly `pnpm test`).
  - The planning brief cited `AGENTS.md:32-34,103-104`. The CI sentence is
    indeed at `:103-104`, but the coverage paragraph the brief clipped to
    `:32-34` actually spans `:28-34` and must be rewritten whole;
    `AGENTS.md:60-72` also gained a sentence about running `pnpm build` before
    the bare suites. Re-anchor before editing.

## Dependencies

| Type                | Dependency                                                                                   | Required state                                                                                                                                                                                    | Current state                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soft ordering       | [Tighten the skill version validators](./2026-09-08-tighten-the-skill-version-validators.md) | Never in the same parallel group as this lane; either order. Its step 3 rewrites `AGENTS.md:11` (the skills-system version-bump sentence); this plan rewrites `:28-34`, `:67-68`, and `:103-104`. | Authored in the same batch, not merged. Whichever lane integrates second re-anchors its `AGENTS.md` paragraphs by text; the paragraphs do not overlap, so no prose reconciliation is expected.                          |
| Soft adjacency      | [Guard bare proto in Markdown records](./2026-09-08-guard-bare-proto-in-markdown-records.md) | No group constraint: it cites `.lintstagedrc.mjs:14` and `AGENTS.md` as evidence and writes neither.                                                                                              | Authored in the same batch. If this lane lands first, that plan re-anchors `.lintstagedrc.mjs:14` in its test header comment.                                                                                           |
| Soft ordering       | Any other wave-7 lane that edits root `package.json`, `.lintstagedrc.mjs`, or `AGENTS.md`    | Never in the same parallel group as this lane.                                                                                                                                                    | None. Of the seventeen `2026-09-08-*.md` plans, only the two rows above name any of the three files, and only this plan writes root `package.json` or `.lintstagedrc.mjs`.                                              |
| Satisfied adjacency | PR #273 (remote project management)                                                          | Its new smoke test must sit inside the `test:smoke` glob and pass `oxfmt --check`.                                                                                                                | Merged 2026-09-08 as `7d70ac307`. `tools/smoke/pjm-remote/no-secret-output.test.mjs` matches `tools/smoke/*/*.test.mjs` and is one of the 81 clean files above; it also bumped `packages/cli/package.json` to `0.2.66`. |
| Soft adjacency      | PR #190 (ReviewPlan Stage A, draft), PR #125                                                 | No coordination required; neither touches `package.json`, `.lintstagedrc.mjs`, `AGENTS.md`, `.github/workflows/`, or `scripts/`.                                                                  | Open. Verified against the paginated file lists.                                                                                                                                                                        |
| Satisfied premise   | The newly-gated surfaces are already clean                                                   | Wiring them in must not turn CI red on pre-existing debt.                                                                                                                                         | Satisfied — all five commands recorded above exit 0 at the planning `HEAD`.                                                                                                                                             |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                              | Affected | Files in common                                                                | Required update                                                                                                                                            |
| ---------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #273 `feat: add provider-neutral remote project management` (merged 2026-09-08) | None     | `tools/smoke/pjm-remote/no-secret-output.test.mjs` (new file).                 | Already reflected: this plan's inspected `HEAD` sits on top of its merge commit; the file is inside `test:smoke`'s glob and formats clean.                 |
| PR #190 `ReviewPlan Stage A compatibility release` (draft) lands                   | None     | None of its 217 files is a root gate file or under `scripts/`.                 | No plan change.                                                                                                                                            |
| PR #125 `oat-brainstorm visual companion` lands                                    | Minor    | `.agents/skills/**` assets newly covered by `pnpm check`.                      | Re-run `pnpm check` on the merged state; repair formatting rather than narrowing the glob.                                                                 |
| Sibling lane `tighten-the-skill-version-validators` integrates first               | Minor    | `AGENTS.md:11` (its edit) versus `:28-34`, `:67-68`, `:103-104` (this plan's). | Re-anchor this plan's three paragraphs by their text before editing; the line numbers here will have moved by the size of its `:11` rewrite.               |
| Any other wave-7 lane edits `AGENTS.md` ahead of this one                          | Material | `AGENTS.md:28-34` and `:103-104`.                                              | Re-anchor both paragraphs against the integrated tree before editing; if either paragraph was already rewritten, STOP and reconcile with the orchestrator. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..origin/main -- package.json .lintstagedrc.mjs AGENTS.md .github/workflows/ci.yml scripts/worktree/init.test.mjs scripts/worktree/init.sh tools/smoke pnpm-workspace.yaml .oxfmtrc.jsonc packages/cli/package.json apps/oat-docs/package.json
```

Expected at the authored baseline: no output. A `packages/cli/package.json`
line whose only hunk is the lockstep `version` field is the wave fan-in's bump
and is not a STOP. If `package.json`'s scripts block
changed, re-read `"check"`, `"format"`, `"format:fix"`, `"test"`, and
`"test:smoke"` before editing. If `AGENTS.md` changed, re-locate both paragraphs
by their text rather than by line number. A material mismatch is a STOP
condition. When this plan runs as a wave lane, re-run the drift check against
the exact execution `HEAD` after predecessor lanes integrate.

## Repository conventions

- Build: `pnpm build` → all packages compile. Run it before invoking
  `pnpm test:smoke`, `pnpm test:skills`, or `pnpm test:release` directly: those
  suites load the CLI's built resolver from `packages/cli/dist`, which
  `turbo run test` supplies through its `build` dependency but a bare suite
  invocation does not (`AGENTS.md:60-72`).
- Typecheck: `pnpm type-check`.
- Test: `pnpm test`; for evidence-grade verification
  `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root.
  `pnpm test --force` does **not** force a re-run — pnpm appends the flag to the
  last command of the chained root script. A green run showing
  `cache hit, replaying logs` or `>>> FULL TURBO` is not evidence.
- The isolated `HOME` is not incidental: a maintainer who has run
  `oat tools install --scope user` has `~/.oat/templates/`, which participates in
  template resolution and makes bundle-tier tests fail locally while passing in
  CI.
- Lint/format check (non-mutating): `pnpm check`; also `pnpm lint` and
  `pnpm format`, which CI does not run today — this plan changes that for the
  format half.
- Capture each gate's exit code explicitly
  (`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`); never derive success from a
  pipeline ending in a pager or filter.
- Implementation pattern: the existing chained-root-script style in
  `package.json` (`"format"`, `"test"`), and the shell-expanded glob style of
  `"test:smoke"` and `"test:skills"`.
- Skill versioning: one `metadata.version` bump per changed skill per PR
  (top-level `version:` is gone since CLI 0.2.65). **This plan changes no skill
  file** — it changes only how skill assets are checked — so no bump applies.
  If a step ever did edit `.agents/skills/*/SKILL.md`, locate every pin by
  searching the OLD VERSION LITERAL across `packages/cli/src`, `tools/smoke`,
  and `.agents/skills/*/tests`.
- `DR-260906-standing-claims-in-skills-name`: a standing claim written into a
  skill must name what makes it true. The equivalent obligation here is that the
  rewritten `AGENTS.md` sentences must name the exact scripts and globs that
  make them true, not assert coverage in the abstract.
- Never run `oxfmt` over an OAT `state.md`; it mangles the frontmatter. No
  `state.md` is in scope here, and this plan must not widen any `oxfmt` glob to
  reach one.
- `.oat/config.json` keys parity: not touched by this plan.
- **Lane mode (the default under the wave-7 execution program):** this plan runs
  as a lane in wave 7, in a worktree at `.worktrees/wave-7/<lane>`, with a root
  review after. In lane mode run the focused checks plus `pnpm check`,
  `pnpm type-check`, the forced `turbo run test`, `pnpm run check:skill-bumps`,
  `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. **Do not** edit
  lockstep release files and **do not** run `pnpm release:check-versions` or
  `pnpm release:validate`: the wave fan-in owns the single lockstep bump and the
  full definition-of-done sequence. Only a standalone execution bumps the five
  public packages itself, above freshly fetched `origin/main`, and runs all
  eight AGENTS.md gates in order.
- Git/PR convention: do not push or open a PR unless the wave orchestrator
  instructs it. In particular, do not create or push a scratch branch to prove
  CI coverage.

## Scope

### In scope

- `package.json` — add one script that holds the root-level `oxfmt --check` glob
  list; call it from `"check"` and from `"format"`; add `"test:scripts"` and
  chain it into `"test"`.
- `.lintstagedrc.mjs` — add an `'*.{mjs,cjs}'` task.
- `AGENTS.md` — rewrite the coverage paragraph at `:28-34` and the CI sentence
  at `:103-104`; name `test:scripts` in the Definition of Done narrative where
  the bare-suite commands are listed (`:67-68`, inside the `:60-72`
  paragraph).
- Lockstep release files
  (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never
  edited by this plan when it runs as a wave lane; the wave fan-in makes exactly
  one lockstep bump for the integrated wave. Only a standalone execution bumps
  them itself.

### Out of scope

- `BL-260907-type-check-cli-test-files` — the test-scoped `tsconfig` gate and the
  614-error pre-existing triage. **Explicitly not part of this plan.** It is a
  medium/M item with its own acceptance criteria, its own triage decision
  (fix versus per-file allowlist), and no shared file with this change beyond
  `package.json`. Do not add a type-check script, do not touch
  `packages/cli/tsconfig*.json`, and do not extend the type-aware `oxlint`
  invocation's `--ignore-pattern '**/*.test.ts'`.
- Wiring `pnpm exec oxlint tools/smoke .agents/skills` (the `pnpm lint` half)
  into `pnpm check`. It passes today (verified, 0 warnings / 0 errors), so it is
  a viable follow-up, but neither source item asks for it and adding a lint
  surface to the gate CI runs first is a separate decision. The rewritten
  `AGENTS.md` text must therefore keep telling maintainers to run `pnpm lint`.
- `.github/workflows/ci.yml` — deliberately unchanged. Both wirings hang off
  `pnpm check` and `pnpm test`, which CI already runs; adding a CI step would
  make the local and CI gate lists diverge, which `AGENTS.md:49-54` exists to
  prevent.
- `turbo.json` — the new root-level commands are chained after `turbo run …` in
  the root scripts, matching the existing pattern; no new Turborepo task.
- `scripts/worktree/init.sh`, `scripts/worktree/validate.sh`, and the content of
  `scripts/worktree/init.test.mjs` — the test is run as-is. The only edit this
  plan makes to it is the temporary `assert.fail` control injection in steps 1
  and 5, reverted with `git checkout` each time; it must not appear in the
  final diff.
- `tools/smoke/**` — `test:smoke`'s globs are unchanged; the worktree test is
  wired through a separate `test:scripts` entry rather than by moving the file
  or widening the smoke glob, so smoke's contract stays what
  `tools/smoke/CONTRACT.md` says it is.
- Any new dependency. `oxfmt`, `oxlint`, and `node --test` are all already
  present.

## Current state

Two independent gaps, one shared cause: the root `package.json` splits its
verification surface across four scripts, and CI runs only two of them.

**Formatting.** `turbo run check` reaches every workspace package, and each
package's own `check` already includes an `oxfmt --check` (`packages/cli` over
`.`, `apps/oat-docs` over `docs/**/*.md`). What no workspace package covers is
the two root-level trees outside any package — `.agents/skills` and
`tools/smoke` — and the only command that checks those is the trailing
`oxfmt --check` on `package.json:20`'s `"format"`, which CI does not run. (That
root glob also lists `apps/oat-docs/docs/**/*.md`; the docs app already checks
it, so that third is redundant rather than missing.) The practical failure mode is the one both wave-2 lanes hit: edit a
skill test `.mjs`, watch `pnpm check` pass, and discover at review that
`pnpm format` fails — with no commit hook to have fixed it, because
`.lintstagedrc.mjs` has no `.mjs` task at all.

**The worktree test.** `scripts/worktree/init.test.mjs` is a real `node:test`
file that pins the journal contract for the direct-registration path
`scripts/worktree/init.sh` uses. It passes today. It is executed by no gate:
`turbo run test` only sees workspace packages and `scripts/` is not one;
`test:smoke` globs `tools/smoke/*/*.test.mjs` and `tools/smoke/*/*/*.test.mjs`;
`test:skills` globs `.agents/skills/*/tests/*.test.mjs`; `test:release` names
four files explicitly. A journal contract change therefore gets no automatic
evidence.

Because `packages/cli`'s `check` already contains its `format`, adding the root
glob list to `check` makes `pnpm check` a strict superset of `pnpm format` —
which is what lets the `AGENTS.md` rewrite say something true and narrow rather
than adding another hedge.

## Implementation steps

### 1. Establish both red controls before changing anything

Prove the gaps exist on the unmodified tree, so the wiring has a documented
before-state. Work only inside the repository checkout for the deliberate
breakages, and revert each one immediately.

1. Copy any `.agents/skills/*/tests/*.test.mjs` to a scratch name inside the
   same directory and mis-format it (for example collapse an indented block to
   one line, or add trailing whitespace `oxfmt` would strip). Run
   `pnpm check > gate.log 2>&1; echo "exit=$?"`.
2. With that file still mis-formatted, run
   `pnpm exec oxfmt --check '.agents/skills/**/*.{md,mjs,js,cjs}'` and record
   its exit code. Delete the scratch copy.
3. Inject a deliberate failure into the real `scripts/worktree/init.test.mjs`:
   insert `assert.fail('deliberate control failure');` as the first statement
   of the `test(...)` callback at `:148` (`assert` is already imported from
   `node:assert/strict` at `:1`). Confirm the
   injection is real with
   `node --test scripts/worktree/init.test.mjs > direct.log 2>&1; echo "exit=$?"`
   → `exit=1`, `# fail 1`. Then run
   `pnpm test > gate.log 2>&1; echo "exit=$?"`. Do **not** use a scratch file
   under `scripts/` for this control: the wiring in step 4 names the real file
   explicitly, so a scratch neighbour would prove nothing.

**Verify:** step 1's `pnpm check` prints `exit=0` **despite** the mis-formatted
file; step 2's direct `oxfmt --check` prints a non-zero exit naming that file
(so the violation is real, not imagined); step 3's direct `node --test` prints
`exit=1` and its `pnpm test` prints `exit=0` **despite** the failing test under
`scripts/`. Record all four. Then revert the injection
(`git checkout -- scripts/worktree/init.test.mjs`) and confirm
`git status --porcelain` is empty.

### 2. Centralize the root-level format globs and add them to `check`

In `package.json`, add one script holding the existing glob list and call it from
both `"check"` and `"format"`, so the list has a single definition. The name
`format:root` follows the repository's existing convention that `format` means
the non-mutating check and `format:fix` the write:

```json
    "format:root": "pnpm exec oxfmt --check '.agents/skills/**/*.{md,mjs,js,cjs}' 'apps/oat-docs/docs/**/*.md' 'tools/smoke/**/*.{mjs,md,json}'",
    "check": "turbo run check && pnpm oat:validate-skills && pnpm format:root",
    "format": "turbo run format && pnpm format:root",
```

Keep `"format:fix"` as it is; it is the mutating counterpart and keeps its own
`--write` glob list. Keep the glob list byte-identical to
`package.json:20`'s current one — widening it (to `.oat/**`, for instance) is
out of scope and risks reaching an OAT `state.md`; narrowing it (dropping the
docs third because the docs app already checks it) is a separate cleanup and
would make the `"format"` refactor non-identical.

**Verify:** `pnpm check > gate.log 2>&1; echo "exit=$?"` → `exit=0` on the clean
tree, and `gate.log` contains an `oxfmt` summary line reporting the combined
root-glob file count (`.agents/skills` 316 + docs 71 + `tools/smoke` 81 = 468
at the planning `HEAD`). Also
`pnpm format > format.log 2>&1; echo "exit=$?"` → `exit=0`, proving the
refactor left `format` behaviorally identical.

### 3. Add the `.mjs`/`.cjs` lint-staged task

In `.lintstagedrc.mjs`, add a fourth entry beside the existing three:

```js
  // .mjs/.cjs sources (skill tests, smoke helpers, release tools) are not
  // matched by the *.{ts,tsx,js,jsx} task above, so they had no commit-time
  // formatting at all.
  '*.{mjs,cjs}': ['oxfmt --write --no-error-on-unmatched-pattern'],
```

Format only — do not add `oxlint --fix` to this task. `oxlint` currently covers
`tools/smoke` and `.agents/skills` through `pnpm lint` and nothing else; making
the commit hook lint every `.mjs` in the repository (including `tools/release/`
and `scripts/`, which no gate lints) would introduce a new failure surface at
commit time that this plan has not audited. Record that reasoning in the comment
or in the PR body.

**Verify:** `pnpm exec oxfmt --check '**/*.{mjs,cjs}'` → exit 0 across 174 files
(so the new task has nothing to rewrite on a clean tree), and staging a
deliberately mis-formatted `.mjs` then running the repository's commit hook
rewrites it in place.

### 4. Add `test:scripts` and chain it into `test`

In `package.json`:

```json
    "test": "turbo run test && pnpm test:smoke && pnpm test:scripts && pnpm test:skills && pnpm test:release",
    "test:scripts": "node --test scripts/worktree/init.test.mjs",
```

Place `test:scripts` after `test:smoke`: `scripts/worktree/init.test.mjs`
imports `tools/smoke/runner/provision.mjs` and `cleanup.mjs`, so running it
after the smoke suite keeps the shared runner's failures attributable to smoke
rather than to `scripts/`. **Name the file explicitly; do not use a
`scripts/*/*.test.mjs` glob.** On Node `22.17.0` an unmatched glob makes
`node --test` run zero tests and exit 0, so a glob would let a deleted or
renamed test pass vacuously, whereas an explicit missing path exits 1 with
`Could not find …` (both verified live, recorded in `## Source and live
evidence`). This matches `test:release`'s explicit-file style. A future
`scripts/<area>/*.test.mjs` is added to the list by hand, which is the price of
a gate that cannot pass on nothing.

**Verify:** `pnpm test:scripts > scripts.log 2>&1; echo "exit=$?"` → `exit=0`
and `scripts.log` reports `# tests 1` / `# pass 1` / `# fail 0` for
`isolates nested smoke bootstrap from normal worktree initialization`. Then
`git status --porcelain` → empty (the test provisions and cleans up its own
host repository under `tmpdir()`; a dirty tree afterwards is a STOP
condition). Finally, prove the explicit path cannot pass on nothing:
temporarily rename the test file, run `pnpm test:scripts`, confirm a non-zero
exit with `Could not find`, and rename it back.

### 5. Prove each wiring with a direct failing control (green-then-red, one per gate)

Repeat step 1's two breakages against the wired tree, one at a time:

1. Mis-format a scratch `.agents/skills/*/tests/*.test.mjs` copy; run
   `pnpm check > gate.log 2>&1; echo "exit=$?"`.
2. Delete the scratch copy, then re-inject the same `assert.fail(...)` line
   into `scripts/worktree/init.test.mjs:148` as in step 1.3; run
   `pnpm test:scripts > scripts.log 2>&1; echo "exit=$?"` and then
   `pnpm test > gate.log 2>&1; echo "exit=$?"`.

**Verify:** breakage 1 makes `pnpm check` print a **non-zero** exit and name the
mis-formatted file in `gate.log`; breakage 2 makes `pnpm test:scripts` and
`pnpm test` each print a **non-zero** exit and name
`isolates nested smoke bootstrap from normal worktree initialization` with
`deliberate control failure` in the log. Delete the scratch copy and revert the
injection (`git checkout -- scripts/worktree/init.test.mjs`), confirm
`git status --porcelain` is empty, and confirm both gates return to `exit=0`.
Record the exact commands, exit codes, and the naming lines — the before/after
pair from steps 1 and 5 is this change's whole evidence.

### 6. Update `AGENTS.md` to describe the new coverage exactly

Rewrite, do not append:

- The paragraph at `:28-34`. It must now say that `pnpm check` runs each
  package's own lint/format checks through `turbo run check`, validates
  canonical OAT skill structure through `oat:validate-skills`, runs markdownlint
  over the docs app, **and** applies `oxfmt` to `.agents/skills/**`,
  `apps/oat-docs/docs/**`, and `tools/smoke/**` through `format:root` —
  so `pnpm check` now contains everything `pnpm format` checks. It must also say
  what is still uncovered: the root-level `oxlint tools/smoke .agents/skills`
  that only `pnpm lint` runs.
- The sentence at `:103-104` ("CI runs neither `pnpm lint` nor `pnpm format`…").
  It must become: CI does not run `pnpm lint`; `pnpm format` is now subsumed by
  `pnpm check`; run `pnpm lint` whenever a change touches `tools/smoke` or
  `.agents/skills`, because `oxlint` over those paths still has no CI gate.
- The Definition-of-Done narrative at `:67-68`, which lists the suites to run
  separately when they matter — add `pnpm test:scripts` beside
  `pnpm test:smoke`, `pnpm test:skills`, and `pnpm test:release`, and note that
  it runs `scripts/worktree/init.test.mjs`.

Do not renumber or extend the eight-item Definition-of-Done gate list at
`:40-47`: it mirrors CI's steps exactly, and CI's steps do not change. Do not
touch the `<skills_system>` block at `:7-14`: its version-bump sentence at
`:11` belongs to the sibling `tighten-the-skill-version-validators` lane.

**Verify:** `grep -n 'format:root\|test:scripts' AGENTS.md` → both
appear; `grep -n 'CI runs neither' AGENTS.md` → no match (the stale sentence is
gone, not merely qualified); and the eight-item list at `:40-47` is unchanged in
`git diff`.

### 7. Run the lane gates

**Verify (lane mode):** from the repository root, each with its exit code
captured separately — `pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force`, `pnpm test:smoke`,
`pnpm test:scripts`, `pnpm test:skills`, `pnpm test:release`,
`pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` → every command exits 0. Run `pnpm build` before the
bare suite invocations. Do not edit lockstep release files and do not run
`pnpm release:check-versions` or `pnpm release:validate`. **Standalone mode
only:** additionally bump the five public packages above freshly fetched
`origin/main` and run the eight AGENTS.md gates in order.

## Test plan

This change adds no test file; its subject _is_ the test wiring, so its evidence
is a matched pair of gate observations per wiring rather than a new assertion.

- **Wiring 1 — skill-asset formatting in `pnpm check`.**
  - Red-then-green negative control: step 1.1 shows `pnpm check` exiting 0 with
    a mis-formatted `.agents/skills/*/tests/*.test.mjs` present on the
    **unmodified** tree (the pre-fix bad state is accepted); step 1.2 shows a
    direct `oxfmt --check` rejecting that same file, so the violation is real;
    step 5.1 shows `pnpm check` exiting non-zero and naming it on the wired
    tree (the post-fix implementation rejects the same state); and the clean
    tree still passes (`exit=0` in step 2), which is the valid accepted control.
  - Preserve the exact mis-formatting used and its expected categorical outcome
    in the PR body so independent review can repeat it.
- **Wiring 2 — `scripts/worktree/init.test.mjs` in `pnpm test`.**
  - Red-then-green negative control: step 1.3 shows `pnpm test` exiting 0 with
    a deliberate `assert.fail` injected into `scripts/worktree/init.test.mjs`
    (and a direct `node --test` of the same file exiting 1, so the failure is
    real); step 5.2 shows `pnpm test:scripts` and `pnpm test` exiting non-zero
    and naming it on the wired tree; `pnpm test:scripts` on the clean tree
    reports `# tests 1` / `# pass 1` / `# fail 0`; and the rename control in
    step 4 shows the explicit path failing with `Could not find` rather than
    passing on zero tests.
  - The source item asks for CI coverage "verified by a deliberate failure in a
    scratch branch". The local control above is the same evidence without
    pushing: `.github/workflows/ci.yml:36-37` runs exactly `pnpm test`, so a
    failure of `pnpm test` locally is a failure of CI's Test step by
    construction. Record that reasoning; do not push a scratch branch.
- **Wiring 3 — lint-staged `.mjs`.** Stage a mis-formatted `.mjs`, run the
  repository's commit hook, and confirm the file is rewritten in place and the
  rewrite is what `oxfmt --check` accepts.
- **Existing suites that must stay green, unmodified:**
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`, `pnpm test:smoke`,
  `pnpm test:skills`, `pnpm test:release`, `pnpm lint`, `pnpm format`,
  `pnpm oat:validate-skills`, `pnpm type-check`, `pnpm build`.

## Done criteria

- [ ] `pnpm check` fails on a mis-formatted `.agents/skills/**` file, with the
      failure naming the file — the same coverage `pnpm format` has today
      (`BL-260906-cover-skill-test-files-under`, criterion 2).
- [ ] `.lintstagedrc.mjs` formats `.agents/skills/**/*.mjs` at commit
      (`BL-260906-cover-skill-test-files-under`, criterion 1), verified by
      staging a mis-formatted file and running the hook.
- [ ] `scripts/worktree/init.test.mjs` runs under `pnpm test` via a new
      `test:scripts` script (`BL-260906-run-scripts-worktree-init-test`,
      criterion 1).
- [ ] CI's Test step covers it, established by the local deliberate failure in
      step 5.2 plus `.github/workflows/ci.yml:36-37` running exactly `pnpm test`
      (`BL-260906-run-scripts-worktree-init-test`, criterion 2 — satisfied
      without pushing a scratch branch, with the substitution recorded).
- [ ] `AGENTS.md`'s Definition of Done names `pnpm test:scripts`, and both stale
      coverage paragraphs are rewritten rather than appended to
      (`BL-260906-cover-skill-test-files-under` criterion 3 and
      `BL-260906-run-scripts-worktree-init-test` criterion 3); `grep -n 'CI runs
neither' AGENTS.md` returns no match.
- [ ] The eight-item Definition-of-Done gate list still mirrors CI's steps
      exactly and is unchanged in `git diff`; `.github/workflows/ci.yml` is
      unchanged.
- [ ] Every step-1 and step-5 control is recorded with its exact command and
      exit code, showing accepted-before and rejected-after for each wiring.
- [ ] `git diff --stat` touches exactly `package.json`, `.lintstagedrc.mjs`, and
      `AGENTS.md`; no dependency is added, `pnpm-lock.yaml` is unchanged, and
      `scripts/worktree/init.test.mjs` carries no trace of the control
      injection.
- [ ] `"test:scripts"` names `scripts/worktree/init.test.mjs` explicitly (no
      glob), and the rename control in step 4 is recorded.
- [ ] Lane mode: `pnpm check`, `pnpm type-check`,
      `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
      `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each exit 0 with the exit code captured
      explicitly, and no lockstep release file is edited. Standalone mode: one
      lockstep bump and all eight AGENTS.md gates pass in order.
- [ ] `git status --short` contains no unexplained or out-of-scope files; every
      scratch control file was deleted and every control injection reverted.

## STOP conditions

Stop and report instead of improvising when:

- step 1's controls do not reproduce — if `pnpm check` already fails on a
  mis-formatted skill asset, or `pnpm test` already fails on a failing
  `scripts/` test, the gap has been closed by someone else and this plan's
  premise is false;
- adding `format:root` to `pnpm check` makes the clean tree fail —
  something in `.agents/skills`, `apps/oat-docs/docs`, or `tools/smoke` is
  mis-formatted at the execution `HEAD`. Repair the formatting; **never** narrow
  the glob to make the gate pass;
- `pnpm test:scripts` fails on the clean tree, or leaves `git status
--porcelain` non-empty after a run (the test provisions worktrees; a leak is a
  separate defect and must not be papered over by excluding the file);
- the work appears to require editing `.github/workflows/ci.yml`, `turbo.json`,
  `packages/cli/tsconfig*.json`, the type-aware `oxlint` `--ignore-pattern`, or
  anything under `scripts/worktree/*.sh` — all are out of scope, and the
  `tsconfig` surface belongs to `BL-260907-type-check-cli-test-files`;
- a wave-7 sibling lane has already rewritten the `AGENTS.md` paragraphs this
  plan rewrites — reconcile with the orchestrator rather than merging both
  versions by hand;
- **the weaker-anywhere rule fires.** This change only adds coverage, so any
  input, file, or run that the pre-change gates rejected and the post-change
  gates accept is a Critical finding. Watch specifically for: a `"format"`
  refactor that silently drops a glob; a `"test"` chain edit that reorders or
  removes `test:smoke`, `test:skills`, or `test:release`; a `test:scripts`
  entry written as a glob (`node --test` exits 0 on an unmatched glob, verified
  on Node `22.17.0`, so only an explicit file path can fail on a missing test);
- a named verification gate fails twice after one bounded correction;
- the work would expose, copy, or rotate a credential without explicit
  authority.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 or PR #125 lands, or the sibling `tighten-the-skill-version-validators`
  lane integrates (apply the `## Landing-event impact` table);
- a dependency named in `## Dependencies` changes state;
- the cited anchors move — `package.json:12`, `:20`, `:33-34`;
  `.lintstagedrc.mjs:1-15`; `AGENTS.md:11`, `:28-34`, `:40-47`, `:60-72`,
  `:103-104`; `.github/workflows/ci.yml:30-52`;
  `scripts/worktree/init.test.mjs:59` and `:148`; `apps/oat-docs/package.json:11`;
  `packages/cli/package.json:32-34`;
- `.nvmrc` moves off Node `22.17.0` — re-verify the unmatched-glob and
  missing-path exit codes of `node --test` before trusting the explicit-path
  rationale;
- either newly-gated surface stops being clean (re-run the five commands in
  `## Source and live evidence`), or `node --test scripts/worktree/init.test.mjs`
  no longer passes;
- `BL-260907-type-check-cli-test-files` lands first and has already restructured
  `package.json`'s script block.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`.

**Correction applied 2026-09-09 (wave-7 p18 execution; wave-close pass; no requirement change):** Step 6's sentence for the `:28-34` paragraph — "so `pnpm check` now contains everything `pnpm format` checks" — is false and was not written: `packages/control-plane` defines a `format` script but no `check` script, so `turbo run check` never formats it while `turbo run format` does (the plan sampled two packages when it derived the claim). The landed `AGENTS.md` text states the true coverage instead: `pnpm check` covers `format:root`'s three globs, while `pnpm lint`'s root `oxlint` pass and `packages/control-plane`'s `format` still run in no CI gate; the `:103-104` sentence was rewritten to the same effect, and the two Essential Commands bullets (`:21`, `:23`) were updated in-file. The root review adjudicated the refusal a justified deviation; the control-plane gap is filed as `BL-260909-give-packages-control-plane`. `format:fix` was refactored onto a shared `format:root:fix` (behavior-preserving; adjudicated licensed). Sibling plans authored before this lane (p19, p20) still describe the pre-p18 gate premise — read their gate lists against the landed `AGENTS.md`. Executed at `1ce96aa7e` + `bb277915e`, merged in group 6 as `f789c9261`.

## Review focus

- That the `"format"` refactor is behavior-preserving: the glob list moved into
  `format:root` must be byte-identical to the one it replaced, and
  `pnpm format` must still exercise `turbo run format` plus that list.
- That `"test"`'s chain still contains `test:smoke`, `test:skills`, and
  `test:release` in an order where each suite's failure remains attributable,
  and that `test:scripts` names its file explicitly so it cannot pass vacuously.
- That the control injection into `scripts/worktree/init.test.mjs` was fully
  reverted: the file must be absent from `git diff --stat`.
- That the controls in steps 1 and 5 were genuinely executed as a matched pair —
  accepted before, rejected after — and not asserted. A gate wired without a
  demonstrated failure is precisely the class of defect this repository has
  shipped twice.
- That `AGENTS.md`'s new text is exactly true: `pnpm check` now subsumes
  `pnpm format`, and `pnpm lint`'s root-level `oxlint` is still ungated. An
  overclaim here is worse than the gap it replaces, because maintainers will
  stop running `pnpm lint`.
- That `.github/workflows/ci.yml` and the eight-item Definition-of-Done list are
  untouched, so local and CI gate lists stay in lockstep.
- Deferred on purpose: wiring `oxlint tools/smoke .agents/skills` into
  `pnpm check` (passes today; nobody asked), adding `oxlint --fix` to the
  lint-staged `.mjs` task, and the whole of
  `BL-260907-type-check-cli-test-files`.

## Execution record (2026-09-09, wave 7)

Executed as wave-7 p18 (PR #286 `wave-7-execution`, CLI 0.2.67; lane commit(s) `4cc2b0304` (was `1ce96aa7e`), `aa2f17ebc` (was `bb277915e`)): skill-asset formatting and the worktree-init test run inside the gates CI executes: `pnpm check` runs `format:root` over `.agents/skills/**`, `apps/oat-docs/docs`, and `tools/smoke`; `pnpm test` runs `test:scripts` last; lint-staged formats `*.{mjs,cjs}`; `format:fix` shares one root glob through `format:root:fix`; `AGENTS.md` states the true coverage (naming `packages/control-plane`, whose `format` still runs in no CI gate). Verification: forced check/type-check/cli test `Cached: 0`; chained `pnpm test` across all four suites; lint; format; check:skill-bumps; validate-skills; four matched controls (unwired green / wired red, incl. the pre-commit hook in a scratch clone); two Codex rounds (R1 1I fixed, 1I rejected as a patch finding; R2 1I closed by running the clean integrated `pnpm test`, 1m fixed); root review PASS with findings (0/1I/1M/5m; the refused plan sentence adjudicated a justified deviation) → fix round → round 2 PASS (0/0/0/2m). Deviations: the plan's Step 6 sentence ("`pnpm check` now contains everything `pnpm format` checks") is false and was not written (`packages/control-plane` defines `format` but no `check`); the `:21`/`:23` Essential Commands bullets updated in-file; `format:fix` refactored onto a shared `format:root:fix` (adjudicated licensed). The wave's final review (Phase 21) then added `.oat/repo/**` and the docs tree to `turbo.json`'s `globalDependencies` (a cached `pnpm test` had replayed green on a red tree) and recorded in `AGENTS.md` how control-plane's `lint` is gated only by accident through the smoke enrollment test.
