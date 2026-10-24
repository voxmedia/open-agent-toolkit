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

**Intent:** Implement Outcomes 4–5 and pinned G2/G4 without changing the five-axis method or nav generation. On approval, bootstrap/apply record accepted IA through `oat decision new` plus an Information architecture section in the Fumadocs/MkDocs docs-app AGENTS.md or the Markdown contributing page; the authored record remains authoritative. Add shared repository config mirrors `documentation.ia` with the exact G2 shape and `documentation.navOwner: nav-sync | hand-authored`, preserving unrelated fields and existing guidance. No user/local IA mirror or nonReaderPaths delivery is added. Absent navOwner remains undeclared: analyze asks the operator, nothing automatically regenerates navigation, and Markdown ignores it. Add analyze's Information Architecture Fit section and IA-driven Product/QA/consumer/agent coverage, ask_user when IA is missing, and a Medium/High misroute rule grounded in reader impact. Add apply's restructure action with explicit block approval, source→destination map, parent Contents changes, grep-derived inbound-link rewrites, framework-compatible old-URL strategy, retired-page stub/archive pointer and sidebar-owner-aware verification plus analyze rerun. Never promise a static-export redirect without verified framework support; use stubs/pointers where needed. Add stable recommendation IDs and approval: explicit | default throughout analyze/apply templates. The one apply input is an analysis artifact plus approved recommendation IDs; explicit items require individual approval, blanket/unattended runs skip and report them, and the structured result lists applied/skipped-with-reason/failed IDs. Bootstrap Step 7b uses that same handoff. Report docs-package drift offline from bundled public-package-versions.json with the exact upgrade command. An explicitly approved tooling update is limited to docs-app @open-agent-toolkit/docs-\* dependencies, the content conversions oat docs migrate already supports and build verification; unsupported scaffold changes are manual. Update public configuration/workflow docs. Keep execution in existing skills and helpers, with no new apply engine, generic approval framework, proposal engine, nav-owner behavior changes or p04/p07 scaffold materialization.
**Exit evidence:** Real config command/read tests prove exact IA shape, navOwner values and undeclared behavior, invalid-value rejection, scope boundaries, and unrelated guidance/config preservation. Conservation review maps P3/P4/BL-260911/E12/G2/G4 to the changed skill/template clauses and preserves existing prohibitions. Public synthetic walkthroughs demonstrate framework and Markdown IA recording locations, no-record ask_user and declared-audience misrouting, nav-sync versus hand-authored restructuring verification, repaired inbound links and retained old-URL recovery. Existing skills perform the walkthroughs; label agent/manual evidence accurately. At the documented approval handoff, demonstrate an explicit recommendation skipped and listed under blanket/unattended approval, individual approval permitting only G4's three operations, and unsupported scaffold work reported manual. Preserve reproduction-grade negative controls for approval clauses and valid controls, using real consumers/helpers where they exist and text contract guards only where shipped prose itself is the contract; do not invent a fake execution engine for proof. Offline drift fixtures compare actual installed docs dependencies with bundled versions without network and report the upgrade command. Each changed skill receives one PR-scoped version bump; all five public packages/bundled metadata advance to 0.3.25 unless main requires higher. Gates 1–8 run in order with explicit exits/cache truth; skill lint/format/sentence contracts pass; root independent phase review and the configured p03 external review gate pass before acceptance, then phase PR opens against p02 or main as appropriate. Preserve local proofs under ignored analysis/p03 with a short tracked journal summary.
**Provisional:** no

## Phase p-rev2: Preserve loaded skill bindings

**Intent:** Correct p02's authoring-docs binding from PR #369 Bugbot discussion_r4354277626 without changing IA guidance-source precedence. Resolve the actual loaded sibling first, then user and repository skill roots, probing each exact authoring-docs/SKILL.md and binding its root once for references and scripts. Correct all equivalent p02 call sites. Preserve p02/p03 anchors and execute after p03 verification/review; ship the bounded product correction through PR #369 and integrate its evidence into this revision range.
**Exit evidence:** A mixed-scope fixture demonstrates the old instruction choosing an older user skill lacking new assets while the loaded sibling contains them; the corrected prose probes the loaded sibling first, falls back user then repo, and consistently uses the bound root. Relevant text-contract protection fails on the old ordering and passes with valid fallback controls; no invented generic resolver runtime. Required gates and skill prose/lint/format checks pass with truthful cache reporting; an independent reviewer verifies the correction; PR #369 CI/Bugbot clear before landing. Existing p02 PR-scoped skill/public versions remain sufficient because the correction ships in that same PR; p03's 0.3.25 versions remain its delivery.
**Provisional:** no

## Phase p-rev3: Validate normalized IA paths

