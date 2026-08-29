# AGENTS

<skills_system priority="1">

## Skills Discovery

- Canonical skills live in `.agents/skills`.
- Provider-linked views are managed by sync tooling; do not duplicate full skill inventories in this file.
- Refresh provider views with `oat sync --scope all`.
- Update installed skills to latest bundled versions with `oat tools update`.
- When a PR changes a canonical skill at `.agents/skills/*/SKILL.md`, increase that skill's frontmatter `version:` in the same PR.
- The version bump is PR-scoped, not edit-scoped: one bump per changed skill in the final PR diff is required, even if the skill was edited multiple times on the branch.

</skills_system>

## Development Commands

### Essential Commands

- `pnpm check` - Lint and format checks per package, markdownlint over `apps/oat-docs/docs`, and `oat:validate-skills`
- `pnpm build` - Build all packages and applications (excludes docs for speed)
- `pnpm build:docs` - Build the docs site and its dependencies
- `pnpm lint` - Lint code using oxlint, plus `tools/smoke`
- `pnpm format` - Check formatting (oxfmt --check), plus `.agents/skills/**/*.md` and `tools/smoke`; use `pnpm format:fix` to auto-fix
- `pnpm type-check` - TypeScript type checking across all packages
- `pnpm test` - Run tests across the workspace

`pnpm check` and the `pnpm lint`/`pnpm format` pair overlap, but neither
contains the other, so passing one does not predict the other. Only `pnpm check`
runs markdownlint over the docs app and validates canonical OAT skill structure
through `oat:validate-skills`. Markdownlint catches docs violations such as a
fenced code block with no language or a skipped heading level. Only `pnpm lint`
and `pnpm format` apply their respective lint/format coverage to `tools/smoke`
and `.agents/skills/**/*.md`; skill validation does not replace either check.

### Definition of Done

Every change runs the checks CI gates on, in this order:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `pnpm release:check-versions` (fetch `origin/main` first: the gate also requires every lockstep version to be strictly greater than current `origin/main`)
7. `pnpm release:validate`
8. `pnpm build:docs`

This list mirrors CI's gate steps exactly, in CI's order, so that running it
locally implies CI green. Steps 5 and 6 are the two version-lockstep gates;
they earned their place here because while the skill gate ran only in CI,
changes reached review twice with a version bump no local gate would have
surfaced.

Capture each gate's exit code explicitly (for example
`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`); never derive success from a
pipeline whose final stage is a pager or filter — `pnpm <gate> | tail && echo OK`
reports `tail`'s exit status and prints OK even when the gate fails.

CI runs neither `pnpm lint` nor `pnpm format`. Run both whenever a change
touches `tools/smoke` or `.agents/skills`, since nothing else covers them.

### Development Workflow

- `pnpm dev` - Run workspace development tasks
- `pnpm run cli -- help` - Run the OAT CLI help from repo root
- `pnpm run cli -- <command> [options]` - Execute specific OAT CLI commands during local testing
- After creating or switching to a worktree, run `pnpm run worktree:init` before using the CLI workflow.

### Web Retrieval Convention

- For web content fetches, prefer `https://markdown.new/<original-url>` when viable (docs/blog/reference pages) to reduce HTML parsing overhead.
- Example: `https://markdown.new/developers.openai.com/codex/skills/`
- If markdown conversion is unavailable or loses required structure, fall back to the original URL.

### Import Path Convention

- Prefer same-directory imports (`./...`) for local modules.
- For anything outside the current directory, use explicit TypeScript aliases configured by the package.
- Avoid parent-relative imports (`../...`), `src/...` imports, and catch-all aliases like `@/*`.

### Package Management

