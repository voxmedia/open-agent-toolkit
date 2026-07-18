---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
---

# Specification: wave-skills-promotion

## Problem Statement

The stoa repo dogfooded two wave-orchestration skills — `oat-wave-execute`
(1.4.0) and `oat-wave-program` (1.0.0) — across a six-PR, 48-plan execution
program (waves 0–5, 2026-07-12→16). Every standing rule they carry is
evidence-cited in the program's signal ledger. The skills are proven but
live only as repo-local copies in stoa; they cannot be installed by any
other repo, they carry stoa-specific phrasing (DoD command names, formatter
rules, provider-view paths), and a queue of six evidence-backed changes
(packet §2) was deliberately parked for the promotion rather than applied
in place.

This project upstreams both skills into the OAT toolkit's workflow pack as
first-class bundled skills: ported with their scripts and asset templates,
genericized where stoa-isms leak, with the §2 queue applied, the §3
CLI-absorption table dispositioned row-by-row, and the §4 explainer-kit
integration delivered as an RC-gated final phase. The authoritative scope
document is `references/2026-07-17-wave-skills-promotion-packet.md`; the
evidence base is `references/2026-07-17-wave-signal-ledger.md`.

The zero-regression bar shapes everything: stoa's wave 6 will run on the
promoted skills as this project's acceptance evidence, and stoa's
repo-local copies stay authoritative until that run passes. Scope was
deliberately kept port-shaped — the large CLI-absorption rows are deferred
with owners so wave 6 validates one change (packaged skills) rather than
two (skills + new CLI surface).

## Goals

### Primary Goals

- Both wave skills installable from the OAT workflow pack, with their
  scripts and asset templates, behaviorally equivalent to stoa's 1.4.0 +
  the §2 queue.
- Every §2 queued change shipped or rejected with written rationale.
- Every §3 CLI-absorption row dispositioned (in-scope rows done; deferred
  rows filed as owned backlog items).
- The mechanical/judgment ownership split and the orchestration-log +
  end-of-run-synthesis discipline survive promotion intact.
- §4 explainer integration (program-recap recipe, wave-close/program-close
  callers, personal-wrapper migration) built against the frozen
  explainer-kit v1 RC, as a gated final phase.
- An in-repo fixture mini-wave dry-run passes before stoa W6 is attempted.

### Secondary Goals

- Docs coverage: a wave-workflow docs surface in the docs app, including a
  descriptive (non-contract) description of the execution-program artifact
  format.
- The four still-open upstream feedback items triaged into tracked backlog
  items in this repo.

## Non-Goals

- Running stoa's wave 6 (happens in the stoa repo; it is acceptance
  evidence, not project work).
- Absorbing the wave command family (`oat wave new/refresh/close`) or a
  `bootstrap-group` CLI command — deferred backlog items.
- Declaring the execution-program artifact format a stable OAT contract —
  descriptive docs only; contract status is a backlog item grouped with
  the wave-CLI work.
- Root-causing the `.oat/config.json` revert (BL-260715, operator-owned in
  stoa) or building a CLI-level tracked-config guard.
- explainer-kit v1 itself (separate project on the `explainer-kit` branch).
- Renaming the skills (operator decision: keep `oat-wave-*`).

## Requirements

### Functional Requirements

**FR1: Port both skills into the workflow pack**

- **Description:** `oat-wave-execute` (SKILL.md + bootstrap script + two
  asset templates) and `oat-wave-program` (SKILL.md + one asset template)
  become canonical bundled skills under the toolkit's skills root, listed
  in the workflow pack manifest, bundled into the CLI, and installable/
  syncable to all provider views like every other workflow skill.
- **Acceptance Criteria:**
  - Fresh install of the workflow pack materializes both skills with all
    scripts/assets present and executable.
  - `oat sync --scope all` produces provider views for both skills.
  - Bundle-consistency tests pass (manifest ↔ bundle script parity).
  - "Repo-local dogfood draft" status language is removed/replaced.
