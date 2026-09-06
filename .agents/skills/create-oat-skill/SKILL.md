---
name: create-oat-skill
version: 1.5.0
description: Use when adding a new oat-* workflow skill or lifecycle action. Scaffolds the skill with OAT conventions like mode assertions, progress banners, and project-root resolution.
argument-hint: '[skill-name]'
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Create OAT Skill

Create a new OAT workflow skill under `.agents/skills/` that follows OAT conventions (mode assertion, progress banners, project resolution, and safe bash patterns).

## Baseline Guidance (Required)

This skill is a specialization of the general skill-creation workflow.

- Follow the baseline principles and structure from `.agents/skills/create-agnostic-skill/SKILL.md` (progressive disclosure, section layout, examples, troubleshooting, success criteria).
- Apply the same frontmatter versioning rules from `create-agnostic-skill`: include `version: 1.0.0` for new skills and bump patch/minor/major on future edits.
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
- Description using the create-agnostic-skill formula: `Use when [trigger condition]. [What it does for disambiguation].`
- Whether this is `oat-*` (should be for this skill)
- Whether it needs project context (`activeProject` in `.oat/config.local.json`) or is repo-level
- Whether it dispatches OAT subagents/workers/reviewers, and if so which roles, what fallback is acceptable, and whether authorization covers the full run or only a narrower checkpoint

### Step 2: Draft the Skill Using the OAT Template

Use `.agents/skills/create-oat-skill/references/oat-skill-template.md` as the base.

**Required sections (don’t omit):**

- `## Mode Assertion`
- `## Progress Indicators (User-Facing)` (with separator banner)
- `### Step 0: Resolve Active Project` (if project-scoped)
- `### Step 0.5: Capability Detection and Tier Selection` (if the skill dispatches subagents/workers/reviewers)
- `## Success Criteria`

**Required frontmatter metadata:**

- Include `version: 1.0.0` for new skills.
- On later edits, bump patch for fixes/clarifications, minor for backward-compatible behavior additions, major for breaking workflow/interface changes.

**Progress indicators (required):**

- Start-of-skill banner with horizontal separators:
  - `OAT ▸ {LABEL}` (uppercase label)
- Step indicators printed at the **start** of each corresponding process step (not all at once upfront). Each indicator appears only when that step begins executing, giving the user real-time progress.
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

**Named-skill execution (required when a step names another OAT project skill):**

- When a step directs the agent running this skill to execute a named
  `oat-project-*` skill, require loading that skill's current `SKILL.md` and
  following its current steps, or dispatching a child that carries it.
- Achieving a remembered outcome, paraphrasing what the named skill used to do,
  or relying on ambient discovery to locate it is not compliant.
- Place the clause at the execution boundary itself, not in a remote preface the
  orchestrator may skip.
- Three exemption classes need no load clause:
  - **user advice** — text the skill prints or tells the user, where the user
    runs the named skill in their own turn or session;
  - **non-executing reference** — examples, self-references, owner or provenance
    pointers, inventories, and routing decisions whose invocation boundary lives
    in a different step;
  - **explicit capability fallback** — a clause that states why skill loading is
    unavailable in the current host/runtime and then executes the same contract
    inline.
- Classify rather than blanket-rewrite: adding the clause to an exempt mention is
  as wrong as omitting it at a real execution boundary.

**Autonomy gate inventory (required for inventoried lifecycle skills):**

- Before adding, removing, or rewriting prompt behavior in an inventoried
  lifecycle skill, consult the canonical OAT autonomy contract in the source
  repository and run its broadened prompt scan.
- In the same commit, update the gate inventory when behavior changes and the
  HEAD prompt-site coverage mapping for every changed match. Map reachable
  behavior to its gate ID and use `NG` only for unreachable/metadata
  occurrences; never preserve coverage by line number.
- Run
  `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/autonomy-gate-inventory.test.ts`
  before considering the skill complete.

**Subagent/worker availability (required when the skill delegates):**

