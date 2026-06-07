---
name: oat-docs-analyze
version: 1.4.0
description: Run when you need to evaluate documentation structure, navigation, and coverage against the OAT docs app contract. Produces a severity-rated analysis artifact for oat-docs-apply.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion, Task
---

# Docs Analysis

Scan a repository's documentation surface, evaluate it against the OAT docs contract, and write an actionable analysis artifact.

## Prerequisites

- Git repository with either an OAT/Fumadocs docs app, an MkDocs app, a
  `docs/` tree, or root-level Markdown docs.
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
- Reviewing and correcting the docs analysis artifact itself through the shared Auto Artifact-Review Loop.
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
- Hand-editing or regenerating generated root indexes -> STOP and record a
  generated-artifact finding with the exact evidence that proves freshness or
  source-contract drift.

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
  - `[1/10] Resolving docs target + mode…`
  - `[2/10] Inventorying docs files…`
  - `[3/10] Evaluating index contract…`
  - `[4/10] Assessing quality + coverage…`
  - `[5/10] Verifying substantive claims…`
  - `[6/10] Finding content opportunities…`
  - `[7/10] Checking generated indexes, nav and drift…`
  - `[8/10] Writing analysis artifact…`
  - `[9/10] Reviewing artifact accuracy…`
  - `[10/10] Updating verified tracking + summary…`

## Process

### Step 0: Resolve Docs Target and Analysis Mode

Determine the documentation root using explicit docs-app evidence before generic
repo fallbacks:

1. `.oat/config.json` `documentation.root` / `documentation.tooling`.
   - When `documentation.tooling` is `fumadocs`, record the surface type as
     `oat-fumadocs-app`.
   - Treat `documentation.root` as the docs app root. Resolve the authored docs
     source root and generated index path from `documentation.index`, app config,
     package scripts, generator scripts, or local guidance.
2. OAT/Fumadocs app candidates under `apps/*`, before root `docs/` fallback:
   - `apps/*/source.config.*`
   - `apps/*/next.config.*` with `apps/*/docs`
   - `apps/*/docs` plus docs-app package scripts or local guidance evidence
3. `apps/*/mkdocs.yml`
4. `mkdocs.yml` at repo root
5. generic root `docs/`
6. Root-level Markdown docs (`README.md`, `CONTRIBUTING.md`, etc.) when no docs app exists

Do not select generic root `docs/` or root Markdown docs while `.oat/config.json`
or `apps/*` Fumadocs evidence identifies an active OAT/Fumadocs docs app. Prefer
the app declared in `.oat/config.json` when multiple app candidates exist.

Resolve tracking and analysis mode using the shared helper:

```bash
TRACKING_SCRIPT=".oat/scripts/resolve-tracking.sh"
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
- Generated root indexes or manifests, including warning banners such as "do not edit"
- Local guidance that identifies generated index paths or regeneration commands
- `mkdocs.yml` nav entries when present

Record the docs surface type:

- `mkdocs-app`
- `docs-tree`
- `root-markdown`
- `oat-fumadocs-app`

Capture the evidence sources that will justify later findings and recommendations. Prefer:

- `mkdocs.yml` and generated nav structure
- `.oat/config.json`, package scripts, generator scripts, and local `AGENTS.md`
  files that identify authored docs roots or generated root indexes
- `docs/contributing.md`, contributor guides, and setup docs
- docs-app `AGENTS.md`, contributing pages, or authoring guides that tell
  agents how to edit, analyze, apply, and validate docs
- `package.json` scripts, `requirements.txt`, and docs bootstrap scripts
- existing `index.md` trees and repeated directory patterns
- exact missing or stale paths, commands, and page references

Do **not** infer docs structure conventions from a tiny sample of pages when the broader
tree or config disagrees.

For OAT/Fumadocs docs apps, check whether local guidance covers:

- authored docs source location
- generated root indexes or manifests and their no-hand-edit boundary
- every content directory needing `index.md`
- useful `## Contents` maps
- `.md`-suffixed relative links, including `subdir/index.md`
- `.md` as the default format and `.mdx` only for JSX/component needs
- read-only audit routing to `oat-docs-analyze`
- approved bulk edits routing to `oat-docs-apply`
- generated artifact regeneration or freshness checks after source docs changes

