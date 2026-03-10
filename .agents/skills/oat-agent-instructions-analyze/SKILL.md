---
name: oat-agent-instructions-analyze
version: 1.2.0
description: Run when you need to evaluate agent instruction file coverage, quality, and drift. Produces a severity-rated analysis artifact. Run before oat-agent-instructions-apply to identify what needs improvement.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Agent Instructions Analysis

Scan, evaluate, and report on agent instruction file coverage, quality, and drift across all detected providers.

## Prerequisites

- Git repository with at least one instruction file (AGENTS.md at root is the baseline).
- `jq` available in PATH (used by helper scripts).

## Mode Assertion

**OAT MODE: Agent Instructions Analysis**

**Purpose:** Evaluate instruction file quality and coverage, produce an actionable analysis artifact.

**BLOCKED Activities:**

- No modifying or creating instruction files (that's the apply skill's job).
- No changing repo configuration.

**ALLOWED Activities:**

- Reading all instruction files and project configuration.
- Running helper scripts for discovery.
- Writing analysis artifact to `.oat/repo/analysis/`.
- Updating `.oat/tracking.json`.

## Analyze vs Apply Boundary

`oat-agent-instructions-analyze` owns discovery, evaluation, evidence gathering, and recommendation shaping.
The analysis artifact must be detailed enough that `oat-agent-instructions-apply` can execute approved
recommendations without rediscovering repo conventions from scratch.

`oat-agent-instructions-apply` may verify that cited files still exist and may read those same cited
sources while generating output, but it must not invent unsupported conventions, create new recommendations,
or fill in missing evidence gaps on its own.

## Progress Indicators (User-Facing)

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ AGENT INSTRUCTIONS ANALYSIS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Step indicators:
  - `[1/7] Resolving providers + mode…`
  - `[2/7] Discovering instruction files…`
  - `[3/7] Evaluating quality…`
  - `[4/7] Assessing coverage gaps…`
  - `[5/7] Checking for drift…`
  - `[6/7] Writing analysis artifact…`
  - `[7/7] Updating tracking + summary…`

## Process

### Step 0: Resolve Providers and Mode

**Resolve providers:**

```bash
SCRIPT_DIR=".agents/skills/oat-agent-instructions-analyze/scripts"
PROVIDERS=$(bash "$SCRIPT_DIR/resolve-providers.sh" --non-interactive)
# Or with explicit override:
# PROVIDERS=$(bash "$SCRIPT_DIR/resolve-providers.sh" --providers claude,cursor)
```

If running interactively (user invoked the skill directly), omit `--non-interactive` to allow the user to confirm or add providers.

**Resolve analysis mode (delta vs full):**

```bash
TRACKING=$(bash "$SCRIPT_DIR/resolve-tracking.sh" read agentInstructions)
```

- If `TRACKING` is non-empty, extract `commitHash` from the JSON.
- Verify the stored commit is resolvable:
  ```bash
  git rev-parse --verify "$STORED_HASH^{commit}" 2>/dev/null
  ```
- **If resolvable:** use delta mode — scope gap/drift analysis to directories containing files changed since that commit.
- **If unresolvable or empty:** use full mode. Log: "Previous tracking commit not found — running full analysis."

Delta mode scoping:

```bash
git diff --name-only "$STORED_HASH"..HEAD
```

Use the changed file list to limit coverage gap assessment (Step 4) and drift detection (Step 5) to affected directories. Quality evaluation (Step 3) always runs on ALL instruction files regardless of mode.

### Step 1: Discover Instruction Files

```bash
echo "$PROVIDERS" | bash "$SCRIPT_DIR/resolve-instruction-files.sh"
```

This outputs tab-separated `provider\tpath` lines. Parse into an inventory for evaluation.

If no instruction files are found at all (not even a root AGENTS.md), report this as a Critical finding and recommend creating one via `oat-agent-instructions-apply`.

### Step 2: Evaluate Quality

