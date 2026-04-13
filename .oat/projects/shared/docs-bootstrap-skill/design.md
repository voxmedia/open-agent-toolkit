---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-13
oat_generated: false
oat_template: false
---

# Design: docs-bootstrap-skill

## Overview

The docs-bootstrap skill is a **guided wrapper** around `oat docs init` that turns raw CLI scaffolding into an educational, support-rich onboarding experience. The skill performs four tightly sequenced jobs in one flow: (1) it **prepares** the repo by detecting shape (monorepo, single-package, or nested standalone), validating preconditions, and gathering richer inputs than the CLI prompts for; (2) it **executes** scaffolding by invoking `oat docs init` non-interactively with the collected flags, running dependency install, and verifying a clean build; (3) it **inspects** the post-scaffold state by reading back `.oat/config.json`, verifying paths exist, and asking the one real decision (`requireForProjectCompletion`); and (4) it **educates** the user on the docs model — the OAT documentation config, the two `index.md` files and the `## Contents` navigation contract, the scaffolded agent instructions, and how to populate real content via `oat-project-document`, `oat docs analyze`, and `oat docs apply`.

The skill deliberately calls the CLI rather than reimplementing its scaffold logic. This keeps the skill thin and lets the CLI remain the source of truth for template rendering, version resolution, and configuration writes. The skill's value is in everything that sits **around** the CLI call: asking better questions before the call, auto-fixing or guiding through problems after the call, and sequencing educational content at teachable moments. Where the CLI has gaps (FP-11 Turbopack passthrough, FP-12 site-title coherence, FP-13 template content inaccuracies, FP-14 post-bootstrap config verification, FP-15 missing docs-app `AGENTS.md`), the skill either passes flags if/when the CLI gains support or applies small, labeled, idempotent post-patches as fallbacks.

Two framework paths are supported: **Fumadocs** (primary) receives the full treatment — preflight, guided scaffold, build verification, config inspection, and deep educational walkthrough. **MkDocs** receives a lean path — same preflight and scaffold, basic verification, config inspection, and the shared educational concepts (config, index.md contract, analyze/apply), but no framework-specific deep dive. MkDocs is explicitly labeled in the skill as "needs elaboration" so future work can fill in the gap without rewriting the shared scaffolding.

## Architecture

### System Context

The skill is a Claude Code skill (Markdown + frontmatter under the canonical skill location) that orchestrates CLI invocations, file reads/edits, and user conversation. It does not ship as a CLI command and does not replace `oat docs init` — it sits on top of it.

**Key Components:**

