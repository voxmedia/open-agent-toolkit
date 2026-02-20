---
name: oat-agent-instructions-apply
description: Run when you have an agent instructions analysis artifact and want to generate or update instruction files. Creates a branch, generates files from templates, and optionally opens a PR.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Edit, Bash(git:*), Bash(gh:*), Glob, Grep, AskUserQuestion
---

# Agent Instructions Apply

Generate or update agent instruction files based on an analysis artifact, with user review and PR-based workflow.

## Prerequisites

- Git repository with a recent analysis artifact in `.oat/repo/analysis/`.
- If no analysis exists, run `oat-agent-instructions-analyze` first.
- `jq` available in PATH (used by helper scripts).
- `gh` CLI available for PR creation (optional — manual fallback provided).

## Mode Assertion

**OAT MODE: Agent Instructions Apply**

**Purpose:** Generate and update instruction files based on analysis findings, with user approval at each step.

**BLOCKED Activities:**
- No generating files the user hasn't approved.
- No pushing to remote without user confirmation.
- No modifying files outside the instruction file scope.

**ALLOWED Activities:**
- Reading analysis artifacts, instruction files, and project configuration.
- Running helper scripts for provider resolution and tracking.
- Creating/updating instruction files per approved plan.
- Creating branches, committing, and pushing (with user confirmation).
- Writing tracking updates to `.oat/tracking.json`.

## Progress Indicators (User-Facing)

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ AGENT INSTRUCTIONS APPLY
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Step indicators:
  - `[1/7] Loading analysis artifact…`
  - `[2/7] Building recommendation plan…`
  - `[3/7] Reviewing plan with user…`
  - `[4/7] Creating branch…`
  - `[5/7] Generating instruction files…`
  - `[6/7] Committing + PR…`
  - `[7/7] Updating tracking + summary…`

## Process

### Step 0: Intake — Find Analysis Artifact

Search for the most recent analysis artifact:

```bash
ls -t .oat/repo/analysis/agent-instructions-*.md 2>/dev/null | head -1
```

**If found:** Read the artifact, extract findings and recommendations.

**If not found:** Tell the user:
```
No analysis artifact found in .oat/repo/analysis/.
Run oat-agent-instructions-analyze first to scan the codebase.
```
Then stop.

### Step 1: Resolve Providers

```bash
SCRIPT_DIR=".agents/skills/oat-agent-instructions-analyze/scripts"
PROVIDERS=$(bash "$SCRIPT_DIR/resolve-providers.sh" --non-interactive)
```

The provider list determines which file formats to generate. If running interactively, omit `--non-interactive` to allow the user to confirm or add providers.

### Step 2: Build Recommendation Plan

For each finding, coverage gap, and glob-scoped rule opportunity in the analysis artifact, determine the action:

**For directory coverage gaps (new AGENTS.md files):**
- Determine the target file path based on the directory and provider
- Select the appropriate template from `references/instruction-file-templates/`
- For AGENTS.md files: use `agents-md-root.md` or `agents-md-scoped.md`