**Intent:** Correct p03 G2's repository-relative IA validation for PR #371 discussion_r4355448304. Trim decision and track paths before every existing path check, rejecting traversal in the value that would be stored. Preserve accepted valid trimming, scope rules, stored-null behavior, existing versions and earlier phase anchors. Repair PR #371 discussion_r4355448299's split Reviews table without changing event identity or outcomes.
**Exit evidence:** Existing real config-command tests reject whitespace-padded traversal in both decision and track paths without changing stored config bytes; a valid padded repository-relative control still round-trips. Regression fails against pre-fix code for the intended acceptance and passes after correction. Required gates pass with explicit exits and cache reporting, independent bounded review passes, and PR #371 current-head CI/Bugbot clear before land-pr. Reviews remain one contiguous table and the CLI reads the accepted p-rev2 status.
**Provisional:** no
**Corrects:** p03

## Phase p04: Navigation follows Contents

**Intent:** Deliver P12/P13/P14 and G2/G3 reader-path boundaries through existing nav/init/index tooling. Extend the shared Contents parser with ordered groups from ### headings, dash-only link entries, file/line errors for empty authored groups and `*` or `+` link bullets. Fumadocs emits ---Label--- immediately before the first retained entry; MkDocs represents the same group as a labeled nested nav list. Self-index links retain existing landing-page semantics and produce no empty separator after filtering. Preserve owned/unowned meta behavior and pages wholesale replacement. Treat root true or a non-empty trimmed string as root; because pinned Fumadocs loader and metadata schema disagree, add only the narrow metadata-schema adaptation needed for accepted string roots in OAT's source configuration, with a real collection/loader integration check rather than a loader-only claim. No framework upgrade. Fresh Fumadocs/MkDocs apps explicitly seed navOwner nav-sync and run nav sync after successful scaffold/config; an existing app or undeclared owner is never automatically regenerated through bootstrap, and Markdown runs no nav sync. Protect actual build scripts: Fumadocs prebuild and MkDocs docs:build must run nav sync --check with the existing external/source CLI distinction and correct app selection/quoting. Add shared repository documentation.nonReaderPaths using the existing bounded content-root-relative exclusion grammar; apply it to nav inventory, explicit Contents targets, --check and generate-index while documentation.excludes remains manifest-only. Non-reader exclusion takes precedence over an explicit Contents link; excluded subtrees are not read/written/cleaned by nav generation. Config applies only to its matching resolved content/app root, not an unrelated explicit target. Fumadocs collection files exclude these pages using an adapter that preserves the bounded grammar's literal/wildcard semantics; pinned MkDocs 1.4.2 lacks configurable rendering exclusion, so document that limitation and omit from nav/manifest without promising route removal or adding a plugin. Generate-index keeps its hierarchical inventory but orders surviving direct entries from each index's authored Contents (cross-directory links order the containing direct entry without duplicating files); remaining reader pages use deterministic fallback order and are flagged as unlisted. Directories use their child index frontmatter title, then H1, then slug fallback, independent of nav link labels. No Contents preserves deterministic inventory fallback; malformed present Contents uses the shared grammar errors. Headers describe actual framework/Markdown regeneration rather than promising hooks in Markdown. Update affected human grammar/config/bootstrap docs and bootstrap skill clauses, preserving approval/ownership prohibitions; do not materialize p07 presets/templates or ship p06 checks.
**Exit evidence:** Parser and real framework consumers prove groups, pre-group links, empty authored groups, dash-only errors with file/line, separator escaping and preserved landing pages. Verify string-root metadata through the pinned schema/collection plus installed loader so builds accept what nav sync preserves. Fresh init fixtures for both frameworks have navOwner nav-sync, generated navigation in Contents order and a check that fails on drift; existing undeclared/hand-authored and Markdown controls remain untouched, including dry-run behavior. Real config commands round-trip nonReaderPaths with sibling preservation and scope/invalid-value behavior consistent with other repository reader settings. One shared matcher grammar plus external collection-pattern parity checks protects root anchoring, directories, `*` and whole-segment `**`, literal metacharacters and nested exclusions; existing manifest excludes retains its old effect. A non-reader templates tree passes --check while an omitted reader page fails; no excluded metadata is rewritten. Manifest tests prove authored order, directory titles, unlisted fallback/flags, missing-Contents fallback and tooling-aware header, with no duplicate cross-directory targets. Preserve pre-fix regressions/negative controls at the actual changed boundary and valid controls where required; use deliberate-testing and avoid duplicating the same failure at multiple layers. Reuse existing modules, no generic navigation engine or configuration loader. Each changed canonical skill receives one PR-scoped bump and all five public packages plus bundled versions advance from 0.3.25 to 0.3.26 unless main requires higher. Run ordered gates 1–8, relevant lint/format and isolated sentence contracts, with explicit exits, fresh/cached truth and ignored analysis/p04 evidence. Independent root phase review passes before p04 delivery PR; use land-pr after fresh CI/Bugbot clear. Final project PR stays held.
**Provisional:** no

## Phase p-rev4: Preserve manifest regeneration and portable Contents order

