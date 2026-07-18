---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
---

# Design: wave-skills-promotion

## Overview

Port-first, defer-heavy promotion. Both skills move from
`references/skill-sources/` (frozen at 1.4.0 / 1.0.0) into
`.agents/skills/` essentially as-proven, then receive three ordered,
separately-committed edit passes: (1) verbatim port + toolkit integration,
(2) §2 queue application (one commit per queue item, so each is traceable
to a diff), (3) genericization + convention alignment. Keeping the passes
as distinct commits is the core reviewability decision: the
zero-regression bar (NFR1) is enforced by diff inspection against the
frozen sources, and a rule-by-rule behavioral-equivalence checklist is
maintained as a project artifact.

In-scope CLI work is deliberately tiny (validate-plan help text). The
large mechanical absorptions are filed as backlog items, not built.
Validation is two-stage: an in-repo mini-wave fixture dry-run (smoke),
then stoa's wave 6 (the true gate, out of repo). §4 explainer integration
is an additive, RC-gated final phase whose detailed design is deferred
until the explainer-kit RC freezes its schemas — this design fixes only
its boundaries and integration points.

Approach confirmed at discovery (packet §5 shape, operator-resolved
sequencing): skills-as-is v1 + §2 queue; workflow pack; neutral-phrasing
genericization; in-repo fixture; names kept.

## Architecture

### System Context

The wave skills sit ABOVE the per-project lifecycle: `oat-wave-program`
maintains a durable execution-program artifact over a plan corpus;
`oat-wave-execute` runs one wave as a wrapper OAT project, delegating
execution to `oat-project-implement` and worktree creation to
`oat-worktree-bootstrap-auto`. Both are prose skills — no new runtime
code paths in the CLI. Promotion touches four toolkit surfaces:

**Key Components:**

- **Canonical skills** (`.agents/skills/oat-wave-execute/`,
  `.agents/skills/oat-wave-program/`): SKILL.md + `scripts/
bootstrap-group.sh` + `assets/` templates (execute); SKILL.md +
  `assets/execution-program-template.md` (program).
- **Pack/bundle integration:** `WORKFLOW_SKILLS` in
  `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`, the
  `SKILLS` array in `packages/cli/scripts/bundle-assets.sh` (kept in sync
  by `bundle-consistency.test.ts`), provider views via `oat sync`.
- **validate-plan help surface:**
  `packages/cli/src/commands/project/validate-plan/` — the singleton
  rejection message exists (line ~75); FR5 extends it and the help text
  with the ungrouped-phase alternative.
- **Docs app:** `apps/oat-docs` — new wave-workflow page(s) + regenerated
  index.
- **Backlog:** `.oat/repo/pjm/backlog/` — five deferred + four triage
  items via `oat-pjm-add-backlog-item` conventions.
- **Validation fixture:** `.agents/skills/oat-wave-execute/tests/
mini-wave-fixture/` (skill-local `tests/` is precedented by
  `oat-project-implement/tests` and is already stripped from the bundle
  by `bundle-assets.sh`).
- **§4 explainer callers (gated):** additive sections in both SKILL.md
  files + a `program-recap` recipe file, built against the frozen
  explainer-kit RC.

### Component Diagram

```
oat-wave-program ──owns──▶ execution-program artifact
      ▲   │ wave-close            (.oat/repo/reference/external-plans/)
      │   ▼
oat-wave-execute ──scaffolds──▶ wrapper OAT project (quick mode)
      │                              │
      │ scripts/bootstrap-group.sh   │ delegates execution
      ▼                              ▼
oat-worktree-bootstrap-auto     oat-project-implement
                                     │
              [§4 gated] wave-close/program-close ──▶ explainer-kit RC
```

### Data Flow

Unchanged from the proven skills: plan indexes → program artifact →
wave-execute wrapper project → worktree lanes → merge choreography →
wave-close ledger update. Promotion changes WHERE the skills live, not
how data flows.

## Component Design

### 1. Ported canonical skills

**Purpose:** the two skills as installable toolkit assets.

**Responsibilities:** identical to stoa's 1.4.0/1.0.0 + §2 queue.

**Design Decisions:**

