# Product defects and gaps found during the docs overhaul

Compiled by Fable on 2026-10-02 from the independent verification lanes run for
this project. These are behaviors of the CLI or the skill contracts, not
documentation problems; the docs now describe each one truthfully. Evidence
lives in `references/fable-lanes/verification/`, `references/fact-sheet-writes-and-removal.md`
and the reports named per item. "Reproduced" means a lane ran the branch CLI in a
scratch repository with an isolated HOME; "read" means confirmed in source only;
"unverified" means suspected from contract text.

Grouped so each group can be one backlog item.

## A. Data loss or state corruption

A1. Re-running `oat pjm init` or `oat pjm migrate --apply` deletes `pjm.remote`
settings from `.oat/config.json` with no warning (init rebuilds the whole `pjm`
block). Reproduced. `packages/cli/src/commands/pjm/init.ts:223-231`,
`migrate.ts:547-548`. Report: `E-pjm-remote-backlog.verify.md`.

A2. Deleting or renaming a canonical agent breaks sync when Cursor or Codex is
enabled: `oat sync`, `oat sync --dry-run` and `oat status` exit 1 with "symbolic
link … escapes the sync scope" until the dangling links in `.cursor/agents/` and
`.claude/agents/` are removed by hand; Codex's `.codex/agents/<name>.toml` and its
`[agents.<name>]` table are never removed. Reproduced. Report:
scratchpad `fact-sheet-pages.verify.md` (copied findings in `product-defects` thread).

A3. `oat sync` silently changes user values in `.codex/config.toml`: sets
`[features] multi_agent = true` and raises `[agents] max_depth` to at least 2.
Reproduced. Same report.

A4. `oat-repo-knowledge-index` refresh runs `rm -rf .oat/repo/knowledge/*.md`
(deleting hand-written files there) and then commits on the current branch,
picking up anything already staged. Read. Report:
`skill-guides-family-A.verify.md`.

## B. Removal and scope surprises

B1. No uninstall command. `oat tools remove --all` (project or default scope)
exits 2 with "Pack core does not allow project scope". Per-pack removal leaves
templates, ideas files, config keys, `.gitignore`/`.gitattributes` blocks and
generated Cursor/Codex copies behind, and a stale `tools.requiredBy` key makes
`oat status` report the utility pack as missing. Reproduced. Fact sheet F.

B2. `oat tools install core --scope project` exits 0 and prints "Installed core
tool pack." but writes nothing; `oat tools install --scope project` (no pack
name) still installs core under the home directory. `--help` shows the scope
default as `all` while a not-yet-installed pack lands at user scope. Reproduced.

B3. `oat init --scope project --setup` ignores the scope for packs: it installs
all eight packs under the home directory, and runs `gh repo view`. Reproduced.

B4. `oat tools install --scope user` writes into the current repository when the
workflows pack is already installed there at project scope. Reproduced.

B5. A provider is synced with no opt-in whenever its folder already exists
(repository or home). Reproduced. Possibly intended; needs a decision.

B6. The `copy` sync strategy stamps the syncing checkout's absolute path into
copies, so committed copies show as drifted and are rewritten in every other
checkout. Reproduced. Report: `C-provider-sync.verify.md`.

B7. No command sets the sync strategy; `oat config get/set sync.defaultStrategy`
reports an unknown key and users must hand-edit `.oat/sync/config.json`, where a
file without `version`/`defaultStrategy` fails validation. Reproduced.

## C. Human control and review assurance

C1. Quick and spec-driven projects have no plan-approval step: the plan is
marked ready after an automatic review, and re-running `/oat-project-quick-start`
on a ready plan starts implementation. Read (contracts). Reports:
`approvals-page.verify.md`, `reviews/p06-persona-adoption-rerun.md` (H2).

C2. A dispatch policy set in any config scope overrides every project's
`state.md` choice (`dispatch-ceiling/index.ts:2558`), while the plan and
quick-start skills and (previously) the docs describe project state as the
winner. Decide the intended precedence; align code or skill text. Read.

C3. The legacy `workflow.dispatchCeiling.preset` key overwrites that scope's
Codex/Claude ladder columns with bare ceilings, which then blocks exact model
selection (`commands/config/index.ts:1949-1967`). Read.

C4. Gate reviewer independence is weaker than its name: the default
`--avoid same-family` falls back to any available reviewer, including the same
runtime, recording only a warning; `same-runtime` excludes nothing on an
undetected host. There is no strict mode that fails when independence cannot be
achieved. The plan, quick-start and import-plan skills route any non-zero gate
exit to `onFailure` and still say the reviewer "avoids the same runtime". Read.
Report: `D-workflow-gates-reviews.verify.md`.

C5. Remote planning: replace-mode description updates are not capped at
user-approved (only creates are) (`service.ts:3088-3093` vs `:2719-2724`);
shared remote storage is not rejected for local projects; every binding,
including a local project's, is written under `.oat/repo/pjm/remote/bindings/`,
which OAT does not gitignore (`store.ts:166,217`, `service.ts:6523-6531`).
`oat config set` refuses `pjm.remote.storage.state shared` but a hand edit is
not blocked. Read. Report: `E-pjm-remote-backlog.verify.md`.

C6. Team rules are not enforceable: a gitignored local config layer overrides a
shared gate or checkpoint, and a project can disable a gate in `state.md`.
Reproduced. Consider a CI-checkable record. Report: `approvals-page.verify.md`.

## D. CLI messages and help text that mislead