Flag stale local guidance that references older aliases without mapping them to
the current analyze/apply flow.

### Step 2: Evaluate the `index.md` Contract

Use `references/quality-checklist.md` and `references/directory-assessment-criteria.md`.

For every documentation directory:

1. Verify `index.md` exists.
2. Verify `index.md` includes a `## Contents` section.
3. Flag placeholder-only `## Contents` sections, including comments, generic
   "add links here" copy, or empty lists.
4. Verify the `## Contents` section maps sibling pages and immediate child directories.
5. Verify parent `## Contents` maps include child directories that contain docs.
6. Flag `overview.md` usage as a migration finding.
7. Flag unexpected `.mdx` for plain content unless JSX/components or local
   guidance justify it.
8. Verify single-file directories still expose a useful `index.md` entrypoint
   or local section map.
9. Exempt asset-only directories that contain no Markdown content and are not
   linked as navigable docs sections.

For OAT/Fumadocs docs apps, also distinguish authored source maps from generated
root indexes:

1. Resolve the authored docs source root and generated root index path from
   `.oat/config.json`, package scripts, generator scripts, or local guidance.
2. Confirm the generated root index exists when local configuration says it is
   produced, and record whether it appears tracked, ignored, or local-only.
3. Confirm generated warning banners are present when the repo's generator emits
   them or local guidance requires them.
4. Compare generated entries against the authored `## Contents` graph.
5. Flag stale generated entries that point to deleted or moved docs paths.
6. Flag missing generated entries for authored pages or child directories that
   are reachable from source `## Contents` maps.
7. Flag generated entries that are not reachable from any authored parent
   `## Contents` map unless local generator semantics explicitly explain them.
8. Classify ordering drift separately from missing or stale entries.
9. If source maps and generated output disagree but generator behavior is not
   documented well enough to judge, classify the finding as unclear generator
   semantics instead of guessing.

Generated index checks are read-only. Recommend regeneration, source-map fixes,
or tool investigation in the analysis artifact; do not hand-edit generated
files from this skill.

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
2. Resolve every local relative Markdown link from the page where it appears.
   Flag broken targets. In OAT/Fumadocs docs apps, flag extensionless local
   Markdown links and prefer `.md`-suffixed targets, including
   `subdir/index.md`.
3. Accept anchors on `.md` links, such as `page.md#section`, and do not flag
   anchors-only, external URLs, `mailto:` links, image/asset links, or link
   syntax intentionally shown inside inline code, fenced examples, or template
   snippets.
4. Check Markdown hygiene: opening code fences need language identifiers; shell
   examples should follow local fence conventions, defaulting to `sh` unless
   local guidance uses `bash` or the block needs Bash-only syntax.
5. Flag empty headings, multiple document-level H1s outside intentional imported
   README contexts, overlong frontmatter descriptions when local guidance
   defines a limit, ellipsis-truncated descriptions, and README-copy metadata
   signals that make search/navigation output look stale.
6. Record findings with severity, exact source refs, and confidence.
7. Decide a disclosure mode for each recommendation:
   - `inline`
   - `link_only`
   - `omit`
   - `ask_user`
8. Record canonical link targets whenever a `link_only` recommendation is used.

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
- command definitions, CLI parsers, flag schemas, and command tests
- deployment, release, monitoring, runbook, rollback, and support/escalation
  files that define operational behavior

Do not speculate about future roadmap items or undocumented external integrations.

Classify coverage by the surfaces proven in the repo:

- For app/service docs, check purpose, audience, local setup, testing,
  configuration, deployment/release, observability, runbooks, rollback,
  ownership, support/escalation, troubleshooting, and common failure modes.
- For API docs, check whether broad API surfaces have navigable
  contract-grade reference pages with routes/endpoints, request/response
  shapes, authentication, error modes, examples, and versioning where those
  concepts exist in repo sources.
