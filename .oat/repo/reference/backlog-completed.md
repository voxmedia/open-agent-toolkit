# OAT Backlog Completed Archive (Internal / Dogfood)

Historical record of completed backlog items moved out of the active backlog for easier triage.

## How to Use

- Move completed entries here from `.oat/repo/reference/backlog.md`.
- Keep the newest completed items at the top.
- Use this file as append-only historical context; do not add future work here.

## Done

- [x] **(P?) [area] {Title}**
  - Outcome:
  - Links:

- [x] **(P1) [tooling] Fix `oat project new --help` parsing bug that scaffolds a `--help` project**
  - Outcome:
    - Root cause: `pnpm run cli --` passes a literal `--` into Commander's argv, disabling option parsing. Commander consumed `--help` as the `<name>` positional argument, and `validateProjectName` allowed it because `-` was a valid character.
    - Added dash-prefix rejection in `validateProjectName` (defensive layer).
    - Added `name.startsWith('-')` guard in the action handler that calls `command.help()` instead of scaffolding (correct UX).
    - Added regression tests in both `scaffold.test.ts` and `index.test.ts`.
  - Links:
    - Files: `packages/cli/src/commands/project/new/index.ts`, `packages/cli/src/commands/project/new/scaffold.ts`
  - Created: 2026-02-17
  - Completed: 2026-02-17

- [x] **(P1) [tooling] Migrate `validate-oat-skills.ts` from `.oat/scripts/` to CLI**
  - Outcome:
    - Migrated skill validation logic to `oat internal validate-oat-skills` CLI command (`packages/cli/src/commands/internal/validate-oat-skills.ts`).
    - Core validation logic extracted to `packages/cli/src/validation/skills.ts`.
    - `.oat/scripts/validate-oat-skills.ts` removed.
    - `pnpm oat:validate-skills` package.json script updated to call CLI command.
  - Links:
    - PR: `https://github.com/tkstang/open-agent-toolkit/pull/12`
  - Created: 2026-02-14
  - Completed: 2026-02-16

- [x] **(P1) [tooling] Migrate `new-oat-project.ts` from `.oat/scripts/` to CLI**
  - Outcome:
    - Migrated project scaffolding to `oat project new <name>` CLI command (`packages/cli/src/commands/project/new/`).
    - Preserved `--force`, `--no-set-active`, `--no-dashboard` flags plus added `--mode` flag.
    - `oat-project-new` skill updated to use CLI command.
    - `.oat/scripts/new-oat-project.ts` removed.
  - Links:
    - PR: `https://github.com/tkstang/open-agent-toolkit/pull/12`
  - Created: 2026-02-14
  - Completed: 2026-02-16

- [x] **(P1) [tooling] Add explicit supported-provider configuration for project sync**
  - Outcome:
    - Added explicit project provider enable/disable management in `.oat/sync/config.json` via `oat providers set --scope project --enabled ... --disabled ...`.
    - Added provider selection during `oat init --scope project` (interactive) and persisted explicit provider states.
    - Updated `oat sync --scope project` to use config-aware adapter activation and provide mismatch remediation:
      - interactive prompt path in TTY mode
      - non-interactive warning path with deterministic remediation guidance.
    - Added and documented worktree bootstrap flow: `pnpm run worktree:init` for fresh worktrees with missing provider roots.
  - Links:
    - CLI docs: `docs/oat/cli/provider-interop/config.md`
    - Troubleshooting: `docs/oat/reference/troubleshooting.md`
    - Implementation PR: `https://github.com/tkstang/open-agent-toolkit/pull/14`
  - Created: 2026-02-16
  - Completed: 2026-02-17

- [x] **(P1) [tooling] Retire AGENTS skills-table refresh work item**
  - Outcome:
    - Removed the large `SKILLS_TABLE_START` / `SKILLS_TABLE_END` inventory block from `AGENTS.md`.
    - Replaced it with a concise skills discovery contract that points to canonical `.agents/skills` + provider sync views.
    - Marked the old "refresh AGENTS skills table" work item as obsolete because provider/symlink sync now handles discovery.
  - Links:
    - Reference update: `AGENTS.md`
    - Backlog update: `.oat/repo/reference/backlog.md`
  - Created: 2026-02-14
  - Completed: 2026-02-16