- **Commit choreography (load-bearing for review):**
  1. Commit A: verbatim copy from `references/skill-sources/` into
     `.agents/skills/` (only frontmatter untouched-ness proven by diff).
  2. Commits B1–B6: one commit per §2 queue item (or a written rejection
     in `implementation.md`). Item 1 edits Step 3.2 to verify-only; item
     2 adds the pre-merge `pwd`/branch assert to merge choreography; item
     3 edits `bootstrap-group.sh` (view-parity verification) + merge
     choreography (sync-commit inspection); item 4 adds a named standing
     rule ("Integration gates after every fan-in") to the rules list;
     item 5 adds the stored-verification-record requirement to the fix
     loop; item 6 adds the resumed-handle docs note.
  3. Commit C: genericization pass (see component 2).
  4. Commit D: toolkit-convention alignment — remove "repo-local dogfood
     draft" status prose, drop the stoa decision-record slugs from
     frontmatter description, keep them in body text as evidence
     citations, set final frontmatter versions.
- **Versioning (flagged open question):** continue stoa's lineage —
  `oat-wave-execute` lands at **1.5.0** (queue items 1–2 = the planned
  1.4.1; items 3–5 = the planned 1.5.0; applied together),
  `oat-wave-program` lands at **1.1.0** (genericization + promoted
  status). Alternative: reset both to 1.0.0 as new toolkit skills.
  Continuing lineage keeps the signal ledger's version history readable.
- Cross-references between the skills (`oat-wave-execute` closeout step 8
  invokes `oat-wave-program wave-close`) stay by-name — names are kept,
  so no edits needed.
- Stoa-specific artifact paths referenced by the skills
  (`.oat/repo/reference/external-plans/`) are OAT-standard pjm paths that
  exist in any OAT-initialized repo — keep as-is.

### 2. Genericization edit set

**Purpose:** make rule text repo-neutral without weakening any rule
(FR3/FR4).

**Responsibilities / inventory of known stoa-isms (from the frozen
sources):**

- `pnpm build && pnpm type-check`, `pnpm format:fix`, `pnpm install
--frozen-lockfile` → "the repo's build/type gates", "the repo's
  formatter", "the repo's dependency install" — with the stoa commands
  kept as parenthetical examples.
- `nvm use`, `pnpm rebuild -r better-sqlite3`, NODE_MODULE_VERSION notes
  → generalized to "the repo's runtime/env setup rules (e.g. …)".
- Rule 7 (oxfmt/lint-staged single-glob guard) → generalized to
  "formatter-ignored-file × staged-glob interactions"; the oxfmt
  mechanics stay as the evidence example.
- `.codex/config.toml` worktree pre-trust → framed as conditional
  provider guidance ("when lanes carry codex review steps").
- `DoctorJsonResponse` checklist item, Fastify/vitest/Zod lane addenda →
  kept, but framed as worked examples of lane-type addenda the
  orchestrator adapts per repo (these are briefing guidance, not skill
  requirements).
- Stoa decision-record slugs (`DR-260713-…`, `BL-260715-…`) → kept as
  evidence citations with a note that they live in the source program's
  repo; the config-integrity check loses its "until BL-260715 is fixed"
  stoa-tracking framing and becomes a standing check with the bug cited
  as origin.

**Design Decisions:**

- The **behavioral-equivalence checklist** lives at
  `{PROJECT_PATH}/references/equivalence-checklist.md`: one row per
  standing rule / process step, columns `source text → promoted text →
intent preserved? → divergence rationale`. Filled during commit C,
  reviewed at the phase gate. This is the NFR1 enforcement artifact.
- Genericization never deletes a rule; if a rule seems stoa-only, it is
  generalized or explicitly dispositioned with the operator — never
  silently dropped.

### 3. Pack/bundle integration

**Purpose:** installability (FR1).

**Tasks:** add both names to `WORKFLOW_SKILLS` (manifest) and the
`SKILLS` array (bundle script); `bundle-consistency.test.ts` enforces
parity; run `oat sync --scope all` to generate provider views; verify a
fresh `oat init`-style install materializes scripts with execute bits.

**Design Decisions:** no `PACK_METADATA` entry (workflow pack defaults to
project scope — correct for these repo-scoped skills). `tests/` dirs are
already stripped by the bundle script — the fixture (component 6) rides
that existing behavior.

### 4. validate-plan help update (FR5)

**Purpose:** §3 row 2 — encode "singleton groups invalid; solo lane =
ungrouped phase" in the command's user-facing surface, not just skill
prose.

