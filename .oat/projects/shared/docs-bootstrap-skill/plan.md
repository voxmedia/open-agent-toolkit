---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p06']
oat_auto_review_at_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: docs-bootstrap-skill

> Execute this plan using the `oat-project-implement` skill (sequential) or `oat-project-subagent-implement` skill (parallel), with phase checkpoints and review gates.

**Goal:** Build a guided Claude Code skill (`oat-docs-bootstrap`) that turns `oat docs init` scaffolding into a support-rich onboarding experience — preflight, richer input gathering, CLI invocation with labeled post-patches for open CLI gaps (FP-11/FP-12/FP-13/FP-15), build verification, post-scaffold config inspection, and an educational walkthrough. Two framework paths: Fumadocs (full) and MkDocs (lean, defined minimum contract).

**Architecture:** Seven-component Markdown skill (Preflight → Input Gatherer → Scaffold Runner → Build Verifier → Post-Scaffold Inspector → Educational Walkthrough → Optional Content Kickoff) that delegates scaffold work to the CLI and carries state in-memory via conversation context. Bridges CLI gaps with labeled, idempotent post-patches that ratchet off as CLI fixes land. See `design.md` for the full component contracts.

**Tech Stack:** Markdown (SKILL.md), Claude Code skill conventions, supporting assets (AGENTS.md template, canonical example). No runtime TS/JS code; all logic is procedural instructions in the skill body.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): scaffold oat-docs-bootstrap skill skeleton`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Confirmed at implement start: `oat_plan_hill_phases: ['p06']` (stop after final phase only), `oat_auto_review_at_checkpoints: true`

---

## Phase 1: Skill scaffolding + shared assets

### Task p01-t01: Create oat-docs-bootstrap skill skeleton

**Files:**

- Create: `.agents/skills/oat-docs-bootstrap/SKILL.md`

**Step 1: Gather inputs**

Read `.agents/skills/oat-project-quick-start/SKILL.md` and `.agents/skills/oat-project-new/SKILL.md` as structural references. Note the canonical skill format: frontmatter (`name`, `description`, `version`), Mode Assertion block, Progress Indicators block, Process section with Steps.

**Step 2: Author skeleton**

Write the SKILL.md skeleton with:

- Frontmatter: `name: oat-docs-bootstrap`, `description: "Guided bootstrap of an OAT docs app (Fumadocs or MkDocs) with preflight, richer input gathering, CLI invocation, build verification, config inspection, and educational walkthrough."`, `version: 1.0`
- Title + one-paragraph purpose statement matching the design Overview
- **Mode Assertion** block (OAT MODE: Docs Bootstrap, purpose, BLOCKED/ALLOWED activities, self-correction protocol)
- **Progress Indicators** block with the 7-step banner template
- Empty **Process** section placeholder with Step headings only (Step 0 through Step 7); bodies filled in by later tasks
- **Success Criteria** section (one line; expanded in p06-t01)

**Step 3: Self-review**

Verify frontmatter matches other canonical skills, Mode Assertion has concrete BLOCKED/ALLOWED items (not placeholders), Progress Indicators match the design's 7-component flow.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`
Expected: no formatting changes required.

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p01-t01): scaffold oat-docs-bootstrap skill skeleton"
```

---

### Task p01-t02: Author docs-app AGENTS.md bridge template (FP-15)

**Files:**

- Create: `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`

**Step 1: Gather inputs**

Re-read `discovery.md` FP-15 section for the audience discipline, litmus test, and 8 required sections. Re-read `design.md` Scaffold Runner AGENTS.md content requirements.

**Step 2: Author template**

Write the template with these 8 sections (matching discovery FP-15 "What the scaffolded AGENTS.md should contain"):

1. Purpose and scope (one paragraph)
2. When you need to add a new page
3. When you need to restructure navigation
4. When you need to audit or bulk-edit docs
5. When you're unsure where content belongs
6. When you need project-level documentation updates
7. What not to do (hand-edit generated root index.md, invent nav conventions, bypass apply for bulk changes, create overview.md)
8. Reference (pointers to `contributing.md`, `getting-started.md`, root `AGENTS.md`)

Use `{{SITE_NAME}}`, `{{APP_DIR}}`, `{{REPO_NAME}}`, `{{GENERATE_INDEX_CMD}}` placeholders matching the CLI scaffold template convention. Keep framework-specific content in a small optional block near the Reference section.

**Step 3: Self-review**

Apply the litmus test ("would this instruction still matter six months after scaffold?") to every paragraph. Remove anything that fails (install commands, scaffold creation history, version-upgrade playbooks). Confirm task framing is consistent (every non-intro section starts with "When you need to...").

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template'`
Expected: no formatting changes required.

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/assets/
git commit -m "feat(p01-t02): add docs-app AGENTS.md bridge template for FP-15"
```

---

### Task p01-t03: Add canonical example at apps/oat-docs/AGENTS.md

**Files:**

- Create: `apps/oat-docs/AGENTS.md`

**Step 1: Gather inputs**

Read the template from p01-t02. Resolve placeholder values for `apps/oat-docs/`:
`SITE_NAME` = `OAT Documentation`, `APP_DIR` = `apps/oat-docs`, `REPO_NAME` = `open-agent-toolkit`, `GENERATE_INDEX_CMD` = `pnpm -w run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`.

**Step 2: Instantiate**

Render the template with resolved values. Keep it a faithful instantiation — do not add repo-specific content that would make the file less portable as a reference implementation. If OAT-specific links are useful (e.g., to `oat docs analyze` source), include them as examples rather than as required patterns.

**Step 3: Self-review**

Read it as a newcomer to `apps/oat-docs/` would. Would a first-time contributor know what to do for each "when you need to..." section? Fix any gaps before commit.

**Step 4: Verify**

Run: `oxfmt --check 'apps/oat-docs/AGENTS.md'`
Expected: no formatting changes required.

**Step 5: Commit**

```bash
git add apps/oat-docs/AGENTS.md
git commit -m "feat(p01-t03): add canonical docs-app AGENTS.md example"
```

---

### Task p01-t04: Refresh provider views

**Files:**

- Modify: provider-view directories under `.claude/skills/`, `.codex/skills/`, `.cursor/skills/` (auto-generated by `oat sync`)

**Step 1: Understand current state**

Run: `oat status --scope all`
Expected: shows the new skill as unsynced or missing from provider views.

**Step 2: Sync**

Run: `oat sync --scope all`
Expected: provider views for all supported providers populated with the new skill.

**Step 3: Verify**

Run: `oat status --scope all`
Expected: all provider views show `oat-docs-bootstrap` as in sync.

**Step 4: Commit**

```bash
git add .claude/skills .codex/skills .cursor/skills 2>/dev/null || true
git commit -m "chore(p01-t04): refresh provider views for oat-docs-bootstrap"
```

If no provider directories were affected (depends on repo convention), skip the commit and note in implementation.md.

---

## Phase 2: Preflight + Input Gatherer procedures

### Task p02-t01: Write Preflight Detector procedure

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 1 body)

**Step 1: Gather inputs**

Re-read `design.md` Preflight Detector component (responsibilities, interfaces, design decisions). Confirm three-shape detection (monorepo / single-package / nested-standalone) and the conflict detection categories.

**Step 2: Author Step 1 procedure**

Write the Step 1 body with:

- **Repo shape detection** — order: pnpm-workspace.yaml → package.json workspaces → apps/+packages/ → single-package; then nested-standalone heuristic (single-package + target dir will get its own lockfile)
- **Existing docs detection** — read `.oat/config.json`, detect `documentation` section; check for existing docs app dir; scan root AGENTS.md for `## Documentation` section
- **Defaults** — `appName` per shape, `targetDir` per shape, `siteName` = humanized repo name
- **Preflight Result contract** (matches design)
- **Read-only invariant** — Preflight never mutates state

