# AGENTS

<skills_system priority="1">

## Skills Discovery

- Canonical skills live in `.agents/skills`.
- Provider-linked views are managed by sync tooling; do not duplicate full skill inventories in this file.
- Refresh provider views with `pnpm run cli sync --scope all --apply`.

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

## Agent Workflow

For multi-session or complex development tasks, use the structured agent project workflow:

### Project Structure
Projects live in `.oat/projects/<scope>/<project>/` with:
- Core files: `state.md`, `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`
- Optional: `reviews/`, `pr/`