**Intent:** Correct PR #372 external findings H1/M1/H2/M2 within accepted p04 G2/G3/P14 compatibility. Recognize existing generated manifests carrying the exact previously shipped autogen header while emitting the new tooling-aware header; preserve refusal of hand-authored derived output and all path/output safeguards. Use consistent platform-independent relative inventory keys for nested Contents ordering and rendering, retaining filesystem-native paths only for IO. Preserve directory-only exclusion semantics between the CLI matcher and actual pinned Fumadocs collections, including same-named files and root-level readers. Make shared Contents discovery/parsing ignore fenced examples while preserving original source lines and true-map grammar. Preserve fallback/unlisted flags and all other p04 behavior. No versions beyond the existing PR-scoped0.3.26 bump.
**Exit evidence:** A real derived-output command accepts the literal released header and regenerates once with the new header; current-header and unmarked hand-authored refusal controls pass without weakened ownership recognition. A regression covering nested Contents targets under Windows path semantics fails pre-fix for intended ordering/unlisted mismatch and passes after correction; document whether actual Windows or a portable win32-backed probe was executed. Actual pinned collection-globber/emitter parity tests cover directory-only patterns and true-directory controls. Fenced-only examples retain deterministic inventory fallback; examples before or inside real Contents do not become authored entries, groups, headings or diagnostics. Strict nav still requires a real map; genuine dash-bullet and empty-group errors retain line numbers. Use deliberate-testing, extend existing suites, no test-only production hooks, generic path layer or new Markdown/glob engine. Preserve exact pre-fix red/fixed/valid controls, focused pre/post checks, all ordered gates1–8 and cache truth. Bounded independent review and PR372 current-head CI/Bugbot clear before land-pr.
**Provisional:** no
**Corrects:** p04

## Phase p05: Reader-first starter app

**Intent:** Deliver Outcome7/P9–P11/P15–P18 on the merged p04/p-rev4 baseline. Both framework CLI scaffolds own app-root AGENTS.md with framework-specific authored/generated rules, IA and agent-use guidance, diagram accessibility and rendered commands with explicit working directories. Keep prose command substitutions distinct from JSON-escaped package scripts, including nested app paths with spaces. Retire bootstrap's duplicate current-scaffold AGENTS bridge/template; detect older CLI output and report the missing capability through analyze/manual upgrade rather than silently restoring a second template owner. Preserve existing files and Markdown-mode behavior. Keep Getting Started a first-safe-reader-result stub; move toolchain setup to docs/contributing/docs-toolchain.md, retain docs/contributing.md as the contributor entry with its ../AGENTS.md pointer, and add a contributing/index.md local map for the child directory. Contributing guidance covers the authored/generated table, full Contents grammar, add/move/rename, Syntax/Rendered examples, supported/not-configured features, Markdown→transform→MDX, Mermaid source and same-commit light/dark SVG pairs with accessibility/alt guidance, and actual current validation commands. Conserve accepted p04 navigation/exclusion behavior and align the portable guidance in OAT's own docs; p06's future docs check is not advertised as available. Add static-export llms.txt, llms-full.txt and per-page Markdown via a narrow docs-config helper shared by template and flagship, using the actual pinned loader and getText('raw') APIs rather than newer unavailable page/full helpers. All three outputs use the same loaded non-reader-filtered .md page set, including loaded pages absent from a hand-authored sidebar; MDX stays outside these Markdown endpoints and the existing OAT manifest. Serve per-page source at /llms/<page-slugs>/content.md (root /llms/content.md) without rewrites; include canonical rendered URLs, Markdown URLs, agent-use header and explicit source-relative-link guidance, with basePath added exactly once. Preserve raw authored Markdown rather than inventing a second link/MDX transformer. Enumerate static params and prove actual exported files/URLs with trailingSlash/basePath. Keep generateMetadata parity and add a small explicit parity-owned runtime file list: page, search handler/component, globals, source loader and new llms route handlers; compare exact shared bytes with only named template substitutions where needed, excluding intentional content/branding/config/script differences. Analyze reports missing page-specific metadata as scaffold guidance while accepting equivalent valid customized Next metadata arrangements. Run tabs before link rewriting in both composed entry points; reparse with GFM and recursively handle nested tabs without transforming fenced literal examples; add bounded Mermaid-transform evidence without claiming diagram validation. Mark the MkDocs/Material path legacy with Material's maintenance/security window ending May5,2027 and a sourced Zensical note; retain current Python pins and accurately preserve the MkDocs1.4.2 rendering limitation. Python upgrades and replacing the echo test depend on later work, with docs-check wiring reserved for p06. Advance all five public/bundled package versions to0.3.27 unless main requires higher, and bump each changed skill once.
**Exit evidence:** Real canonical-template init for Fumadocs and MkDocs proves framework-specific app-root AGENTS, coherent reader/contributor maps and pointers, rendered commands with a spaced nested target, fresh nav and preserved Markdown/existing-file controls. Conservation review maps P9/P10/P11 to portable instructions and removes all current bridge residue without losing capability/result/summary behavior. An actual fresh Fumadocs scaffold static export and OAT's own docs build serve llms.txt, llms-full.txt and root/nested content.md endpoints; inspect generated response bodies, membership, basePath/trailingSlash links, missing-page behavior, raw-source semantics and non-reader/MDX exclusions. Use real pinned collection/loader/build artifacts for this boundary, not invented helper fixtures alone. The explicit parity check fails on one seeded owned-file divergence and passes restored, while declared intentional differences remain accepted. Fresh transform fixtures reproduce old tab-link, nested-tab and GFM failures, pass the integrated fixed plugin pipelines, preserve real flagship fenced Syntax examples, and cover Mermaid's actual JSX/newline behavior. Analyze prose guard/manual walkthrough demonstrates missing metadata guidance without asserting automated agent behavior. Legacy support statement cites the actual Material source and distinguishes Material EOL from MkDocs core; no Python build is claimed. Run deliberate-testing and all ordered DoD gates1–8 with explicit exits/cache truth, applicable skill lint/format/sentence checks, forced isolated-HOME fresh package tests and direct smoke/skills/scripts/validation. Preserve exact necessary pre-fix/fixed/valid and seeded-parity controls under ignored analysis/p05, with a concise tracked summary. Independent root review and phase PR precede current-head CI/Bugbot clearance and land-pr; final project PR remains held.
**Provisional:** no

