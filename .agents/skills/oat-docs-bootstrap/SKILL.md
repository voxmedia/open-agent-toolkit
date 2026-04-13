---
name: oat-docs-bootstrap
version: 1.0.0
description: Use when bootstrapping a new OAT docs app in a repo. Guides the user through preflight detection, richer input gathering than the raw CLI, `oat docs init` invocation with labeled post-patches for open CLI gaps, build verification, post-scaffold config inspection, and an educational walkthrough. Supports Fumadocs (full path) and MkDocs (lean path with defined minimum contract).
argument-hint: '<optional-target-dir>'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# Docs Bootstrap

Bootstrap a docs app in this repo and guide the user through understanding how it works. Wraps `oat docs init` with preflight detection, richer input gathering, labeled post-patches for open CLI gaps (FP-11 Turbopack root, FP-12 site-title coherence, FP-13 template content, FP-15 docs-app AGENTS.md), build verification, post-scaffold config inspection, and an educational walkthrough covering the `index.md` + `## Contents` navigation contract, scaffolded agent-instruction surfaces, and the OAT docs ecosystem (`oat-project-document`, `oat docs analyze`, `oat docs apply`).

## Prerequisites

- A repository initialized for OAT (`.oat/config.json` readable, `.agents/` present).
- The OAT CLI is runnable (either as a workspace binary via `pnpm run cli --` or an installed `oat` binary on PATH).
- A feature request or intent: "add docs to this repo" or equivalent.

## Mode Assertion

**OAT MODE: Docs Bootstrap**

**Purpose:** Turn `oat docs init` scaffolding into a support-rich onboarding experience — preflight, inputs, CLI invocation with labeled post-patches, build verification, config inspection, educational walkthrough, and optional content kickoff. Two framework paths: Fumadocs (full) and MkDocs (lean with defined minimum contract).

**BLOCKED Activities:**

