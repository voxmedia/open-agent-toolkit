---
name: oat-docs-analyze
version: 1.2.0
description: Run when you need to evaluate documentation structure, navigation, and coverage against the OAT docs app contract. Produces a severity-rated analysis artifact for oat-docs-apply.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Docs Analysis

Scan a repository's documentation surface, evaluate it against the OAT docs contract, and write an actionable analysis artifact.

## Prerequisites

- Git repository with either an MkDocs app, a `docs/` tree, or root-level Markdown docs.
- `jq` available in PATH for tracking updates.

## Mode Assertion

**OAT MODE: Docs Analysis**

**Purpose:** Evaluate documentation quality, coverage, navigation, and `index.md` contract conformance.

**BLOCKED Activities:**
- No editing documentation files.
- No scaffolding new docs apps.
- No modifying `mkdocs.yml` or navigation.

**ALLOWED Activities:**
- Reading docs trees, MkDocs config, and related repository metadata.
- Writing a docs analysis artifact to `.oat/repo/analysis/`.
- Updating docs analysis tracking metadata.

## Analyze vs Apply Boundary

`oat-docs-analyze` owns discovery, evaluation, evidence gathering, and recommendation shaping.
The analysis artifact must be detailed enough that `oat-docs-apply` can execute approved
recommendations without rediscovering docs conventions from scratch.

`oat-docs-apply` may verify that cited files still exist and may read those same cited
sources while generating output, but it must not invent unsupported docs conventions,
create new recommendations, or fill in missing evidence gaps on its own.

**Self-Correction Protocol:**
If you catch yourself:
- Editing docs content directly -> STOP and move that recommendation to the artifact.
- Rewriting navigation while analyzing -> STOP and record the required fix instead.

**Recovery:**
1. Return to read-only analysis.
2. Capture the needed change as a finding or recommendation.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening.

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ DOCS ANALYSIS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Use step indicators:
  - `[1/9] Resolving docs target + mode…`
  - `[2/9] Inventorying docs files…`
  - `[3/9] Evaluating index contract…`
  - `[4/9] Assessing quality + coverage…`
  - `[5/9] Verifying substantive claims…`
  - `[6/9] Finding content opportunities…`
  - `[7/9] Checking nav and drift…`
  - `[8/9] Writing analysis artifact…`
  - `[9/9] Updating tracking + summary…`

## Process

### Step 0: Resolve Docs Target and Analysis Mode

Determine the documentation root using the first matching surface:

1. `apps/*/mkdocs.yml`
2. `mkdocs.yml` at repo root
3. `docs/`
4. Root-level Markdown docs (`README.md`, `CONTRIBUTING.md`, etc.) when no docs app exists

Prefer the OAT docs app when multiple MkDocs apps exist and one is clearly the active repo docs surface.

Resolve tracking and analysis mode using the shared helper:

```bash
TRACKING_SCRIPT=".agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh"
TRACKING=$(bash "$TRACKING_SCRIPT" read docs 2>/dev/null || true)
```

- If the stored commit exists, run in `delta` mode and scope drift checks to changed docs directories.
- Otherwise run in `full` mode.

### Step 1: Inventory the Docs Surface

Build a complete inventory of:

- All Markdown files in the docs surface
- All directories containing Markdown files
- All `index.md` files
- Any `overview.md` files
- `mkdocs.yml` nav entries when present

Record the docs surface type:

- `mkdocs-app`
- `docs-tree`
- `root-markdown`

Capture the evidence sources that will justify later findings and recommendations. Prefer:

- `mkdocs.yml` and generated nav structure
- `docs/contributing.md`, contributor guides, and setup docs
- `package.json` scripts, `requirements.txt`, and docs bootstrap scripts
- existing `index.md` trees and repeated directory patterns
- exact missing or stale paths, commands, and page references

Do **not** infer docs structure conventions from a tiny sample of pages when the broader
tree or config disagrees.

### Step 2: Evaluate the `index.md` Contract

