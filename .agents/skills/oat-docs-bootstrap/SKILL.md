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

Collect the inputs needed to invoke `oat docs init` and apply post-scaffold patches. The skill asks for richer inputs than the CLI prompts for — most importantly, a **site name** separate from the package/app name (the FP-12 workaround). Ask one question at a time, surfacing defaults from the Preflight Result, and end with a coherence check before scaffold.

Print `[2/7] Gathering inputs…` at the start of this step.

**2a. Resolve Preflight conflicts (if any).**

If `conflicts[]` from Preflight is non-empty, present them together and collect a `conflictResolution`. See the **Conflict Resolution Contract** sub-procedure below for the exact semantics of each option. Do not proceed to input questions until the user has chosen a resolution.

If `conflicts[]` is empty, skip conflict handling and go to 2b.

**2b. Ask for inputs, one at a time.**

Each question includes plain-language context explaining what the value affects. Defaults come from the Preflight Result. Ask sequentially — each answer can inform the next default.

- **Framework.** `"Which docs framework? Fumadocs (Next.js, primary path) or MkDocs (Python, lean path)?"` Default: `fumadocs`.
- **Site name.** `"What's the name of the product or project these docs are for?"` Default: `defaults.siteName` (humanized repo name). Explain: "This becomes the display title — what shows up in the site header, browser tab, and page headings. It is **not** the package name." This is the FP-12 workaround — distinct from `appName`.
- **Package / app name.** `"What should the docs package be called?"` Default: `defaults.appName`. Explain: "This becomes the `package.json` `name`, the directory name, and the pnpm filter (e.g., `pnpm --filter {appName} dev`). It does **not** show up in the UI."
- **Target directory.** `"Where should the docs app live?"` Default: `defaults.targetDir`. Explain: "Relative to repo root. Monorepos typically use `apps/{appName}`; single-package repos use `{appName}` as a subdirectory."
- **Site description.** `"One-sentence description of the docs site?"` Default: empty. Explain: "Used for search previews, social cards, and page metadata. Optional but strongly recommended."
- **Lint mode.** `"Markdown linting — `markdownlint-cli2`or`none`?"` Default: `none`.
- **Format mode.** `"Markdown formatting — `oxfmt`or`none`?"` Default: `oxfmt`.

**2c. Validate inputs.**

