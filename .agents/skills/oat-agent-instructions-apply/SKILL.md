---
name: oat-agent-instructions-apply
version: 1.2.0
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

## Question Handling Across Hosts

When this skill needs a user decision:
1. Use `AskUserQuestion` when running in Claude Code with tool availability.
2. Use Codex structured user-input tooling when available in the current Codex host/runtime.
3. Otherwise ask the same question in plain conversational text.

Keep the question content consistent across hosts so the workflow remains portable even when the UI differs.

## Analyze vs Apply Boundary

Treat the analysis artifact as the source of truth for what should be generated and why.

Apply may:
- read the exact evidence sources cited by the artifact
- verify that cited files still exist
- translate approved recommendations into concrete instruction text

Apply must **not**:
- invent unsupported conventions
- infer formatting/style rules from defaults or a small sample
- create new recommendations that are not present in the artifact
- silently fill in missing evidence gaps

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

Validate that the artifact includes evidence, confidence, and progressive disclosure decisions for each recommendation.
Also validate that every `link_only` recommendation includes at least one concrete link target to a canonical doc, config, or example.
If the artifact is missing that detail, treat it as incomplete:
```
Analysis artifact is missing evidence-backed recommendation detail.
Re-run oat-agent-instructions-analyze before applying changes.
```
Then stop.

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

For each finding, provider baseline gap, and coverage gap in the analysis artifact, determine the action.
The artifact should already specify the rationale, evidence, confidence, and disclosure decision.
Do not rediscover conventions from scratch during this step.

**For provider baseline gaps (always-on provider files):**
- Treat them as first-class recommendations from the artifact, not as implied apply-time behavior
- Examples include missing Claude `CLAUDE.md` import shims and missing `.github/copilot-instructions.md` shims
- Carry forward the artifact's evidence refs, confidence, and disclosure mode into the plan
- If the artifact marks a provider-baseline recommendation `omit`, do not include it in the apply plan
- If the artifact marks a provider-baseline recommendation `ask_user`, include it with the evidence and require explicit user approval

**For coverage gaps (new files):**
- Determine the target file path based on the directory and provider
- Select the appropriate template from `references/instruction-file-templates/`
- For AGENTS.md files: use `agents-md-root.md` or `agents-md-scoped.md`
- For glob-scoped rules: use `glob-scoped-rule.md` body + appropriate `frontmatter/` wrapper
- Carry forward the artifact's evidence refs, confidence, and disclosure mode into the plan
- If the artifact marks a coverage-gap recommendation `omit`, do not include it in the apply plan
- If the artifact marks a coverage-gap recommendation `ask_user`, include it with the evidence and require explicit user approval
- If a `link_only` coverage-gap recommendation has no link target, stop and ask for a fresh analysis instead of guessing

**For quality findings (updates to existing files):**
- Identify the specific issue and the fix
- Preserve existing manual customizations — only modify the problematic section
- If the artifact marks a recommendation `omit`, do not include it in the apply plan
- If the artifact marks a recommendation `ask_user`, include it with the evidence and require explicit user approval
- If evidence is missing or stale, stop and ask for a fresh analysis instead of guessing

**Multi-format composition order:**
1. **AGENTS.md first** — the canonical, provider-agnostic file
2. **CLAUDE.md** — if claude provider is active, ensure `@AGENTS.md` import exists
3. **Glob-scoped rules** — identical body content, stamped with per-provider frontmatter:
   - Claude: `.claude/rules/{name}.md` with `paths` frontmatter
   - Cursor: `.cursor/rules/{name}.mdc` with `alwaysApply`/`globs`/`description` frontmatter
   - Copilot: `.github/instructions/{name}.instructions.md` with `applyTo` frontmatter
4. **Copilot shim** — if copilot provider is active, generate `.github/copilot-instructions.md` from `frontmatter/copilot-shim.md` template

Fill the apply plan template at `references/apply-plan-template.md` with each recommendation.

Persist the exact markdown plan shown to the user as `APPLY_PLAN_MARKDOWN` (including recommendation tables and the summary table). This is the source that must be embedded in the PR description.

### Step 3: User Reviews Plan

Present the full recommendation plan to the user first, then ask which review mode they want:
- **apply all** — approve the full set as presented
- **apply interactively** — switch to recommendation-by-recommendation review
- **discuss** — pause for questions, adjustments, or scope changes before approval
- **cancel** — stop without applying anything

For the review-mode choice:
- Claude Code: use `AskUserQuestion`
- Codex: use structured user-input tooling when available in the current host/runtime
- Fallback: ask in plain text

The prompt should ask for exactly one of: `apply all`, `apply interactively`, `discuss`, `cancel`.

If the user chooses **cancel**, output "No actions approved. Exiting." and stop.

If the user chooses **apply all**:
- confirm that the full plan is approved
- capture any global notes that apply across the whole plan
- treat all non-blocked recommendations as approved unless the user names exceptions

If the user chooses **apply interactively**:
- for each recommendation, ask:
  - **approve** — proceed with generation
  - **modify** — approve with user-specified changes
  - **skip** — do not act on this recommendation
- use the same host-specific question handling (`AskUserQuestion` / Codex structured input when available / plain text fallback)
- wait for user decisions on all recommendations before proceeding

If the user chooses **discuss**:
- answer questions and revise the plan if needed
- re-present the updated plan and ask again: `apply all`, `apply interactively`, `discuss`, or `cancel`

If all recommendations are skipped, output "No actions approved. Exiting." and stop.