D1. `oat init --no-hook` help says "Skip" but removes an installed hook
(`init/index.ts:553-558` vs `:1392`). Reproduced.

D2. `oat status` and `oat doctor` tell adopters to run `pnpm build` for
`packs:inventory` (`status/index.ts:230`, `doctor/index.ts:1209`), which only
works inside the OAT source repository. Read.

D3. `oat config describe` gaps: no entries for Cursor ladder columns, tier cells
or `recommendationVersion` though `set` accepts them; names `oat providers set`
as the owner of the sync strategy (it cannot set it); lists `tools.<pack>` as
living only in `.oat/config.json` though user-scope installs write
`~/.oat/config.json`; names `oat config set` for `pjm.remote.storage.state`
though it refuses `shared`. Read.

D4. `oat config unset` with no layer flag only clears local config, so unsetting
a user- or shared-level key silently does nothing
(`commands/config/index.ts:1577,2935,4102-4128`). Read.

D5. Piping `oat` output into `head` crashes with an EPIPE error. Reproduced.

D6. `scripts/worktree/init.sh:468` runs a bare `oat sync` (scope `all`), which
also writes under the home directory. Read.

D7. The optional AGENTS.md tool-guidance block recommends `oat sync --scope all`,
which writes under each reader's home directory. Reproduced.

## E. Skill contract defects

E1. `oat-project-spec` requires discovery marked ready-for `oat-project-spec`,
but `oat-project-discover` finishes ready-for `oat-project-design`.
E2. `oat-project-implement` advertises `--retry-limit <N>` that no step reads.
E3. `oat-project-promote-spec-driven` advertises `--project` that step 0 never
reads.
E4. `oat-project-split` accepts only `--plan-file`, while `oat-brainstorm` and
`oat-project-discover` hand it an in-conversation payload; children are created
in quick mode.
E5. `oat-pjm-review-backlog` accepts `--archive-dated`, missing from its hint.
E6. `oat-brainstorm` contradicts its own lite branch
(`references/destinations.md:122-126`, `SKILL.md:821` vs `:509-548`).
E7. `oat-project-new/SKILL.md:94` and the spec/design/plan/promote fallbacks
check the shared projects root, which is wrong for the default synced scope.
E8. PJM kickoff-handoff templates (`.oat/templates/pjm-handoffs-readme.md`,
`pjm-agents.md:89-90`) omit lite.
E9. `oat-project-plan` updates `spec.md` but commits only `plan.md` and
`state.md` outside synced scope.
E10. `oat-project-complete` hardcodes `--base main` (`SKILL.md:1508-1509`) while
the PR skills resolve the base branch from config.
E11. `oat-project-pr-final` usage text says it will ask for a title and base
branch; later steps fill both from defaults and push and create automatically.
E12. `oat-docs-bootstrap`: Step 7b passes an "approved subset" that
`oat-docs-apply` has no input for; it also says `setup-docs.sh` creates a venv
(it only runs `pip install`), that the MkDocs docs index is `docs/index.md` (the
scaffold sets `mkdocs.yml`), and treats `documentation.tooling` as an object (it
is a string).
E13. `oat-docs-apply` and `oat-docs-analyze` `allowed-tools` omit tools the
skills run (`oat`, `pnpm`, the tracking script).
E14. `explainer-kit` `--inputs` silently skips source-code files; a directory of
only source fails with "Generated fact base is invalid: min-items"; the
engineer-tour recipe's `codebase` role is not enforced. Reproduced.
E15. Local-scope projects are gitignored but lifecycle skills run `git add` on
project files outside synced scope, which may fail. Unverified.
E16. `.oat/templates/plan.md` may ship `oat_plan_hill_phases: []`, which
autonomy would read as "every phase". Unverified.
E17. Decision records still marked accepted but overtaken by code:
DR-260621 (default `same-runtime`, now `same-family`), DR-260706 (`important`,
now `high`).

## F. First-run experience (may be intended; needs a decision)

F1. New tracked projects default to the synced scope, which needs an `origin`
remote and pushes project files there on every save; in a repository without
`origin` the first project fails. Entry skills other than `oat-project-new`
cannot take a scope.
F2. A non-interactive `oat tools install` installs all eight packs.
F3. `oat-project-discover` refuses to start until the knowledge index exists,
and `/oat-project-progress` stops without it even for quick and lite projects.
F4. Unattended cross-runtime review either stalls on the reviewing tool's
permission prompts or needs a provider permission-bypass flag in a user-written
exec target; no narrower allowlist is documented or tested.

## G. Documentation residuals (not product)

G1. `getting-started/tool-packs.md` is a ~45k-character specification listed
under Getting Started; it needs a split into a short guide and a reference.
G2. `workflows/advanced/workflow-gates.md` and `dispatch-ceiling.md` are mostly
implementer contracts; decision guidance now has "In short" pointers but the
pages need restructuring.
G3. Owner-worded project stability, support and non-goals statement.
G4. Fresh-clone behavior on Windows with committed symlinks is untested.

## Addenda (found after the first compilation)

C7. The planning skills (`oat-project-plan`, `oat-project-quick-start`,
`oat-project-import-plan`) apply `onFailure` to any failed gate run, so with
`onFailure: warn` planning marks the plan ready even when no review ran. Read.
Filed under the strict gate-reviewer item.

Backlog items: 25 items filed on 2026-10-02 as `BL-261002-*` with the label
`docs-overhaul-followup`. F3 is covered by the existing
`BL-260830-make-documentation-aware`.