**Step 3: Self-review**

Verify read-only discipline is explicit. Verify the nested-standalone heuristic is deterministic (not reliant on future file state).

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p02-t01): add Preflight Detector procedure"
```

---

### Task p02-t02: Write Input Gatherer procedure

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 2 body)

**Step 1: Gather inputs**

Re-read `design.md` Input Gatherer component. Note the one-at-a-time questioning principle, coherence check, and the separate site-name vs. app-name distinction (the FP-12 workaround).

**Step 2: Author Step 2 procedure**

Write Step 2 body covering:

- **Conflict surfacing** — if Preflight returned conflicts, present them before any input questions; collect `conflictResolution` (one of `replace` / `second-app` / `abort` / `repair`)
- **Input questions, one at a time:** framework → site name → package/app name → target directory → site description → lint → format; each with context explaining what it affects
- **Input validation** (no spaces in package name, target dir writable/empty per resolution, framework is a valid value)
- **Coherence check** — final summary: "Display title: X, Package name: Y, Description: Z — correct?" with adjust option
- **Input Result contract** (matches design)

**Step 3: Self-review**

Verify each question's prompt explains what the value affects downstream (e.g., site name → display title in layout + metadata, package name → pnpm filter / dir name). Confirm coherence check is literally the last step before scaffold.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p02-t02): add Input Gatherer procedure"
```