- [x] **(P1) [skills] Add ad-hoc review provide flow when no project state exists**
  - Outcome:
    - Added `oat-review-provide` for non-project review scopes:
      - commit range (`base_sha`, explicit `sha..sha`)
      - branch-based range (`base_branch=<branch>`)
      - staged / unstaged working tree
      - explicit pre-existing files (`--files`)
    - Added destination policy helper:
      - defaults to local-only `.oat/projects/local/orphan-reviews/`
      - auto-uses tracked `.oat/repo/reviews/` when it already exists and is not gitignored
      - supports inline-only output
    - Updated `oat-project-review-provide` to hard-stop when active project/state is missing and route to `oat-review-provide`.
  - Links:
    - Skills:
      - `.agents/skills/oat-review-provide/SKILL.md`
      - `.agents/skills/oat-review-provide/scripts/resolve-review-output.sh`
      - `.agents/skills/oat-project-review-provide/SKILL.md`
    - PR: `https://github.com/tkstang/open-agent-toolkit/pull/8`
  - Created: 2026-02-16
  - Completed: 2026-02-16

- [x] **(P1) [workflow] Add quick/import project lanes with canonical plan normalization**
  - Outcome:
    - Added lifecycle entry skills:
      - `oat-project-quick-start`
      - `oat-project-import-plan`
      - `oat-project-promote-full`
    - Added mode/provenance metadata contracts:
      - `.oat/templates/state.md`: `oat_workflow_mode`, `oat_workflow_origin`
      - `.oat/templates/plan.md`: `oat_plan_source`, import traceability fields
    - Made routing and downstream workflows mode-aware:
      - `oat-project-progress`
      - `oat-project-review-provide`
      - `oat-project-pr-progress`
      - `oat-project-pr-final`
      - `.oat/scripts/generate-oat-state.sh`
  - Links:
    - Project: `.oat/projects/shared/quick-oats/`
    - Plan: `.oat/projects/shared/quick-oats/plan.md`
  - Created: 2026-02-16
  - Completed: 2026-02-16

- [x] **(P1) [skills] Normalize skill naming to namespace model (`oat-<domain>-<action>`)**
  - Outcome:
    - Adopted naming pattern: `oat-<domain>-<action>` for external-facing skills; internal-only skills kept unprefixed.
    - Final mappings applied:
      - `oat-new-project` -> `oat-project-new`
      - `oat-open-project` -> `oat-project-open`
      - `oat-clear-active-project` -> `oat-project-clear-active`
      - `oat-complete-project` -> `oat-project-complete`
      - `oat-discovery` -> `oat-project-discover`
      - `oat-spec` -> `oat-project-spec`
      - `oat-design` -> `oat-project-design`
      - `oat-plan` -> `oat-project-plan`
      - `oat-implement` -> `oat-project-implement`
      - `oat-progress` -> `oat-project-progress`
      - `oat-index` -> `oat-repo-knowledge-index`
      - `oat-pr-progress` -> `oat-project-pr-progress`
      - `oat-pr-project` -> `oat-project-pr-final`
      - `oat-request-review` -> `oat-project-review-provide`
      - `oat-receive-review` -> `oat-project-review-receive`
    - All skill directories, SKILL.md frontmatter, AGENTS.md registrations, and cross-references in templates updated.
    - All `/oat:` slash-command references in repo reference docs and project artifacts replaced with skill-first names.
  - Links:
    - Source discussion: OAT feature ideas (naming philosophy + domain model)
    - Plan: `.oat/repo/archive/external-plans/skill-rename-slash-cleanup.md`
  - Created: 2026-02-14
  - Completed: 2026-02-15

- [x] **(P1) [skills] Standardize OAT invocation language to skill-first across templates/docs**
  - Outcome:
    - All `/oat:` slash-command references in repo reference and project artifacts replaced with skill-first names (no slash prefix).
    - Templates, skill SKILL.md files, and project artifacts now use canonical skill names as primary references.
    - Completed as part of the naming normalization rename pass.
  - Links:
    - Source discussion: invocation compatibility for Codex vs slash-enabled hosts
    - Plan: `.oat/repo/archive/external-plans/skill-rename-slash-cleanup.md`
  - Created: 2026-02-14
  - Completed: 2026-02-15

- [x] **(P2) [workflow] Visual progress indicators during workflow execution**
  - Outcome:
    - Standardized user-facing progress indicator guidance across `oat-*` skills:
      - prominent separator banners (`OAT ▸ …`)
      - short step indicators (2–5 lines)
      - “starting/done” updates for long-running work
  - Links:
    - Workflow feedback: `.oat/repo/archive/workflow-user-feedback.md`
    - Commits: `d39876d`, `57de516`, `a22c107`, `bca8167`, `13de18f`, `bdc9a76`
  - Created: 2026-01-30
  - Completed: 2026-01-31