## Phase p06: oat docs check

**Intent:** Deliver Outcome8/P20–P23/P25 and the existing G5 command on merged p05. Register `oat docs check [--target-dir <dir>] [--json] [--rule <id>...]` with stable documented rule IDs, deterministic content-root-relative POSIX paths/locations and exactly G5's JSON object; findings are error or warn, errors exit1 and warning-only runs exit0. Invalid rule names/config are actionable diagnostics, never silently ignored; retain CLI runtime-error conventions. Reuse existing repo/config/content-root detection, matching-root isolation, Contents grammar and nonReaderPaths matcher. Omitted target follows configured root then existing docs fallback; explicit targets resolve as framework app roots or literal Markdown roots by the existing resolver, never an unconditional docs append. Reader rules cover authored .md/.mdx and their ancestor map directories, skip non-readers with the existing bounded grammar, and keep documentation.excludes manifest-only. No site build is part of the checker; Markdown mode has no sidebar or default generated manifest.

Implement P20's literal thresholds and document the counting: root links warn above10/error above14 when flat; Contents links warn above10/error above15 without real groups, with catalog:true or an explicit recognized generated marker exempting only that width rule. Groups use the accepted parser, not fenced headings or a newly permissive grammar. Folder/leaf counts are direct reader pages including index; a leaf has no reader-bearing child directory, index-only is error and two total pages warn. Folder counts warn above12/error above20 without a grouped index. Directory depth is0 at the content root, warns at4/errors at5 and beyond. Page length warns above500 physical source lines, or above1000 for pages explicitly typed reference or under reference/references path segments; reference pages also warn above40 real H3 headings. No unspecified new default length error threshold. Keep the author's target heuristics distinct from lint limits. Descriptions missing/empty error; lengths below40/above160 warn. Every page has one real H1; every reader-bearing directory has index.md with a nonempty dash-bullet Contents map; errors include unresolved in-root links/anchors and truncated Contents descriptions; overview below10 words and mixed in-repo separators warn. Parse YAML frontmatter, Markdown/GFM, references, explicit heading IDs and static HTML sufficiently to preserve existing flagship behavior, recursively account for supported tabs, and preserve literal fenced examples. Ordinary escaping links are P25 warnings, with no reads outside the allowed root to validate their targets; escaping Contents remains strict under G3. No network link checking or arbitrary MDX/command execution.

Add a small documented documentation.check config preserved by normalization and real config commands: rule severity(error|warn|off), named numeric rule thresholds, reason-bearing path/rule exceptions, configurable provenance ticket/milestone patterns and an optional diagram base ref. Reuse the bounded matcher for path exceptions rather than adding a glob grammar. Validate option names/values and patterns; do not silently drop checker settings. No blanket flagship exclusions or suppressions to obtain a passing baseline. P25 warns for planning/backlog/home paths and escaping ordinary links, with explicit reason-bearing decision-pointer exceptions; legitimate product documentation remains visible and warnings do not fail CI. P22 checks literal pnpm script/npm run invocations in contributing.md/mdx and contributing/\*\*, including executable code examples, against the relevant package. Respect explicit cd within a block, -w/workspace root and literal --filter package selection; recognize package-manager built-ins and illustrative placeholders without running commands or guessing prose intent. Unresolvable command context is reported clearly rather than validating against an arbitrary package; echo scripts warn. Correct ambiguous actual contributor commands to explicit working-directory forms if needed.

For P21, nav-sync ownership uses the existing read-only check semantics; hand-authored/undeclared ownership compares membership/order, including group separators and accepted page/folder collisions, without requiring generated labels, title keys or YAML formatting. Fumadocs meta and MkDocs nav both participate; Markdown skips sidebar checks. Preserve all accepted p04/p05 exclusion, nonlocal-link and source-identity behavior. P23 parses every actual Mermaid fence, including tab content, with the installed Mermaid parser; missing accTitle/accDescr warn. Check diagram SVG light/dark pairs and both page references, role=img/title/desc, and page-visible or associated long-description structure for rendered images; scope diagram assets to conventional diagrams paths or explicit paired references so logos are not mislabeled. Alt text empty, filename/slug-like or above155 characters warns. Associate tabbed Mermaid and referenced SVG pairs within their actual diagram/tab section, and warn when source changed without both associated SVGs in the same change. Use optional configured base ref(default origin/main when available), the merge base for committed changes plus staged/unstaged/untracked files; never mutate Git. Without a usable Git comparison, retain all static checks and clearly report the diff check unverified instead of implying freshness. Bootstrap PR checkout/fetch instructions provide the applicable base; no new command flags or automatic SVG generation.