---

### Task p02-t03: Write Conflict Resolution Contract procedure

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 2, Conflict Resolution sub-procedure)

**Step 1: Gather inputs**

Re-read `design.md` Conflict Resolution Contract section (the I2 review fix). Four resolutions with mutations / preserved state / stop conditions.

**Step 2: Author sub-procedure**

Write a dedicated Conflict Resolution sub-procedure inside Step 2. For each resolution, specify:

- `replace` — allowed mutations (rm existing docs app dir, clear `documentation` section, clear root AGENTS.md section), preserved state, stop conditions (uncommitted changes refuse)
- `second-app` — scoped as deferred; surface CLI limitation (single-docs config), redirect to other resolutions
- `abort` — exit cleanly, no mutations, print summary
- `repair` — delegate to `oat-docs-analyze` / `oat-docs-apply`, do not directly modify existing docs app files
- **Pre-scaffold invariant** — Scaffold Runner never runs `oat docs init` until the resolution's mutations have completed and state matches CLI expectations

**Step 3: Self-review**

Verify each resolution has an explicit stop condition. Verify `second-app` refusal includes a clear explanation, not just "not supported."

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p02-t03): add Conflict Resolution Contract procedure"
```

---

## Phase 3: Scaffold Runner

### Task p03-t01: Write Scaffold Runner CLI invocation procedure

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 3 body, CLI invocation)

**Step 1: Gather inputs**

Re-read `design.md` Scaffold Runner component. Confirm the CLI flags supported today and the post-patch fallback list (FP-11/FP-12/FP-13/FP-15).

**Step 2: Author CLI invocation procedure**

Write the CLI invocation procedure:

- Assemble flags from Input Gatherer result: `--yes --framework F --name N --target-dir D --description S --lint L --format F2`
- If the Capability Probe (p03-t02) reports `--site-name` supported, add it; otherwise queue the FP-12 post-patch
- Execute `oat docs init` as a non-interactive child process, capture stdout/stderr
- On non-zero exit, surface the CLI error verbatim to the user and stop the flow
- On success, output `{ appRoot, createdFiles[], scaffoldSucceeded: true }` plus the captured logs for the Walkthrough

**Step 3: Self-review**

Verify the "stop flow on CLI non-zero" path is explicit. Verify flags are only added when the Capability Probe reports support (no assumed defaults).

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p03-t01): add Scaffold Runner CLI invocation procedure"
```

---

### Task p03-t02: Write Capability Detection procedure

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 3, Capability Detection sub-procedure)

**Step 1: Gather inputs**