For each discovered instruction file, evaluate against the quality checklist at `references/quality-checklist.md`.

**Required context — read these docs before evaluating:**

- `.agents/docs/agent-instruction.md` — full quality criteria and best practices
- `.agents/docs/rules-files.md` — cross-provider rules file format reference
- `.agents/docs/cursor-rules-files.md` — Cursor-specific `.mdc` format reference (if cursor provider is active)

**Evidence standard:**

- Every non-obvious convention, drift claim, or proposed rule must be backed by concrete evidence captured in the artifact.
- Preferred evidence sources: formatter/linter/editor config (`.editorconfig`, oxlint, oxfmt, ESLint, Prettier, Ruff, etc.),
  `package.json` scripts, existing checked-in instruction files, repo documentation, and repeated codebase patterns
  with exact file references.
- Do **not** infer formatting or linting conventions from ecosystem defaults or a small code sample.
- If a formatter or linter already enforces a rule, prefer recording the command and linking to the config/doc rather
  than restating tabs/spaces, quote style, import ordering, or similar trivia as prose instructions.

**For each file:**

1. Read the file content.
2. Read the local evidence sources needed to validate the file's claims.
3. Check each applicable criterion from the quality checklist.
4. Note findings with severity ratings, exact source refs, and a confidence rating.
5. Record a disclosure decision for each recommendation: `inline`, `link_only`, `omit`, or `ask_user`.
6. Record line count and quality assessment (pass / minor issues / significant issues / major issues).

**Provider-specific validation:**

- **AGENTS.md**: Check section structure, command accuracy, size budget.
- **CLAUDE.md**: Verify `@AGENTS.md` import if present, check for content duplication with AGENTS.md.
- **Claude rules** (`.claude/rules/*.md`): Validate `paths` frontmatter if conditional.
- **Cursor rules** (`.cursor/rules/*.mdc`): Validate frontmatter fields (`alwaysApply`, `globs`, `description`).
- **Copilot instructions** (`.github/instructions/*.instructions.md`): Validate `applyTo` frontmatter.
- **Copilot shim** (`.github/copilot-instructions.md`): Verify it's a minimal pointer, not content duplication.

### Step 3: Assess Coverage Gaps

Walk the directory tree and evaluate each directory against `references/directory-assessment-criteria.md`.

Before general coverage-gap analysis, assess **provider baseline gaps** for every active provider.
These checks are mandatory even when the missing file does not appear in the discovered inventory.

Provider baseline examples:

- **Claude**: if a directory has `AGENTS.md` and the claude provider is active but the matching `CLAUDE.md` shim is missing, record an explicit recommendation to create `CLAUDE.md` with the canonical `@AGENTS.md` import. This applies to **every** directory with an `AGENTS.md` — root and nested alike (e.g., `packages/cli/AGENTS.md` → `packages/cli/CLAUDE.md`).
- **Copilot**: if the copilot provider is active but `.github/copilot-instructions.md` is missing, record an explicit recommendation to create the minimal Copilot shim.
- **agents_md / codex**: no extra always-on shim beyond `AGENTS.md`.

Do not leave these as implied apply-time behavior. They must appear in the analysis artifact as explicit provider-baseline recommendations.

**Chained recommendations for new AGENTS.md files:**

When a coverage-gap recommendation proposes creating a **new** `AGENTS.md` in a subdirectory, also emit the corresponding provider-baseline recommendations for that directory in the same artifact. For example, if the analysis recommends creating `packages/cli/AGENTS.md` and the claude provider is active, it must also recommend creating `packages/cli/CLAUDE.md` with `@AGENTS.md`. Do not defer these to a follow-up analysis — they belong in the same artifact so `oat-agent-instructions-apply` can generate both files in one pass.

**In delta mode:** Only assess directories that contain files changed since the last tracked commit. Skip unchanged directories.

**In full mode:** Assess all directories (excluding `node_modules/`, `dist/`, `.git/`, `.oat/`, etc.).

