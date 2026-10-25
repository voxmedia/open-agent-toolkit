---
name: oat-docs-analyze
description: Run when you need to evaluate documentation structure, navigation, and coverage against the OAT documentation contract. Produces a severity-rated analysis artifact for oat-docs-apply.
argument-hint: '[target] [--ia] [--ia-guidance <path|url>]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Bash(oat config:*), Bash(oat docs nav sync --check:*), Bash(oat docs check:*), Bash(oat docs literals:*), Bash(pnpm:*), Bash(bash:*), Bash(jq:*), Bash(node:*), Bash(command -v:*), Bash(sed:*), Bash(npm root -g:*), Bash(test:*), Bash(oat --version), Bash(mkdir:*), Bash(date:*), Bash(echo:*), Bash(cd:*), Bash(pwd:*), Glob, Grep, AskUserQuestion, Task
metadata:
  version: '1.7.5'
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

### Shared authoring method and optional IA proposal

Independently probe each exact `authoring-docs/SKILL.md` in order:
`${SKILL_DIR}/..` from the loaded skill (`SKILL_DIR` is the absolute directory
containing that loaded `SKILL.md`), `${HOME}/.agents/skills`, then
`<repo-root>/.agents/skills`. Bind the first matching `authoring-docs` directory
once as `AUTHORING_DOCS_ROOT`; load `${AUTHORING_DOCS_ROOT}/SKILL.md` and use
that same root for every authoring-docs reference and script, never ambient
discovery. If none is found, name `authoring-docs`, stop this handoff, and give
the intended-scope recovery command: `oat tools install docs --scope <user|project>`
or `oat tools update --pack docs --scope <user|project>`.

Always use its landing-page contract, section entries and one-purpose-per-page
rule for the quality pass even without `--ia`. For IA work, read
`${AUTHORING_DOCS_ROOT}/references/guidance-sources.md` and use the source-aware config-get
interface/helper: explicit `--ia-guidance` or conversation → repo → user →
built-in. Preserve selected source order and cite locators/provenance in the
analysis artifact. External Markdown packs require `index.md` and `## Contents`;
non-repo inputs stay read-only and private contents never enter the artifact.

`--ia` is a skill argument, not a CLI docs command. It adds the shared IA Proposal
to the **same analysis artifact and existing artifact-review loop**. Read manifests,
UI navigators/journeys, CLI `bin`, routers, IaC, `e2e/`/`.maestro/`, existing docs
and independent monorepo units. Ask only decision-changing questions about reader
work contexts, independent verification, canonical facts and link survival.
Use the five axes before presets and show two plausible two-level trees with
5–8 representative page placements each, page jobs, nearest approved presets
and tradeoffs. A UI alone does not justify Product/Engineering/QA; size chooses
depth, not audience. For an existing tree respect AGENTS/contributing authority;
conflicts are `ask_user`, with both source citations. Analyze remains read-only:
propose `record-ia` or `restructure` recommendations for apply; never persist
IA or materialize scaffolds from analysis.

### Step 0: Resolve Docs Target and Analysis Mode

Determine the documentation root using explicit docs-app evidence before generic
repo fallbacks:

1. `.oat/config.json` `documentation.root` / `documentation.tooling`.
   - When `documentation.tooling` is `fumadocs`, record the surface type as
     `oat-fumadocs-app`.
   - When tooling is `markdown`, record `docs-tree`; `documentation.root` is
     the literal authored content root, even with a child named `docs`. The
     configured `documentation.index` is authored, not a generated manifest.
     Honor configured excludes and existing local instructions.
   - For framework tooling, treat `documentation.root` as the docs app root. Resolve the authored docs
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
# Set SKILL_DIR to the absolute directory containing this loaded SKILL.md.
SCOPE_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh"
TRACKING=$(bash "$TRACKING_SCRIPT" read docs 2>/dev/null || true)
```

- If the stored commit exists, run in `delta` mode and scope drift checks to changed docs directories.
- Otherwise run in `full` mode.

Configured tooling/root take precedence over discovery. Markdown needs no app
package, site config, docs-root AGENTS, site build, or generated manifest. Read
managed root guidance, contributing pages, and any existing local AGENTS files;
do not mark their absence as a missing app shell. A successful adoption only
establishes config/baseline/guidance; audit incomplete authored content normally.

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

For framework apps, also read [Legacy scaffold checks](references/legacy-scaffold-checks.md). Apply those checks to the actual installed app, cite the observed file and source contract, and report discrepancies in Findings and Recommendations. Include missing app-root AGENTS capability and missing page-specific Next metadata, accepting equivalent valid customized arrangements. These are read-only checks, not bootstrap scaffold repairs. Do not change app-shell configuration during analysis or assume docs-apply can edit it; identify the manual upgrade needed when outside apply's current scope.

Do **not** infer docs structure conventions from a tiny sample of pages when the broader
tree or config disagrees.

For configured Markdown and OAT/Fumadocs docs apps, check whether local guidance covers:

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

For every non-excluded Markdown-bearing documentation directory:

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

For Markdown, assess useful audience/scope context, nonempty title/description
metadata, populated Contents, and relative `.md` links. Do not overwrite or
recommend replacing existing context just to satisfy structure. Optional external
manifests are separate derived artifacts: assess them only when local guidance
actually declares one. Never require default generation or repoint an authored
`documentation.index` to a manifest.

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
   Flag broken targets. In configured Markdown and OAT/Fumadocs docs apps, flag extensionless local
   Markdown links and prefer `.md`-suffixed targets, including
   `subdir/index.md`.
3. Accept anchors on `.md` links, such as `page.md#section`, and do not flag
   anchors-only, external URLs, `mailto:` links, image/asset links, or link
   syntax intentionally shown inside inline code, fenced examples, or template
   snippets.
4. Check Markdown hygiene: opening code fences need language identifiers; shell
   examples should follow local fence conventions, defaulting to `bash` unless
   the example is POSIX-only (`sh`) or local guidance requires another fence.
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

### Information Architecture Fit

Read the authored IA decision and `## Information architecture` section in the
docs-app AGENTS.md (Fumadocs/MkDocs) or contributing page (Markdown).
`documentation.ia` is a repository-only mirror: compare preset, decision path,
tracks/principles and verification overlay to those authored sources. A preset
ID and its approved label (for example `flat-small` and Flat Small) name the
same preset, not a contradiction. The
authored record is authoritative; missing/broken records or contradictory
mirrors become `ask_user` findings. No recorded IA means `ask_user` to choose
and record one, not an inferred preset. Keep ordinary contract analysis useful
while those recommendations are blocked.

In the artifact's **Information Architecture Fit** section, cite whether the
landing page routes each declared audience, all declared sections exist and are
reachable, page reader/purpose matches placement, root breadth is usable, and an
app's docs avoid merely mirroring implementation directories. Review coverage
only for declared readers: Product features/journeys/screens/states; QA scenario
tables with seeds and automation references; consumer first-success/task guides;
agent entrypoints, canonical sources and verification commands. Do not demand
these tracks from every repository. For an accepted triad, also perform the
conditional source assessments below.

Top-level IA misroutes a declared audience: `High` when the reader cannot find
a normal first-success or required verification path; `Medium` when that path
is reachable but its placement causes material detours/confusion. Cite the
declared audience, route and concrete reader impact. This rule overrides Low
organization polish; do not upgrade purely cosmetic differences.

For framework apps read `documentation.navOwner` independently of IA. Missing
means **undeclared**: issue `ask_user` to choose `nav-sync` or `hand-authored`,
and run only read-only membership/order comparisons. Never assume nav sync owns
existing navigation. Markdown ignores navOwner and never runs nav sync.

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

### Conditional triad source assessments (P24)

Run these six assessments only after the authored **accepted** IA decision and
local Information architecture section agree with the mirror's
`verification: triad`. Cite that agreement first. A mirror alone does not prove
acceptance. For absent, `agent-only`, or `none` overlays, record not applicable
and continue ordinary analysis unchanged. Missing/broken authored acceptance or
a conflicting mirror blocks these assessments with `unverified` / `ask_user`;
it does not block ordinary analysis or justify choosing an IA.

Map Product, QA and Engineering feature subsets from the accepted decision,
tracks/principles and local guidance, citing each mapping. Do not infer roles
from fixed folder names or tracks array order. Engineering may mix domain
contracts with feature pages: compare only its mapped feature subset. A grouped
flat IA may have no per-feature triad; explain not applicable rather than invent
folders. An unresolved mapping stays `unverified` / `ask_user` without new config.

1. **Slug parity.** Compare relative feature/journey keys in the mapped subsets.
   Exclude indexes, support pages, templates and Engineering domain contracts.
   Cite missing/extra peers and the declared mapping before recommending repair.