Build an `APPLIED_PLAN_DETAILS` block from approved/modified recommendations with:
- Recommendation ID
- Action (create/update)
- Target path
- Provider
- Disclosure
- Evidence refs
- Decision (`approved_via_apply_all` / `approved` / `modified`)
- User notes (if any)

Also build `APPLIED_PLAN_MARKDOWN`: a markdown block containing only the approved/modified recommendation sections from the presented plan, preserving table formatting.

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
2. Read only the project context needed to fill the approved recommendation:
   - the evidence files cited in the artifact
   - `package.json` for commands and dependencies
   - directory structure for architecture section
   - existing instruction files for consistency
3. Generate the file content by filling the template with project-specific details from the cited evidence.
4. Preserve progressive disclosure decisions from the artifact:
   - `inline` → keep the essential rule in the instruction file
   - `link_only` → add a concise pointer to the canonical doc/config/example
   - `omit` → do not encode the item in the instruction file
   - `ask_user` → require explicit user confirmation before writing
5. For glob-scoped rules across multiple providers:
   - Write the body content once (from `glob-scoped-rule.md` template)
   - Stamp with each provider's frontmatter
   - Verify body content is identical across all provider versions

**Updating existing files:**

1. Read the existing file.
2. Identify the section(s) that need updating based on the finding.
3. Make targeted edits using only the approved recommendation and its cited evidence.
4. Do not rewrite the entire file unless the user explicitly approves.

**Negative rules:**
- Do not add tabs-vs-spaces, quote style, import sorting, naming, or similar formatting rules unless the artifact cites repo evidence for them.
- Do not upgrade a repeated code pattern into a hard instruction unless the artifact already approved it.
- If formatter/linter config exists, prefer `run formatter/lint` or a link to the config/doc over prose restatement of the same rule.
- If a cited source no longer exists, stop that recommendation and ask for a fresh analysis or user guidance.

**Required context — read these docs before generating:**
- `.agents/docs/agent-instruction.md` — quality criteria and best practices
- `.agents/docs/rules-files.md` — cross-provider format reference
- `.agents/docs/cursor-rules-files.md` — Cursor-specific `.mdc` format (if cursor provider is active)

### Step 6: Commit and PR

**Stage and commit:**

```bash
git add {list of generated/updated files}
git commit -m "chore: update agent instruction files

Generated by oat-agent-instructions-apply from analysis artifact.
Files: {count} created, {count} updated."
```

**Ask user about PR:**

Use host-specific question handling here as well:
- Claude Code: use `AskUserQuestion`
- Codex: use structured user-input tooling when available in the current host/runtime
- Fallback: ask in plain text

```
Files committed. Options:
1. Push and create PR (requires gh CLI)
2. Push only (create PR manually)
3. Keep local (no push)

Choose:
```

**If creating PR:**

The PR body must include both:
1. **Overview** — why this PR exists, source analysis artifact, and provider scope.
2. **Applied Plan Details** — the exact plan markdown presented in terminal (tables included), filtered to approved/modified recommendations.

```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
gh pr create --base main \
  --title "chore: update agent instruction files" \
  --body "$(cat <<'PRBODY'
## Overview

- Generated/updated agent instruction files based on analysis
- Source: {analysis-artifact-path}
- Providers: {provider-list}
- Result: {N} created, {N} updated, {N} skipped

## Applied Plan Details

The following section is copied from the presented apply plan (`APPLY_PLAN_MARKDOWN`), preserving its tables:

{APPLY_PLAN_MARKDOWN}

## Applied Plan Summary

| Rec # | Action | Target | Provider | Decision | Notes |
|------:|--------|--------|----------|----------|-------|
| {1} | {create/update} | `{path}` | {provider} | {approved/modified} | {note or "-"} |
| ... | ... | ... | ... | ... | ... |

## Changes

{list of files created/updated with brief rationale}

## Verification

- [ ] Instruction files follow quality checklist
- [ ] No content duplication across formats
- [ ] Glob-scoped rules have identical body content across providers
- [ ] Commands referenced in instruction files are valid
- [ ] Every non-obvious convention in generated text is backed by cited analysis evidence
PRBODY
)"
```

**If `gh` is not available or fails:**

```
PR creation failed. To create manually:
1. Push: git push -u origin {branch}
2. Open PR at your repository's web interface
3. Use this structure in the PR body:
   - `## Overview`
   - `## Applied Plan Details`
   - Paste `APPLY_PLAN_MARKDOWN` (tables intact) under `## Applied Plan Details`
   - `## Applied Plan Summary`
   - `## Changes`
   - `## Verification`
```

### Step 7: Update Tracking and Output Summary

**Update tracking:**

```bash
SCRIPT_DIR=".agents/skills/oat-agent-instructions-analyze/scripts"
ROOT_TARGET=$(bash "$SCRIPT_DIR/resolve-tracking.sh" root)
ROOT_HASH=$(echo "$ROOT_TARGET" | jq -r '.commitHash')
ROOT_BRANCH=$(echo "$ROOT_TARGET" | jq -r '.baseBranch')

bash "$SCRIPT_DIR/resolve-tracking.sh" write \
  agentInstructionsApply \
  "$ROOT_HASH" \
  "$ROOT_BRANCH" \
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

- Quality criteria: `.agents/docs/agent-instruction.md`
- Cross-provider rules: `.agents/docs/rules-files.md`
- Cursor-specific format: `.agents/docs/cursor-rules-files.md`
- Analysis artifact: `.oat/repo/analysis/agent-instructions-*.md`
- Templates: `references/instruction-file-templates/`
- Apply plan template: `references/apply-plan-template.md`
- Tracking script: `scripts/resolve-tracking.sh` (symlink to analyze skill)
