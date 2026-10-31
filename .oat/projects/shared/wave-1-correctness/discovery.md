---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-10-31
oat_generated: false
---

# Discovery: wave-1-correctness

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Operator kickoff (autonomous run, 2026-10-31): deliver Wave 1 of the
backlog-and-roadmap review (`.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md`
section 5) as one quick-mode OAT project with one final PR, run through
`oat-project-autonomous` with a High dispatch ceiling, no project recap, and
no merge. Scope is exactly these seven backlog items; each item's acceptance
criteria are the requirement:

1. BL-261002-clean-up-stale-provider-views — Clean up stale provider views and
   Codex entries when a canonical agent is deleted or renamed
   (`.oat/repo/pjm/backlog/items/BL-261002-clean-up-stale-provider-views.md`)
2. BL-261002-stop-oat-sync-from-changing — Stop oat sync from changing user
   values in .codex/config.toml
   (`.oat/repo/pjm/backlog/items/BL-261002-stop-oat-sync-from-changing.md`)
3. BL-261002-honor-the-requested-scope — Honor the requested scope for every
   pack in tools install and init --setup
   (`.oat/repo/pjm/backlog/items/BL-261002-honor-the-requested-scope.md`)
4. BL-261002-correct-misleading-init-status — Correct misleading init, status,
   and doctor messages and stop scripts from defaulting to user-scope sync
   (`.oat/repo/pjm/backlog/items/BL-261002-correct-misleading-init-status.md`)
5. BL-261002-align-implement-complete — Align implement, complete, and
   pr-final skill contracts with their actual behavior
   (`.oat/repo/pjm/backlog/items/BL-261002-align-implement-complete.md`)
6. BL-261012-commit-paths-should-accept — commit-paths should accept tracked
   files under ignored directories
   (`.oat/repo/pjm/backlog/items/BL-261012-commit-paths-should-accept.md`);
   re-verify the mechanism first and drop the item if it does not reproduce
7. BL-261011-clean-up-the-isolated-home — Clean up the isolated HOME
   directories that evidence-grade test runs leave under TMPDIR
   (`.oat/repo/pjm/backlog/items/BL-261011-clean-up-the-isolated-home.md`)

Close each delivered item with `oat backlog archive <id> --summary` in the
same PR and update affected docs under `apps/oat-docs/docs`.

## Clarifying Questions

No live questions: the run is autonomous and the operator supplied the scope,
workflow, dispatch ceiling, recap choice, and PR topology in the kickoff. The
item files supply acceptance criteria. Choices the criteria leave open are
recorded under Key Decisions with their evidence (gate `QS-05` below).

## Solution Space

Each item is a bounded correctness fix with an obvious owning component; the
only real alternatives are within items and are recorded under Options
Considered. Chosen direction: fix each defect at its owning component, add a
regression test that fails when the fix is removed, and correct the docs that
describe the old behavior.

## Evidence Gathered (verified in this branch, `origin/main` 1056ccb)

- **Item 1.** `assertNoUnmanagedCursorAgentCollisions` (Cursor sync extension)
  scans `.cursor/agents`, `.claude/agents` and `.codex/agents`. For any
  symbolic link it calls `validateRealPathWithinScope`, which fails on a
  dangling link (missing target), and the catch reports every failure as
  "target escapes the sync scope". The throw happens during planning, before
  the main sync plan (which already removes manifest-tracked agent views whose
  canonical file is gone) can apply; `oat status` runs the same planner.
  Codex base role exports from canonical agents carry `# oat-managed` and
  `# oat-role` but no `# oat-owner`, and stale cleanup removes only roles whose
  owner equals the scope's cleanup owner (`project-config` or `user-config`)
  plus a legacy name-prefix rule, so deleted agents' roles and tables stay.
  Partial sync (pack removal through `removedCanonicalPaths`) skips Codex stale
  cleanup entirely. Codex owner headers are read only by stale cleanup. An
  unknown owner value makes the header parser reject the file as unmanaged.
- **Item 2.** `mergeCodexConfig` sets `[features] multi_agent = true` whenever
  it is not `true` and sets `[agents] max_depth` to
  `max(2, existing, inherited)`. The config operation reports only
  `codex:config:update` with a generic reason. Default managed dispatch needs
  depth ≥ 1 (root → phase implementer); depth 2 only enables optional nested
  phase work; `oat doctor` already warns when managed roles exist and
  `multi_agent` is not `true`.