**Interfaces:** extend the existing rejection message (validate-plan.ts
~75) to state the alternative: `singleton groups are not allowed — run a
solo lane as an ungrouped phase (ungrouped phases execute sequentially in
plan order)`. Add the same rule to the command's `--help` description.
Update `validate-plan.test.ts` expectations.

**Design Decisions:** message-text change only; no validation-behavior
change (already rejects singletons).

### 5. Backlog filing set (FR6/FR7)

**Purpose:** §3 rows dispositioned durably.

**Nine items**, per `oat-pjm-add-backlog-item` conventions in
`.oat/repo/pjm/backlog/`:

Deferred-work (FR7): wave CLI family (`oat wave new/refresh/close`;
grouped with →), artifact-format-as-contract (grouped with ←; trigger =
second consumer), `oat worktree bootstrap-group` TS command, post-W6
reviews-row-watch removal (trigger = W6 clean observation), tracked-config
guard (blocked on stoa BL-260715).

Triage (FR6): configurable per-target gate timeout; runbook
verify-commands pass; `--scope all` flag-placement drift; resolver
`--candidate-model`/`--preferred` conflict. Each triaged first — if
already fixed on current main, closed with rationale instead of filed.

### 6. Validation fixture + dry-run (FR9)

**Purpose:** pre-W6 smoke of the promoted skills end-to-end.

**Shape:** `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/`
containing: `setup-fixture.sh` (materializes a throwaway git repo under
`$TMPDIR` with a tiny source tree, 3 toy plans + a plan index under
`.oat/repo/reference/external-plans/`, minimal OAT scaffolding, and a
no-op DoD gate script) plus the fixture file tree it copies. The dry-run
is **agent-executed** (the skills are prose): a documented procedure in
the fixture's README walks `oat-wave-program new` (coverage invariant),
one wave = one 2-lane write-disjoint group + 1 ungrouped lane,
`oat-wave-execute` (bootstrap via the ported script, briefs, merge
choreography with the new pre-merge asserts and sync-commit inspection),
and `wave-close` (ledger flip).

**Design Decisions:**

- Fixture is smoke, not proof (risk register): it validates mechanical
  choreography (branches, bootstrap, asserts, bookkeeping, ledger), not
  review quality. W6 remains the true gate.
- Throwaway-repo-from-script rather than committed git-repo-in-repo
  (nested `.git` dirs don't survive git tracking; script materialization
  is the standard workaround).
- `setup-fixture.sh` and the ported `bootstrap-group.sh` both stay
  bash-3.2 clean (NFR3); the dry-run runs on macOS system bash.

### 7. Docs surface (FR8)

**Purpose:** wave workflow documented in `apps/oat-docs`.

**Shape:** one new docs page (location per `apps/oat-docs/AGENTS.md`
conventions, likely under the workflows area): what waves are, the two
skills' split of program-layer vs wave-layer, the mechanical/judgment
ownership boundary (verbatim-in-intent), how a wave composes with
`oat-project-implement`, and a **descriptive** section on the
execution-program artifact format carrying an explicit "not a stable
contract" note pointing at the deferred backlog item. Regenerate the docs
index via `oat docs generate-index`.

### 8. §4 explainer integration (RC-gated; boundaries only)

**Purpose:** FR10, designed in detail only when the explainer-kit RC
freezes.

**Fixed boundaries (from packet §4):**

- `program-recap` recipe in the generic `explainer-kit.recipe/v1` format;
  reference implementation is the shipped stoa program deck.
- Wave-close / program-close caller sections added to the two SKILL.md
  files: synthesize a fact base from reconciled program records → invoke
  via `FactBaseBindingV1 {mode:'supplied'}` → output to
  `.oat/repo/explainers/<slug>/`; publishing stays human-gated.
- Personal-wrapper migration to `ExplainerRunRequestV1` + manifest
  consumption — operator-owned E2E; doubles as the RC acceptance gate.

**Design Decisions:** build against the packaged RC only (packet
constraint); the explainer-kit project currently sits at scaffold stage
on this repo's `explainer-kit` branch, so this phase's plan tasks are
written but marked blocked with the RC as the unblock trigger. Merge
order with explainer-kit Phase 3 (touches the same lifecycle skills) is
coordinated at that time. Skill version bumps for the caller additions
land as a separate minor bump (e.g. execute 1.6.0) so the §4 delta is
independently revertible.