**For glob-scoped rule opportunities (from the analysis artifact's "Glob-Scoped Rule Opportunities" section):**
- For each identified file-type pattern, create a glob-scoped rule using `glob-scoped-rule.md` body + appropriate `frontmatter/` wrapper
- Read several representative files matching the pattern to understand conventions before writing the rule body
- Rule body should capture project-specific conventions — not generic best practices the agent already knows

**For quality findings (updates to existing files):**
- Identify the specific issue and the fix
- Preserve existing manual customizations — only modify the problematic section

**Multi-format composition order:**
1. **AGENTS.md first** — the canonical, provider-agnostic file (root + every scoped directory)
2. **CLAUDE.md shims** — if claude provider is active, create a `CLAUDE.md` containing only `@AGENTS.md` at **every directory level** where an AGENTS.md was created (root + each scoped package/directory). Claude Code reads the nearest CLAUDE.md per directory — without a per-directory shim, scoped AGENTS.md files are invisible to Claude.
3. **Always-on Cursor project rule** — if cursor provider is active, generate a `.cursor/rules/{project-name}.mdc` with `alwaysApply: true` frontmatter that summarizes key project facts (package manager, workspace structure, essential commands, code style, non-negotiables). This ensures Cursor agents always have project context. Use the Always-On mode from `frontmatter/cursor-rule.md`.
4. **Glob-scoped rules** — identical body content, stamped with per-provider frontmatter:
   - Claude: `.claude/rules/{name}.md` with `paths` frontmatter
   - Cursor: `.cursor/rules/{name}.mdc` with `alwaysApply: false` + `globs` frontmatter
   - Copilot: `.github/instructions/{name}.instructions.md` with `applyTo` frontmatter
5. **Copilot shim** — if copilot provider is active, generate `.github/copilot-instructions.md` from `frontmatter/copilot-shim.md` template

Fill the apply plan template at `references/apply-plan-template.md` with each recommendation.

### Step 3: User Reviews Plan

Present the recommendation plan to the user. For each recommendation, ask:
- **approve** — proceed with generation
- **modify** — approve with user-specified changes
- **skip** — do not act on this recommendation

Wait for user decisions on all recommendations before proceeding.

If all recommendations are skipped, output "No actions approved. Exiting." and stop.

### Step 4: Create Branch

```bash
TIMESTAMP=$(date -u +"%Y-%m-%d-%H%M")
BRANCH="oat/agent-instructions-${TIMESTAMP}"
git checkout -b "$BRANCH"
```

If branch creation fails (e.g., uncommitted changes), ask the user to resolve and retry.

### Step 5: Generate/Update Instruction Files

For each approved recommendation, in the order from Step 2:

**Creating new files:**

1. Read the appropriate template from `references/instruction-file-templates/`.
2. Read the project context needed to fill the template:
   - `package.json` for commands and dependencies
   - Directory structure for architecture section
   - Existing instruction files for consistency
3. Generate the file content by filling the template with project-specific details.
4. **CLAUDE.md shims** — for every directory where an AGENTS.md is created or already exists, if Claude is a provider, also create a `CLAUDE.md` containing exactly `@AGENTS.md` (one line, no other content). This applies to root AND every scoped directory.
5. **Always-on Cursor rule** — if Cursor is a provider, create `.cursor/rules/{project-name}.mdc` with `alwaysApply: true`. Content should be a concise summary of key project facts (package manager, workspace layout, essential commands, code style, non-negotiables) — not a full copy of AGENTS.md. Target ~30-60 lines.
6. For glob-scoped rules across multiple providers:
   - Write the body content once (from `glob-scoped-rule.md` template)
   - Stamp with each provider's frontmatter
   - Verify body content is identical across all provider versions

**Updating existing files:**

1. Read the existing file.
2. Identify the section(s) that need updating based on the finding.
3. Make targeted edits — preserve all content the finding doesn't address.
4. Do not rewrite the entire file unless the user explicitly approves.

**Required context — read these docs before generating:**
- `references/docs/agent-instruction.md` — quality criteria and best practices
- `references/docs/rules-files.md` — cross-provider format reference
- `references/docs/cursor-rules-files.md` — Cursor-specific `.mdc` format (if cursor provider is active)

### Step 6: Commit and PR

**Stage and commit:**

```bash
git add {list of generated/updated files}
git commit -m "chore: update agent instruction files

Generated by oat-agent-instructions-apply from analysis artifact.
Files: {count} created, {count} updated."
```

**Ask user about PR:**

```
Files committed. Options:
1. Push and create PR (requires gh CLI)
2. Push only (create PR manually)
3. Keep local (no push)

Choose:
```

**If creating PR:**

```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --base main \
  --title "chore: update agent instruction files" \
  --body "$(cat <<'PRBODY'
## Summary

- Generated/updated agent instruction files based on analysis
- Source: {analysis-artifact-path}
- Providers: {provider-list}

## Changes

{list of files created/updated with brief rationale}

## Verification

- [ ] Instruction files follow quality checklist
- [ ] No content duplication across formats
- [ ] Glob-scoped rules have identical body content across providers
- [ ] Commands referenced in instruction files are valid
PRBODY
)"
```

**If `gh` is not available or fails:**

```
PR creation failed. To create manually:
1. Push: git push -u origin {branch}
2. Open PR at your repository's web interface
3. Use the commit message as PR description
```

### Step 7: Update Tracking and Output Summary

**Update tracking:**

```bash
SCRIPT_DIR=".agents/skills/oat-agent-instructions-analyze/scripts"
bash "$SCRIPT_DIR/resolve-tracking.sh" write \
  agentInstructionsApply \
  "$(git rev-parse HEAD)" \
  "$(git branch --show-current)" \
  "apply" \
  {providers...}
```

**Output summary:**

```
Apply complete.

  Files created:   {N}
  Files updated:   {N}
  Files skipped:   {N}
  Providers:       {list}
  Branch:          {branch-name}
  PR:              {URL or "not created"}

  Source analysis:  {artifact-path}
  Tracking updated: .oat/tracking.json
```

## Deferred from v1

- `AGENTS.override.md` generation and management
- Auto-apply mode (skip user review for low-severity recommendations)
- Batch update across multiple repos

## References

- Quality criteria: `references/docs/agent-instruction.md`
- Cross-provider rules: `references/docs/rules-files.md`
- Cursor-specific format: `references/docs/cursor-rules-files.md`
- Analysis artifact: `.oat/repo/analysis/agent-instructions-*.md`
- Templates: `references/instruction-file-templates/`
- Apply plan template: `references/apply-plan-template.md`
- Tracking script: `scripts/resolve-tracking.sh` (symlink to analyze skill)