Re-read `design.md` Capability Detection section under Scaffold Runner (M1 review fix).

**Step 2: Author Capability Detection sub-procedure**

Write the sub-procedure covering:

- **CLI help probe** — run `oat docs init --help` once; parse for `--site-name`/`--title`, `--turbopack-root`-equivalent, AGENTS.md scaffolding flag; record boolean capability flags
- **File-shape checks per patch target:**
  - FP-12 targets (`app/layout.tsx`, `docs/index.md`, `docs/getting-started.md`, `docs/contributing.md`) — expected markers and patched-shape detection
  - FP-11 target (`next.config.js`) — expected `createDocsConfig()` usage vs. replaced `createMDX()` shape
  - FP-13 targets (same markdown files + package.json template fields) — expected scaffold markers
  - FP-15 target (`<appRoot>/AGENTS.md`) — existence check only, never overwrite
- **Refuse-and-surface contract** — on ambiguous drift (neither scaffold shape nor patched shape), record `patchesApplied[]` entry with status `refused`, explanation, and suggested manual fix; do not proceed with that patch

**Step 3: Self-review**

Verify every patch type has a detection rule. Verify the FP-15 "never overwrite" rule is explicit.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p03-t02): add Capability Detection sub-procedure"
```

---

### Task p03-t03: Write site-identity patches (FP-12 title + FP-15 AGENTS.md)

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 3, site-identity patches sub-procedure)

**Step 1: Gather inputs**

Re-read `design.md` Scaffold Runner responsibilities for FP-12 (title patches + metadata export) and FP-15 (AGENTS.md write-if-missing). Re-read p01-t02's template location.

**Step 2: Author site-identity patches sub-procedure**

Write the sub-procedure covering:

- **FP-12 title patches** — only if Capability Detection did not set the `--site-name` flag. Target files + specific edits:
  - `app/layout.tsx` — set `branding.title` on `DocsLayout`
  - `docs/index.md` — frontmatter `title:` + `# ...` H1
  - `docs/getting-started.md` — body text reference to `{{SITE_NAME}}`
  - `docs/contributing.md` — H1 reference
  - `app/layout.tsx` — add `export const metadata = { title, description }` if missing
- **FP-15 AGENTS.md write** — only if `<appRoot>/AGENTS.md` doesn't exist. Render the bridge template from p01-t02 with current values of `{{SITE_NAME}}`, `{{APP_DIR}}`, `{{REPO_NAME}}`, `{{GENERATE_INDEX_CMD}}`. Never overwrite existing file.
- Each patch is wrapped in a labeled comment (`<!-- FP-12 patch -->` / `<!-- FP-15 patch -->`) so it can be found and removed when the CLI fix lands

**Step 3: Self-review**

Verify each patch respects the Capability Detection result. Verify idempotency — running the patch twice is a no-op.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p03-t03): add site-identity patches sub-procedure (FP-12 + FP-15)"
```

---

### Task p03-t04: Write scaffold-integrity patches (FP-11 Turbopack + FP-13 content)

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 3, scaffold-integrity patches sub-procedure)

**Step 1: Gather inputs**

Re-read `design.md` Scaffold Runner responsibilities for FP-11 (Turbopack root) and FP-13 (four template-content sub-findings).

**Step 2: Author scaffold-integrity patches sub-procedure**

Write the sub-procedure covering:

- **FP-11 Turbopack root patch** — only when repo shape is `nested-standalone` AND Capability Detection shows the CLI hasn't addressed it. Two code paths based on Capability Detection:
  - If `createDocsConfig` passthrough supports `turbopack`, pass `{ root: __dirname }` through
  - Otherwise, replace `createDocsConfig` wrapper with explicit `createMDX()` + hand-written Next config, preserving user edits
- **FP-13 patches (four sub-findings):**
  - **A — Empty descriptions.** Target: `docs/contributing.md:3`, `docs/getting-started.md:3`. Replace `description: ''` with static defaults per design
  - **B — Bare install/build commands.** Target: `docs/getting-started.md:15-33`. Replace with shape-aware commands (monorepo uses `pnpm --filter`, nested-standalone prefixes `cd <appRoot> &&`, single-package leaves as-is)
  - **C — False docs:lint claim.** Target: `docs/contributing.md:31`. If `lint=none`, narrow the claim (drop "and linting"); if `lint=markdownlint-cli2`, leave intact
  - **D — Generated index.md warning.** Target: `docs/contributing.md` (append "Generated files" section) + hook into first prebuild run to prepend `<!-- generated by oat docs generate-index; do not hand-edit. Source: docs/index.md -->` to the generated `<appRoot>/index.md`
- Idempotency: each patch skips if the marker is absent (already patched) or if user has edited beyond scaffold shape (refuse-and-surface)

**Step 3: Self-review**

Verify all four FP-13 sub-findings are covered. Verify FP-11 has both code paths. Verify "skip on already-patched" logic is explicit for each.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p03-t04): add scaffold-integrity patches sub-procedure (FP-11 + FP-13)"
```