## Data Models

No new runtime data models. Two document formats ship as bundled assets
(wrapper-plan, orchestration-log, execution-program templates) —
unchanged from the proven versions except template-directive hygiene.
The execution-program artifact format is documented descriptively (FR8)
but deliberately NOT frozen as a contract.

## API Design

No API surface. The only CLI-visible change is validate-plan help/error
text (component 4).

## Security Considerations

Nothing security-sensitive: no auth, no network, no new executable paths
beyond a bundled bash script that already ships in stoa and a fixture
setup script confined to `$TMPDIR`. Scripts are reviewed in the port
diff; neither takes untrusted input.

## Performance Considerations

Not applicable — prose skills and a docs page. The bundle grows by a few
kilobytes.

## Error Handling

Skill-level error discipline is inherited from the proven rules (STOP
semantics, gate-timeout diagnostics, verified bookkeeping asserts) and is
preserved by FR3/FR4. The fixture setup script uses `set -euo pipefail`
and cleans up its `$TMPDIR` tree on failure. validate-plan changes do not
alter exit semantics.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification         | Key Scenarios                                                                                                    |
| ---- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| FR1  | integration          | bundle-consistency test green; fresh install materializes both skills w/ executable script; sync views generated |
| FR2  | manual               | per-item commit ↔ queue-item traceability table in implementation.md; 6/6 accounted                              |
| FR3  | manual               | equivalence-checklist rows all "intent preserved" or justified                                                   |
| FR4  | manual               | ownership-boundary sections intact; closeout synthesis-before-archive order intact                               |
| FR5  | unit                 | validate-plan rejection message names ungrouped-phase alternative; help text updated                             |
| FR6  | manual               | 4 items triaged (filed or closed-with-rationale) in backlog                                                      |
| FR7  | manual               | 5 items filed with owner/trigger/groupings                                                                       |
| FR8  | integration          | docs build green; index regenerated; "not a contract" note present                                               |
| FR9  | e2e (agent-executed) | fixture dry-run: coverage invariant, group+ungrouped wave, merge asserts fire, wave-close flips ledger           |
| FR10 | e2e (operator)       | personal-wrapper E2E green vs frozen RC (gated)                                                                  |
| NFR1 | e2e + manual         | fixture dry-run + completed equivalence checklist pre-W6-handoff                                                 |
| NFR2 | integration          | `pnpm release:validate`, lint, type-check, tests green                                                           |
| NFR3 | manual + e2e         | scripts pass bash-3.2 review (no mapfile/assoc arrays); dry-run on macOS system bash                             |
| NFR4 | integration          | `oat sync --scope all` produces valid views for all providers                                                    |

### Unit Tests

- **Scope:** validate-plan message/help changes only.
- **Key Test Cases:** singleton-group rejection includes the
  ungrouped-phase guidance; help output contains the rule.

### Integration Tests

- **Scope:** bundle-consistency (manifest ↔ bundle script), docs build.
- **Test Environment:** existing repo test suites; no new harness.

### End-to-End Tests

- **Scope:** the mini-wave fixture dry-run (agent-executed, documented
  procedure); the stoa W6 run (out of repo, acceptance evidence).

## Deployment Strategy

Standard toolkit release: lockstep version bump across the five public
packages (bundled skills count as shipped CLI functionality), skill
frontmatter bumps in the same PR, `pnpm release:validate` before done.
Consumers receive the skills via npm release + `oat tools update`. Stoa's
migration (delete repo-local copies, install packaged, run W6) is
operator-coordinated after release. Rollback = stoa's repo-local copies,
which stay authoritative until W6 passes.

**Open question (W6 handoff shape):** whether stoa consumes a normal npm
release or needs a pre-release channel. Proposed: normal release — the
skills are additive assets, and stoa controls when it migrates.

## Migration Plan

No migrations in this repo. Stoa's skill migration is out-of-repo,
operator-owned, and reversible (its copies remain until W6 passes).

## Open Questions

- **Versioning:** continue lineage (execute 1.5.0 / program 1.1.0 —
  proposed) vs reset to 1.0.0. Operator call at design review.
- **W6 handoff:** normal npm release (proposed) vs pre-release channel.
- **§4 detail design:** deferred until the explainer-kit RC freezes
  (fixed boundaries above).

## Implementation Phases

### Phase 1: Port + toolkit integration (FR1, FR4)