- `appName`: no spaces, no uppercase, no leading/trailing hyphens, matches `^[a-z0-9][a-z0-9-]*[a-z0-9]$` or single lowercase char. Reject and re-prompt on failure.
- `siteName`: non-empty after trim. Reject empty.
- `targetDir`: must be relative (no leading `/`, no `..`), must be writable based on the chosen `conflictResolution` (e.g., `replace` requires the path to be empty-after-cleanup; `second-app` requires a fresh path that doesn't overlap with an existing docs app).
- `framework`: must be `fumadocs` or `mkdocs`.
- `lint`: must be `none` or `markdownlint-cli2`.
- `format`: must be `none` or `oxfmt`.

**2d. Coherence check.**

Before proceeding to scaffold, summarize what the user chose and confirm:

```
Here's what I'll scaffold:

  Framework:       {framework}
  Display title:   {siteName} Documentation   ← shown in header / tab / page headings
  Package name:    {appName}                   ← used by pnpm filter / directory name
  Target dir:      {targetDir}                 ← relative to repo root
  Description:     {siteDescription | "(none)"}
  Lint:            {lint}
  Format:          {format}

Does this look right? (yes / adjust)
```

If `adjust`, ask which field to change and loop back to the question for that field. Re-show the coherence check after the adjustment. Continue looping until the user confirms `yes`.

**2e. Emit the Input Result.**

Record internally for the Scaffold Runner:

```
Input Result:
  framework: 'fumadocs' | 'mkdocs'
  siteName: string            // FP-12 workaround: display title distinct from appName
  appName: string
  targetDir: string
  siteDescription: string
  lint: 'none' | 'markdownlint-cli2'
  format: 'oxfmt' | 'none'
  conflictResolution: 'replace' | 'second-app' | 'abort' | 'repair' | null
```

#### Conflict Resolution Contract (sub-procedure)

When Preflight (Step 1) records non-empty `conflicts[]`, present them to the user together and collect exactly one resolution. Each resolution below has a precise definition in terms of **allowed mutations**, **preserved state**, and **stop conditions**. The Scaffold Runner (Step 3) reads the chosen resolution and adjusts its behavior; it never reinvents these semantics.

Resolution options:

- **`replace`** — Treat the existing docs setup as disposable and scaffold fresh.
  - **Allowed mutations (executed by this sub-procedure before Scaffold Runner begins):**
    - Remove the existing docs app directory (`existingDocs.docsAppPath`), if present on disk.
    - Remove the `documentation` section from `$REPO_ROOT/.oat/config.json`, if present. The CLI will rewrite it during init.
    - Remove the `## Documentation` section from `$REPO_ROOT/AGENTS.md`, if present. The CLI upserts its own.
  - **Preserved state:** Everything outside the three touchpoints above. Git history is preserved — deletions are tracked normally and remain recoverable via `git revert` / `git checkout`.
  - **Stop conditions:**
    - If the existing docs app directory contains **uncommitted changes** (tracked or untracked), **refuse** and surface a focused error: `Refusing to replace {docsAppPath}: it contains uncommitted changes. Commit or stash before choosing 'replace'.` The user must resolve the working tree before retrying.
    - If any allowed mutation fails (e.g., permission error removing the directory), **stop the flow before Scaffold Runner** — partial cleanup leaves an inconsistent state that the CLI cannot recover from.
- **`second-app`** — Add a new docs app alongside the existing one (currently a **deferred feature**).
  - **Allowed mutations:** None. This resolution is not functional in the current CLI.
  - **Preserved state:** Everything.
  - **Stop conditions:** The current `OatDocumentationConfig` shape (`packages/cli/src/config/oat-config.ts`) supports a single `documentation` object. Until the CLI gains multi-docs support, **refuse with an explicit explanation** and redirect the user to the other three resolutions:

    ```
    'second-app' isn't available yet: the OAT config schema currently supports a single
    documentation section, so adding a second docs app would overwrite the first's config.

    Pick another resolution:
      - replace — remove the existing docs app and scaffold fresh at the same path
      - abort   — exit without changes; keep the existing setup as-is
      - repair  — run `oat docs analyze` on the existing setup and decide from there

    (When the CLI schema adds multi-docs support, 'second-app' becomes available without
    any further changes to this skill.)
    ```

    Re-prompt for a resolution; do not allow `second-app` to proceed.

- **`abort`** — Stop the flow without any mutation.
  - **Allowed mutations:** None.
  - **Preserved state:** Everything.
  - **Stop conditions:** Print a compact summary of what was detected and exit immediately. No CLI invocation, no post-patches, no Walkthrough. Example summary:

    ```
    Aborting docs bootstrap. Nothing was changed.

    Detected:
      - {existing-config / existing-app-dir / existing-agents-section as applicable}

    To revisit later, rerun this skill; Preflight is idempotent.
    ```

- **`repair`** — Fix the existing setup in place rather than replacing it. Delegate to the docs-analysis pack.
  - **Allowed mutations (by this sub-procedure):** None directly. The bootstrap skill does not modify existing docs app files. It hands off to `oat-docs-analyze` (read-only audit) and, with user approval, to `oat-docs-apply` (applies approved recommendations).
  - **Preserved state:** Existing docs app directory, the `documentation` config section, the root `AGENTS.md` `## Documentation` section — all preserved unless analyze surfaces a recommendation and the user approves it via apply.
  - **Stop conditions:**
    - Invoke `oat-docs-analyze` and surface its report to the user. If analyze cannot produce meaningful recommendations (e.g., `documentation.index` points at a missing file, or the app directory is empty), **stop the flow before Scaffold Runner**, report what analyze found, and ask the user whether to escalate to `replace`.
    - If analyze + apply complete cleanly, the existing setup is now the target — **do not proceed to Scaffold Runner**; exit with a summary that points at the repaired app. Scaffolding on top of a repaired app would re-introduce the conflicts Preflight surfaced.

**Presentation pattern:**

Print the conflict summary once, then ask for a resolution. Example:

```
Preflight detected existing docs setup:
  - existing-config: .oat/config.json has a `documentation` section pointing at apps/docs
  - existing-app-dir: apps/docs exists on disk (clean working tree)
  - existing-agents-section: AGENTS.md has a ## Documentation section

How should I proceed?
  1. replace    — remove the existing docs app and scaffold fresh at the same path
  2. second-app — (deferred) add a new docs app alongside; not available in current CLI
  3. abort      — exit without changes
  4. repair     — run `oat docs analyze` / `oat docs apply` on the existing setup

Choose:
```

Record the user's choice as `conflictResolution` in the Input Result. If the user chose `second-app`, loop back to the prompt after surfacing the refusal message; do not emit `conflictResolution: 'second-app'`.

**Pre-scaffold invariant:**

No matter which resolution the user picks, the Scaffold Runner (Step 3) **never** invokes `oat docs init` until:

1. The chosen resolution's "Allowed mutations" have **completed successfully**, and
2. The working-tree state **matches what the CLI expects** for that resolution (e.g., for `replace`: the target directory is empty or absent, the `documentation` config section is cleared, the root `AGENTS.md` `## Documentation` section is cleared; for `abort` / `repair`: the skill has already exited).

If any mutation fails or any invariant check fails, **stop the flow before scaffold** and surface the error. A partial resolution followed by a scaffold produces a worse end state than either doing nothing or completing the resolution cleanly.

### Step 3: Scaffold Runner

Invoke `oat docs init` with the collected inputs and then apply labeled post-patches for any CLI gaps the Capability Detection sub-procedure reports as still-open. The Scaffold Runner has four phases: **CLI invocation** (authored here), **Capability Detection** (p03-t02), **site-identity patches** (p03-t03), and **scaffold-integrity patches** (p03-t04).

Print `[3/7] Scaffolding…` at the start of this step.

**Precondition:** The Conflict Resolution Contract's "Allowed mutations" have completed and the working-tree state matches what the CLI expects (Step 2's pre-scaffold invariant). If any resolution-triggered mutation is still pending, **do not invoke the CLI** — stop the flow and surface the missing state.

