---
name: oat-agent-instructions-analyze
version: 1.5.2
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
  - `[1/10] Resolving providers + mode…`
  - `[2/10] Discovering instruction files…`
  - `[3/10] Discovering documentation surfaces…`
  - `[4/10] Evaluating quality…`
  - `[5/10] Assessing directory coverage gaps…`
  - `[6/10] Discovering file-type patterns…`
  - `[7/10] Checking for drift…`
  - `[8/10] Checking cross-format consistency…`
  - `[9/10] Writing analysis artifact…`
  - `[10/10] Updating tracking + summary…`

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

Use the changed file list to limit coverage gap assessment (Step 5) and drift detection (Step 7) to affected directories. Quality evaluation (Step 4) always runs on ALL instruction files regardless of mode.

### Step 1: Discover Instruction Files

```bash
echo "$PROVIDERS" | bash "$SCRIPT_DIR/resolve-instruction-files.sh"
```

This outputs tab-separated `provider\tpath` lines. Parse into an inventory for evaluation.

If no instruction files are found at all (not even a root AGENTS.md), report this as a Critical finding and recommend creating one via `oat-agent-instructions-apply`.

### Step 2: Discover Documentation Surfaces

Scan the repository for documentation surfaces that instruction files could reference. This inventory feeds into
quality evaluation (Criterion 14) and provides concrete link targets for `link_only` disclosure decisions.

**Discovery sources (check all; none are required — this must work with or without OAT configuration):**

**1. OAT docs config (if available):**

```bash
# Only if .oat/config.json exists
cat .oat/config.json 2>/dev/null | jq -r '.documentation // empty'
```

If present, extract `root` and `index` paths. Use these as the primary docs surface, but do not skip other sources.

**2. Docs directories:**

Scan for directories named `docs/`, `doc/`, and `apps/*/docs/`. For each found directory:

- Check for `index.md` files
- If an `index.md` contains a `## Contents` section, parse the topic-to-path map (these follow the OAT docs index contract)
- Record each docs directory with its topic coverage

```bash
# Example discovery
find . -maxdepth 3 -type d -name 'docs' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.oat/*' -not -path '*/dist/*'
```

**3. READMEs:**

Find `README.md` files at the root and in key subdirectories (packages, apps, modules, services).
READMEs are often the only documentation for a package and are valuable link targets for scoped instruction files.

```bash
find . -maxdepth 3 -name 'README.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*'
```

**4. Knowledge base (only if current):**

Check if `.oat/repo/knowledge/` exists and contains files. If so:

- Read `project-index.md` frontmatter for `oat_generated_at` and `oat_source_main_merge_base_sha`
- Compare merge-base SHA against current HEAD to assess staleness:
  ```bash
  KNOWLEDGE_SHA=$(grep 'oat_source_main_merge_base_sha' .oat/repo/knowledge/project-index.md 2>/dev/null | awk '{print $2}')
  if [ -n "$KNOWLEDGE_SHA" ]; then
    FILES_CHANGED=$(git diff --name-only "$KNOWLEDGE_SHA"..HEAD 2>/dev/null | wc -l)
    GENERATED_AT=$(grep 'oat_generated_at' .oat/repo/knowledge/project-index.md | awk '{print $2}')
  fi
  ```
- **Include in inventory only if reasonably current** (≤20 files changed since merge-base AND ≤7 days old)
- If stale, record as `stale` in the inventory but **do not recommend linking to stale knowledge files**
- Available knowledge files: `architecture.md`, `conventions.md`, `stack.md`, `structure.md`, `testing.md`, `integrations.md`, `concerns.md`

**5. Standalone documentation files:**

Scan for common standalone docs:

- `ARCHITECTURE.md`, `DESIGN.md`, `CONTRIBUTING.md` at repo root
- `ADR/` or `decisions/` directories (architectural decision records)
- `.github/*.md` files (excluding templates like `PULL_REQUEST_TEMPLATE.md`)

```bash
# Example discovery
ls ARCHITECTURE.md DESIGN.md CONTRIBUTING.md 2>/dev/null
find . -maxdepth 1 -type d \( -name 'ADR' -o -name 'decisions' \) 2>/dev/null
find .github -maxdepth 1 -name '*.md' -not -name 'PULL_REQUEST_TEMPLATE*' -not -name 'ISSUE_TEMPLATE*' 2>/dev/null
```

**Output:**

Build a Documentation Inventory for the analysis artifact. Each entry records:

| Field        | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| Type         | `docs-app`, `readme`, `knowledge`, `standalone`                             |
| Path         | Relative path from repo root                                                |
| Topics/Scope | What the doc covers (e.g., "CLI usage", "architecture, conventions")        |
| Current?     | `current`, `stale`, or `N/A` (for non-versioned docs like READMEs)          |
| Notes        | Additional context (e.g., "OAT config root", "package-level", "thin index") |

This inventory is used by:

- **Step 3 (Evaluate Quality):** When checking Criterion 12 (Progressive Disclosure) and Criterion 14 (Available Documentation Is Referenced), use the inventory to identify whether instruction files reference available docs and whether content is duplicated that could use `link_only`.
- **Step 4 (Coverage Gaps):** When recommending new AGENTS.md files, populate the `Link Targets` field with docs from this inventory that are topically relevant to the directory scope. Prefer scope-specific docs over project-wide docs.
- **Step 8 (Write Artifact):** Include the full Documentation Inventory table in the artifact. Use inventory paths as link targets in the Progressive Disclosure Decisions table.

### Step 3: Evaluate Quality

For each discovered instruction file, evaluate against the quality checklist at `references/quality-checklist.md`.

**Required context — read these bundled skill docs before evaluating:**

These docs are bundled with this skill under `references/docs/` and should be read from that location,
not from repo-root `.agents/docs/`.

- `references/docs/agent-instruction.md` — full quality criteria and best practices
- `references/docs/rules-files.md` — cross-provider rules file format reference
- `references/docs/cursor-rules-files.md` — Cursor-specific `.mdc` format reference (if cursor provider is active)

**Evidence standard:**

- Every non-obvious convention, drift claim, or proposed rule must be backed by concrete evidence captured in the artifact.
- Preferred evidence sources: formatter/linter/editor config (`.editorconfig`, oxlint, oxfmt, ESLint, Prettier, Ruff, etc.),
  `package.json` scripts, existing checked-in instruction files, repo documentation, and repeated codebase patterns
  with exact file references.
- Do **not** infer formatting or linting conventions from ecosystem defaults or a small code sample.
- If a formatter or linter already enforces a rule, prefer recording the command and linking to the config/doc rather
  than restating tabs/spaces, quote style, import ordering, or similar trivia as prose instructions.

**Documentation inventory integration:**

When evaluating Criterion 12 (Progressive Disclosure) and Criterion 14 (Available Documentation Is Referenced), use the
documentation inventory from Step 2 to:

- Check whether instruction files reference available project documentation in their References section
- Check whether scoped instruction files reference docs topically relevant to their directory scope
- Identify content in instruction files that duplicates information available in docs — recommend `link_only` with the specific doc path
- Verify that any doc links in instruction files point to docs that still exist

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

### Step 4: Assess Coverage Gaps

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
- When recommending new AGENTS.md files, use the documentation inventory from Step 2 to populate the `Link Targets`
  field with docs topically relevant to the directory scope. Prefer scope-specific docs (e.g., a package README or
  package-level docs directory) over project-wide docs. If the directory has a `README.md` or a nearby `docs/` tree,
  include those paths as link targets for the new file's References section.

### Step 5: File-Type Pattern Discovery

Discover cross-cutting file-type patterns that warrant glob-scoped rules. This step runs independently of directory coverage assessment — it identifies patterns that span multiple directories and are best addressed with targeted rules rather than directory-level instruction files.

Follow the systematic process in `references/file-type-discovery-checklist.md`.

**Core principle:** The goal is not to prove consistency from file counts. The goal is to find non-obvious conventions, competing sub-patterns, and failure modes that would cause an agent to generate the wrong file.

**1. Scan for file-type patterns and co-located directory conventions:**

Search the repo for files matching common naming conventions (test files, story files, style files, config files, schema files, etc.). Also scan for directory-level co-location conventions where the meaningful pattern is a set of files that appear together in a repeated structure.

For each file or directory pattern with 5+ occurrences, proceed to calibrated sampling and deep-read investigation.

```bash
# Example discovery commands
find . -name '*.stories.tsx' -not -path '*/node_modules/*' | wc -l
find . -name '*.test.tsx' -not -path '*/node_modules/*' | wc -l
find . -name 'styles.ts' -not -path '*/node_modules/*' | wc -l
```

**2. Calibrate sample size to detect splits, not just consistency:**

Use these minimums:

- 5–10 matching files: read **all** of them
- 11–30 files: sample **8–12** files across different directories and different git ages
- 30+ files: sample **12–15** files across directories; if any inconsistency appears, expand sampling enough to confirm the split ratio

Do not take all samples from one directory or one generation of files. Mix older and newer files because convention splits often correlate with time.

**3. Deep-read the sample and investigate behavioral consistency:**