**Goal:** both skills installable from the workflow pack, verbatim.
**Tasks:** commit A (verbatim copy); manifest + bundle-script entries;
sync views; fresh-install verification.
**Verification:** bundle-consistency green; install materializes both
skills; diff vs `references/skill-sources/` is empty (frontmatter aside).

### Phase 2: §2 queue + genericization (FR2, FR3, FR4, NFR3)

**Goal:** promoted text = 1.4.0 + queue, repo-neutral.
**Tasks:** commits B1–B6 (one per queue item); commit C (genericization +
equivalence checklist); commit D (convention alignment + versions).
**Verification:** traceability table 6/6; checklist complete; scripts
bash-3.2 clean.

### Phase 3: Dispositions (FR5, FR6, FR7)

**Goal:** every §3 row dispositioned durably.
**Tasks:** validate-plan message/help + tests; 5 deferred backlog items;
4 triage items (file or close-with-rationale).
**Verification:** CLI tests green; 9 items accounted for in backlog.

### Phase 4: Docs (FR8)

**Goal:** wave workflow documented.
**Tasks:** docs page; descriptive artifact-format section with
non-contract note; index regeneration; docs build.
**Verification:** `pnpm build:docs` green.

### Phase 5: Validation + release readiness (FR9, NFR1, NFR2)

**Goal:** pre-W6 confidence + shippable release.
**Tasks:** fixture + setup script; agent-executed dry-run; fix findings;
`pnpm release:validate`; W6 handoff note for the operator.
**Verification:** dry-run green; release validation green.

### Phase 6 (GATED on explainer-kit RC): §4 integration (FR10)

**Goal:** program-recap recipe + wave/program-close callers +
personal-wrapper migration against the frozen RC.
**Tasks:** written at gate-open; blocked until then; merge order
coordinated with explainer-kit Phase 3.
**Verification:** operator E2E green; separate minor version bump.

## Dependencies

### External Dependencies

- **explainer-kit v1 packaged RC** — Phase 6 gate; project at scaffold
  stage on this repo's `explainer-kit` branch.
- **stoa repo W6 run** — acceptance evidence, operator-coordinated.

### Internal Dependencies

- `skill-manifest.ts` + `bundle-assets.sh` + `bundle-consistency.test.ts`
  (FR1); `validate-plan` command (FR5); docs app (FR8); pjm backlog
  (FR6/FR7); `oat-project-implement` / `oat-worktree-bootstrap-auto`
  (runtime collaborators of the skills, unchanged).

### Development Dependencies

- Node 22.17.0 / pnpm / Turborepo; macOS system bash 3.2 for NFR3 checks.

## Risks and Mitigation

- **Genericization silently weakens a rule:** Medium | High
  - **Mitigation:** equivalence checklist row per rule; one-commit-per-
    pass choreography for reviewable diffs; stoa copies authoritative
    until W6.
  - **Contingency:** W6 regression → diff checklist rows, restore
    source phrasing, patch release.
- **Fixture under-fidelity (false confidence):** Medium | Medium
  - **Mitigation:** fixture framed as smoke; manual checklist carries
    the equivalence burden; W6 is the gate.
  - **Contingency:** W6 catches what the fixture missed → fold the miss
    back into the fixture for next time.
- **RC slips; Phase 6 blocks completion:** Medium | Medium
  - **Mitigation:** Phases 1–5 + W6 handoff are complete-able without
    Phase 6; the gated phase is additive and separately versioned.
  - **Contingency:** ship phases 1–5, leave the project open on the
    gated phase, or split Phase 6 out by operator decision.
- **Bundle/installer miss ships a broken skill:** Low | High
  - **Mitigation:** bundle-consistency test; fresh-install check in
    Phase 1 verification; executable-bit check for the script.
  - **Contingency:** patch release.
- **Merge collision with explainer-kit Phase 3 on lifecycle skills:**
  Low | Medium
  - **Mitigation:** this project touches no lifecycle skill text until
    Phase 6; coordinate merge order at gate-open.

## References

- Specification: `spec.md`
- Authoritative scope: `references/2026-07-17-wave-skills-promotion-packet.md`
- Evidence ledger: `references/2026-07-17-wave-signal-ledger.md`
- Frozen sources: `references/skill-sources/`
- Pack manifest: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Bundle script: `packages/cli/scripts/bundle-assets.sh`