- **Priority:** P0

**FR2: Apply the §2 queued changes**

- **Description:** All six queued items are applied to the ported skill
  text (or rejected with written rationale in project artifacts): (1)
  Step 3.2 scaffold-placeholder fix becomes verify-only on oat ≥ 0.1.65;
  (2) mandatory `pwd` + branch assert immediately before every
  `git merge`; (3) bootstrap script verifies provider-view parity with the
  root checkout + merge choreography adds sync-commit content inspection;
  (4) "integration gates after every fan-in" promoted to a named standing
  rule; (5) every fix disposition produces a minimal stored verification
  record; (6) docs note preferring resumed implementer handles for fix
  continuations.
- **Acceptance Criteria:**
  - Each of the six items is traceable to a specific edit in the promoted
    skill text/scripts, or to a written rejection rationale.
  - Skill frontmatter versions reflect the change level (queue applied on
    top of 1.4.0 / 1.0.0).
- **Priority:** P0

**FR3: Genericize stoa-isms via neutral phrasing**

- **Description:** Rule text that names stoa-specific commands, tools, or
  paths (pnpm DoD commands, oxfmt/lint-staged specifics, nvm/better-sqlite3
  env rules, `.codex` trust paths, fixture-tree exclusions) is rephrased to
  repo-neutral language ("the repo's DoD gates / formatter / env setup"),
  with stoa specifics retained only as cited evidence examples. No new
  config schema; no install-time placeholders.
- **Acceptance Criteria:**
  - No rule's normative text requires a stoa-specific tool to be present.
  - Every rule's INTENT from the signal ledger is preserved (no rule
    deleted or weakened during genericization).
  - Stoa-specific mentions that remain are clearly framed as evidence/
    examples, not requirements.
- **Priority:** P0

**FR4: Preserve the load-bearing disciplines**

- **Description:** The mechanical/judgment ownership split (both skills'
  Ownership Boundary sections) and the orchestration-log contract +
  end-of-run synthesis requirement survive promotion verbatim in intent.
  Genericization and queue application must not move judgment (group
  composition, dispositions, synthesis, user checkpoints) into the skills.
- **Acceptance Criteria:**
  - Ownership Boundary sections present in both promoted skills with the
    judgment list intact.
  - Orchestration-log template ships as a bundled asset; closeout sequence
    retains synthesis-before-archive ordering.
- **Priority:** P0

**FR5: validate-plan singleton-group semantics (§3 row 2)**

- **Description:** The "singleton groups are invalid; a solo lane runs as
  an ungrouped phase" encoding, currently living only in skill prose, is
  documented in the validate-plan command's user-facing help/error surface.
- **Acceptance Criteria:**
  - validate-plan help text (and/or its rejection message) states the
    singleton-group rule and the ungrouped-phase alternative.
  - Existing validate-plan tests updated/extended accordingly.
- **Priority:** P1

**FR6: Upstream-feedback triage (§3 row 6)**

- **Description:** The four still-open feedback items (configurable
  per-target gate timeout; runbook verify-commands pass; `--scope all`
  flag-placement drift; resolver `--candidate-model`/`--preferred`
  conflict) are triaged into tracked backlog items in this repo, each with
  enough context to be actionable without the stoa ledger.
- **Acceptance Criteria:**
  - Each item exists as a backlog item (or is closed with rationale if
    found already fixed), with evidence pointers.
- **Priority:** P1

**FR7: File the deferred-work backlog items**

- **Description:** The five deferred items from discovery are filed as
  backlog items with owner/trigger: wave CLI family (grouped with the
  artifact-format-contract item), artifact format as stable contract,
  `oat worktree bootstrap-group` command, post-W6 reviews-row watch
  removal, CLI-level tracked-config guard (blocked on BL-260715).
