---
name: oat-agent-instructions-analyze
version: 1.3.0
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
  - `[1/9] Resolving providers + mode…`
  - `[2/9] Discovering instruction files…`
  - `[3/9] Evaluating quality…`
  - `[4/9] Assessing directory coverage gaps…`
  - `[5/9] Discovering file-type patterns…`
  - `[6/9] Checking for drift…`
  - `[7/9] Checking cross-format consistency…`
  - `[8/9] Writing analysis artifact…`
  - `[9/9] Updating tracking + summary…`

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

### Step 4: File-Type Pattern Discovery

Discover cross-cutting file-type patterns that warrant glob-scoped rules. This step runs independently of directory coverage assessment — it identifies patterns that span multiple directories and are best addressed with targeted rules rather than directory-level instruction files.

Follow the systematic process in `references/file-type-discovery-checklist.md`.

**1. Scan for file-type patterns:**

Search the repo for files matching common naming conventions (test files, story files, style files, config files, schema files, etc.). For each pattern with 5+ matching files, proceed to sampling.

```bash
# Example discovery commands
find . -name '*.stories.tsx' -not -path '*/node_modules/*' | wc -l
find . -name '*.test.tsx' -not -path '*/node_modules/*' | wc -l
find . -name 'styles.ts' -not -path '*/node_modules/*' | wc -l
```

**2. Sample and assess consistency:**

For each pattern with 5+ files, sample 3–5 representative files from different directories. Check for:

- Structural consistency (shared imports, exports, boilerplate)
- Required wrapping or providers
- Naming conventions beyond the file extension

Quantify: `N/M files follow pattern`. Patterns with >80% consistency are strong candidates.

**3. Check for exception patterns (highest priority):**

Identify file-type patterns that require an **exception** to a project-wide rule. These are the most valuable rules because agents will follow the general rule and produce incorrect code without guidance. Examples:

- Story files needing `export default` when the project bans default exports
- Test files needing specific providers/wrappers not obvious from the framework
- Config files using CommonJS in an ESM project
- Generated files that agents should never hand-edit

**4. Assess correctness impact:**

For each pattern, determine what breaks when an agent writes a new file without the rule:

- **Crashes/breaks:** Code won't compile, tests won't run, app crashes
- **Visual/behavioral bugs:** Code runs but produces wrong results
- **Lint/CI failures:** Code works but fails automated checks
- **Style inconsistency:** Code works but doesn't match conventions

**5. Assign severity using calibrated scale:**

- **High:** Exception to project-wide rule AND code breaks/fails lint; OR >20 files AND correctness impact
- **Medium:** >20 files AND lint/CI failures; OR 5–20 files with correctness impact
- **Low:** Style consistency only, no correctness impact

**In delta mode:** Still run the full file-type scan. File-type patterns are repo-wide concerns that may not intersect with recently-changed directories but are still high-value for agent correctness.

Record all discovered patterns in the artifact's Glob-Scoped Rule Opportunities table with consistency counts, correctness impact, and exception-to-rule flags.

### Step 5: Drift Detection (Delta Mode Only)

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

### Step 6: Cross-Format Consistency (Multi-Provider Only)

**Skip if only one provider (agents_md) is active.**

For glob-scoped rules that target the same file patterns across providers:

1. Extract the body content (below frontmatter) from each provider's version.
2. Compare bodies — they should be identical.
3. Flag divergence as a Medium finding.

### Step 7: Write Analysis Artifact

Generate the analysis artifact using the template at `references/analysis-artifact-template.md`.

```bash
TIMESTAMP=$(date -u +"%Y-%m-%d-%H%M")
ARTIFACT_PATH=".oat/repo/analysis/agent-instructions-${TIMESTAMP}.md"
```

Fill in all template sections with findings from Steps 2-6.

The artifact is the contract for apply. It must contain:

- exact evidence references for each finding and recommendation
- confidence for each recommendation
- progressive disclosure decisions (`inline`, `link_only`, `omit`, `ask_user`)
- canonical documentation/config links when deeper detail should stay out of always-on instructions

Write the artifact to `$ARTIFACT_PATH`.

### Step 8: Update Tracking and Output Summary

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
- File-type discovery: `references/file-type-discovery-checklist.md`
- Artifact template: `references/analysis-artifact-template.md`
- Tracking script: `scripts/resolve-tracking.sh`
- Provider resolution: `scripts/resolve-providers.sh`
- File discovery: `scripts/resolve-instruction-files.sh`