- **Item 3.** `tools install <pack>` filters requested scopes by the pack's
  `allowedScopes` and then reports success for an empty target list (core is
  user-only). The aggregate install always includes core at user scope. Guided
  setup (`init --setup`) uses `scopeSelection: defaults`, which ignores an
  explicit `--scope`. An explicit `--scope user` unions with an existing
  project placement and reconciles both scopes, so project writes
  (`localPaths`, `.gitignore` block) happen. `detectDefaultBranch` runs
  `gh repo view` first; its only caller is guided setup.
- **Item 4.** Reproduced: `oat tools list | head -1` and
  `oat status --scope project | head -1` crash with an unhandled `EPIPE`
  stack trace from the logger's direct `process.stdout.write`. `--no-hook`
  help says "Skip" while the code uninstalls an installed hook. Status and
  doctor `packs:inventory` recovery text hardcodes `pnpm build`.
  `scripts/worktree/init.sh` runs a bare `cli -- sync` (scope `all`). The
  project-guidance block writer hardcodes `oat sync --scope all`. Local-scope
  `project new` keeps the initial `skipped_disabled` commit status, which
  prints "(--no-commit)".
- **Item 5.** `oat-project-implement` argument hint lists `--retry-limit`; no
  step reads it (fix attempts come from `oat_orchestration_retry_limit`).
  `oat-project-complete` Step 11 runs `gh pr create --base main`.
  `oat-project-pr-final` "Without arguments" says it will ask for title and
  base branch; Step 5 resolves both and pushes and creates the PR.
- **Item 6.** Reproduced with the branch-built CLI on Git 2.56.0 in a scratch
  repository: a tracked file under a directory matched by an ignore rule
  (`assets/*` ignoring `assets/templates/t.md`) fails `commit-paths` with exit
  2 and Git's "The following paths are ignored" message, because the helper
  stages with `git add -A -- <paths>` into an isolated index. An untracked
  file there fails the same way (that refusal must stay). The item stays in
  scope.