- **Acceptance Criteria:**
  - All five exist in the repo backlog with rationale, trigger conditions,
    and the noted groupings.
- **Priority:** P0 (packet success criterion: every §3 row dispositioned)

**FR8: Docs coverage for the wave workflow**

- **Description:** The docs app gains a wave-workflow surface: what the
  two skills do, the mechanical/judgment split, how they compose with the
  project lifecycle (wrapper projects, `oat-project-implement`), and a
  descriptive section on the execution-program artifact format (explicitly
  not a stable contract).
- **Acceptance Criteria:**
  - Docs build passes; generated index regenerated via the docs tooling.
  - Artifact-format section carries the "descriptive, not contract"
    framing with a pointer to the deferred contract backlog item.
- **Priority:** P1

**FR9: In-repo validation fixture + mini-wave dry-run**

- **Description:** A minimal fixture (tiny repo tree with 2–3 toy plans +
  a plan index) lives in this monorepo's test area. A dry-run exercises:
  program `new` with the coverage invariant, one wave containing a 2-lane
  write-disjoint group plus 1 ungrouped lane, merge choreography, and
  `wave-close` ledger updates — using the promoted skills.
- **Acceptance Criteria:**
  - Dry-run completes with the program artifact's coverage invariant
    holding on every commit and the ledger row flipped by wave-close.
  - Findings feed fixes before stoa W6 is attempted.
- **Priority:** P0

**FR10: §4 explainer-kit integration (RC-gated final phase)**