---

## Phase 4: Build Verifier + Post-Scaffold Inspector

### Task p04-t01: Write Build Verifier procedure

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 4 body)

**Step 1: Gather inputs**

Re-read `design.md` Build Verifier component. Confirm the install/build commands per repo shape, the known failure patterns, and the narrow auto-fix rules.

**Step 2: Author Step 4 procedure**

Write Step 4 body covering:

- **Install per shape:** monorepo `pnpm install` at repo root; single-package/nested-standalone `cd <appRoot> && pnpm install`
- **Build per shape:** monorepo `pnpm --filter <appName> build`; single-package/nested-standalone `cd <appRoot> && pnpm build`
- **Known failure patterns + classification:**
  - `ERR_PNPM_NO_MATCHING_VERSION` on `@open-agent-toolkit/*` → surface-only (not auto-fix)
  - `fumadocs-mdx: command not found` + `node_modules missing` warning → auto-fix (rerun install)
  - Turbopack "inferred workspace root" warning → benign if p03-t04 patched; flag otherwise
  - FP-10 tsconfig rewrite churn → flag if it still happens post PR #27
- **Verification Result contract** (matches design, with corrected `knownIssues[]` without FP-13-cwd-commands)
- **Auto-fix discipline** — only known-single-correct-answer cases; everything else surfaced with context
- **Unknown error stop** — pause flow, present error, do not proceed to Inspector/Walkthrough
- **Cross-reference** to the design note that FP-13 is a Scaffold Runner concern, not a Build Verifier pattern

**Step 3: Self-review**

Verify the auto-fix scope is narrow. Verify unknown errors halt the flow.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p04-t01): add Build Verifier procedure"
```

---

### Task p04-t02: Write Post-Scaffold Inspector procedure

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 5 body)

**Step 1: Gather inputs**

Re-read `design.md` Post-Scaffold Inspector component. Confirm the config read-back, path verification, drift detection, nested-config handling, and `requireForProjectCompletion` opt-in.

**Step 2: Author Step 5 procedure**

Write Step 5 body covering:

- **Read parent `.oat/config.json`** and parse `documentation` section
- **Path verification per field:** `root` (dir exists), `index` (file exists), `config` (file exists, mkdocs only)
- **Nested-standalone dual-config handling** — check for `<appRoot>/.oat/config.json`, parse separately, verify its paths relative to its own root, and explain the relationship to the user
- **Drift detection** — compare config-referenced paths vs. what Scaffold Runner touched (e.g., if `next.config.js` was replaced, confirm nothing in config references it; add `driftFinding` if mismatch)
- **`requireForProjectCompletion` opt-in prompt** — default: no; explain the project-completion gate behavior before asking; write back to `.oat/config.json` only if user opts in
- **Inspection Result contract** (matches design)
- **Write-once discipline** — this is the only component that writes to `.oat/config.json`; Preflight and Input Gatherer are read-only; Scaffold Runner writes via the CLI

**Step 3: Self-review**

Verify nested-config handling is explicit. Verify the `requireForProjectCompletion` prompt explains the behavior before asking.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p04-t02): add Post-Scaffold Inspector procedure"
```