- Uses pnpm workspaces with Turborepo for efficient monorepo management
- All packages use `workspace:*` for internal dependencies
- Build dependencies are automatically handled by Turborepo (`^build` dependency)
- Publishable packages under `packages/` are released from npm and participate in PR release dry-runs.
- Publishable package guardrail: the lockstep public package set is `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, and `packages/docs-transforms`. If a PR changes shipped functionality for any of them, bump all five public package versions together in the same PR.
- For release policy, bundled assets count as shipped CLI functionality. Changes under `.agents/skills`, `.agents/agents`, `.oat/templates`, `.oat/scripts`, or `apps/oat-docs/docs` require the same lockstep public package version bump even if no file under `packages/cli/src` changed.
- Definition of done for publishable package changes: run `pnpm release:validate` before finishing. A publishable-package PR is not done until that command passes.

## Architecture Overview

### Monorepo Structure

- **Turborepo-based** with pnpm workspaces for efficient builds and caching
- **TypeScript ESM** - All packages use `"type": "module"` with ES modules
- **Shared configurations** - TypeScript and build configs in packages/

### Technology Stack

- **Runtime**: Node.js 22.17.0 with TypeScript 7; TypeScript 6 remains available through the compatibility API alias
- **Development**: tsx for direct TypeScript execution with hot reloading
- **Build**: Turborepo 2.7.6 with TypeScript compilation to `dist/`
- **Linting/Formatting**: oxlint + tsgolint type-aware checks + oxfmt (configured via .oxlintrc.json and .oxfmtrc.jsonc)

### Build System

- Turborepo handles dependency ordering and parallel builds
- TypeScript compilation to `dist/` directories
- Watch mode available for both packages (`pnpm dev`) and applications (`tsx watch`)
- Clean builds with `pnpm clean` to remove all `dist/` directories

## Feature Planning Triage

**Pre-implementation gate:** Before making any code changes, confirm that either a workflow option has been selected or the user has explicitly opted out. If neither has happened, present the workflow options below. This applies even if the task seems small — the user decides scope, not the agent.

### Workflow Options

Present these options to the user, with a recommendation based on the assessment heuristic below:

1. **Full spec-driven workflow** — Discovery → Design (with confirmed requirements & spec.md) → Plan → Implement
   _Best for: complex features, cross-cutting concerns, multiple components, projects needing formal requirements or traceability. Design produces both spec.md and design.md as part of one collaborative conversation._
   _Design mode choices: collaborative, selective collaborative, or draft-and-review. Selective collaborative is only available here, where the section set is large enough for selective live review to pay off._
   → Use `oat-project-new` (scaffolds spec-driven project)

2. **Quick workflow** — Discovery → [Optional Lightweight Design] → Plan → Implement
   _Best for: bounded features at any size, clear requirements, rapid iteration preferred. Can still produce a design artifact when architecture decisions matter._
   _Lightweight design keeps the smaller collaborative/draft choice; it does not offer selective collaborative mode._
   → Use `oat-project-quick-start`

3. **Import external plan** — Normalize an existing plan into OAT format → Implement
   _Best for: plans already drafted in another tool, session, or document._
   → Use `oat-project-import-plan`

4. **Provider plan mode → import** — Use provider's native plan mode, then import the result into an OAT project for tracked implementation.
   _Best for: users who prefer provider planning UX but want OAT tracking._

5. **No project workflow** — Proceed without OAT project tracking.
   _Best for: small fixes, straightforward changes, or explicit user preference._

### Recommendation Heuristic

Before presenting options, assess the request and lead with a recommendation:

- **Multiple components/APIs/data models, unclear boundaries, or cross-cutting concerns** → Recommend spec-driven (#1)
- **Bounded feature of any size, some design questions but clear requirements** → Recommend quick (#2)
- **User references an existing plan or external artifact** → Recommend import (#3)
- **User is already in plan mode or prefers that UX** → Recommend provider plan mode → import (#4)
- **Simple, well-understood change or user says "just do it"** → Recommend no workflow (#5)

The distinguishing factor is **requirements clarity and design risk**, not task count. A large but well-understood migration is fine for quick mode. A small but architecturally unclear feature might need spec-driven.

### Guardrail

Once a workflow is selected (or explicitly declined), do NOT produce ad-hoc planning artifacts outside the chosen workflow. All planning output must flow through the selected workflow's artifacts (`discovery.md`, `spec.md`, `design.md`, `plan.md`, etc.) or, if no workflow was selected, proceed directly to implementation.

If the user declines all workflows, confirm once:

> "Got it — I'll proceed without project tracking. If this grows in scope, I can set up a project workflow at any point."

## Agent Workflow

For multi-session or complex development tasks, use the structured agent project workflow:

- The optional post-approval `retro` step uses `oat-project-retro` to generate/apply retrospectives and `oat-project-retro-file` to file tracker feedback.

### Execution Continuation

This rule applies only to OAT project lifecycle execution, such as `oat-project-implement`, and OAT project review/receive flows. It does not apply to non-OAT tasks or ad-hoc work outside the OAT project workflow.

When executing an OAT project implementation or OAT project review workflow, do not stop at task boundaries, phase boundaries, or other clean checkpoints unless:

- the configured HiLL checkpoint has been reached,
- a real blocker exists,
- or explicit user input is required.

Status summaries, completed bookkeeping, and "clean boundary" pauses are not completion criteria. After updating tracking artifacts, continue execution until one of the allowed stop conditions applies.

### Project Structure

Projects live in `.oat/projects/<scope>/<project>/` with:

- Core files: `state.md`, `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`
- Optional: `reviews/`, `pr/`

### Docs Pack Workflows

- `oat-docs-bootstrap` - Guide users through bootstrapping a docs app end-to-end: preflight, input gathering, scaffold (via `oat docs init`) with capability-gated post-patches, build verification, config inspection, and educational walkthrough.
- `oat-docs-analyze` - Analyze a docs surface for `index.md` contract coverage, nav drift, and docs app readiness.
- `oat-docs-apply` - Apply approved docs-analysis recommendations with branch, nav-sync, and PR workflow support.

## Documentation

The repository's documentation site lives in `apps/oat-docs`.

- **Docs root:** `apps/oat-docs`
- **Framework:** Fumadocs
- **Generated index:** `apps/oat-docs/index.md` — regenerated by `oat docs generate-index`; do not hand-edit.
- **Authoring conventions:** see `apps/oat-docs/AGENTS.md` for docs-app working conventions.

## External Attributions

Prose adapted from external projects is tracked in the repo-root `NOTICES.md`.
When borrowing from an external source, add an entry there.
