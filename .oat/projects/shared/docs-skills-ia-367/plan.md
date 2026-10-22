---
oat_template: false
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-10-22
oat_phase: plan
oat_phase_status: complete
oat_auto_review_at_hill_checkpoints: false # brief: no checkpoints
oat_plan_hill_phases: [] # [] = none for brief modes
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: brief
oat_phase_review_gate:
  enabled: true
  phases: ['p03', 'p06']
  review_type: code
  exit_nonzero_on: high
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Project Brief: docs-skills-ia-367

> Execute this brief using `oat-project-implement`. Phases are the units of
> progress: each `## Phase pNN:` block carries intent and exit evidence instead
> of planned tasks, and only the next phase must be concrete. Execution records
> (`### Task pNN-tNN:`) live in `implementation.md`, never here.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

**Phase block grammar (strict):** each phase is one `## Phase pNN: <name>`
heading followed by a blank line and these exact lines:

```markdown
**Intent:** one or more non-empty lines
**Exit evidence:** one or more non-empty lines
**Provisional:** no
```

Phase IDs are stable and document order governs execution. `**Provisional:**`
accepts `yes` or `no`; absent means `no`. The first phase must not be
provisional. Do not add `### Task` headings to phases.

## Goal

Give the OAT docs layer an information-architecture (IA) workflow and remove
the friction around it, as proposed in
[issue #367](https://github.com/voxmedia/open-agent-toolkit/issues/367)
(P1–P28; a copy is in `references/research/issue-367.md`). Today no OAT skill
owns IA: bootstrap picks a framework and seeds the same two-page tree, analyze
audits conformance but not structure, and operators re-explain audience and
structure on every run. After this project, bootstrap and analyze propose a
reader-first IA from a configurable guidance source, the accepted IA is
recorded in the repo and audited, the sidebar follows the authored `## Contents`
map (including group headings), the starter app is reader-first, and one
`oat docs check` command catches the drift the survey found.

The project also folds in three open backlog items:
`BL-260911-make-docs-bootstrap-a-front` (OAT-side parts),
`BL-261002-correct-docs-bootstrap-docs` and
`BL-261002-catch-hardcoded-docs-paths`.

## Outcomes

Each outcome names the #367 proposals or backlog items it closes. The final
review audits every P-number against this list.

1. **The shipped skills and packages stop contradicting the CLI, config and
   template (P6, P7, P8, P19, `BL-261002-correct-docs-bootstrap-docs` E12/E13
   corrections, `BL-261002-catch-hardcoded-docs-paths`).** Evidence: closed FP
   patches and plan IDs gone from `oat-docs-bootstrap`; the CLI renders the
   detected Node version in place of FP-13E's hedge; an old-scaffold shape is
   reported as an analyze finding; each P7 and E12/E13
   statement corrected with a cited source line; a `createDocsConfig` test
   proving `output: 'export'`, `trailingSlash`, `images.unoptimized` and
   `basePath` survive the nested-standalone path, with a negative control on
   the old Path B shape; a docs-path check that fails on a seeded stale
   reference from a skill test.
2. **The `authoring-docs` IA reference teaches the axes method and presets
   instead of one Standard Top-Level Model (P28 D1–D9, except D9's Feature
   and QA validation templates, which p07 ships with P26).** Evidence:
   rewritten `references/information-architecture.md` plus presets, IA
   proposal template, new page types and smell-test rows; `metadata.version` at least 1.1.0 (later phases bump
   it again); skill contract tests updated.
3. **Bootstrap and analyze propose an IA from a resolved guidance source
   (P1, P2, BL-260911 front door).** Evidence: `documentation.guidance` in the
   config schema with resolution-order tests; bootstrap Step 2.5 and
   `oat-docs-analyze --ia` documented in the skills; an existing docs surface
   routes to analyze/apply first; the resolved guidance path is cited in the
   analysis artifact and bootstrap summary.
4. **An accepted IA is recorded in the target repo and audited (P3), and
   apply can carry it out (P4).** Evidence: `documentation.ia` and
   `documentation.navOwner` schema and tests; analyze's "Information
   Architecture Fit" section and misroute severity rule; apply's `restructure`
   action with inbound-link rewrite and old-URL plan in the apply-plan
   template.
5. **Apply honors approval classes and analyze reports package drift
   (BL-260911), through one handoff contract that bootstrap also uses
   (E12 handoff).** Evidence: `approval: explicit | default` on every
   recommendation; apply skips `explicit` items under blanket or unattended
   approval and lists them in its structured result; an explicitly approved
   tooling update runs only the G4 carve-out; drift computed offline from
   `public-package-versions.json` and reported with the upgrade command;
   bootstrap Step 7b uses apply's documented input.
6. **The sidebar follows authored Contents, including groups (P12, P13,
   P14).** Evidence: nav sync tests for `###` group headings emitted as
   `---Label---`, string `root`, and `*`-bullet errors; `oat docs init` runs nav
   sync and the template prebuild runs `nav sync --check`; `generate-index`
   follows Contents order and index titles with tooling-aware header text.
7. **The starter app is reader-first and stays in step with OAT's own app
   (P9, P10, P11, P15, P16, P17, P18).** Evidence: CLI-scaffolded docs-app
   `AGENTS.md`; Getting Started is a reader page and the toolchain page lives
   under `contributing/`; the contributing skeleton covers the P11 list;
   static-export-compatible `llms.txt`, `llms-full.txt` and per-page `.md`
   routes; a template-parity test; transform tests for links, nesting and GFM
   inside tabs and for `remarkMermaid`; MkDocs pins refreshed or marked legacy.
8. **`oat docs check` validates Markdown, Fumadocs and MkDocs docs with
   calibrated rules (P20, P21, P22, P23, P25).** Evidence: the command with
   `--json`, stable rule IDs and the P20 default thresholds; tests per rule
   including a seeded failure; OAT's own docs pass; the starter app runs it,
   and bootstrap wires it into the target repo's PR CI with the build and
   manifest-freshness steps.
9. **Bootstrap scaffolds preset trees and page templates (P5, P26, P27).**
   Evidence: one fixture per preset showing the tree, section indexes with
   purpose paragraphs and `contributing/templates/`; the flat size outcome
   below about 15 pages.
10. **Product, Engineering and QA pages can be checked against source where
    the recorded IA declares a triad (P24), or the brief records why not.**
    Evidence: a prototype result in `references/` and either the shipped check
    or a recorded descope decision.
11. **OAT's own docs describe the shipped behavior and the release is
    audited.** Evidence: updated `apps/oat-docs` pages; every phase PR
    carried its own lockstep and skill version bumps; the two
    `BL-261002-*` items closed; `BL-260911` closed only after its outstanding
    external criteria move to the rollout item with reciprocal links (otherwise
    left open with its OAT-side slice marked done); #367 answered with a
    P-number checklist.

## Approach

Work in the order of #367's suggested sequencing, adjusted so contract cleanup
comes first: it shortens the 1,185-line bootstrap skill and removes false
statements before new stages are added. Skills (`.agents/skills/oat-docs-*`,
`authoring-docs`, `oat-docs`, `docs-completed-projects-gap-review`), the CLI
(`packages/cli/src/commands/docs/**`, `packages/cli/src/config/**`), the docs
packages (`packages/docs-config`, `packages/docs-transforms`,
`packages/docs-theme`) and the templates (`.oat/templates/docs-*`) change
together; OAT's own docs app is updated in the phase that changes the
behavior it describes, and finished in p09.

The IA method itself is the one developed in the 2026-10-22 survey: choose
along five axes (readers and work contexts, the organizing principle per
track, page purpose, a verification overlay, and a size gate), then name the
nearest preset. The maintainer keeps a local guidance pack with the
long-form method, presets and exemplar evidence; the operator supplies its
location when a phase needs it, and it is read-only and never committed. The
issue body carries the public summary. Only generic content enters this
repository.

### Design

These contracts are pinned. A phase implements them; changing one is a
realignment with the user, not a phase-local decision.

**G1. Guidance resolution (`documentation.guidance`).**

- Type: `string | string[]` of paths or URLs, in `OatDocumentationConfig`.
- Resolution, highest first, in bootstrap, analyze and authoring: an explicit
  argument (`--ia-guidance <path|url>`) or a conversational instruction; repo
  `.oat/config.json`; user-scope config; the built-in `authoring-docs` IA
  reference.
- A guidance source is Markdown with an `index.md` and `## Contents`.
- Guidance is advisory. Repo-local `AGENTS.md` and contributing pages stay
  authoritative for an existing tree; a conflict becomes an `ask_user`
  finding. Non-repo paths are read-only inputs and only the path string is
  stored. Skills cite the resolved source in the analysis artifact, the apply
  plan and the bootstrap summary.

**G2. Recorded IA (`documentation.ia`, `documentation.navOwner`).**

- The accepted IA is written as a decision record (`oat decision new`) plus a
  short "Information architecture" section (tracks, organizing principle per
  track, placement rules, verification overlay) in the docs-app `AGENTS.md`
  for Fumadocs and MkDocs, or in the contributing page for Markdown mode,
  which has no app and no docs-root `AGENTS.md`. The authored record is
  authoritative.
- Config mirrors it for tools: `documentation.ia` =
  `{ preset: string, decision: string /* repo-relative path */, tracks?: Array<{ path: string, principle: string }>, verification?: 'triad' | 'agent-only' | 'none' }`.
- `documentation.navOwner` = `'nav-sync' | 'hand-authored'`, for Fumadocs
  and MkDocs only. It is independent of IA because a repo can own its sidebar
  either way without a recorded IA. Markdown mode has no sidebar, never runs
  nav sync, and ignores `navOwner`.
- New Fumadocs and MkDocs scaffolds (`oat docs init`, bootstrap) write
  `navOwner: nav-sync` explicitly. Absent means **undeclared**, never
  `nav-sync`: nothing regenerates navigation automatically (an explicit
  `oat docs nav sync` run behaves as today), analyze raises an `ask_user`
  finding to choose an owner, and `oat docs check` applies the read-only
  comparison.
- Non-reader pages (page templates, drafts) are declared in a new key,
  `documentation.nonReaderPaths` (globs relative to the docs root). Nav sync
  inventory, `--check`, `generate-index`, `oat docs check`'s reader rules and,
  where the framework allows, rendering all skip them. Presets that scaffold
  `contributing/templates/` write that glob. `documentation.excludes` keeps
  its existing manifest-only meaning, so existing configurations are
  unchanged.

**G3. Contents grammar and nav sync.**

- Inside `## Contents` (until the next `## ` heading), a `### <Label>` line
  starts a group. Nav sync emits `---<Label>---` before the group's first
  entry; entries before the first `###` are ungrouped. A group with no
  entries is an error naming the line.
- Bullets stay dash-only. A `*` or `+` bullet that looks like a Contents entry
  becomes an error naming the file and line instead of being skipped.
- `root` is treated as a root folder when it is `true` or a non-empty string.
- `nav sync` keeps writing `pages` wholesale; the change is that groups now
  survive because they come from Contents.

**G4. Approval classes and the apply input.**

- Every analyze recommendation carries `approval: explicit | default`.
  `explicit` covers the docs package update and anything outside the
  Markdown scope. A drift recommendation includes the exact upgrade command.
- An explicitly approved tooling update may do only three things: bump the
  docs app's `@open-agent-toolkit/docs-*` dependencies, run `oat docs migrate`
  for the content conversions it supports today (admonitions and injected
  frontmatter), and run the build verifier. Scaffold changes the CLI cannot
  make (app config, routes, package scripts) are reported as `manual` with
  the change needed, never edited. Apply's other out-of-scope prohibitions
  stay.
- Apply's one documented input is the analysis artifact plus a list of
  approved recommendation IDs. `explicit` items need their own approval in
  the approval step, are never covered by blanket approval, and are skipped
  and reported when unattended. Apply's structured result lists applied,
  skipped (with reason) and failed recommendation IDs. Bootstrap's Step 7b and
  the existing-docs front door hand off through the same input.

**G5. `oat docs check`.**

- `oat docs check [--target-dir <dir>] [--json] [--rule <id>...]`, reading
  `documentation.*` config, for Markdown, Fumadocs and MkDocs. Markdown mode
  runs the file, Contents and page rules only: no site build, no sidebar
  rule, and no manifest unless one is configured.
- Rules have stable IDs and a severity of `error` or `warn`. Exit 1 when any
  error is reported, 0 otherwise.
- JSON: `{ summary: { errors, warnings }, findings: Array<{ ruleId, severity, path, line?, message }> }`.
- Defaults are the P20 thresholds. `documentation.check` overrides a rule's
  severity (`error | warn | off`) or threshold.
- The navigation rule (P21) applies to Fumadocs `meta.json` and to the
  MkDocs `nav:` block. It runs as `nav sync --check` semantics when
  `navOwner` is `nav-sync` and as a membership-and-order comparison against
  Contents when it is `hand-authored` or undeclared. Paths in
  `documentation.nonReaderPaths` are skipped.
- P24 is not part of this command (see Decisions).

**G6. What the skills ship about IA.** A generic method: the five axes, the
six presets (Product/Engineering/QA, Consumer and Maintainer, Domain
Engineering, Task Type, Toolkit and CLI, Flat Small) with "choose when"
signals, the IA proposal template (two candidate structures, each a two-level
tree with 5–8 placed pages and its nearest preset), and the bootstrap
procedure. Exemplars and repo evidence stay in external guidance.

## Constraints and Out of Scope

- **Constraint:** This repository is public. Skills, templates, docs, tests,
  fixtures, commit messages and project artifacts contain no internal
  repository names, internal paths, product details or organization
  identifiers. Survey evidence is cited only in aggregate, as #367 does.
- **Constraint:** Every PR passes the Definition of Done gates in
  `AGENTS.md`, in order, with explicit exit codes and evidence-grade reruns
  where Turborepo replays cache. Skill prose edits also run the skill contract
  tests named in `AGENTS.md`.
- **Constraint:** Every phase PR carries its own release bumps: one
  `metadata.version` bump per changed skill and, when lockstep packages
  change, the lockstep bump required by the release gates. Re-run the version
  gates after `main` advances.
- **Constraint:** Tests that exercise the bundle template tier use an isolated
  `HOME`. P0 guards (the FP-11 regression, approval-class skipping) get a
  negative control.
- **Constraint:** Existing plain `docs/` fallback behavior and existing
  hand-authored `meta.json` repos keep working: nothing becomes stricter for a
  repo that has not opted in, except through `oat docs check`, which is new.
  Named exceptions: the G3 parser errors for non-dash bullets and empty
  `###` groups apply to every nav sync and index run. They are documented in
  the Contents grammar and release notes with the one-line repair.
- **Out of scope:** Updating consumer repositories to the new tooling. That
  is a follow-on rollout wave after this project lands and is reviewed.
- **Out of scope:** BL-260911's change to the external docs-update
  automation's configuration and its acceptance runs in external
  repositories; both move to that rollout wave.
- **Out of scope:** `BL-260830-make-documentation-aware` (configurable
  discovery prerequisites, #205). It changes project discovery, not the docs
  skills, and stays open as its own item.
- **Out of scope:** The house-conventions repository changes proposed
  alongside #367.
- **Out of scope:** Publishing packages to npm; merging PRs.

## Decisions

- **Workflow: brief, not quick or spec-driven.** #367 already specifies the
  28 proposals with evidence, and later phases depend on earlier results (P12
  after P13; the check design after the IA record; P24 after a prototype), so
  an up-front task plan would go stale. Rejected: spec-driven (re-derives the
  issue as a spec); quick (approved task list that is partly wrong by p06).
  Mitigation: the design contracts are pinned in `### Design`.
- **Delivery: one stacked PR per phase.** Each PR stays reviewable and early
  phases can merge first. Rejected: one PR at the end (too large to review).
- **BL-260830 excluded.** Different subsystem; adjacent to P2/P3 only.
- **BL-260911 split.** OAT-side front door, approval classes and drift
  reporting are in scope; the external automation config and external
  acceptance go to the rollout wave.
- **Ship a generic IA method in `authoring-docs` (G6), with external guidance
  taking precedence (G1).** Rejected: a thin skill that is only useful with an
  external pack.
- **Record the IA as an authored decision and mirror it in config (G2).**
  Rejected: config only (not reviewable); page only (not checkable).
- **Nav sync owns the sidebar for new scaffolds, gated by `--check`, shipped
  only after P13; `navOwner: hand-authored` opts out and gets the P21
  comparison.** Rejected: keeping `meta.json` hand-authored by default (the
  survey found drift in most repos that do).
- **P24 lives in `oat-docs-analyze` plus a narrow CLI helper for quoted
  literals, after a prototype.** It needs judgment, so it is not an
  `oat docs check` rule. Rejected: a CLI-only rule.
- **Contents bullets stay dash-only, with a clear error for `*` and `+`.**
  Rejected: accepting all bullet markers (widens the contract for no reader
  benefit).
- **Brief review by GPT-6 Astra at high effort; phase reviews use a provider
  different from the phase implementer.** Requested by the user.

## Known Unknowns

- Whether user-scope config resolution already covers `documentation.*` keys
  (`packages/cli/src/config/resolve.ts`), or G1's user tier needs resolver
  work — Settled by: p02
- The exact `turbopack.root` passthrough shape for the pinned Next version,
  and whether the ESM template's `__dirname` use fails at config load —
  Settled by: p01
- Whether `docs-completed-projects-gap-review` is generalized to resolve
  `documentation.root` and the recorded IA, or marked repo-internal —
  Settled by: p01
- Whether Fumadocs static export supports redirects for P4's old-URL plan, or
  stub pages and `not-found.tsx` recovery are the only options — Settled by:
  p03
- Whether the pinned Fumadocs source config can skip `nonReaderPaths` when
  rendering, or those pages render but stay out of navigation — Settled by:
  p04
- Whether the pinned Fumadocs versions accept a string `root` — Settled by:
  p04
- Whether Fumadocs' llms routes work under `output: 'export'` at the pinned
  version — Settled by: p05
- Bump the MkDocs pins, or mark the MkDocs path legacy with its end-of-life
  date (recommendation: both) — Settled by: p05
- How to calibrate and prove P20 thresholds in a public repo without the
  internal corpus (recommendation: OAT's own docs plus synthetic fixtures at
  each threshold boundary, with the survey distribution quoted from #367) —
  Settled by: p06
- Whether a generic P24 check is feasible across repo layouts — Settled by:
  p08

## Delivery endpoint and authority

- **Endpoint:** merged — one PR per phase, stacked in phase order against
  `main`, each passing the Definition of Done gates and its phase review.
  Delivered means every phase PR has merged after CI, Bugbot and actionable
  review findings are clear.
- **Authority:** The user approves this brief and any change to an Outcome,
  Constraint, Decision or `### Design` contract. The agent decides phase-local
  design inside the pinned contracts, may add, split or reorder phases and
  make provisional phases concrete (logging each change), and may open,
  update and merge phase PRs bottom-up once CI, Bugbot and blocking findings
  are clear. The agent does not publish packages, change other repositories
  or change shared configuration.
- **Landing amendment:** 2026-10-22, user: "I want you to go ahead and just land
  these PRs as ci/bugbot review clears instead of waiting for me". This replaces
  the original open-PR endpoint and user-owned merge requirement.
- **Brief approved:** 2026-10-22 by user at e6a6a4f7bcce399a2bd33d1229de77026c787436

## Milestones

<!-- Reserved for goal mode. Brief projects deliver once and leave this section empty. -->

## Phase p01: Contract cleanup and silent defects

**Intent:** Make the shipped docs skills, CLI help and packages tell the truth before new stages are added. Retire the closed FP patches and plan IDs in `oat-docs-bootstrap`, move the "Generated files" section into the template, have the CLI render the detected Node version in place of FP-13E's hedge, route old-scaffold shapes to analyze findings, and update `add-docs-to-a-repo.md` (P6). Fix each P7 statement and the E12 corrections that do not depend on the new apply input (`setup-docs.sh` venv claim, MkDocs index location, `tooling` as a string) and the E13 `allowed-tools` gaps (`BL-261002-correct-docs-bootstrap-docs`). Add a `turbopack` passthrough to `createDocsConfig`, have the template pass the ESM-safe directory, and delete FP-11 (P8). Derive the `oat-docs` topic map from the installed docs index, resolve or mark repo-internal `docs-completed-projects-gap-review`, and package the MkDocs migration guide (P19). Add a check that fails when a skill test references a docs path that no longer exists (`BL-261002-catch-hardcoded-docs-paths`).
**Exit evidence:** `oat-docs-bootstrap` contains no closed FP patches or plan-task IDs and its exit summary matches the remaining patches; a scaffold test shows the detected Node version rendered; an old-scaffold fixture produces an analyze finding; each corrected P7 and E12/E13 statement is listed in the phase record with its source citation; a `createDocsConfig` test passes for the nested-standalone shape and a negative control shows the old Path B shape dropping `output: 'export'`; the docs-path check fails on a seeded stale reference and passes after it is removed; changed skills carry one version bump each; Definition of Done gates 1–8 pass with recorded exit codes; phase PR open.
**Provisional:** no

## Phase p-rev1: Correct the scaffold navigation command

**Intent:** Correct p01's generated-files instructions to select the rendered docs-app directory when nav sync runs from the repository root. This is a correction to Outcome 1/P6 from external PR #368 review 5621004819, not a change to nav target resolution. Retain p01 anchors and add this correction before continued p02 delivery; p02 yields at a verified commit before correction execution and resumes after integration.
**Exit evidence:** A real nested scaffold reproduces bare nav sync exiting 1 despite configured documentation.root, and the documented command with rendered target exits 0 and writes the expected nested navigation. One focused regression executes the command extracted from rendered contributing.md, fails on the original template for the intended target-resolution error, then passes after the correction. Existing integration/nav coverage and required gates pass with explicit exits/cache disclosure; an independent reviewer confirms the bounded delta; update PR #368. Existing p01 PR-scoped versions remain sufficient unless main advances.
**Provisional:** no

## Phase p02: IA method and guidance input

**Intent:** Ship one coherent IA selection workflow before persistence and restructuring are added in p03. Rewrite `authoring-docs` using P28 D1–D9 and G6: readers/work contexts, organizing principle within each track, page purpose, verification overlay and size gate; the six approved presets (Product/Engineering/QA, Consumer and Maintainer, Domain Engineering, Task Type, Toolkit and CLI, Flat Small) with choose-when signals; per-track standard sections; placement, section-entry and root-landing rules; agent and Product/QA track guidance; IA Proposal template; page types, smell tests, persona mapping, writing-style and rubric/SKILL reference updates. Feature and QA validation page templates remain p07. Add `documentation.guidance: string | string[]` through repository and user normalization and the real config command, preserving unrelated config fields. Implement G1 selection as explicit argument/conversational source → repo config → user config → built-in reference, reusing the existing effective-config machinery where applicable and adding only the narrow shared support needed by those consumers. Multiple sources retain order; source selection and provenance are explicit, and sources remain read-only Markdown inputs with an index/Contents entry. Bootstrap Step 2.5 and analyze `--ia` load `authoring-docs`, read repo signals, ask only decision-changing questions, and propose two candidate two-level structures with 5–8 representative page placements and the nearest preset. Bootstrap routes existing docs primarily to analyze then apply, requiring an explicit choice before replacement or a second app. Analyze's quality pass, authoring's IA work and apply's content actions load the shared authoring method; analysis/apply templates and bootstrap summaries cite the resolved guidance. External guidance remains advisory to repo AGENTS/contributing rules; conflicts become `ask_user`, and private source contents are never copied into repository artifacts. Update current user-facing config/workflow documentation for this phase's behavior. No IA persistence, restructure action, approval-class changes, scaffold preset materialization or new docs-check command in p02.
**Exit evidence:** Real config read/write and resolution tests prove repo and user scalar/array guidance, explicit/conversational override and built-in fallback, ordered source provenance and preservation of unrelated config; settle the user-tier known unknown using actual user-file normalization rather than mocked resolved values alone. Updated authoring-docs contract tests and a conservation review cover D1–D9 with the two page-template deferrals explicit, and authoring-docs reaches at least 1.1.0. Preserve synthetic fixture evidence of bootstrap proposal output containing two plausible trees, page placements, nearest presets and resolved-source citation for fresh Markdown/framework setup; an existing-docs fixture takes analyze→apply by default, and replacement/second-app routes require an explicit choice. The IA proposal is exercised through the skill workflow and shared helpers as applicable, without inventing a CLI bootstrap stage or pretending prose assertions execute an agent. Conflict and read-only behavior are demonstrated on public synthetic guidance. Each changed skill receives its one PR-scoped bump, the five public packages and bundled metadata advance together to the next release after p01 (0.3.24 unless current main requires higher), gates 1–8 run in order with explicit exits and accurate cache disclosure, skill prose contract/lint/format checks pass, and the phase PR opens against the p01 branch (or main if p01 has merged).
**Provisional:** no

## Phase p03: Record and act on the IA

**Intent:** Write the accepted IA as a decision record plus a docs-app `AGENTS.md` section and mirror it in `documentation.ia` and `documentation.navOwner` (P3, G2). Add analyze's Information Architecture Fit section, misroute severity rule, `ask_user` finding when no IA is recorded, and IA-driven coverage surfaces (P3). Add apply's `restructure` action (P4). Add approval classes and offline package-drift reporting, and the single apply input that bootstrap Step 7b also uses (BL-260911, E12 handoff, G4).
**Exit evidence:** schema tests for `documentation.ia` and `navOwner`; analyze and apply skill text and templates updated with the new section, rule, action and input; a negative control shows an `explicit` recommendation skipped under unattended approval and listed in the structured result, and an explicitly approved tooling update performs only the G4 carve-out and reports an unsupported scaffold change as `manual`; a Markdown-mode fixture records its IA in the contributing page; drift reported with the upgrade command from `public-package-versions.json` with no network; gates pass; phase PR open.
**Provisional:** yes

## Phase p04: Navigation follows Contents

**Intent:** Emit `---Label---` groups from `###` subheadings in Contents, accept a string `root`, and make non-dash bullets an error (P13, G3). Then run nav sync at the end of `oat docs init` and bootstrap and add `nav sync --check` to the template prebuild, writing `navOwner: nav-sync` on new Fumadocs and MkDocs scaffolds and leaving undeclared repos and Markdown mode untouched (P12). Add `documentation.nonReaderPaths` and make nav sync inventory, `--check` and `generate-index` honor it, keeping those paths out of the rendered app where the framework allows (prerequisite for p07's templates). Make `generate-index` follow Contents order and index titles with tooling-aware header text (P14). Update the Contents grammar docs.
**Exit evidence:** nav sync and parser tests for groups, empty groups, string `root` and `*` bullets; a fresh `oat docs init` fixture has `navOwner: nav-sync`, `meta.json` in Contents order and a prebuild that fails on drift; a repo with no `navOwner` is not regenerated by init or bootstrap; a Markdown-mode fixture runs no nav sync and is unchanged; a `nonReaderPaths` template directory passes `--check` while an omitted reader page still fails, and an existing `documentation.excludes` entry still affects only the manifest; `generate-index` tests for authored order, titles and header text per tooling; gates pass; phase PR open.
**Provisional:** yes

## Phase p05: Reader-first starter app

**Intent:** Scaffold the docs-app `AGENTS.md` from the CLI and fix the contributing pointer (P9). Make Getting Started a reader page and move the toolchain page to `contributing/docs-toolchain.md` (P10). Ship the contributing skeleton, including diagram rules (P11). Add llms routes through `docs-config` and the template (P15). Add the template-parity test and the analyze rule for missing per-page metadata (P16). Fix remark plugin ordering and add transform tests (P17). Refresh or mark legacy the MkDocs template (P18).
**Exit evidence:** a fresh scaffold contains the listed files and a static export serves `llms.txt`, `llms-full.txt` and a per-page `.md` route; the parity test fails on a seeded divergence; transform tests cover links, nesting and GFM inside tabs and `remarkMermaid`; gates including `pnpm build:docs` pass; phase PR open.
**Provisional:** yes

## Phase p06: oat docs check

**Intent:** Add `oat docs check` per G5 with the P20 rules and thresholds, the `meta.json` comparison (P21), the contributing-command rule (P22), the provenance and escaping-link rule (P25) and the diagram rules (P23). Wire it into the starter app and OAT's own docs, have bootstrap wire it into the target repo's PR CI with the build and manifest-freshness steps for each tooling mode, and replace the MkDocs template's `echo` test with it.
**Exit evidence:** one test per rule with a seeded failure and a passing control at each threshold boundary; `--json` output matches G5; OAT's own docs pass with no errors; a Markdown-mode fixture is checked without a site build or manifest; the starter app runs it; a bootstrapped fixture's PR workflow invokes the check, build and manifest-freshness steps and fails on a seeded docs error; gates pass; phase PR open.
**Provisional:** yes

## Phase p07: Page templates and presets

**Intent:** Ship the Product feature, Engineering feature, QA validation and Screen spec templates (P26, including the Feature and QA validation templates listed in P28 D9) and the operations, reference and agent templates (P27) in `authoring-docs`, then have bootstrap scaffold each preset's tree, section indexes with purpose paragraphs, `contributing/templates/` and track table, with the flat outcome below about 15 pages (P5).
**Exit evidence:** one fixture per preset plus the flat outcome; templates carry the literal-versus-concept rule and are declared in `documentation.nonReaderPaths`; `oat docs check` and `nav sync --check` pass on every preset scaffold; gates pass; phase PR open.
**Provisional:** yes

## Phase p08: Product and QA checks against source

**Intent:** Prototype the P24 checks (triad slug parity, paired documentation, quoted literals found in source, test IDs, duplicate or contradictory scenarios, templates excluded from reader Contents) for repos whose recorded IA declares a triad, then ship them in `oat-docs-analyze` with a narrow CLI literal helper, or record a descope decision with the prototype evidence.
**Exit evidence:** prototype findings in `references/`; either analyze steps plus helper tests on a synthetic triad fixture, or a decision record and #367 note; gates pass; phase PR open.
**Provisional:** yes

## Phase p09: Docs, release and closeout

**Intent:** Finish OAT's own docs for everything shipped and audit release readiness (each earlier phase PR already carried its own version bumps). Create the consumer rollout backlog item, carrying BL-260911's outstanding external criteria with reciprocal links; close the two `BL-261002-*` items and close BL-260911 only once its criteria have moved, otherwise mark its OAT-side slice done and leave it open. Answer #367 with a P-number checklist pointing at the phase PRs.
**Exit evidence:** docs pages updated and `pnpm build:docs` passes; release gates pass against current `main`; the rollout item exists with the transferred criteria; backlog dispositions match the rule above; the #367 checklist covers P1–P28; phase PR open.
**Provisional:** yes

---

## Parallelism

Phases that have no overlapping file modifications may run concurrently. To declare parallelism:

```yaml
oat_plan_parallel_groups: [['p02', 'p03']]
```

Each inner array is a group of phases that execute in parallel (each in its own worktree) and merge back in plan order after all pass. Groups may be declared whenever the phases become concrete.

Default is `[]` (fully sequential, no worktrees). This brief declares none: p04, p05 and p07 all edit the starter template, and p02 and p03 both edit the analyze and bootstrap skills.

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation                                                      | Gate Target       |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- | ----------------- |
| plan   | artifact | fixes_completed | 2026-10-22 | structured (no artifact), plan round 1: 9 findings          | -                                        | codex exec gpt-6-astra high, read-only, user-requested reviewer | -                 |
| plan   | artifact | fixes_completed | 2026-10-22 | structured (no artifact), plan round 2: 4 findings          | -                                        | codex exec gpt-6-astra high, read-only, user-requested reviewer | -                 |
| plan   | artifact | passed          | 2026-10-22 | structured (no artifact), plan round 3: 0 findings          | 61b2e3281739e094979d5ded38488de69d2c86d6 | codex exec gpt-6-astra high, read-only, user-requested reviewer | -                 |
| p01    | code     | fixes_completed | 2026-10-22 | reviews/p01-review-2026-10-22T203848Z.md                    | 169c15cf503ec55071a2a2c255cf4da2d486942b | auto                                                            | -                 |
| final  | code     | pending         | -          | -                                                           | -                                        | -                                                               | -                 |
| plan   | artifact | passed          | 2026-10-22 | reviews/archived/artifact-plan-review-2026-10-22T200026Z.md | e6a6a4f7bcce399a2bd33d1229de77026c787436 | gate                                                            | codex-6-sol-xhigh |
| p01    | code     | fixes_completed | 2026-10-22 | reviews/p01-testing-complexity-20261022.md                  | f0c3bedf0179c49cb790763ed98d1e7ad34b7731 | manual                                                          | -                 |
| p01    | code     | fixes_completed | 2026-10-22 | reviews/p01-review-2026-10-22T205540Z.md                    | d42f19285c2841d72fecac32fbd7f0ec130f4d31 | auto                                                            | -                 |
| p01    | code     | passed          | 2026-10-22 | reviews/p01-testing-complexity-confirmation-20261022.md     | d42f19285c2841d72fecac32fbd7f0ec130f4d31 | manual                                                          | -                 |
| p01    | code     | passed          | 2026-10-22 | reviews/p01-review-2026-10-22T210641Z.md                    | 183b3d3aa7944c85919f09cc05dcb47b08c8f011 | auto                                                            | -                 |
| p01    | code     | fixes_completed | 2026-10-22 | reviews/archived/remote-pr-368-review-2026-10-22T212500Z.md | 7a0078df58e2f94868216c3381d6a9dcc421891b | auto                                                            | -                 |
| p-rev1 | code     | passed          | 2026-10-22 | reviews/p-rev1-review-2026-10-22T213617Z.md                 | 79ab7f30a1831fe2b09d7a199c4bb178395f0d22 | auto                                                            | -                 |
| p02    | code     | pending         | -          | -                                                           | -                                        | -                                                               | -                 |

Add one `code` row per phase as phases become concrete. For code-review events,
`Reviewed Head` is the full 40-character SHA at the head of the reviewed range.
Writers must preserve every existing row and every unknown trailing cell.

Ledger correction (PR #368, discussion `4353594144`): the earlier aggregate
plan row is expanded into three distinct events. Plan round 1's nine findings
were addressed before round 2; round 2's four were addressed before round 3;
round 3 passed at the recorded head. Exact reviewed heads for the first two
in-memory rounds are unavailable in the retained review provenance and remain
`-`. Findings-bearing p01 events retain `fixes_completed`; their passing
successors are the testing/complexity confirmation and final round 3 above.
This corrects the erroneous `passed` labels introduced at phase acceptance;
it does not revoke the final passing reviews or p01 acceptance.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase p01: [Description]

**Total: [N] phases**

Ready for final code review and PR preparation.

---

## References

- Journal: `implementation.md`
- Research: `references/research/` (`issue-367.md` is the issue body as filed)
- Project log: `project-log.md` (when enabled)