For each directory meeting 1+ primary indicators from the criteria doc:

- Check if it's covered by an existing instruction file (either a direct AGENTS.md or a parent's scoped rule with matching globs).
- If uncovered, add to the coverage gaps list with severity, evidence, and a recommendation.
- For each recommendation, decide what belongs inline vs what should link to deeper documentation or config files.

### Step 4: Drift Detection (Delta Mode Only)

**Skip this step entirely in full mode.**

For files changed since the last tracked commit:

1. Identify the nearest parent instruction file for each changed file.
2. Check if the instruction file references the changed file's patterns, conventions, or commands.
3. Flag instruction files that may be stale due to the changes.

Common drift signals:

- Changed file is in a directory whose AGENTS.md references removed/renamed paths.
- New package.json scripts not reflected in instruction file commands.
- New dependencies or framework changes not reflected in tech stack documentation.
- Existing instructions claim formatting/style conventions that are not backed by current repo evidence.

### Step 5: Cross-Format Consistency (Multi-Provider Only)

**Skip if only one provider (agents_md) is active.**

For glob-scoped rules that target the same file patterns across providers:

1. Extract the body content (below frontmatter) from each provider's version.
2. Compare bodies — they should be identical.
3. Flag divergence as a Medium finding.

### Step 6: Write Analysis Artifact

Generate the analysis artifact using the template at `references/analysis-artifact-template.md`.

```bash
TIMESTAMP=$(date -u +"%Y-%m-%d-%H%M")
ARTIFACT_PATH=".oat/repo/analysis/agent-instructions-${TIMESTAMP}.md"
```

Fill in all template sections with findings from Steps 2-5.

The artifact is the contract for apply. It must contain:

- exact evidence references for each finding and recommendation
- confidence for each recommendation
- progressive disclosure decisions (`inline`, `link_only`, `omit`, `ask_user`)
- canonical documentation/config links when deeper detail should stay out of always-on instructions

Write the artifact to `$ARTIFACT_PATH`.

### Step 7: Update Tracking and Output Summary

**Update tracking:**

```bash
ROOT_TARGET=$(bash "$SCRIPT_DIR/resolve-tracking.sh" root)
ROOT_HASH=$(echo "$ROOT_TARGET" | jq -r '.commitHash')
ROOT_BRANCH=$(echo "$ROOT_TARGET" | jq -r '.baseBranch')

bash "$SCRIPT_DIR/resolve-tracking.sh" write \
  agentInstructions \
  "$ROOT_HASH" \
  "$ROOT_BRANCH" \
  "{mode}" \
  --artifact-path "$ARTIFACT_PATH" \
  {providers...}
```

**Output summary to the user:**

```
Analysis complete.

  Files evaluated:  {N}
  Coverage:         {N}% of assessed directories
  Mode:             {full|delta}
  Providers:        {list}

  Findings:
    Critical:  {N}
    High:      {N}
    Medium:    {N}
    Low:       {N}

  Artifact: {artifact_path}

Next step: Run oat-agent-instructions-apply to act on these findings.
```

## Deferred from v1

- `AGENTS.override.md` discovery and evaluation
- Subagent parallelization for large repos
- Auto-fix mode (directly patching instruction files without apply workflow)

## References

- Quality criteria source: `.agents/docs/agent-instruction.md`
- Cross-provider rules reference: `.agents/docs/rules-files.md`
- Cursor-specific format: `.agents/docs/cursor-rules-files.md`
- Copilot instruction system: `.oat/repo/reviews/github-copilot-instructions-research-2026-02-19.md`
- Quality checklist: `references/quality-checklist.md`
- Directory criteria: `references/directory-assessment-criteria.md`
- Artifact template: `references/analysis-artifact-template.md`
- Tracking script: `scripts/resolve-tracking.sh`
- Provider resolution: `scripts/resolve-providers.sh`
- File discovery: `scripts/resolve-instruction-files.sh`