**3a. Assemble CLI flags.**

Build the flag list deterministically from the Input Result (Step 2e) and the Capability Detection result (3b, authored in p03-t02). Non-interactive mode is mandatory — the skill owns the interactive flow; the CLI runs headless.

Base flags (always passed):

- `--yes` — non-interactive
- `--framework {framework}` — from Input Result
- `--name {appName}` — from Input Result
- `--target-dir {targetDir}` — from Input Result
- `--description {siteDescription}` — from Input Result (pass empty string if user left blank)
- `--lint {lint}` — from Input Result
- `--format {format}` — from Input Result

Capability-gated flags (added only when the Capability Probe reports support):

- `--site-name {siteName}` — only if `capabilities.siteNameFlag === true` (FP-12 upstream fix landed). If `false`, **do not pass it**, and queue the FP-12 post-patch instead (applied in p03-t03).

Do not pass flags the CLI doesn't advertise. Never assume a flag exists because the skill wants it — the Capability Probe is the source of truth for what's safe to pass.

**3b. Run Capability Detection.**

Before CLI invocation, probe the installed CLI to discover which FP-12 / FP-11 / FP-13 / FP-15 gaps it has already closed. Post-patches must never run blindly — they must be gated on both a CLI-level capability probe **and** a file-shape check on the specific target file. This self-ratcheting keeps the skill correct as CLI fixes land upstream.

**CLI help probe.** Run `$CLI_CMD docs init --help` exactly once, capture stdout, and grep the flag list for known markers. Record boolean capability flags on the `capabilities` object:

- `siteNameFlag` — `true` if `--site-name` (or equivalent alias like `--title`) appears in the help output. Implies FP-12 upstream fix has landed.
- `turbopackRootFlag` — `true` if a flag for forwarding a Turbopack root (or a `--framework-config` passthrough that accepts `turbopack.root`) appears. Implies FP-11 fix has landed in some form.
- `agentsMdScaffoldFlag` — `true` if the help output mentions `AGENTS.md` scaffolding or the CLI's scaffold template list includes `AGENTS.md`. Implies FP-15 fix has landed.

If the `--help` invocation fails (non-zero exit or empty stdout), treat all capabilities as `false` and record a warning in `Scaffold Result.cliLogs.stderr` — do not guess. Assuming a capability that doesn't exist leads to a broken scaffold; assuming absence just means an extra post-patch runs unnecessarily.