2. **Paired documentation.** Inspect each member's actual peer links, resolving
   relative paths and anchors within the repository. Accept case-insensitive
   Paired Documentation headings and QA's canonical Scope links when they point
   to the appropriate Product/Engineering peers. A heading alone or an unrelated
   resolving link is insufficient. Cite both link and target/anchor; unresolved
   or wrong-peer links become evidence-backed findings.
3. **Quoted literals and concepts.** Select Product/QA reader Markdown and narrow
   canonical implementation directories from cited source references/local
   guidance, then invoke the read-only helper (repeat one value per flag):

   ```bash
   oat docs literals --target-dir <resolved-target> \
     --page <product-page> --page <qa-page> \
     --source-root <implementation-dir> \
     --source-exclude <generated-or-fixture-pattern> --json
   ```

   Pages are content-relative; roots and exclusions are repository-relative.
   Never scan the repository root, dependencies, home or external sources.
   Select implementation roots and exclusions that omit docs, templates,
   generated/vendor output and example/test fixtures as evidence. The helper
   does not automatically exclude documentation from selected source roots;
   a match to documentation itself is not canonical implementation support.
   Inspect the returned scope, searched files and skipped symlink/binary/non-UTF8
   inputs; incomplete traversal or invalid selections fail visibly. Missing
   canonical sources remain unverified; do not broaden scanning to manufacture
   matches.

   The helper extracts AST inline code, ignores fences, and performs exactly
   one strict HTML entity decode per value and physical source line, followed
   by case-sensitive substring matching. It reports the first lexical source
   file/physical line, without snippets or a runtime verdict. CommonMark can
   normalize multiline spans; source matching stays per physical line. It does
   not fold whitespace/Unicode, decode JS escapes, evaluate interpolation or
   load i18n/runtime values. A found substring can be in a comment, dead code,
   fixture or longer text: read the citation and judge canonical relevance.
   `not-found` is initially **unverified**, never automatic contradiction.
   Require a differing canonical value before judging contradicted. Distinguish
   intentionally explained concepts from UI literals; prose concepts need no
   occurrence, while ambiguous backticked concepts require clarification or a
   cited conceptual explanation. Exit 0 means completed candidates (including
   not-found/not-applicable), not verified documentation.

4. **Test-ID registry membership.** Locate the repository's actual canonical
   test-ID registry and read its real format. Check exact member equality,
   never substring occurrence in arbitrary source. Cite registry and docs.
   Missing/ambiguous registry stays `unverified` / `ask_user`; do not invent a
   registry path/schema or treat helper matches as membership proof.
5. **Scoped scenario candidates.** Inspect QA tables for duplicate IDs and the
   same scoped Given + When with different Then outcomes. Compare feature,
   seed, platform and configuration preconditions before judging contradiction;
   meaningful differences can explain the result. Cite both rows and scope.
   Ambiguous scope stays unverified. This is judgment, not a scenario engine.
6. **Templates in authored Contents.** Read raw authored `## Contents` links
   before applying reader/nav exclusions. Flag links that expose drafting
   templates as reader destinations even when `nonReaderPaths` makes nav/check
   skip them; cite the map entry and template purpose/local declaration. Do not
   infer safety from a clean generated nav or checker result.

Record applicability, mappings, docs/source citations, candidates and judgments
in the existing artifact's Accuracy Verification section. Use the existing
severity and recommendation `approval: explicit | default` classes; missing
mapping/registry evidence is not permission to add a schema or implementation.
No P24 `oat docs check` rule is added, and its G5 JSON/rule IDs are unchanged.

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

Probe the installed `oat docs check --help`, then run its read-only
`oat docs check --target-dir <resolved-root> --json` (or the repo’s documented
source/local CLI equivalent). Retain exact findings and exit; errors fail while
warning-only passes. Use stable rule IDs/locations as evidence for recommendations,
including reader limits, contributor commands, Mermaid/SVG and provenance. It
executes no page code or documented commands and needs no build. Missing capability
or unusable Git diagram base is explicitly unverified. Preserve specialized local
validators; portable success does not establish coverage or claim accuracy. Review
narrow reason-bearing exceptions from actual config, never invent blanket
suppressions or automatic navigation ownership.

If a generated root index or manifest exists:

