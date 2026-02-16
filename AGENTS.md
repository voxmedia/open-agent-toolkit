# AGENTS

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Skills are loaded from the repository at `.agents/skills`
- Sync provider views with: `pnpm run cli sync --scope all --apply`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>codex</name>
<description>Use when the user asks to run Codex CLI (codex exec, codex resume) or references OpenAI Codex for code analysis, refactoring, or automated editing</description>
<location>project</location>
</skill>

<skill>
<name>create-oat-skill</name>
<description>Create a new OAT workflow skill with standard sections, project-root resolution, and progress banner conventions.</description>
<location>project</location>
</skill>

<skill>
<name>create-pr-description</name>
<description>Create a comprehensive PR description document based on git changes, planning documents, and project context. Use when ready to create or finalize a pull request description.</description>
<location>project</location>
</skill>

<skill>
<name>create-skill</name>
<description>Create a new skill in .agents/skills/ following the openskills standard. Use when adding reusable workflows or capabilities for AI coding agents.</description>
<location>project</location>
</skill>

<skill>
<name>create-ticket</name>
<description>Create a Jira ticket in the DWP project via Atlassian MCP integration.</description>
<location>project</location>
</skill>

<skill>
<name>review-backlog</name>
<description>Review a backlog (and optional roadmap) to produce a structured analysis with value/effort ratings, dependency mapping, parallel lanes, and execution recommendations.</description>
<location>project</location>
</skill>

<skill>
<name>oat-idea-ideate</name>
<description>Resume brainstorming on an existing idea through conversational discussion, or start from a scratchpad entry.</description>
<location>project</location>
</skill>

<skill>
<name>oat-idea-new</name>
<description>Create a new idea directory for lightweight brainstorming and capture, then start brainstorming immediately.</description>
<location>project</location>
</skill>

<skill>
<name>oat-idea-scratchpad</name>
<description>Review scratchpad entries or quick-capture a new idea seed with optional notes.</description>
<location>project</location>
</skill>

<skill>
<name>oat-idea-summarize</name>
<description>Finalize an idea by generating a summary document and adding it to the ideas backlog.</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-clear-active</name>
<description>Clear the active project pointer</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-complete</name>
<description>Mark a project lifecycle as complete</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-design</name>
<description>Create detailed technical design from specification with architecture and implementation details</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-discover</name>
<description>Start discovery phase - gather requirements and understand the problem through structured dialogue</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-implement</name>
<description>Execute implementation plan task-by-task with state tracking and TDD discipline</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-index</name>
<description>Generate or regenerate comprehensive knowledge base of the codebase using parallel mapper agents.</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-new</name>
<description>Create a new OAT project directory under {PROJECTS_ROOT}, scaffold artifacts from templates, and set it as the active project.</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-quick-start</name>
<description>Create a lightweight OAT quick workflow project that captures discovery and generates a runnable implementation plan without requiring spec/design.</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-import-plan</name>
<description>Import an external provider markdown plan into an OAT project by preserving the source and normalizing it into canonical plan.md.</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-promote-full</name>
<description>Promote a quick or imported OAT project to full lifecycle by backfilling missing discovery/spec/design artifacts in place.</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-open</name>
<description>Set the active project with validation</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-plan</name>
<description>Create implementation plan from design with bite-sized TDD tasks</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-pr-final</name>
<description>Create the final project PR description (into main) using OAT artifacts and final review status; optionally open a PR</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-pr-progress</name>
<description>Create a progress PR description for a specific plan phase (pNN) using OAT artifacts and commit conventions; optionally open a PR</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-progress</name>
<description>Check project progress and get routed to the appropriate next skill</description>
<location>project</location>
</skill>

<skill>
<name>oat-review-provide</name>
<description>Run an ad-hoc code review for a commit range when no OAT project/state exists.</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-review-provide</name>
<description>Use when ready to review completed work before merging - after implementing a task, phase, or full project; when quality gate needed before PR</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-review-receive</name>
<description>Use after running oat-project-review-provide - when a review artifact exists and findings need to be converted into actionable plan tasks for gap closure</description>
<location>project</location>
</skill>

<skill>
<name>oat-project-spec</name>
<description>Create formal specification from discovery insights with structured requirements</description>
<location>project</location>
</skill>

<skill>
<name>update-internal-project-reference</name>
<description>Use when OAT implementation changes and you need to update .oat/internal-project-reference docs to match (temporary while dogfooding)</description>
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
- `pnpm test` - Run tests across the workspace

### Development Workflow
- `pnpm dev` - Run workspace development tasks
- `pnpm run cli -- help` - Run the OAT CLI help from repo root
- `pnpm run cli -- <command> [options]` - Execute specific OAT CLI commands during local testing

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