**File-shape checks per patch target.** After the CLI writes the scaffold (3c completes), but before 3d applies any patch, read the target file and classify it as one of three states: `scaffold-shape` (unmodified CLI output, patch is safe), `patched-shape` (already patched by a previous skill run, patch is a no-op), or `drift` (neither — the file has been hand-edited or third-party-modified).

For each patch, the classification rule is:

- **FP-12 targets** — the patch sets display-title references in four files:
  - `<appRoot>/app/layout.tsx` (Fumadocs only): scaffold shape has `DocsLayout` with `branding: { title: '{appName}' }` (the CLI writes the package name); patched shape has `branding: { title: '{siteName}' }` surrounded by `<!-- FP-12 patch -->` markers.
  - `<appRoot>/docs/index.md`: scaffold shape has frontmatter `title: '{appName}'` and `# {appName}` H1; patched shape substitutes `{siteName}` in both positions.
  - `<appRoot>/docs/getting-started.md`: scaffold shape has a body reference to `{appName}`; patched shape uses `{siteName}`.
  - `<appRoot>/docs/contributing.md`: scaffold shape has `# {appName}` H1; patched shape uses `{siteName}`.
  - Classification: if the marker string (`appName` where expected in scaffold shape, `siteName` where expected in patched shape) matches exactly, the file is in that shape. If neither pattern matches (e.g., the user already renamed things manually), classify as `drift`.
- **FP-11 target** — `<appRoot>/next.config.js` (Fumadocs, nested-standalone only):
  - Scaffold shape: single-line `export default createDocsConfig()` or near-equivalent with no `turbopack` option.
  - Patched shape (via passthrough): `createDocsConfig({ turbopack: { root: __dirname } })` plus `<!-- FP-11 patch -->` marker comment.
  - Patched shape (via wrapper replacement): explicit `createMDX()` + hand-written config with `turbopack: { root: __dirname }` and the `<!-- FP-11 patch -->` marker.
  - Classification: pattern-match on the wrapper call or the `createMDX()` import; any other shape is `drift`.
