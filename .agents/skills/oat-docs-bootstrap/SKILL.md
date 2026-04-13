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

##### Scaffold-integrity patches (FP-11 + FP-13)

These patches close the "scaffold works but produces inaccurate or incomplete output" gaps. They run after the site-identity patches so FP-13 sub-findings operate on the correct `{siteName}` text.

**FP-11: Turbopack root patch.**

Gate: run **only if** `repoShape === 'nested-standalone'` AND `framework === 'fumadocs'` AND `capabilities.turbopackRootFlag === false`. Monorepo and single-package shapes do not hit the multi-lockfile warning; MkDocs has no Turbopack concern. If any gate is unmet, record `{ id: 'FP-11', status: 'skipped', reason: '<gate that failed>' }`.

Two code paths, selected by the file-shape classification of `<appRoot>/next.config.js` from Capability Detection (3b):

- **Path A — `createDocsConfig` passthrough.** If `<appRoot>/next.config.js` is in scaffold shape using `createDocsConfig()` AND `@open-agent-toolkit/docs-config` exposes a `turbopack` passthrough option (determined by reading the installed package's type declarations or `package.json` exports), pass `{ root: __dirname }` through:

  ```js
  // <!-- FP-11 patch: turbopack root passthrough -->
  export default createDocsConfig({
    turbopack: { root: __dirname },
  });
  // <!-- /FP-11 patch -->
  ```

  Idempotency: if the marker is already present, skip with `status: 'skipped'`.

- **Path B — wrapper replacement.** If the passthrough isn't supported (the `@open-agent-toolkit/docs-config` version installed is older than the one that added it), replace the `createDocsConfig()` wrapper with an explicit `createMDX()` + hand-written Next config. Preserve any user-authored edits the wrapper had accumulated (by diffing against the known scaffold shape before replacing):

  ```js
  // <!-- FP-11 patch: wrapper replaced for turbopack root -->
  import createMDX from 'fumadocs-mdx/next';

  const withMDX = createMDX();

  /** @type {import('next').NextConfig} */
  const config = {
    reactStrictMode: true,
    turbopack: { root: __dirname },
  };

  export default withMDX(config);
  // <!-- /FP-11 patch -->
  ```

  Before replacing, snapshot the original `next.config.js` to `next.config.js.pre-fp11.bak` in the same directory so the user can inspect the prior state. Record the backup path in `patchesApplied` so the Walkthrough can mention it.

  Idempotency: if the marker is present, skip; if the wrapper replacement has already happened but without the marker (indicating a user-customized variant), classify as `drift` and refuse.

**FP-13: template-content patches.**

Four sub-findings, each with its own gate, target, and idempotency check. All sub-findings apply to Fumadocs; MkDocs handling lives in the Walkthrough's MkDocs Minimum Contract (Step 6, p05-t02) because the MkDocs scaffold's content layout differs and doesn't share these specific gaps.

- **Sub-finding A: Empty `description:` frontmatter.** Targets: `<appRoot>/docs/getting-started.md:3` and `<appRoot>/docs/contributing.md:3`.
  - Gate: the target line matches `description: ''` (scaffold shape).
  - Patch: replace with static defaults:
    - `getting-started.md`: `description: 'Set up the local environment and preview the docs site.'`
    - `contributing.md`: `description: 'Authoring conventions and navigation rules for this docs site.'`
  - Wrap each edit with `<!-- FP-13 patch: description-A -->` / `<!-- /FP-13 patch -->` on the line above.
  - Idempotency: marker present = skip.
  - Rationale: these are per-page descriptions, not site-level — do not template on `{siteDescription}`; use static text that describes the page's own purpose.

- **Sub-finding B: Bare install/build commands lack working-directory context.** Target: `<appRoot>/docs/getting-started.md` (the install/build code block, per scaffold lines 15-33 or nearest equivalent after FP-12 patches).
  - Gate: the block contains a bare `pnpm install` / `pnpm dev` / `pnpm build` sequence with no `--filter` or `cd` prefix (scaffold shape).
  - Patch: rewrite the block per `repoShape`:
    - `monorepo`: prefix each command with `pnpm --filter {appName}` (e.g., `pnpm --filter {appName} install`, `... dev`, `... build`).
    - `nested-standalone`: prefix each command with `cd {appDir} && ` (e.g., `cd apps/docs && pnpm install`).
    - `single-package`: leave bare form — it works correctly from repo root.
  - Wrap the entire rewritten block with `<!-- FP-13 patch: commands-B -->` / `<!-- /FP-13 patch -->`.
  - Idempotency: marker present = skip. If the block has drifted (not bare, not already patched), classify as `drift` and refuse.

- **Sub-finding C: False `docs:lint` claim.** Target: `<appRoot>/docs/contributing.md` line describing the `docs:lint` script (near line 31 per scaffold, may have shifted).
  - Gate: `lint === 'none'` (Input Result) AND the line contains the exact scaffold string "Run Markdown formatting and linting as configured for this docs app."
  - Patch: replace with "Run Markdown formatting as configured for this docs app." (dropping "and linting").
  - If `lint === 'markdownlint-cli2'`, the original claim is accurate — skip with `status: 'skipped', reason: 'linting is configured'`.
  - Wrap with `<!-- FP-13 patch: lint-claim-C -->` / `<!-- /FP-13 patch -->`.
  - Idempotency: marker present = skip.

- **Sub-finding D: Generated `index.md` lacks "do not hand-edit" warning.** Two sub-targets:
  - **D.1 — `contributing.md` explanatory section.** Append a "Generated files" section to `<appRoot>/docs/contributing.md` (before any closing References section if present). Two sentences:

    ```markdown
    <!-- FP-13 patch: generated-files-D -->

    ## Generated files

    The root-level `index.md` at `<appRoot>/index.md` is regenerated from `docs/index.md` and its `## Contents` sections on every `predev` / `prebuild`. Do not hand-edit it; edit the authored source under `docs/` instead.

    <!-- /FP-13 patch -->
    ```

    Idempotency: marker present = skip.

  - **D.2 — Generated `index.md` header comment.** This runs at scaffold time only if `<appRoot>/index.md` exists after the CLI completes (the generate-index script may or may not have run as part of `init`). Prepend the following on the first post-scaffold run:

    ```markdown
    <!-- generated by oat docs generate-index; do not hand-edit. Source: docs/index.md -->
    ```

    Detect on subsequent runs (both skill re-invocations and normal `predev`/`prebuild`) and preserve idempotently: if the comment is already present at the top of the file, the `generate-index` command and the skill both leave it alone.

    If `<appRoot>/index.md` does not exist after scaffold (the script didn't run), record `{ id: 'FP-13/D.2', status: 'skipped', reason: 'index.md not yet generated; will be added on first prebuild' }` and instead add a one-time hook: modify `<appRoot>/package.json` to wrap the `prebuild`/`predev` script to prepend the header comment to the generated file on first run. This hook is labeled with the marker `<!-- FP-13 patch: generated-header-D2 -->` inside the resulting generated file.

**Refuse-and-surface.** Every patch above respects the drift classification from Capability Detection. If a target was classified `drift`, the patch was already recorded as `refused` in 3b — skip here and do not re-check.

##### Post-patch ordering

Inside 3d, patches run in this order:

1. Site-identity patches (this section) — FP-12 before FP-15 is irrelevant; they target disjoint files.
2. Scaffold-integrity patches (p03-t04) — these run after site-identity because FP-13 sub-findings may reference strings FP-12 just rewrote.

**Design discipline:**

- **CLI is the source of truth for templates.** The Scaffold Runner never rewrites template content, re-renders frontmatter, or fabricates files the CLI was supposed to create. Post-patches only adjust specific known-gap locations, and every patch is labeled.
- **Capability Detection gates every patch.** No patch runs blindly; the file-shape check must pass, and the capability must be absent. This means the skill self-ratchets as CLI fixes land — when `--site-name` is supported upstream, FP-12 patches are skipped automatically.
- **Failure is loud, not silent.** CLI non-zero exit stops the flow with the verbatim error. Ambiguous file shapes record a `refused` patch status rather than guessing.

### Step 4: Build Verifier

Install dependencies and build the scaffolded docs app. Classify failures against a small list of known patterns. Auto-fix only when there is a single known-correct remedy; surface everything else with context and stop the flow.

Print `[4/7] Verifying build…` at the start of this step.

Skip this step entirely if `Scaffold Result.scaffoldSucceeded !== true` — a failed scaffold produces an undefined state; installing and building on top of it makes things worse.

**4a. Install dependencies.**

Command varies by repo shape (from Preflight Result) and framework (Fumadocs only uses pnpm; MkDocs uses Python tooling — handled in the MkDocs Minimum Contract, Step 6):

- `monorepo`: run `pnpm install` at `$REPO_ROOT`.
- `single-package`: run `pnpm install` at `$REPO_ROOT`.
- `nested-standalone`: run `pnpm install` inside `<appRoot>` (`cd <appRoot> && pnpm install`). The nested lockfile means install must happen at the app root, not repo root.

For Fumadocs, capture both stdout and stderr. Print a start line (`Installing dependencies…`) and a completion line with duration.

**4b. Build.**

Command varies by shape:

- `monorepo`: `pnpm --filter {appName} build` at `$REPO_ROOT`.
- `single-package`: `pnpm build` at `$REPO_ROOT`.
- `nested-standalone`: `pnpm build` inside `<appRoot>`.

Capture both stdout and stderr. Print a start line (`Building {appName}…`) and a completion line with duration.

**4c. Classify failures against known patterns.**

Inspect the captured install and build output. For each known pattern below, check whether the output matches; if yes, apply the specified handling. Patterns are disjoint — match the first one that fits; do not cascade.

- **`ERR_PNPM_NO_MATCHING_VERSION` on `@open-agent-toolkit/*`.**
  - Detection: `ERR_PNPM_NO_MATCHING_VERSION` appears in install stderr, and the failing package is under the `@open-agent-toolkit/` scope.
  - Handling: **surface-only, do not auto-fix.** This typically indicates a local pnpm registry link drift that the user needs to resolve (rebuild/link the workspace packages). Surface the verbatim error, explain the cause in one sentence, and suggest the user re-run after resolving their local package state. Do not retry.
- **`fumadocs-mdx: command not found` accompanied by a "node_modules missing" warning.**
  - Detection: build stderr contains `fumadocs-mdx: command not found` AND the output contains a warning about missing `node_modules` or skipped install.
  - Handling: **auto-fix by rerunning install.** Re-run 4a once, then re-run 4b. If the second attempt still fails with the same pattern, escalate to surface-only — do not loop.
- **Turbopack "inferred workspace root" warning.**
  - Detection: build stdout/stderr contains the Next.js/Turbopack inferred-root warning about multiple lockfiles.
  - Handling: **benign if FP-11 patch was applied** (check `patchesApplied` for `status: 'applied'` on `FP-11/*`). If FP-11 was applied and the warning still appears, flag as an inconsistency in the Inspection stage, but do not fail the build. If FP-11 was not applied (e.g., shape was not `nested-standalone`), the warning shouldn't appear; if it does, flag it for the user because something unexpected is going on.
- **FP-10 tsconfig rewrite churn.**
  - Detection: build stdout contains repeated "Rewriting tsconfig..." lines (the historical FP-10 symptom prior to PR #27).
  - Handling: **flag as regression.** PR #27 is supposed to have fixed this; if it still happens, add to `knownIssues[]` with note "FP-10 regression suspected — report to CLI maintainers". Build may still succeed, so do not halt the flow on this alone.

**4d. Unknown-error stop.**

If install or build fails with output that does not match any known pattern above:

- **Stop the flow.** Do not proceed to Post-Scaffold Inspector (Step 5) or Walkthrough (Step 6).
- Surface the last 40 lines of captured stderr verbatim.
- Print the command that failed and the working directory it ran in.
- Tell the user: `Build Verifier stopped on an unrecognized error. Resolve the error and re-run this skill.`

**Auto-fix discipline.** Auto-fix is narrow by design — it applies only when there is a **single known-correct answer**. Everything else is surfaced. The goal is to save the user time on truly deterministic retries (like the `fumadocs-mdx` + missing-node_modules combination) without masking real failures under speculative "try again" loops.

**Cross-reference.** FP-13 (template-content sub-findings) is **not** a Build Verifier concern — FP-13 is handled entirely by the Scaffold Runner post-patches (Step 3d). The Build Verifier does not inspect markdown content or re-apply FP-13 patches; it only classifies install/build failures.

**4e. Emit the Verification Result.**

Record internally for the Post-Scaffold Inspector and Walkthrough:

```
Verification Result:
  installSucceeded: boolean
  buildSucceeded: boolean
  knownIssues: Array<{ pattern, severity: 'benign' | 'flagged' | 'surface-only' | 'auto-fixed', detail }>
  unrecognizedError: { command, cwd, stderrTail } | null
  logs: { install: { stdout, stderr }, build: { stdout, stderr } }
```

The Walkthrough references `knownIssues[]` when narrating what the user just saw; the Inspector uses it to correlate drift findings with build-time warnings.

### Step 5: Post-Scaffold Inspector

Read the post-scaffold configuration back, verify its paths, detect drift between config and filesystem, handle nested-standalone dual-config, and collect the `requireForProjectCompletion` opt-in before the Walkthrough. This is the **only** component that writes to `.oat/config.json` — Preflight and Input Gatherer are read-only; Scaffold Runner writes via the CLI.

Print `[5/7] Inspecting config…` at the start of this step.

Skip this step if `Verification Result.buildSucceeded !== true` — inspecting a broken scaffold invites the user to act on inaccurate state.

**5a. Read parent `.oat/config.json` and parse `documentation`.**

Read `$REPO_ROOT/.oat/config.json` after scaffold. The CLI wrote (or updated) the `documentation` section with `root`, `tooling`, `config`, and `index` fields. Parse the section into an `InspectionState` object:

```
InspectionState (parent):
  configPath: $REPO_ROOT/.oat/config.json
  documentation: OatDocumentationConfig | null
  issues: []   // populated by 5b–5d
```

If the `documentation` section is missing or malformed after a successful CLI invocation, that's a severe skill-versus-CLI mismatch — flag it loudly in `issues[]` with `severity: 'critical'` and surface to the user before continuing. Do not try to fabricate a section.

**5b. Verify paths per field.**

For each field in `documentation`, check that the referenced path exists and has the expected type:

- `root`: must be a directory that exists on disk (absolute or resolved-relative to `$REPO_ROOT`).
- `index`: must be a file that exists on disk (Fumadocs: `<appRoot>/index.md`; MkDocs: `<appRoot>/docs/index.md`). The generated root `index.md` is part of the contract even though it's regenerated every build.
- `config`: MkDocs only — must be a file that exists on disk (`<appRoot>/mkdocs.yml`). For Fumadocs, this field is absent; no check needed.
- `tooling.framework`: must match the Input Result `framework`. Mismatch is surprising and indicates drift.
- `tooling.lint` / `tooling.format`: must match Input Result values.

For each check that fails, append an entry to `issues[]`:

```
{ field: 'documentation.root', severity: 'critical', detail: 'path does not exist: ...' }
```

**5c. Nested-standalone dual-config handling.**

If `repoShape === 'nested-standalone'`, the docs app may have its own `.oat/config.json` (inherited or copied from the parent during scaffold). Check for `<appRoot>/.oat/config.json`:

- If present: parse it as a second `InspectionState (nested)` record. Verify its paths relative to its own root. Note this explicitly for the Walkthrough — the user may be confused about why there are two configs; the Walkthrough (Section D) explains it.
- If absent: this is the common case; record nothing and move on.

The parent config describes the repo's docs; the nested config (when present) scopes OAT operations executed from inside the docs app. Do **not** try to reconcile the two or rewrite one to match the other — they serve different scopes by design. Surface what you found; let the user decide.

**5d. Drift detection (config ↔ filesystem ↔ patches).**

Beyond basic path existence, check for drift between the config and what the Scaffold Runner actually did:

- If `Scaffold Result.patchesApplied` contains an FP-11 wrapper-replacement entry (Path B), confirm that the config does not reference the old wrapper path. Config referencing `createDocsConfig` would be stale; record as `driftFinding`.
- For every `status: 'refused'` entry in `patchesApplied`, surface the refusal here (the Scaffold Runner recorded a `suggestedFix`; repeat it). These are the main user-actionable items from the inspection.
- If Turbopack "inferred workspace root" was flagged in `Verification Result.knownIssues` despite FP-11 having been applied, record a `driftFinding` — FP-11's patch should have suppressed the warning.

Each drift finding appends to `issues[]` with `severity: 'warning'` (user should address) or `severity: 'info'` (worth mentioning but not blocking).

**5e. `requireForProjectCompletion` opt-in prompt.**

This is a project-completion gate: when set to `true` on the `documentation` section, OAT project workflows check that the docs are up-to-date before marking a project complete. Default is `false`.

Before asking, explain what it does:

```
OAT projects can optionally require that docs are updated before completion.
If enabled, `oat-project-complete` won't mark a project done until the
`oat docs analyze` report shows no open recommendations.

Enable this for {appName}? (default: no)
```

If user opts in (`yes`), write `documentation.requireForProjectCompletion: true` to `$REPO_ROOT/.oat/config.json` using the **atomic config write** pattern (read → mutate → write, preserving all other fields). Do not rewrite fields the CLI owns — only mutate `requireForProjectCompletion`.

If user opts out (default), record the decision in `InspectionState.issues` as `{ severity: 'info', detail: 'requireForProjectCompletion remains false (not opted in)' }` and move on; do not write to the config.

**Write-once discipline:** 5e is the only point in this skill where `.oat/config.json` is mutated outside of the CLI's own writes. Preflight is read-only (Step 1). Input Gatherer is read-only (Step 2). Scaffold Runner's writes flow through the CLI (Step 3c). Post-patches (Step 3d) mutate scaffold output files, not the config. If you find yourself about to write `.oat/config.json` anywhere else, stop — it belongs here.

**5f. Emit the Inspection Result.**

Record for the Walkthrough:

```
Inspection Result:
  parent: InspectionState
  nested: InspectionState | null    // only present if nested-standalone + nested config exists
  issues: Array<{ field?, severity: 'critical' | 'warning' | 'info', detail, suggestedFix? }>
  requireForProjectCompletion: boolean   // final value after 5e
```

The Walkthrough's Section D (Configuration readback) references `issues[]` verbatim — format it so it reads cleanly when printed to the user.

### Step 6: Educational Walkthrough

Narrate the scaffolded docs app as a chunked conversation, not a wall of text. The Walkthrough's job is to turn the user from "I ran a scaffold" into "I know how this docs app works". It is **not** a re-explanation of the CLI's output, nor a recitation of the AGENTS.md content — both are live files the user can read; the Walkthrough contextualizes them.

Print `[6/7] Walkthrough…` at the start of this step.

Skip this step if `Verification Result.buildSucceeded !== true` OR `Inspection Result.issues` contains any `severity: 'critical'` — narrating a broken scaffold teaches the wrong model.

**Format discipline.** Each section below is a short spoken-style chunk (3–6 short paragraphs), references concrete paths from the `Scaffold Result` / `Inspection Result`, and ends with a single-sentence "what this means for you" takeaway. After each section, pause and check the user wants to continue: `Ready for the next section? (yes / skip to summary)`. If the user says `skip to summary`, jump directly to Step 7's Exit summary.

**Audience discipline.** The Walkthrough is a **setup-time** narration — it runs once, now. The docs-app `AGENTS.md` (FP-15 bridge or CLI-scaffolded) is the **runtime** reference future agents will read when working inside the docs app. These are different audiences at different times; the Walkthrough does not duplicate the AGENTS.md content. If you find yourself reading AGENTS.md content aloud, stop — point the user at the file path instead.

#### Section A (both frameworks) — Your OAT documentation config

Ground this section in the `Inspection Result.parent.documentation` object read back in Step 5, not in generic field documentation. The user just saw the scaffold write this; the Walkthrough tells them what it means.

Narrate each field actually present in their config (skip fields that are absent — don't teach MkDocs-only fields to a Fumadocs user):

- **`documentation.root`** — the scaffolded app directory. Downstream tools (`oat-project-document`, `oat docs analyze`, `oat docs apply`) use this to find "the docs" without the user having to tell them.
- **`documentation.tooling`** — framework + lint + format. `oat docs analyze` uses `framework` to pick the right rule set; the tooling values also get echoed into the `## Documentation` section the CLI wrote into root `AGENTS.md`.
- **`documentation.index`** — the authored `docs/index.md`. This is the content map (not the generated root `index.md` — that's Section B). Tools read this to understand top-level navigation intent.
- **`documentation.config`** (MkDocs only) — path to `mkdocs.yml`. Present for MkDocs because its chrome/nav is YAML-configured; absent for Fumadocs because chrome is code.
- **`documentation.requireForProjectCompletion`** — the opt-in collected in Step 5e. If `true`, `oat-project-complete` will block project completion until `oat docs analyze` reports no open recommendations. Explain whichever value is set on this project.

End with: "This config is how every OAT docs tool finds your docs. Editing it by hand is supported — but changes to `root` or `config` paths need to match reality on disk."

#### Section B (both frameworks) — The two `index.md` files

This section prevents the footgun from FP-13 sub-finding D: users silently hand-edit the generated `index.md` and wonder why their edits vanish on the next build.

Narrate:

- **The authored source** at `<appRoot>/docs/index.md`. This is the file the user edits. It has frontmatter (`title`, `description`) and a `## Contents` section listing direct children of the docs root. It is the top of a fractal: every directory has its own `index.md`, each with its own `## Contents`.
- **The generated map** at `<appRoot>/index.md` (when Fumadocs — the path differs for MkDocs; use the `documentation.index` path resolved by the Inspector if it differs). Regenerated on every `predev` / `prebuild` by the `oat docs generate-index` command. Machine-shaped: rolls up every `## Contents` section in the tree into a single searchable map that tools consume. **Hand-edits are silently clobbered.**
- **How to tell them apart when opening a file.** If the file sits inside `docs/`, it's authored. If it sits at `<appRoot>/index.md` (outside `docs/`), it's generated — and if Scaffold-integrity FP-13/D.2 patched it, the first line is a `<!-- generated … -->` banner confirming so.

End with: "Always edit `docs/index.md` and the `## Contents` sections. Never edit the root-level `index.md` — your edits will disappear next build."

#### Section C (both frameworks) — The `## Contents` contract

This section explains why tooling works at all — the contract every OAT docs tool relies on.

Narrate:

- **Every directory under `docs/` has an `index.md`.** No exceptions, no `overview.md`, no README-as-index. Missing `index.md`s are the first thing `oat docs analyze` flags.
- **Every `index.md` has a `## Contents` section.** The section is a plain Markdown bulleted list of links to the direct children of that directory — both subdirectory `index.md`s and leaf pages.
- **The `## Contents` section is the machine-readable local map.** It's what `oat docs nav sync` reads to regenerate framework nav, what `oat docs generate-index` reads to roll up the tree, and what `oat docs analyze` reads to find orphaned pages.
- **Anything not listed in `## Contents` is invisible to the tooling.** Adding a Markdown file is not enough — it must also appear under the parent `index.md`'s `## Contents`.

Show the user their own `docs/index.md` `## Contents` as a concrete example (read the file and paste the relevant 5–15 lines). Then note: "That's the pattern. Every directory you create from now on follows the same shape."

End with: "`## Contents` is how navigation stays in sync with filesystem. If the nav tooling seems confused, the answer is almost always 'check the nearest `## Contents`'."

#### Section D (both frameworks) — Three agent-instruction surfaces

The docs app is surrounded by three separate places agents and humans are expected to read. Each has a distinct audience and a distinct time. Conflating them is the source of most "why isn't AGENTS.md helping me?" confusion.

Narrate the three surfaces with audience + time discipline:

1. **Root `AGENTS.md` `## Documentation` section** — the repo-wide pointer. A 4-line breadcrumb every agent working anywhere in the repo reads first. Written/updated by `oat docs init` (or `oat docs apply`). Purpose: "docs live here; here's the framework; here's the config path." Not a tutorial — a signpost.
2. **Docs-app `AGENTS.md`** at `<appRoot>/AGENTS.md` — the ongoing reference for agents who are **working inside the docs app**, not setting it up. This is the FP-15 bridge file (or CLI-scaffolded equivalent if `capabilities.agentsMdScaffoldFlag === true`). Task-framed sections: "When you need to add a new page", "When you need to restructure navigation", "When you need to audit or bulk-edit docs". **Audience discipline:** this file exists for the agent working on docs content **six months from now**, not for the agent running this skill today. Everything in it should still be useful at that time. If content would only matter at setup time, it belongs in this Walkthrough, not in `AGENTS.md`.
3. **`docs/contributing.md`** — human-authoring conventions. Markdown feature reference (code blocks, mermaid, GFM alerts), frontmatter requirements, linting/formatting commands (if enabled). Not agent instructions — human reference. Agents working with docs content may read it for the Markdown feature list, but its primary audience is a human contributor.

End with: "Three surfaces, three audiences, three lifetimes. Root `AGENTS.md` = repo-wide pointer. Docs-app `AGENTS.md` = future agents working inside the docs app. `contributing.md` = humans. Keeping them separate keeps each one useful."

#### Section E (Fumadocs only) — Framework deep dive

Skip this section entirely when `framework === 'mkdocs'`; the MkDocs equivalent (with its Minimum Contract) is Section F.

Narrate how the Fumadocs scaffold actually works, grounded in files the user can open alongside you:

- **`app/layout.tsx` — `DocsLayout` renders the chrome.** The `<DocsLayout>` component from `@open-agent-toolkit/docs-theme` wraps every docs page with the top nav, sidebar, and search UI. It accepts a `branding` prop with `title`, `logo`, etc. **Runtime insight (worth knowing):** the compiled theme bundle only forwards `branding.title` into the nav header chrome — it doesn't use it for page metadata, social cards, or browser tab titles. That's why FP-12's patches also add `export const metadata = { title, description }` to `layout.tsx`: the chrome title and the document title are two separate concerns, and the scaffold only wired the first.
- **`next.config.js` — `createMDX()` picks up `docs/`.** The Fumadocs MDX pipeline uses `@open-agent-toolkit/docs-config`'s `createDocsConfig()` wrapper, which under the hood calls `createMDX()` with the docs directory hardcoded to `docs/`. MDX files are compiled at build time; frontmatter becomes typed metadata accessible from layouts and listings.
- **FlexSearch static indexing.** Search is client-side — on build, Fumadocs scans every MDX file under `docs/` and emits a precomputed FlexSearch index that loads alongside the first route. No server; no search API call. That's also why renaming a page without a redirect loses deep links silently: the old index entry stops existing at the next build, and the new one doesn't know the old slug.
- **`@open-agent-toolkit/docs-theme` branding.** The theme package centralizes the nav/sidebar/footer look and forwards only a small surface of props. Don't expect `branding` to influence metadata; use the FP-12 `metadata` export for that.
- **FP-11 Turbopack root.** If your repo is `nested-standalone` (docs app has its own lockfile inside the monorepo), Next's Turbopack infers the wrong workspace root and warns about multiple lockfiles. The FP-11 patch sets `turbopack: { root: __dirname }` either via `createDocsConfig` passthrough or (if the passthrough isn't available) by replacing the wrapper with an explicit `createMDX()` config. Check `patchesApplied` to see which code path your scaffold used.

End with: "Fumadocs gives you a typed MDX pipeline with client-side search and code-owned chrome. Branding is one layer (nav only); metadata is a separate, explicit concern. Most page-level edits are frontmatter + Markdown; only layout/theme changes go in `app/`."

#### Section F (MkDocs only) — Lean summary with Minimum Contract

Skip this section entirely when `framework === 'fumadocs'`.

Narrate the minimum mental model a user needs to work productively in MkDocs, then **mark clearly** what is in scope for this skill vs. what is not. MkDocs has a sprawling ecosystem (Material theme, plugin catalog, Python env specifics) that a scaffold-time walkthrough cannot cover without ballooning beyond usefulness.

In scope (required — share these):

- **`mkdocs.yml` is the root config.** Site name, nav, theme, plugins, Markdown extensions — all in one YAML file. The CLI scaffolded one tuned for the OAT conventions.
- **Material theme provides the default UI.** Light/dark toggle, responsive sidebar, search UI. Config lives under `theme:` in `mkdocs.yml`.
- **Plugins are pip-installed and named in `mkdocs.yml`.** The scaffold's `requirements.txt` pins the plugins currently wired in. Adding a new plugin = add to both files.
- **Python environment via `requirements.txt` + `setup-docs.sh`.** The scaffold provides a `setup-docs.sh` that creates a venv, installs `requirements.txt`, and is idempotent on re-run. Use it; the skill assumes you will.
- **The shared concepts still apply.** The `## Contents` contract (Section C), the two `index.md` model (Section B — note for MkDocs the generated artifact is the `nav:` section of `mkdocs.yml`, not a root `index.md`), and the three agent-instruction surfaces (Section D) all transfer directly.

Deferred (out of scope for this skill — point, don't teach):

- **Material theme internals.** Customizing palettes beyond light/dark, component overrides, template extensions. See the Material docs.
- **Plugin authoring.** Writing your own MkDocs plugin. See the MkDocs plugin docs.
- **Python env debugging.** Venv activation issues, dependency conflicts, pip resolution failures. General Python tooling help.
- **MkDocs-specific Markdown extensions beyond the shared set.** Admonitions, tabs, content tabs, abbreviations, etc. See Material's Markdown extension docs.
- **Deployment patterns** (GitHub Pages, Netlify, self-hosted). Framework-agnostic; outside the bootstrap scope.

End with: "That's the Minimum Contract. Everything on the deferred list has good upstream docs; this skill's job is to get you productive inside OAT's conventions. For the Material deep-dive, the MkDocs plugin ecosystem, or deployment, look at the linked references."

#### Section G (both frameworks) — The OAT docs ecosystem

Introduce the three tools the user will use after scaffold, ordered by when they'll meet each one:

- **`oat-project-document`** — runs during OAT project workflows. When a project wraps up (or at phase boundaries), this skill reads `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md` and proposes evidence-backed documentation updates. No speculation: every proposed update traces back to a source artifact. The user approves the updates before they land. This is the primary way project-derived docs stay current without requiring the user to hand-write them.
- **`oat docs analyze`** — read-only audit of the docs surface. Checks the `## Contents` contract (every dir has `index.md`; every `index.md` has `## Contents`; every link resolves), surfaces drift between filesystem and config, and flags orphaned pages. Produces a report at `.oat/repo/analysis/` — never mutates content. Run it periodically, and before changes to doc-heavy areas.
- **`oat docs apply`** — executes approved analyze recommendations. Creates a branch, runs the fixes, syncs derived navigation artifacts, and (optionally) opens a PR. Will not make unapproved changes or invent new conventions. This is the intended path for any bulk content change; hand-editing a dozen pages at once skips the safety net.

End with: "`oat-project-document` fills docs from project artifacts. `oat docs analyze` tells you where the docs are drifting. `oat docs apply` fixes approved drift with a safety net. Together they're the reason hand-authoring docs from scratch isn't the expected path in OAT."

### Step 7: Optional Content Kickoff

After the Walkthrough, offer — but do not require — to populate initial documentation via the docs-analysis pack. Content authoring is outside this skill's scope (`oat-docs-analyze` + `oat-docs-apply` own it), so this step delegates if the user wants to go further now, and hands off with actionable commands if they don't.

Print `[7/7] Optional content kickoff…` at the start of this step.

**7a. Offer the option.**

Ask once, plainly:

```
Your docs app is scaffolded and verified. Want to populate initial documentation
now by running the docs-analysis pack?

  oat-docs-analyze — reads your scaffolded `docs/` surface and proposes
  content recommendations (missing pages, incomplete `## Contents`, link gaps)
  without changing anything.

  oat-docs-apply — executes approved recommendations on a branch, runs nav
  sync, and optionally opens a PR.

Options:
  yes — run analyze now, then apply on approval
  no  — exit; you can run these any time later
```

**7b. If the user accepts (`yes`).**

Delegate — do not re-implement analyze/apply logic here.

1. Invoke the `oat-docs-analyze` skill against the scaffolded app. Pass the Inspection Result's `documentation.root` path so analyze targets the right surface. Wait for analyze to complete.
2. Surface analyze's report to the user in its native form — do not re-summarize. The user reads it, decides which recommendations to approve.
3. If the user approves any recommendations, invoke the `oat-docs-apply` skill with the approved subset. Wait for apply to complete.
4. Report the outcome back briefly: branch name, PR URL if opened, files changed count.

If analyze produces no recommendations (the scaffold is complete and nothing's missing — unlikely on a fresh scaffold but possible), tell the user and skip apply.

**7c. If the user declines (`no`).**

Hand off with specific, runnable commands. Don't say "run analyze later" — give them the exact invocation for this repo:

- `oat-docs-analyze` (skill invocation from this repo's provider) to audit the docs surface.
- `oat-docs-apply` (skill invocation) to execute approved recommendations.
- `oat-project-document` (skill invocation during OAT project workflows) to propose evidence-backed updates from project artifacts.

Proceed to the Exit summary regardless of whether the user accepted or declined.

#### Exit summary

The final output of Step 7 — and of the skill. Regardless of whether the Content Kickoff delegated or was skipped, print a single scannable summary the user can refer back to later.

Format as a bulleted summary, not prose. Keep it tight — this is a handoff, not a recap:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ DOCS BOOTSTRAP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

App:         {appName}
Location:    {appRoot}
Framework:   {framework}
Config:      {configPath} (documentation section)

Created:
  - <count> files (see `git status` or `git log -1` for the full list)

Patches applied:
  - FP-11 Turbopack root: {applied | skipped | refused | n/a}
  - FP-12 site title + metadata: {applied | skipped | refused}
  - FP-13 template content (A–D): {applied | skipped | refused} per sub-finding
  - FP-15 docs-app AGENTS.md: {applied | skipped}

Build:
  - Install: {ok | known-issue: ...}
  - Build:   {ok | known-issue: ...}
  - Known issues (from Verification Result.knownIssues): {list or 'none'}

Inspection:
  - Config paths verified:  {ok | see issues below}
  - Drift findings:          {list or 'none'}
  - requireForProjectCompletion: {true | false}

Where things live:
  - Authored content:  {appRoot}/docs/
  - Content map:       {appRoot}/docs/index.md (and nested `## Contents`)
  - Generated index:   {path, if Fumadocs} (regenerated on build — don't hand-edit)
  - Agent instructions:
      · Root AGENTS.md `## Documentation` — repo-wide pointer
      · {appRoot}/AGENTS.md — reference for future agents working in this docs app
      · {appRoot}/docs/contributing.md — human authoring conventions

Next:
  - Run `<framework-specific dev command>` to serve locally
  - Run `oat-docs-analyze` to audit the docs surface (read-only)
  - Run `oat-docs-apply` to execute approved recommendations
  - Run `oat-project-document` during OAT project workflows to keep docs current

Reminder: the docs-app AGENTS.md at {appRoot}/AGENTS.md tells future agents how
to work inside this docs app. Read it before making non-trivial doc changes.
```

Substitute every `{placeholder}` with the actual value from `Scaffold Result`, `Verification Result`, or `Inspection Result`. If a patch was `skipped` because the CLI already handled it (e.g., `agentsMdScaffoldFlag === true`), say so explicitly rather than printing `n/a` — the user should know when the CLI has caught up with the skill.

For the "Next" section's `<framework-specific dev command>`, render:

- Fumadocs + `monorepo`: `pnpm --filter {appName} dev`
- Fumadocs + `nested-standalone`: `cd {appRoot} && pnpm dev`
- Fumadocs + `single-package`: `pnpm dev`
- MkDocs (any shape): `{appRoot}/setup-docs.sh && cd {appRoot} && mkdocs serve`

End the skill with the summary. Do not prompt for more input — the user knows what to do next, and the summary contains the commands.

## Success Criteria

(Expanded in p06-t01.)