---

## Phase 5: Educational Walkthrough + Optional Content Kickoff

### Task p05-t01: Write Walkthrough Sections A-D

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 6 body, Sections A-D)

**Step 1: Gather inputs**

Re-read `design.md` Educational Walkthrough component and the three agent-instruction surfaces.

**Step 2: Author Sections A-D**

Write the Walkthrough Step 6 body with these four sections (opening of Step 6 + chunked conversation framing):

- **Section A (both frameworks) — Your OAT documentation config.** Ground in Inspector output: show what's in `.oat/config.json` `documentation`, explain each field (root / tooling / index / config / requireForProjectCompletion), point out which downstream tools use each (`oat-project-document`, `oat docs analyze`, `oat docs apply`, project-completion gate)
- **Section B (both) — The two `index.md` files.** Source at `docs/index.md` (authored, `## Contents` content map) vs. generated root-level `index.md` (machine-shaped, clobbered on every build). Explicitly call out the footgun from FP-13 sub-finding D
- **Section C (both) — `## Contents` contract.** Every directory has an `index.md`; every `index.md` has a `## Contents` section; the section is the machine-readable local map used by `oat docs nav sync` and `oat docs analyze`
- **Section D (both) — Three agent-instruction surfaces.** Call out the audience distinctions:
  1. Root `AGENTS.md` `## Documentation` section (repo-wide pointer, 4-line breadcrumb)
  2. Docs-app `AGENTS.md` (task-framed ongoing reference for agents working _in_ the docs app, not setting it up — flag the audience discipline)
  3. `docs/contributing.md` (human-authoring conventions, Markdown features, pointer to apply)

**Step 3: Self-review**

Verify Section A literally consumes Inspector output rather than reciting generic field docs. Verify Section D's audience distinction is explicit ("not setting it up, but working in it").

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p05-t01): add Walkthrough Sections A-D (config, two-index.md, Contents contract, agent surfaces)"
```

---

### Task p05-t02: Write Walkthrough Sections E-G (incl. MkDocs Minimum Contract)

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 6 body, Sections E-G)

**Step 1: Gather inputs**

Re-read `design.md` framework-specific deep dive guidance and the MkDocs Minimum Contract (M2 review fix).

**Step 2: Author Sections E-G**

Write three more walkthrough sections:

- **Section E (Fumadocs only) — Framework deep dive.** How `DocsLayout` renders chrome, how `createMDX` picks up `docs/`, how FlexSearch static indexing works, how `@open-agent-toolkit/docs-theme` provides branding and how the compiled artifact only forwards `branding.title` into nav chrome (the runtime verification insight from the conversation)
- **Section F (MkDocs only) — Lean summary with Minimum Contract.** One paragraph explaining `mkdocs.yml` as root config, Material theme default UI, plugin model, Python environment via `requirements.txt` + `setup-docs.sh`. Then visibly mark and enumerate the required (shared concepts covered in adapted form) vs. deferred (Material internals, plugin authoring, Python env debugging, MkDocs-specific extensions beyond the shared set, deployment patterns) per the Minimum Contract
- **Section G (both) — OAT docs ecosystem.** `oat-project-document` auto-populates docs during OAT workflows (reads project artifacts, proposes evidence-backed updates). `oat docs analyze` read-only audits. `oat docs apply` executes approved analyze recommendations on a branch with a PR

**Step 3: Self-review**

Verify Section F's deferred list is visible and actionable (user knows where to look for more). Verify Section E's runtime insight (compiled `DocsLayout` only forwards branding.title) is included — it's a valuable teaching point.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p05-t02): add Walkthrough Sections E-G with MkDocs Minimum Contract"
```

---