Use `references/quality-checklist.md` and `references/directory-assessment-criteria.md`.

For every documentation directory:

1. Verify `index.md` exists.
2. Verify `index.md` includes a `## Contents` section.
3. Verify the `## Contents` section maps sibling pages and immediate child directories.
4. Flag `overview.md` usage as a migration finding.
5. Verify single-file directories still expose an `index.md` entrypoint.

### Step 3: Assess Quality and Coverage

Evaluate each docs page for:

- Topic clarity
- Discoverability from a parent index
- Command/path accuracy
- Staleness indicators
- Excessive duplication
- Missing contributor guidance for enabled plugins/extensions when an MkDocs app exists

Evidence standard:

- Every non-obvious docs convention, drift claim, or recommended fix must be backed by
  concrete repo evidence captured in the artifact.
- Preferred evidence sources are MkDocs config, checked-in docs/app config, package scripts,
  contributor docs, and repeated docs-tree patterns with exact file references.
- Do **not** infer command accuracy, plugin availability, or navigation policy from defaults.
- If a command or plugin behavior is already defined in config or setup scripts, prefer
  citing those sources and linking to them rather than restating verbose operational detail
  as always-on docs guidance.

For each evaluated page or directory:

1. Read the docs file plus the local evidence needed to validate its claims.
2. Record findings with severity, exact source refs, and confidence.
3. Decide a disclosure mode for each recommendation:
   - `inline`
   - `link_only`
   - `omit`
   - `ask_user`
4. Record canonical link targets whenever a `link_only` recommendation is used.

In `delta` mode, always evaluate changed docs files plus the nearest parent `index.md` pages.
In `full` mode, evaluate the whole docs surface.

### Step 4: Verify Substantive Claims Against Repo Sources

Add a dedicated accuracy verification pass between page-quality assessment and nav/drift checks.

Only verify claims that are checkable from within the repository. This includes:

- code paths
- CLI commands and flags
- API routes
- config keys and values
- schema fields / payload fields
- file names, script names, and setup entrypoints

Do **not** attempt to verify:

- external URLs
- behavior that requires running a service
- claims whose canonical source lives outside the repository

For any docs page that references code paths, commands, routes, config keys, field names, or
other repo-checkable implementation details:

1. Identify the claim text and the canonical source that should back it.
2. Read the backing source files needed to confirm the claim.
3. Rate the claim as:
   - `verified`
   - `unverified` when the source cannot be found or is too ambiguous
   - `contradicted` when the repo source disagrees with the docs claim
4. Promote contradicted claims to findings with severity based on likely user harm.
   - Wrong destructive/auth/security guidance -> usually `High` or `Critical`
   - Wrong commands, routes, or required fields that break normal usage -> usually `High`
   - Wrong examples or less harmful operational details -> usually `Medium`
5. Record unverified claims as `Low` findings with a note that the source could not be confirmed.

Evidence standard for this step:

- Each checked claim must cite the docs location plus the canonical repo source used to verify it.
- If multiple repo files are needed to verify a claim, cite all relevant sources.
- If the canonical source is ambiguous, mark the claim `unverified` rather than guessing.

### Step 5: Analyze Content Coverage Opportunities

Add a coverage-gap pass after accuracy verification.

Build a lightweight inventory of the repo's documentable capability surface using in-repo
sources only. Prefer:

- `app/routers/`, `src/routers/`, or equivalent route/controller modules
- `app/services/`, `src/services/`, or equivalent business-logic modules
- the main application entrypoint and route registration files
- key models, schemas, and config surfaces that define user-facing behavior

Do not speculate about future roadmap items or undocumented external integrations.

For each significant feature or API capability found in the codebase:

1. Capture the capability area and the evidence that proves it exists.
2. Compare that capability against the docs surface.
3. Classify the docs state as:
   - adequately covered
   - no coverage
   - thin coverage / stub coverage
