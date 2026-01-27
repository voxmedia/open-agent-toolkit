# AGENTS

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>create-pr-description</name>
<description>Create a comprehensive PR description document based on git changes, planning documents, and project context. Use when ready to create or finalize a pull request description.</description>
<location>project</location>
</skill>

<skill>
<name>create-skill</name>
<description>Create a new skill for both Claude Code and Cursor following the Agent Skills Open Standard and Honeycomb patterns.</description>
<location>project</location>
</skill>

<skill>
<name>create-ticket</name>
<description>Create a Jira ticket in the DWP project via Atlassian MCP integration.</description>
<location>project</location>
</skill>

<skill>
<name>docs-new</name>
<description>Create new documentation in the Honeycomb Docs app from implementation files and context.</description>
<location>project</location>
</skill>

<skill>
<name>docs-refactor-to-docs-app</name>
<description>Refactor README files and other markdown documentation into the Honeycomb Docs app.</description>
<location>project</location>
</skill>

<skill>
<name>docs-review</name>
<description>Perform a deep analysis and review of existing documentation, identifying issues, inconsistencies, and improvement opportunities.</description>
<location>project</location>
</skill>

<skill>
<name>docs-update</name>
<description>Update existing documentation in the Honeycomb Docs app based on implementation changes.</description>
<location>project</location>
</skill>

<skill>
<name>new-agent-project</name>
<description>Initialize a new agent project with structured workflow for discovery, planning, and implementation. Use when starting a new feature, refactor, or multi-session development task.</description>
<location>project</location>
</skill>

<skill>
<name>oat-index</name>
<description>Generate or regenerate comprehensive knowledge base of the codebase using parallel mapper agents.</description>
<location>project</location>
</skill>

<skill>
<name>read-relevant-docs</name>
<description>Discover and read relevant documentation from the Honeycomb Docs app based on the current conversation context.</description>
<location>project</location>
</skill>

<skill>
<name>repo-documentation</name>
<description>Repository documentation guidelines and patterns. Use when creating, updating, or migrating documentation in the Honeycomb repository.</description>
<location>project</location>
</skill>

<skill>
<name>update-doc-refs</name>
<description>Check and apply @docs reference comments to source files.</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>

## Development Commands

### Essential Commands
- `pnpm build` - Build all packages and applications
- `pnpm lint` - Lint code using Biome
- `pnpm format` - Format code using Biome
- `pnpm type-check` - TypeScript type checking across all packages
- `pnpm test` - Run tests (when implemented)

### Development Workflow
- `pnpm dev:start` - Build packages + start cyclone-invalidation (full development environment)
- `pnpm dev` - Build all packages in watch mode (no applications running)
- For individual app development, use the app's dev commands (e.g., `pnpm --filter=@honeycomb/cyclone-invalidation dev:poller`)

### Package Management
- Uses pnpm workspaces with Turborepo for efficient monorepo management
- All packages use `workspace:*` for internal dependencies
- Build dependencies are automatically handled by Turborepo (`^build` dependency)

## Architecture Overview

### Monorepo Structure
- **Turborepo-based** with pnpm workspaces for efficient builds and caching
- **TypeScript ESM** - All packages use `"type": "module"` with ES modules
- **Shared configurations** - TypeScript, Biome, and build configs in packages/

### Standalone Applications (`apps/`)
- **cyclone-invalidation**: Cache invalidation app (EventBridge → SQS → BullMQ → Fastly)
  - Single Docker image with `--poller` / `--worker` runtime flags
  - Uses framework packages for infrastructure concerns
- **honeycomb-docs**: MkDocs Material documentation site

### Framework Packages (`packages/`)
- **@honeycomb/poller**: SQS polling framework with dynamic scaling (1-25 pollers per pod)
- **@honeycomb/worker**: BullMQ worker framework with metrics and health checks
- **@honeycomb/core**: Shared infrastructure (HealthServer, RateLimiter, BaseDatadogExporter)
- **@honeycomb/fastly**: Fastly CDN integration (FastlyClient, BatchService)
- **@honeycomb/env**: Runtime environment configuration from `.honeycombenv.mjs`

### Shared Packages (`packages/`)
- **@honeycomb/config**: Environment configuration with Zod validation
- **@honeycomb/logger**: Structured logging with configurable levels
- **@honeycomb/schemas**: Zod schemas for AWS, BullMQ, Redis, and application types
- **@honeycomb/cli**: Generic CLI commands for BullMQ and SQS operations
- **@honeycomb/tsconfig**: Shared TypeScript configurations (base, node)
- **biome-config**: Shared Biome linting/formatting configuration

### Technology Stack
- **Runtime**: Node.js 22.17.0 with TypeScript 5.8.3
- **Development**: tsx for direct TypeScript execution with hot reloading
- **Build**: Turborepo 2.5.4 with TypeScript compilation to `dist/`
- **Linting**: Biome 2.3.11  (extends from packages/biome-config)
- **Queue Processing**: BullMQ + Redis
- **AWS Integration**: SQS, EventBridge

### Development Patterns
- **Standalone App Pattern**: Apps implement `IMessageHandler` and `IProcessor` interfaces from framework packages
- **Framework Packages**: Use `@honeycomb/poller` and `@honeycomb/worker` for infrastructure
- **Configuration**: Runtime env loading via `@honeycomb/env`, validation via `@honeycomb/config`
- **Logging**: Structured logging via @honeycomb/logger with configurable levels
- **Type Safety**: Strong typing with shared Zod schemas across packages

### Build System
- Turborepo handles dependency ordering and parallel builds
- TypeScript compilation to `dist/` directories
- Watch mode available for both packages (`pnpm dev`) and applications (`tsx watch`)
- Clean builds with `pnpm clean` to remove all `dist/` directories

### Environment Setup
- Non-sensitive config: `.honeycombenv.mjs` at repo root (committed)
- Local overrides: `.overwrite.honeycombenv.mjs` at repo root (gitignored)
- Sensitive values (API keys): `.env.local` in each app directory (gitignored)
  - Copy `apps/cyclone-invalidation/.env.example` to `.env.local` for local development
- Use `LOG_LEVEL=debug` for verbose development logging
- Node.js 22.17.0+ required (managed via nvm with .nvmrc)

## Agent Workflow

For multi-session or complex development tasks, use the structured agent project workflow:

### Project Structure
Projects live in `.agent/projects/<project-name>/` with:
- Core files: `discovery.md`, `planning.md`, `implementation.md`
- Optional: `pr-description.md`, `reviews/`, `handoffs/`

### Workflow Phases
1. **Discovery** - Gather requirements, ask clarifying questions, confirm alignment
2. **Planning** - Outline approach, architecture decisions, implementation phases
3. **Implementation** - Track progress, code changes, decisions
4. **PR Creation** - Use `/create-pr-description` to generate comprehensive PR descriptions

### Handoffs
Create handoff documents in `handoffs/` when transitioning between sessions or phases. Include: current state, work completed, work remaining, key decisions, relevant file paths.

See `.agent/README.md` for complete documentation.