For every pattern with 5+ files, read the sampled files and answer:

- What non-obvious setup is required: shared imports, wrappers, providers, helper classes, framework extensions, generated markers, or required boilerplate?
- What behavioral conventions exist inside the files: registration patterns, instantiation style, setup/teardown style, schema/API versions, escaping/sanitization patterns?
- What co-located files or directory structure are assumed: sibling templates, configs, PHP/JS pairs, block metadata, fixtures, shared helpers?
- What would break if an agent copied the wrong example: compile failure, runtime/test failure, incorrect registration, XSS/security issue, CI failure?

**4. Prioritize competing sub-patterns and exception cases:**

Quantify the discovered behavior, not just the filename suffix. Record `N/M files follow pattern A` and, if relevant, `X/Y directories follow structure B`.

Treat these as the highest-priority rule opportunities:

- **Competing sub-patterns**, especially roughly `40–60%` or `50–50%` splits. These are more valuable than perfect consistency because agents are likely to guess wrong.
- **File-type-specific deviations from project-wide rules**, not just export style. Check for any file-type-specific exception such as different imports, instantiation style, security handling, lint suppressions, schema/API versions, or registration mechanisms.
- **Security-sensitive patterns**, especially in templates and rendering code. For PHP/WordPress, inspect `template.php`-style files for escaping, sanitization, and `phpcs:ignore` usage. For React/JS, inspect `dangerouslySetInnerHTML`, raw HTML rendering, and similar exception patterns. Also watch for raw SQL, shell execution, or other sensitive sinks when relevant to the stack.

Patterns with >80% consistency are still useful, but unresolved splits are often the most important because they represent active ambiguity in production code.

**5. Assess correctness impact and assign severity:**

For each pattern, determine what breaks when an agent writes a new file without the rule:

- **Crashes/breaks:** Code won't compile, tests won't run, app crashes
- **Visual/behavioral bugs:** Code runs but produces wrong results
- **Security vulnerability:** Wrong escaping/sanitization, unsafe HTML, raw query/command usage
- **Lint/CI failures:** Code works but fails automated checks
- **Style inconsistency:** Code works but doesn't match conventions

Assign severity using the calibrated scale in the checklist. Give extra weight to:

- security-sensitive patterns
- competing sub-patterns with a meaningful split ratio
- file-type-specific exceptions to general project conventions

**In delta mode:** Still run the full file-type scan. File-type patterns are repo-wide concerns that may not intersect with recently-changed directories but are still high-value for agent correctness.

Record all discovered patterns in the artifact's Glob-Scoped Rule Opportunities table with consistency counts, competing sub-pattern notes, correctness impact, and exception-to-rule flags.

### Step 6: Drift Detection (Delta Mode Only)

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

### Step 7: Cross-Format Consistency (Multi-Provider Only)

**Skip if only one provider (agents_md) is active.**

For glob-scoped rules that target the same file patterns across providers:

1. Extract the body content (below frontmatter) from each provider's version.
2. Compare bodies — they should be identical.
3. Flag divergence as a Medium finding.

### Step 8: Write Analysis Artifact

Generate the analysis artifact using the template at `references/analysis-artifact-template.md`.

```bash
TIMESTAMP=$(date -u +"%Y-%m-%d-%H%M")
ARTIFACT_PATH=".oat/repo/analysis/agent-instructions-${TIMESTAMP}.md"
```

Fill in all template sections with findings from Steps 2-7.

The artifact is the contract for apply. It must contain:

- exact evidence references for each finding and recommendation
- confidence for each recommendation
- progressive disclosure decisions (`inline`, `link_only`, `omit`, `ask_user`)
- canonical documentation/config links when deeper detail should stay out of always-on instructions

Write the artifact to `$ARTIFACT_PATH`.

### Step 9: Update Tracking and Output Summary

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

- Bundled quality criteria source: `references/docs/agent-instruction.md`
- Bundled cross-provider rules reference: `references/docs/rules-files.md`
- Bundled Cursor-specific format reference: `references/docs/cursor-rules-files.md`
- Copilot instruction system: `.oat/repo/reviews/github-copilot-instructions-research-2026-02-19.md`
- Quality checklist: `references/quality-checklist.md`
- Directory criteria: `references/directory-assessment-criteria.md`
- File-type discovery: `references/file-type-discovery-checklist.md`
- Artifact template: `references/analysis-artifact-template.md`
- Tracking script: `scripts/resolve-tracking.sh`
- Provider resolution: `scripts/resolve-providers.sh`
- File discovery: `scripts/resolve-instruction-files.sh`