4. For each missing or thinly covered area, produce a scoped content opportunity that includes:
   - capability area name
   - codebase evidence, including router/service/model refs and key route or method signatures
   - suggested docs location:
     - new page
     - expansion of an existing page
     - new section within an existing page
   - severity:
     - `High` if the missing docs would block a typical integrator
     - `Medium` if it is useful but not core to first success
     - `Low` if it is edge-case, admin-only, or internal-only

For stub pages that already exist in the docs tree or nav:

1. Identify the backing router/service/model evidence.
2. List the concrete subtopics that should be covered in that page.
3. Attach those subtopics to the content opportunity so `oat-docs-apply` has a concrete scope to work from.

The goal is not just to say "this page is thin," but to say what capability surface is missing,
where the docs should live, and what specific subtopics the codebase shows should be documented.

### Step 6: Check Navigation and Drift

If `mkdocs.yml` exists:

1. Compare nav entries with the docs tree.
2. Flag pages present in docs but absent from nav.
3. Flag nav entries that point at missing pages.
4. Flag directories whose `index.md` `## Contents` section appears inconsistent with nav structure.
5. Flag docs guidance that claims structure, plugin support, or workflow rules not backed by current repo evidence.

If no `mkdocs.yml` exists, record whether the repo should be migrated to an OAT docs app.

### Step 7: Severity-Rate Findings

Use these defaults:

- `Critical`: misleading docs that could cause destructive or unsafe actions
- `High`: missing docs app/index coverage for important areas, broken nav, or stale commands that block reliable usage
- `Medium`: incomplete `## Contents`, `overview.md` still in use, plugin/contributor guidance gaps, moderate duplication
- `Low`: polish, wording, or organization improvements

### Step 8: Write Analysis Artifact

Use `references/analysis-artifact-template.md`.

```bash
TIMESTAMP=$(date -u +"%Y-%m-%d-%H%M")
ARTIFACT_PATH=".oat/repo/analysis/docs-${TIMESTAMP}.md"
```

Populate the artifact with:

- Docs target and mode
- Inventory summary
- Severity-rated findings
- Directory coverage and contract gaps
- Accuracy verification verdicts for repo-checkable claims
- Content opportunities for missing or thin docs coverage
- Navigation/drift findings
- Ordered recommendations
- Exact evidence references for each finding and recommendation
- Confidence for each recommendation
- Progressive disclosure decisions (`inline`, `link_only`, `omit`, `ask_user`)
- Canonical link targets when deeper detail should stay out of always-on docs pages

### Step 9: Update Tracking and Output Summary

Update docs tracking using the shared helper:

```bash
TRACKING_SCRIPT=".agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh"
ROOT_TARGET=$(bash "$TRACKING_SCRIPT" root)
ROOT_HASH=$(echo "$ROOT_TARGET" | jq -r '.commitHash')
ROOT_BRANCH=$(echo "$ROOT_TARGET" | jq -r '.baseBranch')

bash "$TRACKING_SCRIPT" write \
  docs \
  "$ROOT_HASH" \
  "$ROOT_BRANCH" \
  "{mode}" \
  --artifact-path "$ARTIFACT_PATH"
```

Output a summary:

```text
Analysis complete.

  Docs target:      {path}
  Surface type:     {mkdocs-app|docs-tree|root-markdown}
  Files evaluated:  {N}
  Mode:             {full|delta}

  Findings:
    Critical:  {N}
    High:      {N}
    Medium:    {N}
    Low:       {N}

  Artifact: {artifact_path}

Next step: Run oat-docs-apply to act on these findings.
```

## Deferred from v1

- Automatic topic clustering for large legacy docs trees
- Heuristic ranking of "most important" missing indexes
- Direct generation of docs scaffolding without an apply review step

## References

- Analysis artifact template: `references/analysis-artifact-template.md`
- Quality checklist: `references/quality-checklist.md`
- Directory criteria: `references/directory-assessment-criteria.md`
- Shared tracking helper: `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-tracking.sh`