### Task p05-t03: Write Optional Content Kickoff + Exit summary

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (Step 7 body + Exit summary)

**Step 1: Gather inputs**

Re-read `design.md` Optional Content Kickoff component.

**Step 2: Author Step 7 + Exit**

Write:

- **Step 7 body** — ask: "Want to populate initial documentation now via `oat docs analyze` + `oat docs apply`?" Delegate on yes (invoke `oat-docs-analyze` skill, then on user approval of its output invoke `oat-docs-apply` skill). On no, hand off with explicit next-step commands the user can run later.
- **Exit summary** — final output: appRoot, framework, what was created (list of files), any patches applied (FP-11/12/13/15 labels), any known issues surfaced by Build Verifier, next-step commands. Include a one-sentence "the docs-app AGENTS.md tells future agents how to work here" reminder so users know where to look later.

**Step 3: Self-review**

Verify the decline path is actionable (specific commands, not "run analyze later"). Verify the exit summary is scannable (bullet list, not prose paragraph).

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "feat(p05-t03): add Optional Content Kickoff and Exit summary"
```

---

## Phase 6: Finalization

### Task p06-t01: Coherence pass + tightening

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md`

**Step 1: Read the skill end-to-end**

Read the whole SKILL.md as a first-time contributor would. Note any places where:

- Section headings don't match the 7-step banner template (rename for consistency)
- Cross-references to other steps/sections point at wrong section IDs
- Design Decision rationale is duplicated across sections (deduplicate)
- Terminology drifts between sections (unify vocabulary)
- Progress indicator banners at step boundaries are missing or inconsistent

**Step 2: Tighten**

Apply the fixes from Step 1. Keep the edits focused on coherence, not scope changes. If a scope change seems needed, stop and surface it to the user rather than silently expanding scope.

**Step 3: Fill Success Criteria section**

Expand the Success Criteria section (stub from p01-t01) with one bullet per completed-state invariant: scaffolded app builds on first try, config verified against disk, educational walkthrough chunked, AGENTS.md bridge present, etc.

**Step 4: Verify**

Run: `oxfmt --check '.agents/skills/oat-docs-bootstrap/SKILL.md'`

**Step 5: Commit**

```bash
git add .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "refactor(p06-t01): coherence pass across oat-docs-bootstrap SKILL.md"
```

---

### Task p06-t02: Manual E2E walkthrough — nested-standalone (Fumadocs)

**Files:**

- Modify: `.oat/projects/shared/docs-bootstrap-skill/implementation.md` (test log)
- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (only if fixes are needed)

**Step 1: Set up test repo**

Pick a non-monorepo sandbox repo (e.g., a fresh clone or a known test target). Verify it has a pnpm-lock.yaml at the root and does not already have a docs app.

**Step 2: Run the skill end-to-end**

Invoke `oat-docs-bootstrap` in the test repo. Walk through each prompt, select Fumadocs, provide a site name that would have triggered FP-12's original double-title bug (e.g., package name `documentation`, site name `Sandbox`), proceed to scaffold.

**Step 3: Observe and log**

Record in implementation.md what happened at each step:

- Did Preflight detect the shape correctly?
- Did Input Gatherer's questions flow well and defaults make sense?
- Did the Scaffold Runner invoke `oat docs init` correctly and apply the FP-11/12/13/15 patches?
- Did `pnpm install` + `pnpm build` succeed in the docs app?
- Did the Inspector surface the config and prompt for `requireForProjectCompletion`?
- Did the Walkthrough cover all 7 sections at the right depth?
- Did Optional Content Kickoff work if invoked?

**Step 4: Fix any issues**

For each observed issue, either fix in SKILL.md (commit `fix(p06-t02): {description}`) or record as a deferred issue in implementation.md for follow-up. Keep the scope of p06-t02 fixes to coherence / correctness, not new features.

**Step 5: Commit logs + any fixes**

```bash
git add .oat/projects/shared/docs-bootstrap-skill/implementation.md .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "test(p06-t02): manual E2E walkthrough — nested-standalone Fumadocs"
```