- For CLI docs, check command groups, flags, output modes, destructive
  behavior, dry-run/force options, scripting contracts, exit-code behavior when
  sourced, and examples for common workflows.
- For operations docs, flag "Future Topics" placeholders, empty runbook
  outlines, unsupported deploy/monitoring claims, and missing owner-reviewed
  gaps for unverifiable operations knowledge.

When a claim affects ownership, support, deployment, observability, rollback, or
external integration behavior and repo evidence cannot verify it, mark it as an
owner-review gap rather than guessing.

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

If a generated root index or manifest exists:

1. Compare generated entries with the authored `## Contents` graph.
2. Flag generated output that is missing, ignored/local-only when local guidance
   expects a tracked artifact, stale, ordered differently from authored maps, or
   unclear because generator semantics are undocumented.
3. Flag generated entries that are not reachable from authored maps as either
   authored-source contract drift or generator-semantics uncertainty, depending
   on the evidence.
4. Cite exact generated paths, authored source paths, package scripts, config
   files, and representative links for each finding.
5. Prefer source-of-truth fixes over generated-file edits.

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
- Generated index and authored local-map findings
- Authored link, `## Contents`, and Markdown hygiene findings
- Local docs-app guidance gaps
- Accuracy verification verdicts for repo-checkable claims
- Content opportunities for missing or thin docs coverage
- Navigation/drift findings
- Ordered recommendations
- Exact evidence references for each finding and recommendation
- Confidence for each recommendation
- Progressive disclosure decisions (`inline`, `link_only`, `omit`, `ask_user`)
- Canonical link targets when deeper detail should stay out of always-on docs pages

### Step 9: Review Analysis Artifact Accuracy

Run the shared **Auto Artifact-Review Loop** from `oat-project-plan-writing` after `$ARTIFACT_PATH` is written and before tracking is updated or `oat-docs-apply` is recommended.

Use the `analysis` target:

- `type: analysis`
- `scope: docs`
- `analysis_artifact: $ARTIFACT_PATH`
- `oat_output_mode: structured`

Follow the canonical loop exactly:

1. Resolve `workflow.autoArtifactReview.analysis`; missing config means enabled, and only explicit `false` skips the loop.
2. Resolve `oat_orchestration_retry_limit`; default to `2` if unavailable.
3. Dispatch `oat-reviewer` in structured mode via Tier 1 subagent when available, falling back to the same reviewer prompt inline when needed.
4. Apply Critical and Important fixes when they are local to the analysis artifact and unambiguous.
5. Offer Medium and Minor fixes rather than applying them silently.
6. Rewrite `$ARTIFACT_PATH` after applied fixes and re-dispatch while retries remain.
7. Stop when the reviewer is clean or the retry bound is exhausted.

The review loop may only edit the analysis artifact. It must not edit docs content, `mkdocs.yml`, navigation files, or any other downstream apply target. If a finding cannot be fixed inside the analysis artifact, preserve it as a residual review finding and surface it in the summary before handoff.

If the loop is disabled, note `Auto artifact review: skipped (workflow.autoArtifactReview.analysis=false)` in the summary and do not describe the artifact as verified.

### Step 10: Update Verified Tracking and Output Summary

Update docs tracking using the shared helper:

```bash
TRACKING_SCRIPT=".oat/scripts/resolve-tracking.sh"
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

Only run this tracking write after Step 9 finishes. A tracked docs analysis artifact is therefore reviewed/verified unless the summary explicitly says the auto artifact-review loop was skipped.

Output a summary:

```text
Analysis complete.

  Docs target:      {path}
  Surface type:     {mkdocs-app|oat-fumadocs-app|docs-tree|root-markdown}
  Files evaluated:  {N}
  Mode:             {full|delta}

  Findings:
    Critical:  {N}
    High:      {N}
    Medium:    {N}
    Low:       {N}

  Artifact: {artifact_path}
  Auto artifact review: {passed|passed with residual findings|skipped}

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
- Shared tracking helper: `.oat/scripts/resolve-tracking.sh`