- **Preflight Detector:** Inspects the working tree to determine repo shape, detect existing docs setup, and surface conflicts before any mutation.
- **Input Gatherer:** Conducts a guided conversation to collect the richer set of inputs the skill needs (package name, site name, description, framework, lint/format, target directory), explaining what each value affects and showing a coherence check before scaffold.
- **Scaffold Runner:** Invokes `oat docs init` non-interactively with collected flags, then handles the FP-12 site-title gap via fallback patching (layout branding, index.md frontmatter/H1, sibling page references, page metadata), the FP-11 Turbopack root gap if needed, and the FP-15 docs-app `AGENTS.md` gap (writes a task-framed AGENTS.md if the CLI hasn't scaffolded one).
- **Build Verifier:** Runs install + build for the scaffolded app, classifies failures against known patterns, and either auto-fixes safe cases or surfaces focused remediation.
- **Post-Scaffold Inspector:** Reads back `.oat/config.json`, verifies referenced paths exist on disk, detects drift from manual edits, asks about `requireForProjectCompletion`, and handles the nested non-monorepo dual-config case. Feeds its findings into the Educational Walkthrough.
- **Educational Walkthrough:** A scripted, chunked conversation covering the docs model. Content branches on framework (Fumadocs deep, MkDocs lean) but shares the config explanation, the two-`index.md` situation, the `## Contents` contract, the audience distinction between the scaffolded docs-app `AGENTS.md` (ongoing task reference) and the Walkthrough itself (setup narration), and the analyze/apply sections.
- **Optional Content Kickoff:** Offers to run `oat docs analyze` and `oat docs apply` as a final step to populate initial project-specific documentation.

### Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          docs-bootstrap skill                          │
│                                                                        │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐           │
│   │  Preflight   │──▶│    Input     │──▶│    Scaffold      │           │
│   │  Detector    │   │   Gatherer   │   │    Runner        │           │
│   └──────────────┘   └──────────────┘   └────────┬─────────┘           │
│                                                  │                     │
│                                                  ▼                     │
│                                          ┌──────────────┐              │
│                                          │    Build     │              │
│                                          │   Verifier   │              │
│                                          └──────┬───────┘              │
│                                                 │                      │
│                                                 ▼                      │
│   ┌──────────────────┐   ┌──────────────┐   ┌────────────────────┐     │
│   │ Optional Content │◀──│ Educational  │◀──│   Post-Scaffold    │     │
│   │     Kickoff      │   │  Walkthrough │   │     Inspector      │     │
│   └──────────────────┘   └──────────────┘   └────────────────────┘     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
           │                     │                     │
           ▼                     ▼                     ▼
    ┌───────────────┐    ┌───────────────┐     ┌──────────────┐
    │  Repo state   │    │  oat docs     │     │  pnpm        │
    │  (git, fs)    │    │  init (CLI)   │     │  (install/   │
    │               │    │               │     │   build)     │
    └───────────────┘    └───────────────┘     └──────────────┘
```

### Data Flow

Single-pass, mostly linear. Each component reads from the previous component's output (captured in skill memory, not persisted to disk) and writes repo state or skill state forward.

```
1. Preflight
   ├─ Read: pnpm-workspace.yaml, package.json, apps/, packages/, .oat/config.json, AGENTS.md
   ├─ Output: { repoShape, repoName, existingDocs?, conflicts[], defaults }
   └─ On conflict → record in conflicts[], do not branch flow (Input Gatherer resolves)

2. Input Gathering
   ├─ Read: Preflight output
   ├─ Present and resolve any Preflight conflicts (replace / second app / abort / repair)
   ├─ Asks, one at a time:
   │   - Framework (Fumadocs / MkDocs)
   │   - Site name (display title — defaults to humanized repo name) [FP-12 workaround]
   │   - Package/app name (defaults per shape)
   │   - Target directory (defaults per shape)
   │   - Site description
   │   - Lint / format preferences
   ├─ Coherence check: "Display: X, Package: Y, Description: Z — correct?"
   └─ Output: { framework, siteName, appName, targetDir, siteDescription, lint, format, conflictResolution }

3. Scaffold Run
   ├─ Invoke: oat docs init --yes --framework F --name N --target-dir D --description S --lint L --format F2
   ├─            (and --site-name if the CLI supports it post-FP-12 fix; else post-patch)
   ├─ Post-patch fallbacks (labeled, idempotent):
   │   - FP-12 title in layout.tsx, docs/index.md, docs/getting-started.md, docs/contributing.md
   │   - FP-12 layout.tsx export const metadata for page title
   │   - FP-11 turbopack.root in next.config.js for nested-standalone
   │   - FP-15 write task-framed AGENTS.md at docs app root if CLI didn't scaffold one
   ├─ Capture CLI stdout/stderr
   └─ Output: { appRoot, createdFiles[], patchesApplied[], scaffoldSucceeded }

4. Build Verification
   ├─ Run: pnpm install (root + appRoot for nested-standalone; --filter for monorepo)
   ├─ Run: pnpm --filter <appName> build (monorepo) or pnpm build in appRoot
   ├─ Classify failures against known patterns from discovery (FP-11, FP-12, FP-13)
   ├─ Auto-fix when safe; otherwise surface focused remediation
   └─ Output: { buildSucceeded, knownIssues[], unknownErrors[] }

5. Post-Scaffold Inspection
   ├─ Read: .oat/config.json (parent), .oat/config.json (nested docs app if present)
   ├─ Verify: documentation.root, .tooling, .index, .config paths exist on disk
   ├─ Detect: drift between config and reality (e.g., root renamed, index moved)
   ├─ Ask: requireForProjectCompletion opt-in? (default: no)
   ├─ Write: the one opt-in field back to .oat/config.json if user agrees
   └─ Output: { parentConfig, nestedConfig?, driftFindings[], requireForProjectCompletion }

6. Educational Walkthrough (chunked conversation)
   ├─ Section A (both): Your OAT documentation config — what's in it, what each
   │                    field controls, which downstream tools use it
   │                    (grounded in Inspector output)
   ├─ Section B (both): The two index.md files — source at docs/index.md (authored,
   │                    the ## Contents content map) vs. generated root-level index.md
   │                    (machine-shaped, clobbered on every build — do not hand-edit)
   ├─ Section C (both): index.md as content map, the ## Contents contract,
   │                    how nav sync reads it
   ├─ Section D (both): Agent instructions surfaces — three files with distinct roles:
   │                    1. Root AGENTS.md ## Documentation section (repo-wide pointer)
   │                    2. Docs-app AGENTS.md (task-framed ongoing reference — flag
   │                       the audience distinction: it's for agents WORKING in the
   │                       docs app, not setting it up)
   │                    3. docs/contributing.md (authoring conventions, Markdown features)
   ├─ Section E (Fumadocs only): Fumadocs-specific deep dive (layout, search,
   │                              source.config, docs-theme)
   ├─ Section F (MkDocs only): lean summary + "needs elaboration" marker
   └─ Section G (both): oat-project-document auto-populates docs during OAT workflows;
                        oat docs analyze + oat docs apply to bootstrap content

7. Optional Content Kickoff
   ├─ Ask: "Want to populate initial documentation now via oat docs analyze + oat docs apply?"
   ├─ If yes → delegate to oat-docs-analyze skill, then oat-docs-apply skill
   └─ If no → hand off with explicit next-step commands

8. Exit
   └─ Summary: what was created, where, what the user can do next
```

## Component Design

### Preflight Detector

**Purpose:** Inspect the working tree before any mutation. Determine the repo shape, detect existing docs setup, and surface conflicts that would require user decisions.

**Responsibilities:**

- Detect repo shape: `monorepo` (pnpm-workspace.yaml, package.json workspaces, or apps+packages dirs) vs `single-package` vs `nested-standalone` (single-package where a docs app will live in a subdirectory with its own lockfile)
- Detect existing docs setup: `.oat/config.json` `documentation` section, existing docs app directory, existing AGENTS.md `## Documentation` section
- Identify conflicts that would require user decision before scaffold
- Resolve repo name and other defaults that the Input Gatherer will use

**Interfaces (skill-internal contract):**

```
Preflight Result:
  repoShape: 'monorepo' | 'single-package' | 'nested-standalone'
  repoName: string                    // from basename(repoRoot)
  existingDocs?: {
    configDocumentation?: OatDocumentationConfig  // from .oat/config.json
    docsAppPath?: string              // inferred from config or common locations
    agentsMdSection?: boolean         // whether AGENTS.md has ## Documentation
  }
  conflicts: Array<{
    kind: 'existing-config' | 'existing-app-dir' | 'existing-agents-section'
    detail: string
  }>
  defaults: {
    appName: string                   // 'docs' or '{repo}-docs' per shape
    targetDir: string                 // per shape
    siteName: string                  // humanized repo name
  }
```

**Dependencies:**

- File system reads (no writes)
- Reuses CLI's `detectDocsRepoShape()` logic conceptually — the skill reads the source of truth directly rather than invoking the CLI for detection

**Design Decisions:**

- **`nested-standalone` as a distinct shape.** The CLI conflates this with `single-package`, but the skill treats it distinctly because the Turbopack workaround (FP-11), the build command pattern (`cd` vs. `--filter`), and the optional nested `.oat/config.json` all differ. Detection heuristic: `single-package` + target directory is a subdirectory of repo root + target will get its own lockfile.
- **Read-only discipline.** Preflight never mutates state. Every fix or prompt flows through later components. This keeps the conflict-handling flow predictable.
- **Conflict surfacing is a list, not a branch.** Preflight returns all conflicts found; the Input Gatherer presents them together rather than branching the flow at Preflight. This keeps Preflight single-purpose.

### Input Gatherer

**Purpose:** Conduct a richer guided conversation than `oat docs init`'s interactive prompts. Collect inputs that the CLI doesn't currently ask for (site name separate from package name), explain what each value affects, and show a coherence check before running scaffold.

**Responsibilities:**

- Present Preflight conflicts and get user decisions (replace / second app / abort / repair)
- Ask for framework (Fumadocs default, MkDocs lean path)
- Ask for **site name** (display title — defaults to humanized repo name) — the FP-12 workaround
- Ask for **package/app name** (defaults to `docs` or `{repo}-docs` per shape)
- Ask for target directory (defaults per shape)
- Ask for site description (subtitle / meta)
- Ask for lint/format preferences
- Show coherence check: "Display title: X, Package name: Y, Description: Z — does that look right?" with ability to adjust
- Validate inputs (no spaces in package name, target dir is writable, etc.)

**Interfaces:**

```
Input Result:
  framework: 'fumadocs' | 'mkdocs'
  siteName: string                    // display title (e.g., "Cyclone App")
  appName: string                     // package name (e.g., "documentation")
  targetDir: string                   // relative to repo root
  siteDescription: string             // subtitle / meta
  lint: 'none' | 'markdownlint-cli2'
  format: 'oxfmt' | 'none'
  conflictResolution?: 'replace' | 'second-app' | 'abort' | 'repair'
```

**Design Decisions:**

- **One question at a time.** Preserves the discovery-phase principle of incremental validation. Each answer can inform the next default (e.g., site name defaults to repo name, which then informs package name suggestion).
- **Coherence check is the last step before scaffold.** Explicit buy-in on the final inputs prevents "I said X but didn't realize it meant Y" regret.
- **The site-name question is framed as "what's this documentation for?"** rather than "what's the display title?" This surfaces the product/project mental model rather than asking users to reverse-engineer the title from the package name.
- **Conflict resolution happens here, not in Preflight.** Preflight detects; Input Gatherer resolves. This means the user sees conflicts in context with the rest of their inputs.

### Scaffold Runner

**Purpose:** Execute `oat docs init` with the collected inputs and apply post-scaffold patches for the CLI gaps (FP-11, FP-12, FP-15).

**Responsibilities:**

- Invoke `oat docs init` non-interactively with `--yes` and all flags the CLI supports (`--framework`, `--name`, `--target-dir`, `--description`, `--lint`, `--format`)
- If the CLI supports `--site-name` (FP-12 fix landed), pass it; otherwise apply post-scaffold title patches to:
  - `app/layout.tsx` (`DocsLayout.branding.title`)
  - `docs/index.md` frontmatter and H1
  - `docs/getting-started.md` body reference
  - `docs/contributing.md` H1
  - Add `export const metadata = { title, description }` to `layout.tsx` (site metadata gap from FP-12 sub-finding C)
- If nested-standalone and the CLI hasn't fixed FP-11, apply Turbopack root patch:
  - Set `turbopack: { root: __dirname }` in `next.config.js` (either via the `createDocsConfig` passthrough if that landed, or by replacing the wrapper with explicit `createMDX()` + hand config)
- If the CLI hasn't scaffolded a docs-app `AGENTS.md` (FP-15 fix not yet landed), write one at the docs app root using a task-framed template. The template is owned by the skill (not by the CLI templates dir) while this patch is in force, and is migrated to the CLI templates once the CLI gains the capability.
- Capture CLI stdout/stderr for the Build Verifier and Walkthrough
- Reject if CLI returns non-zero; preserve CLI error text verbatim for the user

**AGENTS.md template (FP-15 fallback) — content requirements:**

- **Audience:** agents working _in_ the docs app after it exists, not bootstrapping it. Litmus test: "would this instruction still matter six months after scaffold?"
- **Organizing principle:** task framing. Sections start with "when you need to..." — this is self-filtering (recurring actions pass; one-time setup fails).
- **Required sections:**
  1. Purpose and scope (one paragraph)
  2. When you need to add a new page
  3. When you need to restructure navigation
  4. When you need to audit or bulk-edit docs
  5. When you're unsure where content belongs
  6. When you need project-level documentation updates
  7. What not to do
  8. Reference (pointers to `contributing.md`, `getting-started.md`, root `AGENTS.md`)
- **Does NOT contain:** install commands, first-run build steps, how the scaffold was created, version-upgrade playbooks — those belong in `contributing.md`, `getting-started.md`, or the Walkthrough.

**Design Decisions:**

- **Post-patches are labeled and idempotent.** Each patch is wrapped in a comment describing which FP it addresses so future maintenance (e.g., after the CLI fix lands) can find and remove them.
- **Post-patches only if the CLI fix hasn't landed.** The skill detects CLI version/capabilities and skips patches when the CLI can do the work directly. This means the skill gracefully ratchets as CLI fixes land.
- **Never fabricate files the CLI doesn't create** — **except** for the FP-15 AGENTS.md, which is an explicit bridge until the CLI fix lands. The bridge is documented as such and the content will be migrated upstream into `packages/cli/assets/templates/docs-app-{fuma,mkdocs}/AGENTS.md.template` when FP-15's CLI portion is tackled.

### Build Verifier

**Purpose:** Run install + build for the scaffolded app. Classify failures against known patterns and either auto-fix safe cases or surface focused remediation.

**Responsibilities:**

- Run install in the appropriate directory per repo shape:
  - **Monorepo:** `pnpm install` at repo root (workspace-aware)
  - **Single-package / nested-standalone:** `cd <appRoot> && pnpm install` (for nested-standalone this creates the docs app's own lockfile)
- Run build:
  - **Monorepo:** `pnpm --filter <appName> build`
  - **Single-package / nested-standalone:** `cd <appRoot> && pnpm build`
- Watch for known failure patterns and classify:
  - `ERR_PNPM_NO_MATCHING_VERSION` on `@open-agent-toolkit/*` → surface with "check scaffolded versions against npm registry" remediation (not auto-fix — flagged as release-timing artifact rather than repeatable bug)
  - `fumadocs-mdx: command not found` + `node_modules missing` → rerun install and report the downstream effect
  - Turbopack "inferred workspace root" warning → benign if Scaffold Runner already patched; flag as known issue otherwise
  - TypeScript first-build `tsconfig.json` rewrite churn (FP-10) → should be fixed upstream; flag if it still happens
- Report result as `{ buildSucceeded, knownIssues[], unknownErrors[] }`

**Interfaces:**

```
Verification Result:
  buildSucceeded: boolean
  knownIssues: Array<{
    issueId: 'FP-11-turbopack' | 'FP-13-cwd-commands' | ...
    description: string
    autoFixed: boolean
    remediation?: string
  }>
  unknownErrors: Array<{
    command: string
    stderr: string
  }>
```

**Design Decisions:**

- **Auto-fix is the exception, not the rule.** Only known-single-correct-answer issues are auto-fixed. Everything else is surfaced with context so the user drives the fix. This matches the project's principle of "diagnose, don't pattern-match fix."
- **Output feeds the Walkthrough.** If the Verifier auto-fixes something, the Walkthrough mentions it so the user understands what was done on their behalf.
- **Unknown errors stop the flow.** The skill pauses and presents the error rather than proceeding to the Walkthrough — a broken build is not something to educate through.

### Post-Scaffold Inspector

**Purpose:** Read back `.oat/config.json`, verify paths, ask the one real decision (`requireForProjectCompletion`), and hand structured findings to the Walkthrough.

**Responsibilities:**

- Read parent `.oat/config.json` and parse the `documentation` section
- Verify each referenced path exists on disk:
  - `documentation.root` → directory exists
  - `documentation.index` → file exists
  - `documentation.config` → file exists (mkdocs only)
- If repo shape is `nested-standalone`, also check for a second `.oat/config.json` inside the docs app directory and verify its paths relative to its own root
- Detect drift between what the CLI wrote and what the Scaffold Runner patched (e.g., if Scaffold Runner replaced `next.config.js`, verify nothing in config references it)
- Ask the user: "Require docs sync before project completion can be marked done? (default: no)" — this is the one config field that's a real decision rather than auto-derived
- Write the user's `requireForProjectCompletion` choice back to `.oat/config.json` if they opt in
- Emit a structured report for the Walkthrough

**Interfaces:**

```
Inspection Result:
  parentConfig: {
    path: string
    documentation: OatDocumentationConfig
    pathChecks: Array<{ field: string; targetPath: string; status: 'ok' | 'missing' }>
  }
  nestedConfig?: {
    path: string
    documentation: OatDocumentationConfig
    pathChecks: Array<{ field: string; targetPath: string; status: 'ok' | 'missing' }>
  }
  driftFindings: Array<{ detail: string; severity: 'info' | 'warn' }>
  requireForProjectCompletion: boolean
```

**Design Decisions:**

- **Inspector is distinct from Build Verifier.** Build Verifier cares about whether the code compiles; Inspector cares about whether the OAT config correctly describes what was scaffolded. Different failure modes, different remediation paths.
- **The only config write happens here.** Preflight and Input Gatherer are read-only; Scaffold Runner writes via the CLI; Inspector writes only the one `requireForProjectCompletion` field. This keeps config mutations auditable.
- **Nested config is handled by the skill, not the CLI.** FP-4 in original discovery noted that the nested dual-config case is error-prone. The skill resolves this by explicitly inspecting both, explaining their relationship, and ensuring the user understands which one downstream tools read.

### Educational Walkthrough

**Purpose:** Turn the just-completed scaffold into a teaching moment. The Walkthrough is the skill's unique value — most of the rest could theoretically be done by the CLI, but the educational framing is what makes this a skill.

**Responsibilities:**

- Start with the Inspector's output: "Here's what's in your .oat/config.json, here's what each field does, here's what I verified"
- Explain the two-`index.md` situation explicitly (source under `docs/` vs. generated root-level) — flag the footgun from FP-13 sub-finding D
- Explain the `## Contents` contract and how `oat docs nav sync` uses it
- Point out the three distinct agent-instruction surfaces and their audience differences:
  - **Root `AGENTS.md` `## Documentation` section** — repo-wide pointer telling any agent "docs live here." Four-line breadcrumb, not a reference manual.
  - **Docs-app `AGENTS.md`** — task-framed ongoing reference for agents working _in_ the docs app (adding pages, restructuring nav, bulk-editing, project-level doc updates). **Audience distinction:** this file is not bootstrap documentation; it's a runtime reference that should stay relevant six months after scaffold. The Walkthrough flags this distinction so users don't confuse it with `contributing.md` or this Walkthrough itself.
  - **`docs/contributing.md`** — human-authoring conventions (frontmatter requirements, Markdown features like GFM alerts / mermaid / code blocks), the nav contract summary, and the pointer to `oat docs apply` for bulk changes.
- Framework-specific deep dive:
  - **Fumadocs:** How `DocsLayout` renders chrome, how `createMDX` picks up `docs/`, how search indexing works, how the docs-theme package provides branding
  - **MkDocs:** Lean summary with explicit "needs elaboration" marker — this section should note what's NOT covered so future skill work can fill it in
- Explain the OAT docs ecosystem:
  - `oat-project-document` skill auto-populates docs during OAT workflows
  - `oat docs analyze` audits the docs structure against the contract
  - `oat docs apply` executes approved analyze recommendations

**Design Decisions:**

- **Chunked, not monolithic.** Each section is 2-4 paragraphs at most. The user can skip or dive deeper on any section. This matches the "pause for validation between chunks" pattern from the quick-start skill itself.
- **Inspector output is the opening.** Starting with the user's actual config state (not abstract explanations) grounds the teaching in what they just produced.
- **The footgun is called out.** The two-`index.md` situation is one of the most confusing scaffold outputs. Explicitly naming and explaining it is more valuable than hoping the user figures it out when something breaks later.
- **Walkthrough does not derive from AGENTS.md.** The two serve different audiences at different times: Walkthrough is setup-time narration ("here's what just happened and why"), AGENTS.md is runtime task reference ("when you need to X, do Y"). Partial concept sharing (nav contract, tool pointers) is fine; full derivation would either pollute AGENTS.md with bootstrap context or strip setup context out of the Walkthrough.
- **Point to AGENTS.md, don't narrate it.** The Walkthrough gives a one-sentence summary of what the docs-app `AGENTS.md` is for and flags the audience distinction, rather than reading its contents aloud. Users have the file; they don't need it read back to them.
- **MkDocs "needs elaboration" marker.** A visible, non-apologetic note that MkDocs education is thinner. Users get enough to operate; future work can deepen it.

### Optional Content Kickoff

**Purpose:** Offer the natural "next thing" after scaffold — populating initial documentation content — by delegating to the existing analyze/apply skills.

**Responsibilities:**

- Ask: "Want to populate initial documentation now via `oat docs analyze` + `oat docs apply`?"
- If yes: delegate to the `oat-docs-analyze` skill, then (on user approval of its output) to the `oat-docs-apply` skill
- If no: hand off with explicit next-step commands the user can run later

**Design Decisions:**

- **Delegation, not reimplementation.** The analyze and apply skills already exist and are well-scoped. The bootstrap skill's job is to offer the entry point, not to duplicate logic.
- **Optional, not default.** Users who just wanted to bootstrap and walk away shouldn't be forced into content generation. The explicit opt-in respects that.
- **Single handoff point.** If the user declines, the skill prints the exact commands they'd run later. This is the last thing they see from the skill, so it should be actionable.

## Error Handling

Error handling sits mostly in the **Build Verifier** and **Post-Scaffold Inspector**, with a small amount in **Preflight**. The general pattern is: detect the error category, classify as known-single-answer vs. needs-user-input, act or surface accordingly.

### Error Categories

- **Preflight conflicts** (existing docs config, app dir, AGENTS section): Not errors — captured as conflicts and resolved in the Input Gatherer with explicit user choice
- **CLI invocation failures** (Scaffold Runner): Surface the CLI's stderr verbatim; do not attempt retry or workaround. Stop the flow
- **Build failures — known patterns** (Build Verifier): Classify by pattern match, auto-fix only safe cases, surface focused remediation otherwise
- **Build failures — unknown** (Build Verifier): Stop the flow, present the error, ask the user how to proceed
- **Config drift** (Inspector): Treat as warnings, not errors — the scaffold is still valid, the config just needs adjustment

### Remediation Strategy

- **Auto-fix** only when there's a single correct answer and the fix is idempotent. Current candidates: rerunning install when `node_modules missing` is the root cause of a downstream error
- **Surface with context** for everything else: show what failed, what the known-good pattern looks like, what the user's options are
- **Never silently swallow errors**. Every non-zero exit from a child process is either reported or used as input to remediation logic

### Logging

The skill's "logging" is conversation output — every error is communicated to the user as it happens. No file-based logs, no silent failures. If auto-fix is applied, the Walkthrough later tells the user what was done on their behalf.

## Testing Strategy

Because this skill is Markdown + conversation logic rather than compiled code, the testing strategy is a mix of manual walkthroughs in real repos and targeted unit tests for any helper functions the skill ends up extracting.

### Unit Tests

**Scope:** Any pure functions the skill extracts — repo shape detection heuristics (if we duplicate the CLI logic in the skill), conflict classification, default derivation (humanized repo name → site name), version capability checks.

**Key test cases:**

- Repo shape detection: monorepo (pnpm-workspace.yaml), monorepo (package.json workspaces), monorepo (apps+packages dirs), single-package, nested-standalone
- Site name derivation: `cyclone-app` → `Cyclone App`, `vox_mobile` → `Vox Mobile`, `docs` → `Docs`
- Preflight conflict detection: no conflict, single conflict, multiple conflicts stacking

### Integration Tests

**Scope:** End-to-end skill invocation against fixture repos. One fixture per repo shape.

**Test environment:** Temp directories seeded from fixture repos (minimal pnpm monorepo, minimal single-package, minimal nested-standalone parent).

**Key scenarios:**

- Clean monorepo → Fumadocs bootstrap → scaffolded app builds
- Clean single-package → Fumadocs bootstrap → scaffolded app builds
- Clean nested-standalone → Fumadocs bootstrap → scaffolded app builds with Turbopack root patch applied
- Clean monorepo → MkDocs bootstrap → scaffolded app builds
- Existing docs config → conflict detected → replace path → builds
- Build failure with `fumadocs-mdx: command not found` → auto-fix kicks in → rerun install → build succeeds

### Manual Tests

**Scope:** The educational walkthrough (hard to meaningfully automate), the "does this read coherently?" assessment, and edge cases discovered in real repos.

**Key scenarios:**

- Walkthrough reads coherently for a first-time user
- Walkthrough sections are the right length (not too terse, not too long)
- Inspector findings integrate cleanly into Walkthrough Section A
- Two-`index.md` explanation is clear enough that a user can articulate it back
- MkDocs lean path feels acceptable (not obviously under-served)

## Open Questions

- **Scaffold Runner FP-12 patches vs. CLI fix timing:** Should the skill ship with post-patches baked in, or block on the CLI fix landing first? Leaning toward ship-with-patches because the skill can ratchet down as CLI fixes land, and the post-patches are labeled and idempotent.
- **Monorepo-specific friction points:** All friction discovery so far has been from non-monorepo testing. A separate follow-up project will capture monorepo feedback. Any friction found there may require skill adjustments.
- **Scope of auto-fixes:** Currently limited to very narrow cases. Should we expand after observing real usage, or stay conservative and surface more to the user?
- **Conflict `repair` option:** Preflight may surface an existing docs setup that's partially broken. Should the skill offer a "repair" path that fixes what's broken without full replace? Or defer to `oat docs analyze` / `oat docs apply` for that?
- **FP-15 AGENTS.md template ownership:** The skill owns the AGENTS.md template content during the bridge period (before the CLI fix lands). Where does the bridge template live in the skill — inline in the skill Markdown as a heredoc, or as a separate file in the skill directory? Leaning separate file for maintainability and because it makes migration to CLI templates trivial.
- **FP-15 canonical example (`apps/oat-docs/AGENTS.md`):** Adding this to the repo is a one-time fix, not part of the bootstrap skill's runtime behavior. Should this project's plan include it (because the content writing is a natural fit with the skill's template authoring), or should it be a separate trivial PR? Leaning include it because the content is co-authored with the skill's template.
- **Post-patch detection for FP-15:** How does the Scaffold Runner detect whether the CLI has already scaffolded an AGENTS.md? Check for the file's existence at the expected path is the simplest answer. But what if the file exists but is content-stale (e.g., older CLI version scaffolded a thin version)? Skill should probably write if missing, never overwrite — and flag content staleness as a driftFinding from the Inspector.