Bound dependency ownership to existing resolved parsing engines: unified11.0.5, remark-parse11.0.0, remark-gfm4.0.1, github-slugger2.0.0, Mermaid11.12.3 and parse5 7.3.0; CLI may declare the required direct dependencies at those compatible versions and reuse docs-transforms for supported tabs if appropriate. A pinned jsdom29.1.1 runtime dependency and compatible development typings are additionally authorized solely to provide the real DOM required by Mermaid/DOMPurify in Node; lazy syntax validation keeps default script/resource execution disabled, preserves the Node22.17 minimum and uses no sanitizer stub or parser bypass. For the observed pre-existing Fumadocs handler incompatibility with mdast-util-to-markdown2.2.0, authorize exact2.1.2 at the effective pnpm install root. New independent-app policy may be scaffolded safely; existing workspace-root edits remain approval-owned by bootstrap with actionable manual/conflict/skip guidance, never an ignored member-only override or generic policy merger. Preserve framework APIs/content and prove real fresh installs through the shipped setup instructions. No transitive-only imports, second Markdown grammar, browser rendering, custom Mermaid parser, framework upgrade or unrelated lockfile refresh. Retain flagship-specific hosted README/catalog/live-consumer checks when wiring the portable command. Starter/flagship scripts invoke it, replace the MkDocs echo test, add explicit manifest freshness to repo PR CI, and document the real command/repair flow in applicable instructions/human docs. Bootstrap presents concrete PR workflow edits in its approved setup scope and wires checker+build+configured-manifest freshness with framework and Markdown distinctions, preserving existing workflow content and approval boundaries. Markdown gets checker only unless a manifest is explicitly configured. Canonical reusable workflow snippets/helpers are allowed when actually used by bootstrap; do not add a generic workflow merger or a new init flag. Advance all five public/bundled versions to0.3.28 unless main requires higher and bump each changed skill once.
**Exit evidence:** Use deliberate-testing at the real config round-trip, CLI JSON/exit/rule-filter, reader-file/asset and generated scaffold/CI boundaries. Add a seeded failing case and accepted control per rule, with just-below/at/above tests for quantitative warn/error boundaries, literal expected diagnostics, exclusions and reason-bearing overrides; reuse existing suites/fixtures where possible, no test-only API or own-module mocks. Protect nested Markdown/framework target resolution, matching-root exclusions, fenced examples, tab-contained fences, link references/anchors, group/catalog semantics and preserved nav ownership modes. Real pinned Mermaid acceptance/rejection and real SVG/page files prove parser/accessibility behavior; small actual Git fixtures prove committed and working-tree Mermaid/SVG diff semantics and unavailable-base reporting. A built/packed CLI run emits exactly G5 JSON and correct exits, including warning-only, rule-filter and malformed-config cases. OAT own docs and fresh Fumadocs/MkDocs starters pass without errors; any real docs repairs conserve claims/links and narrowly explain justified overrides. Follow bootstrap's concrete CI recipe in a fixture and execute its checker, build and manifest-diff steps with the actual built CLI; seeded docs error and stale configured manifest fail. Separate any command-order stubs from real framework proof, and demonstrate Markdown without build/default manifest. Preserve existing flagship validators. Run all ordered DoD gates1–8 with explicit exits/cache truth, forced isolated-HOME package tests and applicable smoke/skill/script/validation and skill-sentence checks; keep only necessary exact controls/logs under ignored analysis/p06, not tracked generated baselines or installed dependency trees. Independent fresh cross-provider phase review and current-head CI/Bugbot precede authorized land-pr; no p07/P24, consumer changes, npm publication or final-project PR.
**Provisional:** no

P06 corrective scope approved 2026-10-23 after the remote review cap: implicit pnpm commands may resolve to an installed local binary via package/workspace node_modules/.bin presence; explicit run commands stay script-only. Hand-authored/undeclared Fumadocs metadata without pages skips comparison; implicit ordering is deferred while explicit pages and nav-sync checks remain strict. This operator-approved exception supersedes the general membership/order wording for absent pages only. One bounded correction and focused independent confirmation inherit unchanged packaging/framework proof; gates1–9 remain required.

## Phase p07: Page templates and presets