- **Description:** Once the packaged explainer-kit v1 RC exists (its
  project lives on this repo's `explainer-kit` branch): (a) a
  `program-recap` recipe in the generic recipe format; (b) wave-close /
  program-close callers in the wave skills that synthesize a fact base
  from reconciled program records and invoke the kit in supplied-fact-base
  mode, outputting under the explainers root with publishing human-gated;
  (c) personal-wrapper migration to the RC's request/manifest interfaces
  (doubles as the RC's acceptance gate, operator-owned E2E).
- **Acceptance Criteria:**
  - Built against the frozen RC only (never its source tree).
  - Personal-wrapper E2E green (operator-run).
  - Merge order coordinated with explainer-kit Phase 3 (touches the same
    lifecycle skills).
- **Priority:** P0 within its gate; the phase is blocked until the RC
  ships and does not block phases 1–4 or the W6 handoff.

### Non-Functional Requirements

**NFR1: Zero-regression bar (stoa W6)**

- **Description:** The promoted skills must be behaviorally equivalent to
  stoa's 1.4.0 + §2 queue for wave execution; stoa's wave 6 on the
  packaged skills is the acceptance evidence.
- **Acceptance Criteria:**
  - Fixture dry-run (FR9) passes pre-handoff.
  - A behavioral-equivalence checklist (rule-by-rule) accompanies the
    port; every intentional divergence is listed and justified.
- **Priority:** P0

**NFR2: Release conventions**

- **Description:** Bundled assets count as shipped CLI functionality:
  lockstep version bumps across the five public packages, skill
  frontmatter version bumps in the same PR, `pnpm release:validate` green.
- **Acceptance Criteria:**
  - `pnpm release:validate` passes; lint/type-check/tests green.
- **Priority:** P0

**NFR3: Script portability**

- **Description:** `bootstrap-group.sh` stays bash-3.2 compatible (macOS
  system bash: no mapfile, no associative arrays) after the §2 item-3
  parity-check changes.
- **Acceptance Criteria:**
  - Script lints/runs under bash 3.2 semantics; parity check covered by
    the fixture dry-run.
- **Priority:** P0

**NFR4: Provider portability**

- **Description:** Both skills function across provider views (claude/
  codex/cursor) via the standard sync tooling; nothing in the promoted
  text hard-requires a single provider.
- **Acceptance Criteria:**
  - Sync produces valid views; provider-specific mentions (e.g. codex
    worktree trust) are framed as conditional guidance.
- **Priority:** P1

## Constraints

- Stoa's repo-local copies remain the canonical source of truth until
  promotion ships and stoa migrates; this project's `references/
skill-sources/` copies are the port's input, frozen at 1.4.0 / 1.0.0.
- §4 builds only against the packaged explainer-kit v1 RC (frozen
  schemas), never its source tree; merge order coordinated with that
  project's Phase 3.
- No new pack, no new installer surface (workflow pack placement).
- No new config schema for genericization (neutral phrasing only).
- Monorepo conventions: canonical skills under the skills root, oxlint/
  oxfmt, TypeScript ESM, pnpm + Turborepo, release lockstep.

## Dependencies

- OAT CLI ≥ 0.1.65 semantics assumed by §2 item 1 (scaffold placeholder
  substitution upstream) and item 2 of the ledger's retired workarounds.
- Explainer-kit v1 packaged RC (external gate for FR10; project on the
  `explainer-kit` branch of this repo, currently at scaffold stage).
- Stoa repo availability for the W6 acceptance run (operator-coordinated,
  out of this repo).
- Existing toolkit surfaces: workflow pack manifest, bundle tooling,
  validate-plan command, docs app, backlog tooling.

## High-Level Design (Proposed)

Port-first, defer-heavy: the skills move into the toolkit essentially
as-proven, with three text-level passes applied in order — (1) §2 queue
application, (2) genericization, (3) toolkit-convention alignment
(frontmatter, status language, docs links). Toolkit integration touches
the pack manifest, bundle tooling, and provider-sync surfaces. Small
in-scope CLI work is limited to validate-plan help text. Validation runs
an in-repo fixture mini-wave before the external stoa W6 acceptance run.
§4 is a self-contained, RC-gated final phase that adds explainer callers
without disturbing the ported core.

**Key Components:**

- Ported canonical skills (two skill directories with scripts/assets)
- Queue-application + genericization edit set (rule-text level)
- Workflow-pack/bundle integration (manifest, bundle script, sync)
- validate-plan help update
- Backlog filing set (5 deferred + 4 triage items)
- Docs surface (wave workflow + descriptive artifact format)
- Validation fixture + dry-run procedure
- §4 explainer integration set (gated)

**Alternatives Considered:**

- Absorb mechanics into CLI now (wave family and/or bootstrap-group) —
  rejected for this project: doubles the W6 validation surface against a
  zero-regression bar; requires freezing the artifact format prematurely.
- New dedicated pack — rejected: adds installer surface for no isolation
  benefit; the skills call workflow-pack skills anyway.
- Config-driven genericization — rejected: no second consumer yet; neutral
  phrasing preserves intent without schema maintenance.

## Success Metrics

- Stoa W6 executes on the promoted skills with zero behavioral
  regressions (the packet's headline criterion).
- 6/6 §2 items traceably shipped or rejected in writing.
- 6/6 §3 rows dispositioned; 5 deferred backlog items + 4 triage items
  filed.
- Fixture dry-run green before W6 handoff.
- `pnpm release:validate` + full repo quality gates green.
- §4: personal-wrapper E2E green against the frozen RC (when gated phase
  unblocks).

## Requirement Index

| ID   | Description                                             | Priority | Verification                                           | Planned Tasks                      |
| ---- | ------------------------------------------------------- | -------- | ------------------------------------------------------ | ---------------------------------- |
| FR1  | Port both skills into workflow pack with scripts/assets | P0       | integration: install + sync + bundle-consistency tests | p01-t01, p01-t02, p01-t04, p01-t05 |
| FR2  | Apply all six §2 queued changes (or reject in writing)  | P0       | manual: per-item traceability checklist                | p02-t01..t06, p02-t08              |
| FR3  | Genericize stoa-isms via neutral phrasing               | P0       | manual: rule-by-rule intent-preservation review        | p02-t07                            |
| FR4  | Preserve mechanical/judgment split + log discipline     | P0       | manual: ownership-boundary + closeout-order review     | p02-t07, p02-t08                   |
| FR5  | validate-plan singleton-group help/docs                 | P1       | unit: validate-plan help + rejection message           | p03-t01                            |
| FR6  | Triage four upstream feedback items to backlog          | P1       | manual: backlog items exist with evidence              | p03-t03                            |
| FR7  | File five deferred-work backlog items                   | P0       | manual: backlog items with owner/trigger/groupings     | p03-t02                            |
| FR8  | Wave-workflow docs incl. descriptive artifact format    | P1       | integration: docs build + index regeneration           | p04-t01, p04-t02                   |
| FR9  | In-repo fixture + mini-wave dry-run                     | P0       | e2e: dry-run procedure against fixture                 | p05-t01..t03                       |
| FR10 | §4 explainer integration (RC-gated)                     | P0\*     | e2e: personal-wrapper E2E vs frozen RC (operator)      | p06-t01..t03                       |
| NFR1 | Zero-regression bar vs 1.4.0 + §2                       | P0       | e2e: fixture dry-run + manual equivalence checklist    | p02-t07, p05-t03, p05-t05          |
| NFR2 | Release conventions (lockstep bumps, release:validate)  | P0       | integration: release:validate + repo gates             | p05-t04                            |
| NFR3 | bootstrap script bash-3.2 portability                   | P0       | manual + e2e: fixture dry-run on macOS system bash     | p02-t03, p05-t01                   |
| NFR4 | Provider portability of promoted skills                 | P1       | integration: sync views generated for all providers    | p01-t04, p02-t09                   |

\* FR10 is P0 within its gate; the gate (explainer-kit RC) blocks only the
final phase, not the rest of the project.

## Open Questions

- **Versioning:** what frontmatter versions do the promoted skills carry
  (continue stoa's lineage — e.g. 1.5.0 for oat-wave-execute with the
  queue applied — vs reset to 1.0.0 as new toolkit skills)? Design
  proposes continuing lineage; flagged for operator confirmation.
- **W6 handoff shape:** what exactly does stoa consume (npm release with
  the packaged skills + `oat tools update`?) and is a pre-release channel
  needed? Design-level; affects only the handoff step after phase 4.

## Assumptions

- The explainer-kit RC will define stable recipe/request/manifest formats
  matching packet §4's names; FR10's design details are deferred until
  the RC freezes.
- The stoa ledger's evidence citations may remain in promoted rule text as
  historical references (they document WHY; they don't require stoa).
- `oat backlog` tooling in this repo is the destination for FR6/FR7 items.

## Risks

- **Genericization regression:** rewording a rule silently weakens it and
  W6 regresses.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** rule-by-rule equivalence checklist against the signal
    ledger; fixture dry-run; stoa copies stay authoritative until W6.
- **Fixture under-fidelity:** the mini-wave is too toy to catch real
  regressions (no real hooks/gates), giving false confidence.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** treat the fixture as smoke, not proof; keep the
    equivalence checklist manual; W6 remains the true gate.
- **RC schedule slip:** explainer-kit RC lands late; §4 blocks the
  project's completion indefinitely.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** phases 1–4 ship and W6 handoff proceeds without §4;
    the gated phase is additive and separately mergeable; coordinate
    merge order with explainer-kit Phase 3.
- **Bundle/installer drift:** skills with scripts+assets are rarer in the
  bundle path; a missed bundle-script entry ships a broken install.
  - **Likelihood:** Low
  - **Impact:** High
  - **Mitigation:** bundle-consistency tests; fresh-install verification
    in the fixture dry-run.

## References

- Discovery: `discovery.md`
- Authoritative scope: `references/2026-07-17-wave-skills-promotion-packet.md`
- Evidence: `references/2026-07-17-wave-signal-ledger.md`
- Skill sources: `references/skill-sources/`