- Follow the delegation guidance from `.agents/skills/create-agnostic-skill/SKILL.md`.
- Add a pre-work capability step before any edits, artifact writes, external side effects, test runs, or long-running work.
- Distinguish `available`, `authorization required`, and `not resolved`; authorization-required is not the same as unavailable.
- If authorization is required, ask once at skill start and state the approval scope:
  - Which roles are authorized (for example, `oat-phase-implementer`, `oat-reviewer`, or generic workers)
  - Whether approval applies to the whole run, one phase, one review, or one checkpoint
  - What fallback is selected if the user declines
- Lock the selected tier for the run unless the user explicitly changes execution mode.
- Fail closed before side effects if delegation is required for correctness and authorization remains unresolved.
- For Codex, mention multi-agent spawning generically. Do not pin a custom `agent_type` unless the role is guaranteed by the active host config or the skill instructs the agent how to fall back to built-in roles/self-contained prompts.

### Step 4: Create Files

Create:

- `.agents/skills/{skill-name}/SKILL.md`

If the skill needs templates/scripts, add:

- `.agents/skills/{skill-name}/references/…`
- `.agents/skills/{skill-name}/scripts/…`

### Step 5: Register the Skill

Sync the skill to provider views:

```bash
oat sync
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

| Category  | File                                                                  | Constant          |
| --------- | --------------------------------------------------------------------- | ----------------- |
| ideas     | `packages/cli/src/commands/init/tools/ideas/install-ideas.ts`         | `IDEA_SKILLS`     |
| workflows | `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` | `WORKFLOW_SKILLS` |
| utility   | `packages/cli/src/commands/init/tools/utility/install-utility.ts`     | `UTILITY_SKILLS`  |

Add the skill name to the array.

**3. Rebuild and test**

```bash
pnpm build
pnpm test
```

Verify the skill appears in `packages/cli/assets/skills/` after build. If a test asserts the exact skill list for the category (e.g., non-interactive mode expectations), update that test to include the new skill.

## Reading project state

Skills that need to read fields from the active project's `state.md` (e.g. `phase`, `phaseStatus`, `workflowMode`, `docsUpdated`, `lastCommit`) MUST query the CLI instead of hand-parsing YAML with `grep`/`awk`.

For one field, use `--field`:

```bash
WORKFLOW_MODE=$(oat project status --field project.workflowMode 2>/dev/null || echo null)
```

If the skill is reading a resolved project path instead of the active project pointer, add `--project-path`:

```bash
WORKFLOW_MODE=$(oat project status --project-path "$PROJECT_PATH" --field project.workflowMode 2>/dev/null || echo null)
```

For multiple fields, use `--shell` so the CLI fetches project state once and prints shell-safe assignments:

```bash
eval "$(oat project status --shell \
  PHASE=project.phase \
  PHASE_STATUS=project.phaseStatus \
  WORKFLOW_MODE=project.workflowMode 2>/dev/null)"
```

### Contract notes

- **Null sentinel behavior:** YAML `null` in `state.md` surfaces as the literal string `null`, matching the prior `grep | awk` behavior. Missing fields also print or assign `null` after project status resolves successfully.
- `--field <path>` reads arbitrary dot paths from the project status payload. Scalars print as raw values; objects and arrays print as compact JSON.
- `--shell NAME=path ...` prints shell-safe single-quoted assignments. Variable names must match `[A-Za-z_][A-Za-z0-9_]*`.
- `--project-path <path>` reads from a repo-relative or absolute project path instead of `.oat/config.local.json`'s active project pointer.
- Skill snippets assume `oat` is available on `PATH`; do not repeat per-skill `command -v oat` fallback blocks. CI/cloud environments without a global install can provide this `npx`-backed shim once per checkout:

  ```bash
  mkdir -p .oat/bin
  cat > .oat/bin/oat <<'EOF'
  #!/usr/bin/env bash
  exec npx @open-agent-toolkit/cli "$@"
  EOF
  chmod +x .oat/bin/oat
  export PATH="$PWD/.oat/bin:$PATH"
  ```

- Do **not** use this pattern to write state — state writes stay in their existing skill sections.

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