**Intent:** Deliver Outcome9/P5/P26/P27 and P28 D9's remaining Feature/QA templates on merged p06. Ship all ten required page shapes in authoring-docs: Product feature, Engineering feature, QA validation, conditional Screen spec, Alert runbook, Solution record, Command reference, Skill or command guide, Decisions pointer, and Per-area AGENTS. Their fields follow public issue-367 P26/P27, not private exemplars. Keep the incident Solution record distinct from the existing solution page type and the Decisions pointer distinct from an ADR. Each template states the verified-literal versus concept rule and separates planned automation, implemented assertions, and dated execution evidence. Keep reusable copyable bodies canonical as Markdown assets under authoring-docs/references/page-templates/ and link them from the existing template reference; bundle those assets and consume that same source from CLI init, never maintain duplicate bodies in framework templates. Preserve earlier IA Proposal/method/page types/personas/style/rubric work and remove only the now-obsolete Feature/QA deferrals.

Materialization belongs to CLI docs init, shared by Fumadocs, MkDocs and Markdown. Add opt-in --ia-preset <preset> and --planned-pages <count> inputs. Preset IDs are product-engineering-qa, consumer-maintainer, domain-engineering, task-type, toolkit-cli, and flat-small. Require both inputs together, validate an integer count of at least1 and known preset before writes; no implicit interactive choice or default preset. Direct init without them retains the existing starter. Bootstrap supplies the approved nearest preset and anticipated total reader-page count from its IA proposal after explicit IA approval and capability inspection. This transports a selection only: no arbitrary file-write plan, generic apply engine, decision creation, or implicit PJM adoption. Existing docs surfaces still route to analyze and individually approved apply; preset init cannot replace authored content or change navigation ownership.

Use these public generic reader-directory mappings at counts of15 or more: product-engineering-qa -> product/, engineering/, qa/; consumer-maintainer -> consumer/, maintainer/; domain-engineering -> engineering/; task-type -> tutorials/, how-to/, reference/, explanation/; toolkit-cli -> tools/, workflows/. A track index carries its purpose, entry principle and useful section headings rather than mechanically creating every standard-section directory. Generate only purposeful indexes and useful nonempty starter guidance, with real Contents destinations and no invented product facts or empty leaf pages. The Product/Engineering/QA guidance explicitly says Engineering is hybrid (domain/implementation contracts alongside paired feature pages), with Product/QA keyed by feature or journey. Other preset sentences preserve the selected reader model and entry principle. Below15 anticipated reader pages, or for flat-small at any count, collapse reader structure into grouped headings in one root index, retaining the selected model and relevant support templates. This exact CLI boundary operationalizes the existing approximate size heuristic; it does not redefine the authoring guidance. Contributor/template/toolchain pages do not count toward the anticipated reader coverage. No checker suppression or changed threshold to make scaffolds pass.

Scaffold relevant templates under contributing/templates/: triad gets all ten; domain-engineering gets Engineering feature plus the six P27 templates; other presets get the six P27 templates. Size collapse retains the selected preset's template subset. Ship the conditional Screen spec template without automatically instantiating screen pages, and the Per-area AGENTS template without automatic per-track AGENTS files. Include a track table and accepted-selection guidance in the framework app-root AGENTS; Markdown instead puts that information in contributing.md, with no docs-root AGENTS, app dependencies, sidebar, build, or default manifest. Seed documentation.nonReaderPaths with contributing/templates/\*\* before real nav generation, merging without discarding existing config. Templates remain outside reader Contents, sidebar and generated manifest; preserve the pinned MkDocs rendered-route limitation and use_directory_urls:false. Preserve dry-run, adoption and existing-file byte safety. Update bootstrap's approval-to-CLI handoff and inspection, authoring references, CLI/help and human docs. Keep source-workspace and installed CLI command modes valid. Bump changed canonical skills once and all five public packages together to0.3.29 unless current main requires higher. No p08 source-verification prototype, dependency/framework upgrades, consumer changes or publication.

**Exit evidence:** Apply deliberate-testing at actual init output/config/reader boundaries. Use one public fixture per preset plus the size collapse at14/15; assert independent expected paths, real purpose/Contents, track guidance/table, applicable template bodies and nonReaderPaths. Run real docs check with no errors and framework nav sync --check on all six preset fixtures; demonstrate all three framework modes across the fixture matrix, with Markdown's absent framework artifacts. Prove template exclusion reaches checker/nav/manifest with an invalid excluded draft and valid reader control, not own-module mocks. Preserve no-input defaults, dry-run and existing/adopted content, invalid-input no-write controls and source/installed command rendering. Extend the prose contract only where the shipped template text is itself the requirement. A labeled manual bootstrap walkthrough demonstrates approved selection -> actual CLI invocation -> inspection, with IA persistence left to the existing approval/adoption flow. Build/package a CLI and exercise the new assets through installed resolution so a workspace-only pass cannot mask missing bundled files. Inherit unchanged framework/parser/install-policy proof; no broad new campaign. Run all nine ordered DoD gates with explicit exits/cache counts and fresh isolated-HOME relevant suites, root lint/format and skill-sentence contracts for skill edits. Keep necessary probes/logs under ignored analysis/p07. Fresh independent cross-provider anchored phase review and current-head CI/Bugbot precede authorized intermediate delivery; phase PR open.

**Provisional:** no

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

