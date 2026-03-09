# AGENTS

<skills_system priority="1">

## Skills Discovery

- Canonical skills live in `.agents/skills`.
- Provider-linked views are managed by sync tooling; do not duplicate full skill inventories in this file.
- Refresh provider views with `oat sync --scope all`.

</skills_system>

## Development Commands

### Essential Commands
- `pnpm build` - Build all packages and applications
- `pnpm lint` - Lint code using Biome
- `pnpm format` - Format code using Biome
- `pnpm type-check` - TypeScript type checking across all packages
- `pnpm test` - Run tests across the workspace

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

## Architecture Overview

### Monorepo Structure
- **Turborepo-based** with pnpm workspaces for efficient builds and caching
- **TypeScript ESM** - All packages use `"type": "module"` with ES modules
- **Shared configurations** - TypeScript, Biome, and build configs in packages/

### Technology Stack
- **Runtime**: Node.js 22.17.0 with TypeScript 5.8.3
- **Development**: tsx for direct TypeScript execution with hot reloading
- **Build**: Turborepo 2.7.6 with TypeScript compilation to `dist/`
- **Linting**: Biome 2.3.11  (extends from packages/biome-config)

### Build System
- Turborepo handles dependency ordering and parallel builds
- TypeScript compilation to `dist/` directories
- Watch mode available for both packages (`pnpm dev`) and applications (`tsx watch`)
- Clean builds with `pnpm clean` to remove all `dist/` directories

## Feature Planning Triage

**Pre-implementation gate:** Before making any code changes, confirm that either a workflow option has been selected or the user has explicitly opted out. If neither has happened, present the workflow options below. This applies even if the task seems small — the user decides scope, not the agent.

### Workflow Options

Present these options to the user, with a recommendation based on the assessment heuristic below:

1. **Full spec-driven workflow** — Discovery → Spec → Design → Plan → Implement
   _Best for: complex features, cross-cutting concerns, multiple components, projects needing formal requirements or traceability._
   → Use `oat-project-new` (scaffolds spec-driven project)

2. **Quick workflow** — Discovery → [Optional Lightweight Design] → Plan → Implement
   _Best for: bounded features at any size, clear requirements, rapid iteration preferred. Can still produce a design artifact when architecture decisions matter._
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

### Project Structure
Projects live in `.oat/projects/<scope>/<project>/` with:
- Core files: `state.md`, `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`
- Optional: `reviews/`, `pr/`

### Utility Skill Additions

- `oat-docs-analyze` - Analyze a docs surface for `index.md` contract coverage, nav drift, and docs app readiness.
- `oat-docs-apply` - Apply approved docs-analysis recommendations with branch, nav-sync, and PR workflow support.