---

### Task p06-t03: Manual E2E smoke test — monorepo (Fumadocs)

**Files:**

- Modify: `.oat/projects/shared/docs-bootstrap-skill/implementation.md` (test log)
- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (only if fixes are needed)

**Step 1: Set up test repo**

Pick a monorepo sandbox (e.g., a fresh pnpm workspaces repo or a known test target). Verify it has `pnpm-workspace.yaml` and does not already have a docs app.

**Step 2: Run the skill end-to-end (smoke test scope)**

Invoke `oat-docs-bootstrap`, select Fumadocs, accept defaults where reasonable. Target directory should default to `apps/{repo}-docs`; verify.

**Step 3: Observe and log — smoke test level only**

Record in implementation.md whether:

- Preflight detected `monorepo` shape correctly
- Scaffold ran and the docs app landed under `apps/`
- `pnpm --filter <appName> build` succeeded
- Inspector found the config correctly
- No obviously broken behavior

Deep monorepo-specific friction (different repo sizes, different workspace configs, etc.) is **deferred to the follow-up project.** This smoke test exists only to confirm the monorepo code path isn't entirely broken.

**Step 4: Fix any blocking issues**

If the smoke test reveals a monorepo-specific break, fix it and commit. If it reveals a polish concern, record in implementation.md as a follow-up-project input and do not expand scope here.

**Step 5: Commit logs + any fixes**

```bash
git add .oat/projects/shared/docs-bootstrap-skill/implementation.md .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "test(p06-t03): manual E2E smoke test — monorepo Fumadocs"
```

---

## Reviews

Track reviews here after running the `oat-project-review-provide` and `oat-project-review-receive` skills.

Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.

| Scope  | Type     | Status          | Date       | Artifact                                                |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------- |
| p01    | code     | pending         | -          | -                                                       |
| p02    | code     | pending         | -          | -                                                       |
| p03    | code     | pending         | -          | -                                                       |
| p04    | code     | pending         | -          | -                                                       |
| p05    | code     | pending         | -          | -                                                       |
| p06    | code     | pending         | -          | -                                                       |
| final  | code     | pending         | -          | -                                                       |
| spec   | artifact | pending         | -          | -                                                       |
| design | artifact | fixes_completed | 2026-04-13 | `reviews/archived/artifact-design-review-2026-04-13.md` |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: Skill scaffolding + shared assets (4 tasks) — skeleton SKILL.md, FP-15 bridge AGENTS.md template, canonical example at `apps/oat-docs/AGENTS.md`, provider sync
- Phase 2: Preflight + Input Gatherer procedures (3 tasks) — shape + conflict detection, one-at-a-time input gathering, Conflict Resolution Contract
- Phase 3: Scaffold Runner (4 tasks) — CLI invocation, Capability Detection, site-identity patches (FP-12 + FP-15), scaffold-integrity patches (FP-11 + FP-13)
- Phase 4: Build Verifier + Post-Scaffold Inspector (2 tasks) — install/build per shape + failure classification, config read-back + drift detection + `requireForProjectCompletion` opt-in
- Phase 5: Educational Walkthrough + Optional Content Kickoff (3 tasks) — Sections A-D (config, two-index, Contents contract, agent surfaces), Sections E-G (Fumadocs deep, MkDocs Minimum Contract, OAT docs ecosystem), optional analyze/apply delegation + exit summary
- Phase 6: Finalization (3 tasks) — coherence pass, nested-standalone E2E walkthrough, monorepo smoke test

**Total: 19 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (complete, artifact review passed 2026-04-13)
- Spec: N/A (quick mode — no spec)
- Discovery: `discovery.md` (complete, 15 friction points captured — FP-1..FP-10 resolved via PR #27; FP-11..FP-15 addressed via this plan's Scaffold Runner patches and bridge assets)
- Follow-up project: monorepo-specific friction (deferred; will spawn its own discovery round)