- No reimplementing CLI scaffold logic (the CLI remains the source of truth for template rendering, version resolution, and configuration writes)
- No fabricating files the CLI does not create, with one documented exception: the FP-15 bridge AGENTS.md, which is written only when the CLI has not scaffolded one and whose content is migrated upstream when the CLI fix lands
- No expanding scope into content authoring (that's `oat docs analyze` / `oat docs apply` / `oat-project-document`)
- No silent failures — every error has a surfaced remediation

**ALLOWED Activities:**

- Inspecting repo state read-only before any mutation
- Prompting the user for richer inputs than the CLI asks for (notably a site name separate from the package/app name)
- Invoking `oat docs init` non-interactively with collected flags
- Applying labeled, idempotent post-patches for open CLI gaps (FP-11/FP-12/FP-13/FP-15) only when capability detection shows the CLI has not addressed them
- Running install + build and classifying failures against known patterns
- Reading `.oat/config.json` back to verify paths and prompting for `requireForProjectCompletion`
- Narrating the scaffolded output as a chunked educational walkthrough
- Delegating optional initial content population to `oat-docs-analyze` + `oat-docs-apply`

**Self-Correction Protocol:**
If you catch yourself:

- Writing scaffold-template content directly instead of calling the CLI → STOP (the CLI owns templates; you own the surrounding experience)
- Narrating AGENTS.md content word-for-word in the Walkthrough → STOP (the Walkthrough points at AGENTS.md; it does not read it aloud)
- Expanding into full content generation → STOP (delegate to analyze/apply)
- Applying a post-patch without running capability detection first → STOP (patches must be gated on deterministic probes and file-shape checks)

**Recovery:**

1. Acknowledge the deviation
2. Return to the current Step
3. Document any deviation in the final Walkthrough summary so the user knows what happened

## Progress Indicators (User-Facing)

Provide lightweight progress feedback so the user can tell what's happening at each boundary.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ DOCS BOOTSTRAP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before each major component, print a compact step indicator:
  - `[1/7] Preflight…`
  - `[2/7] Gathering inputs…`
  - `[3/7] Scaffolding…`
  - `[4/7] Verifying build…`
  - `[5/7] Inspecting config…`
  - `[6/7] Walkthrough…`
  - `[7/7] Optional content kickoff…`

- For long-running operations (install, build, analyze/apply delegation), print a start line and a completion line; optional duration.
- Keep it concise; don't print a line for every shell command.

## Process

### Step 0: Resolve Active Project and Environment

Bootstrap the skill's working context. This step is purely read-only and establishes what the rest of the skill operates on.

**0a. Resolve repo root and CLI binary:**

```bash
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CLI_CMD="oat"
if ! command -v oat >/dev/null 2>&1; then
  # Fall back to the workspace CLI if there's no installed binary
  if [ -f "$REPO_ROOT/package.json" ] && grep -q '"cli"' "$REPO_ROOT/package.json"; then
    CLI_CMD="pnpm run cli --"
  fi
fi
```

**0b. Read active OAT project context (optional):**

The skill can be invoked outside an active OAT project (e.g., a fresh repo with no project tracking). If an active project exists, surface it so the Educational Walkthrough can link to it; if not, proceed without. Do not block on active-project state — docs bootstrap is scoped to the repo, not to a project.

**0c. Print the banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ DOCS BOOTSTRAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 1: Preflight Detector

Inspect the working tree before any mutation. Determine the repo shape, detect existing docs setup, and surface conflicts that require user decisions later. This step is strictly read-only; any fix or prompt flows through the Input Gatherer (Step 2).

Print `[1/7] Preflight…` at the start of this step.

**1a. Detect repo shape.**

Check in order; the first match wins:

1. If `pnpm-workspace.yaml` exists at `$REPO_ROOT` → **`monorepo`**
2. If `$REPO_ROOT/package.json` has a non-empty `workspaces` field (array or `{packages: []}`) → **`monorepo`**
3. If both `$REPO_ROOT/apps/` and `$REPO_ROOT/packages/` directories exist → **`monorepo`**
4. Otherwise → **`single-package`**

Once `single-package` is identified, apply the nested-standalone heuristic: if the user will place the docs app in a subdirectory of the repo (the common case for single-package repos) and that subdirectory will have its own `pnpm-lock.yaml` after scaffold + install, treat the shape as **`nested-standalone`**. This is a single-package shape with its own docs-app lockfile, which affects the Turbopack root patch (FP-11) and the install command pattern.

In practice: for Fumadocs, any single-package repo with a target subdirectory is `nested-standalone`. For MkDocs, the shape stays `single-package` because MkDocs doesn't have the Turbopack concern.

**1b. Detect existing docs setup.**

Read (do not modify):

- `$REPO_ROOT/.oat/config.json`, extract the `documentation` section if present. Record `configDocumentation` (the parsed object) or `null`.
- Presence of an existing docs app directory. Inference sources: the `root` field of `configDocumentation` if present; common locations like `apps/docs`, `apps/*-docs`, `documentation/`, `docs/` at repo root (for single-package). Record `docsAppPath` (the absolute path) or `null`.
- `$REPO_ROOT/AGENTS.md` (if it exists): scan for a `## Documentation` section. Record `agentsMdSection: true | false`.

**1c. Identify conflicts.**

Build `conflicts: []` by adding an entry for each finding:

- If `configDocumentation` is non-null → `{ kind: 'existing-config', detail: <summary of what's there> }`
- If `docsAppPath` exists on disk → `{ kind: 'existing-app-dir', detail: <path + whether it has uncommitted changes> }`
- If `agentsMdSection` is true → `{ kind: 'existing-agents-section', detail: <what the section says> }`

Conflicts are **recorded**, not **resolved**. Resolution happens in Step 2 (Input Gatherer). Preflight remains single-purpose.

**1d. Resolve defaults for the Input Gatherer.**

Derive:

- `repoName`: `basename($REPO_ROOT)`
- `siteName` default: humanized form of `repoName` (e.g., `cyclone-app` → `Cyclone App`, `vox_mobile` → `Vox Mobile`, `docs` → `Docs`). Do not append " Documentation" here — that's a concern of the scaffold, not of the default.
- `appName` default:
  - If shape is `monorepo`: `{repoName}-docs` (e.g., `open-agent-toolkit-docs`)
  - If shape is `single-package` or `nested-standalone`: `docs`
- `targetDir` default:
  - If shape is `monorepo`: `apps/{appName}`
  - If shape is `single-package`: `{appName}` (subdirectory of repo root)
  - If shape is `nested-standalone`: same as single-package (`{appName}`)

**1e. Emit the Preflight Result.**

Record internally (not persisted to disk) for the Input Gatherer and downstream components:

```
Preflight Result:
  repoShape: 'monorepo' | 'single-package' | 'nested-standalone'
  repoName: string
  existingDocs:
    configDocumentation: OatDocumentationConfig | null
    docsAppPath: absolute-path-string | null
    agentsMdSection: boolean
  conflicts: Array<{ kind, detail }>
  defaults:
    appName: string
    targetDir: string
    siteName: string
```

**Design discipline:**

- **Read-only invariant.** Preflight never writes files, never modifies config, never runs scaffold. Every fix or prompt flows through later components.
- **Conflict surfacing is a list, not a branch.** Preflight returns all conflicts found; the Input Gatherer presents them together. This keeps Preflight single-purpose and predictable.
- **`nested-standalone` is a first-class shape** distinct from `single-package`. The CLI conflates them, but the skill treats them separately because Turbopack root (FP-11), build command patterns, and nested `.oat/config.json` handling all differ.

### Step 2: Input Gatherer

(Body authored in p02-t02; Conflict Resolution Contract authored in p02-t03.)

### Step 3: Scaffold Runner

(Body authored in p03-t01; Capability Detection in p03-t02; site-identity patches in p03-t03; scaffold-integrity patches in p03-t04.)

### Step 4: Build Verifier

(Body authored in p04-t01.)

### Step 5: Post-Scaffold Inspector

(Body authored in p04-t02.)

### Step 6: Educational Walkthrough

(Body authored in p05-t01 (Sections A–D) and p05-t02 (Sections E–G).)

### Step 7: Optional Content Kickoff

(Body authored in p05-t03; Exit summary in the same task.)

## Success Criteria

(Expanded in p06-t01.)