- **FP-13 targets** — the four sub-findings (empty descriptions, bare commands, false lint claim, generated-file warning) each target a specific line or section (see design.md). Scaffold shape for each is "unchanged CLI scaffold output"; patched shape has the `<!-- FP-13 patch -->` marker comment adjacent to the rewrite.
- **FP-15 target** — `<appRoot>/AGENTS.md`:
  - Scaffold shape: file **does not exist** (current CLI doesn't scaffold it).
  - Patched shape: file exists and begins with `# AGENTS —` (the template's H1 form).
  - Any other state (file exists but has a different H1, file was hand-written) classifies as `drift`.

**Refuse-and-surface contract.** If any target classifies as `drift`, the associated patch **does not run**. Instead, record an entry in `Scaffold Result.patchesApplied` with `status: 'refused'`, the target path, the observed shape snippet, and a suggested manual fix for the user. Example:

```
patchesApplied:
  - id: FP-12/layout.tsx
    status: refused
    target: /abs/path/apps/docs/app/layout.tsx
    reason: drift — expected `branding: { title: 'docs' }` (scaffold) or patched-shape marker; found neither
    suggestedFix: manually set `DocsLayout.branding.title` to {siteName} and ensure `export const metadata = { title, description }` is present
```

Continue with remaining patches; one `refused` entry does not stop the flow. The Post-Scaffold Inspector (Step 5) surfaces the refused list to the user so they can address it manually.

**Probe ordering.**

- The CLI help probe runs **before** `oat docs init` (3c) so its result can feed flag assembly (3a).
- The file-shape checks run **after** `oat docs init` (3c) so they operate on the actual scaffold output.
- The post-patch sub-procedures (3d, site-identity and scaffold-integrity) read the combined `capabilities` record and target classifications to decide whether to apply each patch.

**3c. Invoke the CLI.**

Execute `oat docs init` as a non-interactive child process. Use `$CLI_CMD` resolved in Step 0 (`oat` or `pnpm run cli --`):

```bash
$CLI_CMD docs init {flags...}
```

Capture both stdout and stderr. **Do not** stream output directly to the user; the Educational Walkthrough (Step 6) references specific CLI log lines, so the skill needs the captured text.

**On non-zero exit:**

- Surface the CLI's stderr **verbatim** to the user (no re-wording — the user needs to see exactly what the CLI said).
- Print the exit code and the exact flag list that was passed.
- **Stop the flow.** Do not apply any post-patches. Do not proceed to Build Verifier. A failed scaffold produces an undefined state; guessing at recovery is worse than letting the user diagnose.
- Example surfaced error:

  ```
  oat docs init exited with code 2.

  Flags passed:
    --yes --framework fumadocs --name docs --target-dir docs
    --description "" --lint none --format oxfmt

  CLI stderr:
  { verbatim CLI stderr }

  Docs bootstrap stopped. Resolve the CLI error and re-run this skill.
  ```

**On zero exit:**

- Read back `$REPO_ROOT/.oat/config.json` to resolve `appRoot` from the newly written `documentation.root` entry. This is authoritative; do not infer from `targetDir` alone.
- Enumerate files under `appRoot` that did not exist before 3c (the Preflight Result's read-only snapshot provides the "before" set). Record as `createdFiles[]`.
- Emit the Scaffold Result for downstream sub-procedures:

  ```
  Scaffold Result:
    scaffoldSucceeded: true
    appRoot: absolute-path-string
    createdFiles: string[]           // paths relative to appRoot
    capabilities: { siteNameFlag: boolean, ... } // from Capability Detection (3b)
    cliLogs: { stdout: string, stderr: string }  // retained for Walkthrough
    patchesApplied: []               // populated by 3c/3d site-identity + scaffold-integrity sub-procedures
  ```

The Walkthrough (Step 6) and Post-Scaffold Inspector (Step 5) both consume `Scaffold Result`; keep it structured and avoid shell-side ephemeral state.

**3d. Apply post-patches.**

Each patch:

- Reads the relevant capability flag from `Scaffold Result.capabilities` and the file-shape detection from Capability Detection (3b).
- Runs only if the capability is **absent** (the CLI didn't already address the gap) AND the file-shape check passes.
- Is **labeled** with a comment marker (e.g., `<!-- FP-12 patch -->`) so it can be found and removed deterministically when the CLI fix lands upstream.
- Is **idempotent** — running the patch twice is a no-op.
- Appends an entry to `Scaffold Result.patchesApplied` with `{ id, status: 'applied' | 'skipped' | 'refused', reason? }`.

##### Site-identity patches (FP-12 + FP-15)

These patches close the "site name + AGENTS.md" gaps. They run after `oat docs init` (3c) and before scaffold-integrity patches (see 3d ordering note below). Site-identity must run before scaffold-integrity because the FP-13 sub-findings may reference `{siteName}` strings that FP-12 has just written.

**FP-12: title patches.**

Gate: run **only if** `capabilities.siteNameFlag === false`. If the CLI wrote the site title itself, skip the entire FP-12 group and record `{ id: 'FP-12', status: 'skipped', reason: 'CLI --site-name flag supported' }`.

Per-file edits (Fumadocs only — MkDocs has no `layout.tsx`; its title handling is covered by the MkDocs Minimum Contract in Step 6):

- **`<appRoot>/app/layout.tsx` — `branding.title`.** Scaffold shape has `branding: { title: '{appName}' }`. Replace the literal string value with `{siteName}` (the user-supplied display title) wrapped in FP-12 markers:

  ```tsx
  <!-- FP-12 patch: branding title -->
  branding={{ title: '{siteName}' }}
  <!-- /FP-12 patch -->
  ```

  Idempotency: if the marker `<!-- FP-12 patch: branding title -->` is already present, skip and record `status: 'skipped'`.

- **`<appRoot>/app/layout.tsx` — `export const metadata`.** If no `export const metadata` exists in the file, insert it after the imports:

  ```tsx
  /* FP-12 patch: site metadata */
  export const metadata = {
    title: '{siteName} Documentation',
    description: '{siteDescription}',
  };
  /* /FP-12 patch */
  ```

  (Use JS comment markers here — TSX does not allow HTML comments at module scope.) Idempotency: if `export const metadata` already exists anywhere in the file, skip; do not merge or replace user-authored metadata.

- **`<appRoot>/docs/index.md`.** Two edits:
  1. Frontmatter `title: '{appName}'` → `title: '{siteName}'`.
  2. First H1 `# {appName}` → `# {siteName}`.
     Wrap each edit with HTML-comment markers (`<!-- FP-12 patch: index title -->` / `<!-- /FP-12 patch -->` around the frontmatter line; same pattern around the H1 line). Idempotency: marker absence = scaffold shape, safe to patch; marker present = already patched, skip.

- **`<appRoot>/docs/getting-started.md`.** Body contains references to `{appName}` in the intro paragraph (per the scaffold template). Replace those references with `{siteName}`, wrapped in an HTML-comment marker on the first occurrence. Idempotency: marker absence = patch; marker present = skip.

- **`<appRoot>/docs/contributing.md`.** H1 `# {appName}` → `# {siteName}`, same marker pattern as `index.md`'s H1.

Failure handling: if Capability Detection (3b) classified any of these files as `drift`, the patch is already recorded as `refused` in `Scaffold Result.patchesApplied` — skip and move on. Do not re-check drift here.

**FP-15: AGENTS.md write-if-missing.**

Gate: run **only if** `capabilities.agentsMdScaffoldFlag === false` AND `<appRoot>/AGENTS.md` does not exist on disk.

- If the CLI scaffolded `AGENTS.md` itself, skip with `status: 'skipped', reason: 'CLI scaffolds AGENTS.md'`.
- If the file already exists (user hand-authored, or a previous skill run wrote it), **never overwrite**. Skip with `status: 'skipped', reason: 'AGENTS.md already present — not overwriting'`.

Procedure when gate passes:

1. Read the template from `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`.
2. Substitute placeholders:
   - `{{SITE_NAME}}` → `{siteName}` (Input Result)
   - `{{APP_DIR}}` → `{targetDir}` (Input Result; the scaffolded app path relative to repo root)
   - `{{REPO_NAME}}` → `{repoName}` (Preflight Result)
   - `{{GENERATE_INDEX_CMD}}` → rendered per repo shape:
     - `monorepo`: `pnpm --filter {appName} run docs:generate-index` (if the scaffold exposes that script) or the equivalent `pnpm -w run cli -- docs generate-index --docs-dir {appDir}/docs --output {appDir}/index.md`
     - `nested-standalone`: `(cd {appDir} && pnpm run docs:generate-index)` or the `-w` equivalent
     - `single-package`: `pnpm run docs:generate-index`
     - Fall back to the `pnpm -w run cli -- docs generate-index ...` form if the scaffold did not write a `docs:generate-index` script (determined by grepping `<appRoot>/package.json` after scaffold).
3. Write the rendered content to `<appRoot>/AGENTS.md`.
4. Wrap the entire file in an HTML comment banner at the top — not for idempotency (file existence is the idempotency check), but so the user knows this file was written by the skill and can be regenerated: `<!-- Generated by oat-docs-bootstrap (FP-15 bridge). Safe to hand-edit after generation. -->`.
5. Record `{ id: 'FP-15', status: 'applied', target: '<appRoot>/AGENTS.md' }` in `patchesApplied`.

When the CLI eventually scaffolds `AGENTS.md` natively and `agentsMdScaffoldFlag` becomes `true`, the bridge template in this skill can be retired (or folded back into the skill as a reference for how the CLI's template evolved).

##### Post-patch ordering

Inside 3d, patches run in this order:

1. Site-identity patches (this section) — FP-12 before FP-15 is irrelevant; they target disjoint files.
2. Scaffold-integrity patches (p03-t04) — these run after site-identity because FP-13 sub-findings may reference strings FP-12 just rewrote.

**Design discipline:**

- **CLI is the source of truth for templates.** The Scaffold Runner never rewrites template content, re-renders frontmatter, or fabricates files the CLI was supposed to create. Post-patches only adjust specific known-gap locations, and every patch is labeled.
- **Capability Detection gates every patch.** No patch runs blindly; the file-shape check must pass, and the capability must be absent. This means the skill self-ratchets as CLI fixes land — when `--site-name` is supported upstream, FP-12 patches are skipped automatically.
- **Failure is loud, not silent.** CLI non-zero exit stops the flow with the verbatim error. Ambiguous file shapes record a `refused` patch status rather than guessing.

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