| Scope  | Type     | Status          | Date       | Artifact                                                         | Reviewed Head                            | Invocation                                                      | Gate Target          |
| ------ | -------- | --------------- | ---------- | ---------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- | -------------------- |
| plan   | artifact | fixes_completed | 2026-10-22 | structured (no artifact), plan round 1: 9 findings               | -                                        | codex exec gpt-6-astra high, read-only, user-requested reviewer | -                    |
| plan   | artifact | fixes_completed | 2026-10-22 | structured (no artifact), plan round 2: 4 findings               | -                                        | codex exec gpt-6-astra high, read-only, user-requested reviewer | -                    |
| plan   | artifact | passed          | 2026-10-22 | structured (no artifact), plan round 3: 0 findings               | 61b2e3281739e094979d5ded38488de69d2c86d6 | codex exec gpt-6-astra high, read-only, user-requested reviewer | -                    |
| p01    | code     | fixes_completed | 2026-10-22 | reviews/archived/p01-review-2026-10-22T203848Z.md                | 169c15cf503ec55071a2a2c255cf4da2d486942b | auto                                                            | -                    |
| final  | code     | pending         | -          | -                                                                | -                                        | -                                                               | -                    |
| plan   | artifact | passed          | 2026-10-22 | reviews/archived/artifact-plan-review-2026-10-22T200026Z.md      | e6a6a4f7bcce399a2bd33d1229de77026c787436 | gate                                                            | codex-6-sol-xhigh    |
| p01    | code     | fixes_completed | 2026-10-22 | reviews/archived/p01-testing-complexity-20261022.md              | f0c3bedf0179c49cb790763ed98d1e7ad34b7731 | manual                                                          | -                    |
| p01    | code     | fixes_completed | 2026-10-22 | reviews/archived/p01-review-2026-10-22T205540Z.md                | d42f19285c2841d72fecac32fbd7f0ec130f4d31 | auto                                                            | -                    |
| p01    | code     | passed          | 2026-10-22 | reviews/archived/p01-testing-complexity-confirmation-20261022.md | d42f19285c2841d72fecac32fbd7f0ec130f4d31 | manual                                                          | -                    |
| p01    | code     | passed          | 2026-10-22 | reviews/archived/p01-review-2026-10-22T210641Z.md                | 183b3d3aa7944c85919f09cc05dcb47b08c8f011 | auto                                                            | -                    |
| p01    | code     | fixes_completed | 2026-10-22 | reviews/archived/remote-pr-368-review-2026-10-22T212500Z.md      | 7a0078df58e2f94868216c3381d6a9dcc421891b | auto                                                            | -                    |
| p-rev1 | code     | passed          | 2026-10-22 | reviews/p-rev1-review-2026-10-22T213617Z.md                      | 79ab7f30a1831fe2b09d7a199c4bb178395f0d22 | auto                                                            | -                    |
| p02    | code     | fixes_completed | 2026-10-22 | reviews/archived/p02-review-2026-10-22T215711Z.md                | 7564e8332cdcae4d40e6dbf746f0c54ba93a23a8 | auto                                                            | -                    |
| p02    | code     | fixes_completed | 2026-10-22 | reviews/archived/p02-review-2026-10-22T221413Z.md                | bbefca279ca3a24108f465b65c7b6f351be3ee80 | auto                                                            | -                    |
| p02    | code     | passed          | 2026-10-22 | reviews/archived/p02-review-2026-10-22T222739Z.md                | 7f6ee861b5bee201f636d80dcae74b78711ca47e | auto                                                            | -                    |
| p02    | code     | passed          | 2026-10-22 | reviews/archived/p02-complexity-20261022.md                      | c6d5877dc2284bce1d5a96bf7e823851da159839 | manual                                                          | -                    |
| p02    | code     | fixes_completed | 2026-10-22 | reviews/archived/remote-pr-369-review-2026-10-22T230000Z.md      | -                                        | -                                                               | -                    |
| p03    | code     | fixes_completed | 2026-10-22 | reviews/archived/p03-review-2026-10-22T231217Z.md                | a8286fdc58dfd1e1d6f29f2207cf74737efd6927 | auto                                                            | -                    |
| p03    | code     | fixes_completed | 2026-10-22 | reviews/archived/p03-review-2026-10-22T233634Z.md                | 366218ea358a908e5e5849c375df90bd2c53be94 | auto                                                            | -                    |
| p03    | code     | passed          | 2026-10-23 | reviews/archived/p03-review-2026-10-23T000325Z.md                | 28887537aa3498293340bbc86f3f85772b4a9f09 | auto                                                            | -                    |
| p03    | code     | passed          | 2026-10-23 | reviews/archived/p03-review-2026-10-23T000851Z.md                | 28887537aa3498293340bbc86f3f85772b4a9f09 | gate                                                            | claude-opus-5-5-high |
| p-rev2 | code     | fixes_completed | 2026-10-23 | reviews/archived/p-rev2-review-2026-10-23T004632Z.md             | 88fd7be1ff6041f56eab4e74c6b5ff7b7f482327 | auto                                                            | -                    |
| p-rev2 | code     | passed          | 2026-10-23 | reviews/archived/p-rev2-review-2026-10-23T013602Z.md             | 41e0ad2cbdc9f84a90b0a1a842091f41810b5246 | auto                                                            | -                    |
| p-rev3 | code     | fixes_completed | 2026-10-23 | reviews/archived/p-rev3-review-2026-10-23T023450Z.md             | 007d3f2c47edfa4b8e1670155370314731b4f953 | auto                                                            | -                    |
| p04    | code     | fixes_completed | 2026-10-23 | reviews/archived/p04-review-2026-10-23T040657Z.md                | 905b048de4f64c836c3fce0797f4469dd790e145 | auto                                                            | -                    |
| p04    | code     | fixes_completed | 2026-10-23 | reviews/archived/p04-review-2026-10-23T043436Z.md                | 3bbe2a49326835a44c839a24de609335a119baa6 | auto                                                            | -                    |
| p04    | code     | passed          | 2026-10-23 | reviews/archived/p04-review-2026-10-23T050209Z.md                | 3f99348b589cbd750bdfd088e02e4c10a5848e2f | auto                                                            | -                    |
| p-rev4 | code     | fixes_completed | 2026-10-23 | reviews/archived/remote-pr-372-review-2026-10-23T051908Z.md      | -                                        | -                                                               | -                    |
| p-rev4 | code     | fixes_completed | 2026-10-23 | reviews/archived/remote-pr-372-review-2026-10-23T052300Z.md      | -                                        | -                                                               | -                    |
| p-rev4 | code     | passed          | 2026-10-23 | reviews/archived/p-rev4-review-2026-10-23T054624Z.md             | ba253ba359a03d2f40410e2431e38ca6effd629b | auto                                                            | -                    |
| p05    | code     | fixes_completed | 2026-10-23 | reviews/archived/p05-review-2026-10-23T072438Z.md                | 95a2cef6610eb3a65c18544ffcdd51f9abb4b212 | auto                                                            | -                    |
| p05    | code     | passed          | 2026-10-23 | reviews/archived/p05-review-2026-10-23T080358Z.md                | 04d5361060ed597fb59431ea4e98ee1d0d30f853 | auto                                                            | -                    |
| p05    | code     | fixes_completed | 2026-10-23 | reviews/archived/remote-pr-373-review-2026-10-23T082550Z.md      | -                                        | -                                                               | -                    |
| p05    | code     | fixes_completed | 2026-10-23 | reviews/archived/remote-pr-373-review-2026-10-23T083002Z.md      | -                                        | -                                                               | -                    |
| p05    | code     | passed          | 2026-10-23 | reviews/archived/p05-review-2026-10-23T085345Z.md                | e197f3f8c4f4b76d5e9837508d543933e3ec5b45 | auto                                                            | -                    |
| p06    | code     | fixes_completed | 2026-10-23 | reviews/archived/p06-review-2026-10-23T174051Z.md                | 237f50659d7ef6478662e38370e39a094eb9c57c | auto                                                            | -                    |
| p06    | code     | fixes_completed | 2026-10-23 | reviews/archived/p06-review-2026-10-23T181410Z.md                | 43da5b19d2b025dd9caaa21adf51b1c345fea060 | auto                                                            | -                    |
| p06    | code     | passed          | 2026-10-23 | reviews/archived/p06-review-2026-10-23T185005Z.md                | 9e19dd89657e18386cb3cdffcb58e753d66a68a8 | auto                                                            | -                    |
| p06    | code     | passed          | 2026-10-23 | reviews/archived/p06-review-2026-10-23T194704Z.md                | 9e19dd89657e18386cb3cdffcb58e753d66a68a8 | gate                                                            | claude-opus-5-5-high |
| p06    | code     | fixes_completed | 2026-10-23 | reviews/archived/remote-pr-374-review-2026-10-23T200139Z.md      | -                                        | -                                                               | -                    |
| p06    | code     | fixes_completed | 2026-10-23 | reviews/archived/remote-pr-374-review-2026-10-23T201000Z.md      | -                                        | -                                                               | -                    |
| p06    | code     | passed          | 2026-10-23 | reviews/archived/p06-review-2026-10-23T221841Z.md                | 27382a66a0790f3a63e9aaff89432114159986bb | auto                                                            | -                    |
| p07    | code     | fixes_completed | 2026-10-24 | reviews/archived/p07-review-2026-10-24T152354Z.md                | 65d121f0e8cf86bdfa9c15c97d704fcb13f5d6d4 | auto                                                            | -                    |
| p07    | code     | passed          | 2026-10-24 | reviews/archived/p07-review-2026-10-24T155132Z.md                | 632d69e04954f58e26e1a541fdd6b36968189e1e | auto                                                            | -                    |
| p07    | code     | fixes_added     | 2026-10-24 | reviews/archived/remote-pr-375-review-2026-10-24T161341Z.md      | f6b5b38e8079f48a2b355253207ef2c3697f00ed | -                                                               | -                    |

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