- **Item 7.** The root AGENTS.md evidence recipe is a bare
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`; nothing removes the
  directory. A second recipe in AGENTS.md (skill-prose contract tests) uses
  the same pattern.

## Options Considered

### Item 1 — how sync recognizes canonical-derived Codex roles

- **Option A: stamp canonical exports with the scope's existing owner value**
  (`project-config` at project scope, `user-config` at user scope). Stale
  cleanup already removes owned roles that are no longer desired, and older
  CLIs parse the header because the value is known to them.
- **Option B: introduce a new owner value** such as `canonical`. Older CLIs
  reject an unknown owner and treat the file as unmanaged, which breaks teams
  on mixed CLI versions.
- **Option C: persist extension-managed role names in the sync manifest.**
  Larger change to the manifest schema and its consumers.

**Chosen:** A. Smallest change; compatible with older readers. Roles that an
older CLI left behind with no owner header stay as today (they cannot be
proved canonical-derived); the docs say so.

### Item 1 — dangling agent links during the Cursor collision scan

- **Option A: skip a link whose target does not exist** (it cannot define a
  role), keep the "escapes the sync scope" refusal for an existing target
  outside the scope.
- **Option B: skip every non-colliding link** (as the Claude helper does).
  Wider behavior change than needed.

**Chosen:** A.

### Item 2 — user values for `multi_agent` and `max_depth`

- **Option A: never override an explicit value; add absent keys; report
  added keys and conflicts.**
- **Option B: decision record that OAT owns the keys, and print changes.**

**Chosen:** A. It is the behavior the adoption docs promised and keeps users
in control. Sync keeps writing role files and tables when `multi_agent` is
false and prints a conflict line naming the key, the kept value, and what OAT
needs; it does not refuse the role step (the item makes refusal optional, and
`oat doctor` already reports the condition). An explicit `max_depth` below 1
is reported as a conflict (default dispatch needs depth 1); an explicit
`max_depth = 1` is kept and noted as disabling only optional nested work.

### Item 3 — core under `--scope project`

- **Option A: `tools install core --scope project` exits 1 with a message
  that core is user-scope only; the aggregate install under explicit
  `--scope project` skips core and says so.**
- **Option B: support core at project scope.** Changes pack semantics.

**Chosen:** A.

### Item 3 — `gh` during `init --setup`

- **Option A: drop the `gh repo view` probe from default-branch detection**
  (keep `origin/HEAD`, then `main`); `init` calls nothing that runs `gh`.
- **Option B: add an opt-in flag for remote detection.** New surface for a
  marginal gain.

**Chosen:** A. Satisfies "does not call gh unless the user opted in" with no
new flag (there is no opt-in, so `gh` is never called).

### Item 7 — who owns the temporary HOME

- **Option A: a repository wrapper script that creates the directory, runs a
  given command with `HOME` set, and removes the directory on every exit
  path; a root `test:evidence` script runs the forced turbo test through it.**
- **Option B: have the test harness own HOME.** Touches every package's test
  setup.

**Chosen:** A. AGENTS.md points both isolated-HOME recipes at the wrapper.

## Key Decisions

1. **Workflow and depth (gate `QS-04`, autonomous):** straight to plan, no
   lightweight design. Evidence: every item has a confirmed root cause and an
   owning component; the open choices are local behavior choices inside
   existing components, recorded above, not architecture or component
   boundaries. The single bundled quick review (plan artifact review plus the
   configured cross-family plan gate) checks these decisions with the plan.
2. **Requirements (gate `QS-05`, autonomous):** the acceptance criteria in the
   seven item files, interpreted by the Options Considered choices above.
3. **Item 6 stays in scope:** the failure reproduces with the branch CLI.
4. **Version policy:** one lockstep bump of the five public packages
   (0.3.38 → 0.3.39) and one `metadata.version` bump per changed skill.
5. **Close-out:** each delivered item is archived with
   `oat backlog archive <id> --summary` in this PR, committed with its exact
   `affectedPaths`.
6. **Negative controls:** items 3 (writes outside the requested scope) and 6
   (exact-path commit refusal of untracked ignored paths) bear on safety
   contracts; their tests are proven able to fail by neutralizing the guard,
   and the pre-fix bad state, post-fix rejection, and a valid accepted control
   are recorded in `implementation.md`. Item 1's cleanup tests and item 2's
   regression test are likewise proven to fail when the fix is removed, as
   their acceptance criteria require.

## Constraints

- Follow root AGENTS.md: Definition of Done gates in CI order, isolated HOME
  for evidence-grade runs, exact-path commits through
  `oat internal commit-paths`, docs updated in the same PR.
- CLI conventions from `packages/cli/AGENTS.md`: alias imports, logger-only
  output, exit codes 0/1/2, `--dry-run` writes nothing.
- No scope expansion beyond the seven items' acceptance criteria (AGENTS.md
  Feature Planning Triage).
- Do not merge or watch the PR.

## Success Criteria

- Every acceptance criterion in the seven item files is met, with a
  regression test where the criterion asks for one.
- The docs passages each item names describe the shipped behavior.
- All nine Definition of Done gates pass locally with recorded exit codes.
- Each delivered item is archived in this PR.

## Out of Scope

- Removing null-owner Codex roles left behind by CLI versions before this fix.
- A new opt-in flag for remote default-branch detection.
- Moving every test package's HOME handling into its harness.
- Other "Known surprises" entries in `what-oat-writes.md` not owned by these
  items (for example `tools remove --all`, stale `tools.requiredBy`).

## Deferred Ideas

- Persisting extension-managed Codex roles in the sync manifest (Option C
  above) — only needed if owner-stamped cleanup proves insufficient.

## Open Questions

None blocking; implementation-level details are left to the plan tasks.

## Assumptions

- Older CLIs accept `# oat-owner: project-config` and `# oat-owner: user-config`
  on canonical exports (verified in the header parser on this branch's base).
- A mixed-version team may see one-line churn on Codex role headers until all
  members upgrade; acceptable.

## Risks

- **Codex header churn:** every canonical-derived `.codex/agents/*.toml` gains
  one header line on the first sync after upgrade.
  - **Likelihood:** High
  - **Impact:** Low
  - **Mitigation Ideas:** note it in the docs; this repository's own generated
    files are refreshed by sync in the same PR.
- **Install-scope regressions:** changing how explicit `--scope` is applied
  could alter default (no-flag) installs.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** keep the no-flag paths unchanged; snapshot HOME and
    the repository in tests for each command.

## Next Steps

Quick mode → straight to plan (gate `QS-04` above).