1. Compare generated entries with the authored `## Contents` graph. Current
   manifests link relative to the manifest file (an app-root manifest links
   `docs/<page>.md`); links relative to the docs directory instead mean an older
   CLI wrote it, so cite the CLI that regenerates it rather than content drift.
2. Flag generated output that is missing, ignored/local-only when local guidance
   expects a tracked artifact, stale, ordered differently from authored maps, or
   unclear because generator semantics are undocumented.
3. Flag generated entries that are not reachable from authored maps as either
   authored-source contract drift or generator-semantics uncertainty, depending
   on the evidence.
4. Cite exact generated paths, authored source paths, package scripts, config
   files, and representative links for each finding.
5. Prefer source-of-truth fixes over generated-file edits.

For a Fumadocs app with recorded `navOwner: nav-sync`, compare generated
`docs/**/meta.json` with authored `## Contents`:

1. Flag a docs directory with an `index.md` but no `meta.json` as a missing
   generated artifact.
2. Flag a `meta.json` whose `pages` order or entries differ from that directory's
   `## Contents` (immediate pages and child folders by name, `index` first in the
   docs root and in any `root: true` folder, other targets as `[Title](url)` link
   entries) as stale; the fix is to rerun `oat docs nav sync`.
3. Flag a `"..."` or `"z...a"` rest entry as a hand edit; nav sync output is strict.
4. Flag pages that no `## Contents` map lists: under strict `meta.json` they are
   hidden from the sidebar. Recommend listing them, not adding a rest entry.
5. During analysis, run only the read-only check, with `--check` first and
   `--target-dir` set to the resolved docs app directory (the directory that
   holds `source.config.ts` and `docs/`, such as `apps/oat-docs`, not its `docs/`
   content root):

   ```bash
   oat docs nav sync --check --target-dir <docs-app-dir>
   ```

   It writes nothing, names stale `meta.json` files and unlisted pages, and exits
   1 when either exists. The skill grants only this `--check` form; plain
   `oat docs nav sync` writes files and is not part of analysis.

For `hand-authored` or undeclared Fumadocs navigation, compare current meta.json
membership/order with Contents without assuming strict generator output; do not
flag rest entries merely because they are hand-authored. Report missing reader
routes and differences with local ownership evidence; recommend no automatic
regeneration. For nav-sync-owned MkDocs, use the same explicit-target read-only
`oat docs nav sync --check --target-dir <docs-app-dir>`.

If `mkdocs.yml` exists:

1. Compare nav entries with the docs tree.
2. Flag pages present in docs but absent from nav.
3. Flag nav entries that point at missing pages.
4. Flag directories whose `index.md` `## Contents` section appears inconsistent with nav structure.
5. Flag docs guidance that claims structure, plugin support, or workflow rules not backed by current repo evidence.

For Markdown, verify the authored Contents graph and file/link contract without
site nav generation or builds. Lack of `mkdocs.yml`, a generated manifest, or an
app package is expected, not a migration finding. For other unconfigured surfaces,
record whether app migration is relevant only when evidence or user intent supports it.

### Offline docs-package drift

For framework apps read their package.json and installed docs packages against
the running CLI's bundled `assets/public-package-versions.json`, without network.
The helper covers the `@open-agent-toolkit/docs-*` packages and, when the app
declares it in any dependency section, the app-local `@open-agent-toolkit/cli`
whose `oat docs generate-index` runs in `predev`/`prebuild`; a stale local CLI
writes a different manifest than the running CLI.
Run this skill's production helper after resolving this skill's own directory:

```bash
node "$SKILL_DIR/scripts/package-drift.mjs" --app "<docs-app-dir>" --cli "$(command -v oat)"
```

`--cli` follows a direct install to its package root. For a POSIX shell shim,
such as a pnpm global `oat`, the helper reads the shim as text without executing
it: the `# cmd-shim-target=` comment first, then relative `exec` targets resolved
from the shim's real directory. If the helper still reports that it cannot
locate the running CLI bundle, discover the bundle from that invoked installation
offline. Inspect `command -v oat` and, for a shell
shim, read its `exec` lines or `cmd-shim-target` comment (for example,
`sed -n '1,160p' "$(command -v oat)"`). Resolve a relative JavaScript target from
the shim's directory; do not evaluate copied shell text. Locate that target's
package root containing `package.json` named `@open-agent-toolkit/cli` and
`assets/public-package-versions.json`. `pnpm root -g` or `npm root -g` can help
locate it, but newer pnpm installations may nest it in a hashed directory; use
the actual shim target, never another checkout's bundle. Bind the inspected paths:

```bash
OAT_INSTALLED_ENTRY="<absolute JavaScript target from the invoked shim>"
OAT_INSTALLED_ROOT="<that installed @open-agent-toolkit/cli package root>"
# Both must equal the invoked oat version; stop if either differs.
test "$(node "$OAT_INSTALLED_ENTRY" --version)" = "$(oat --version)" &&
  test "$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).version' "$OAT_INSTALLED_ROOT/package.json")" = "$(oat --version)" &&
  node "$SKILL_DIR/scripts/package-drift.mjs" --app "<docs-app-dir>" --versions "$OAT_INSTALLED_ROOT/assets/public-package-versions.json"
```

Never substitute registry latest or this target repo's package version. Missing
bundle metadata, missing installed packages, or non-orderable versions (including
prereleases) mean unverified, never an upgrade. The helper compares stable numeric
version components: older installed packages are `drift`; equal versions are
`current`; newer installed packages are `ahead`, with no upgrade command. For
`ahead`, report that the running CLI is stale and ask the operator to update or
select the intended CLI installation before re-analysis; do not recommend a docs
package downgrade. `unverified` also has no package command and needs manual
verification. Neither status authorizes a tooling update.

The helper reports declared and installed versions, target versions and commands
for orderable targets. If the app uses a different package manager, translate the
command to its documented equivalent preserving package, exact target and
dependency section. Cite the manifest, installed package path, bundle path and
exact command. Report older docs-package drift as `tooling-update`,
`approval: explicit`. Report older app-local CLI drift as `manual`,
`approval: explicit`, with the helper's exact command: apply's approved tooling
update covers only `@open-agent-toolkit/docs-*` dependencies. Describe
unsupported scaffold repairs separately as `manual`. Markdown has no
app-package drift check. This helper reads only and never upgrades anything.

### Step 7: Severity-Rate Findings

Use these defaults:

- `Critical`: misleading docs that could cause destructive or unsafe actions
- `High`: missing docs app/index coverage for important areas, broken nav, or stale commands that block reliable usage
- `Medium`: incomplete `## Contents`, `overview.md` still in use, plugin/contributor guidance gaps, moderate duplication
- `Low`: polish, wording, or organization improvements

### Recommendation handoff

Give every recommendation a unique stable ID (`R-001`, etc.) and
`approval: explicit | default`; preserve IDs through review and never reuse a
retired ID for a different change. `explicit` covers docs-package updates,
restructure blocks and anything outside the Markdown scope (including authored
IA decision/config writes). `default` covers ordinary in-scope content repairs.
Missing evidence, `omit` and `ask_user` remain independent blockers regardless
of approval class. Capture exact targets and commands; an explicit class is not
permission to perform unsupported work. Apply's one input is this artifact plus
a list of approved recommendation IDs. Blanket or unattended approval never
covers explicit recommendations; apply reports skipped IDs with reasons.

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
- Information Architecture Fit and offline package drift
- Ordered recommendations with stable IDs and approval classes
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
2. Resolve the retry bound from `oat_orchestration_retry_limit` in the active OAT project's `state.md` frontmatter; it is not an `oat config` key. Default to `2` when no project is active or the value is absent or invalid.
3. Dispatch `oat-reviewer` in structured mode via Tier 1 subagent when available, falling back to the same reviewer prompt inline when needed.
4. Apply Critical and High fixes when they are local to the analysis artifact and unambiguous.
5. Offer Medium and Low fixes rather than applying them silently.
6. Rewrite `$ARTIFACT_PATH` after applied fixes and re-dispatch while retries remain.
7. Stop when the reviewer is clean or the retry bound is exhausted.

The review loop may only edit the analysis artifact. It must not edit docs content, `mkdocs.yml`, navigation files, or any other downstream apply target. If a finding cannot be fixed inside the analysis artifact, preserve it as a residual review finding and surface it in the summary before handoff.

If the loop is disabled, note `Auto artifact review: skipped (workflow.autoArtifactReview.analysis=false)` in the summary and do not describe the artifact as verified.

### Step 10: Update Verified Tracking and Output Summary

Update docs tracking using the shared helper:

```bash
# Set SKILL_DIR to the absolute directory containing this loaded SKILL.md.
SCOPE_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh"
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
- Shared tracking helper: `$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh`, where
  `SCOPE_ROOT` is derived from this loaded skill's directory.
