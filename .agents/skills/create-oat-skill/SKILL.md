---
name: create-oat-skill
version: 1.2.0
description: Use when adding a new oat-* workflow skill or lifecycle action. Scaffolds the skill with OAT conventions like mode assertions, progress banners, and project-root resolution.
argument-hint: "[skill-name]"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Create OAT Skill

Create a new OAT workflow skill under `.agents/skills/` that follows OAT conventions (mode assertion, progress banners, project resolution, and safe bash patterns).

## Baseline Guidance (Required)

This skill is a specialization of the general skill-creation workflow.

- Follow the baseline principles and structure from `.agents/skills/create-skill/SKILL.md` (progressive disclosure, section layout, examples, troubleshooting, success criteria).
- Apply the same frontmatter versioning rules from `create-skill`: include `version: 1.0.0` for new skills and bump patch/minor/major on future edits.
- This skill adds/overrides only the OAT-specific requirements (progress banners, `{PROJECTS_ROOT}` + local-config active-project resolution, and OAT-safe bash patterns).

## When to Use

Use when:
- Adding a new `oat-*` workflow skill
- Adding a new workflow phase or lifecycle action
- Standardizing a “one-off” workflow into a reusable OAT skill

## When NOT to Use

Don’t use when:
- You only need to update an existing skill
- The workflow is still exploratory and may change daily

## Arguments

Parse from `$ARGUMENTS`:
- **skill-name**: (required) kebab-case name (e.g., `oat-backlog-refine`, `oat-archive-project`)

## Workflow

### Step 1: Collect Inputs

If not provided, ask the user for:
- Skill name (kebab-case)
- Description using the create-skill formula: `Use when [trigger condition]. [What it does for disambiguation].`
- Whether this is `oat-*` (should be for this skill)
- Whether it needs project context (`activeProject` in `.oat/config.local.json`) or is repo-level

### Step 2: Draft the Skill Using the OAT Template

Use `.agents/skills/create-oat-skill/references/oat-skill-template.md` as the base.

**Required sections (don’t omit):**
- `## Mode Assertion`
- `## Progress Indicators (User-Facing)` (with separator banner)
- `### Step 0: Resolve Active Project` (if project-scoped)
- `## Success Criteria`

**Required frontmatter metadata:**
- Include `version: 1.0.0` for new skills.
- On later edits, bump patch for fixes/clarifications, minor for backward-compatible behavior additions, major for breaking workflow/interface changes.

**Progress indicators (required):**
- Start-of-skill banner with horizontal separators:
  - `OAT ▸ {LABEL}` (uppercase label)
- A few short step indicators for multi-step work (2–5 lines)
- For long-running operations, print a “starting…” line and a “done” line (duration optional)

### Step 3: Apply OAT Conventions

**Project root resolution (required for project-scoped skills):**
- Always resolve `{PROJECTS_ROOT}` via:
  - `$OAT_PROJECTS_ROOT` env var
  - `oat config get projects.root`
  - fallback `.oat/projects/shared`
- Never hardcode `.oat/projects/shared` directly except as the fallback.

**Active project (required for project-scoped skills):**
- Prefer `activeProject` in `.oat/config.local.json` as the pointer.
- If missing/invalid: prompt for `{project-name}`, derive `PROJECT_PATH="${PROJECTS_ROOT}/{project-name}"`, then persist with `oat config set activeProject "$PROJECT_PATH"`.

**Bash safety (recommended):**
- Prefer portable bash (`set -eu`, avoid `pipefail` unless explicitly handled).
- Quote variables; validate user-provided names; prevent path traversal.

**Question handling (required when the skill needs user decisions):**
- Write the workflow prose so it stays portable across hosts.
- If structured prompts help, document the runtime split explicitly:
  - Claude Code: use `AskUserQuestion` when available
  - Codex: use structured user-input tooling when available in the current host/runtime
  - Fallback: ask in plain conversational text
- Do not hard-code a specific Codex question tool name in the skill text unless the host/runtime contract is guaranteed.

### Step 4: Create Files

Create:
- `.agents/skills/{skill-name}/SKILL.md`

If the skill needs templates/scripts, add:
- `.agents/skills/{skill-name}/references/…`
- `.agents/skills/{skill-name}/scripts/…`

### Step 5: Register the Skill

Sync the skill to provider views:

```bash
oat sync --apply
```

Run OAT validator and resolve findings:

```bash
pnpm oat:validate-skills
```

### Step 6: Register for CLI Distribution

New OAT skills must be registered in two places so `oat init tools` can install them for users.

**Ask the user:** "Should this skill be distributed via `oat init tools`? If so, which category: **ideas**, **workflows**, or **utility**?"

Category guidance:
- **ideas** — `oat-idea-*` skills for brainstorming and capture
- **workflows** — `oat-project-*`, `oat-repo-*`, `oat-worktree-*` skills for project lifecycle and codebase operations
- **utility** — cross-cutting tools that don't fit the above (e.g., `oat-review-provide`, `oat-agent-*`)

If the user confirms, make both of these changes:

**1. Add to `packages/cli/scripts/bundle-assets.sh`**

Add the skill name to the `SKILLS` array (alphabetical within its group):

```bash
SKILLS=(
  # ... existing entries ...
  {skill-name}
)
```

**2. Add to the corresponding TypeScript constant**

| Category | File | Constant |
|----------|------|----------|
| ideas | `packages/cli/src/commands/init/tools/ideas/install-ideas.ts` | `IDEA_SKILLS` |
| workflows | `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` | `WORKFLOW_SKILLS` |
| utility | `packages/cli/src/commands/init/tools/utility/install-utility.ts` | `UTILITY_SKILLS` |

Add the skill name to the array.

**3. Rebuild and test**

```bash
pnpm build
pnpm test
```

Verify the skill appears in `packages/cli/assets/skills/` after build. If a test asserts the exact skill list for the category (e.g., non-interactive mode expectations), update that test to include the new skill.

## Examples

### Basic Usage

```
/create-oat-skill oat-backlog-refine
```

### Conversational

```
We should add a new OAT skill to archive completed projects. Create the skill with the standard OAT sections and progress banners.
```

## Success Criteria

- ✅ New skill created at `.agents/skills/{skill-name}/SKILL.md`
- ✅ Skill frontmatter includes valid semver `version:` (`1.0.0` for new skills)
- ✅ Skill includes required OAT sections (mode + progress + project resolution if applicable)
- ✅ Skill registered in `AGENTS.md`
- ✅ `pnpm oat:validate-skills` passes
- ✅ If distributable: added to `bundle-assets.sh` and the appropriate category constant, tests pass
