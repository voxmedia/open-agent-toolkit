# Fact base

## Confirmed claims

- **design:** ---
oat_status: complete
oat_ready_for: oat-project-plan
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
     **B3 framing (design-review amendment, root cause now known):** the
     sync-drift class (27-file `.codex/agents` deletions; tracked-config
     reverts) was root-caused post-packet to a stale locally-resolved CLI
     shadowing the global one (consuming repo's `node_modules/.bin/oat`
     at 0.1.1 vs global 0.1.7x; pnpm scripts prepend `.bin` to PATH;
     desired-state sync under two tool versions thrashes managed files).
     Write B3's rule text as a **regression guard for this named failure
     class**, not mitigation of a mystery — and give the check a concrete
     on-fire diagnostic: compare `node_modules/.bin/oat --version` vs
     `oat --version`. The promoted skill must not imply the toolkit has
     an unexplained corruption bug.
  3. Commit C: genericization pass (see component 2).
  4. Commit D: toolkit-convention alignment — remove "repo-local dogfood
     draft" status prose, drop the stoa decision-record slugs from
     frontmatter description, keep them in body text as evidence
     citations, set final frontmatter versions. **Record the
     release-collapse explicitly** in the changelog/commit message: the
     ledger's queued items were tagged "1.4.1" (items 1–2) and "1.5.0"
     (items 3–5); both land together as 1.5.0, so ledger citations still
     resolve.
- **Versioning (RESOLVED at design review):** continue stoa's lineage —
  `oat-wave-execute` lands at **1.5.0**, `oat-wave-program` at **1.1.0**.
  The signal ledger cites version numbers in nearly every ruling; a reset
  to 1.0.0 would orphan every citation, while toolkit consumers never
  installed 1.x so arriving at 1.5.0 costs nothing and is semver-honest.
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

**Ten items**, per `oat-pjm-add-backlog-item` conventions in
`.oat/repo/pjm/backlog/`:

Deferred-work (FR7): wave CLI family (`oat wave new/refresh/close`;
grouped with →), artifact-format-as-contract (grouped with ←; trigger =
second consumer), `oat worktree bootstrap-group` TS command, post-W6
reviews-row-watch removal (trigger = W6 clean observation), tracked-config
guard — **rejected near-permanently** (design-review amendment): the
revert class is root-caused to a stale local binary in the consuming
repo; the cure is dependency hygiene there, and a CLI-level guard is
unnecessary. Filed as a closed disposition record, not a pending item.

Triage (FR6): configurable per-target gate timeout; runbook
verify-commands pass; `--scope all` flag-placement drift; resolver
`--candidate-model`/`--preferred` conflict. Each triaged first — if
already fixed on current main, closed with rationale instead of filed.

New upstream candidate (design-review amendment, accepted): `oat sync`
warns when the invoking binary's version differs from the version that
produced the last sync (stamp the CLI version in the sync manifest) —
the general fix for the stale-tool thrash class, now evidence-backed and
cheap to detect.

### 6. Validation fixture + dry-run (FR9)

**Purpose:** pre-W6 smoke of the promoted skills end-to-end.

**Shape:** `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/`
containing: `setup-fixture.sh` (materializes a throwaway git repo under
`$TMPDIR` with a tiny source tree, 3 toy plans + a plan index under
`.oat/repo/reference/external-plans/`, minimal OAT scaffolding, and a
no-op DoD gate script) plus the fixture file tree it copies. The DoD
gate script is **toggleable to fail via env var** (design-review
amendment) so the unhappy path is exercisable. The dry-run is
**agent-executed** (the skills are prose): a documented procedure in
the fixture's README walks `oat-wave-program new` (coverage invariant),
one wave = one 2-lane write-disjoint group + 1 ungrouped lane,
`oat-wave-execute` (bootstrap via the ported script, briefs, merge
choreography with the new pre-merge asserts and sync-commit inspection),
`wave-close` (ledger flip), and one **unhappy-path leg**: toggle the DoD
gate to fail → verify fix-loop bookkeeping / park semantics — the
choreography branch most likely to regress silently, and it stays purely
mechanical.

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

| ID   | Verification         | Key Scenarios                                                                                                                                                      |
| ---- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR1  | integration          | bundle-consistency test green; fresh install materializes both skills w/ executable script; sync views generated                                                   |
| FR2  | manual               | per-item commit ↔ queue-item traceability table in implementation.md; 6/6 accounted                                                                                |
| FR3  | manual               | equivalence-checklist rows all "intent preserved" or justified                                                                                                     |
| FR4  | manual               | ownership-boundary sections intact; closeout synthesis-before-archive order intact                                                                                 |
| FR5  | unit                 | validate-plan rejection message names ungrouped-phase alternative; help text updated                                                                               |
| FR6  | manual               | 4 items triaged (filed or closed-with-rationale) in backlog                                                                                                        |
| FR7  | manual               | 5 items filed with owner/trigger/groupings                                                                                                                         |
| FR8  | integration          | docs build green; index regenerated; "not a contract" note present                                                                                                 |
| FR9  | e2e (agent-executed) | fixture dry-run: coverage invariant, group+ungrouped wave, merge asserts fire, wave-close flips ledger; unhappy leg: toggled gate-fail → fix-loop/park bookkeeping |
| FR10 | e2e (operator)       | personal-wrapper E2E green vs frozen RC (gated)                                                                                                                    |
| NFR1 | e2e + manual         | fixture dry-run + completed equivalence checklist pre-W6-handoff                                                                                                   |
| NFR2 | integration          | `pnpm release:validate`, lint, type-check, tests green                                                                                                             |
| NFR3 | manual + e2e         | scripts pass bash-3.2 review (no mapfile/assoc arrays); dry-run on macOS system bash                                                                               |
| NFR4 | integration          | `oat sync --scope all` produces valid views for all providers                                                                                                      |

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

**W6 handoff (RESOLVED at design review): normal npm release** — no
pre-release channel; additive-asset risk doesn't justify the machinery,
and stoa's repo-local copies are the rollback. Phase 5 produces a **W6
handoff mini-runbook** (not just a note) containing:

1. The exact released package version, to be pinned in stoa's W6 program
   artifact for provenance.
2. The migration sequence: delete repo-local skill copies →
   `oat tools update` → `oat sync`.
3. The row-stomp observation task: the §3 row 4 trigger fires FROM W6
   (one more clean final-gate observation closes it) — W6's operator
   must log that observation and report it back so the deferred
   watch-removal backlog item can close.

## Migration Plan

No migrations in this repo. Stoa's skill migration is out-of-repo,
operator-owned, and reversible (its copies remain until W6 passes).

## Open Questions

- **§4 detail design:** deferred until the explainer-kit RC freezes
  (fixed boundaries above).

Resolved at design review (2026-07-18): versioning (continue lineage —
execute 1.5.0 / program 1.1.0, with the 1.4.1+1.5.0 release-collapse
recorded); W6 handoff (normal npm release + Phase 5 mini-runbook);
fixture honesty bar (mechanical-only confirmed; toggleable-fail DoD gate

- unhappy-path leg added as the one accepted upgrade).

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
**Tasks:** validate-plan message/help + tests; 5 deferred/disposition
items (tracked-config guard filed as a closed rejection per the
root-cause amendment); 4 triage items (file or close-with-rationale);
1 new upstream candidate (sync version-stamp warning).
**Verification:** CLI tests green; 10 items accounted for in backlog.

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
- **implementation:** ---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-21
oat_current_task_id: null
oat_generated: false
---

# Implementation: wave-skills-promotion

**Started:** 2026-07-18
**Last Updated:** 2026-07-18

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews`.
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## HiLL / Checkpoint Configuration

- `oat_plan_hill_phases: ['p05', 'p06']` — resolved from `workflow.hillCheckpointDefault: final`, applied per mergeable delta: p05 ends this run's release-ready delta (p06 is RC-gated and merges separately with its own checkpoint). Recorded here because the literal "final phase" (p06) cannot complete in this run.
- `oat_auto_review_at_hill_checkpoints: true` — from `workflow.autoReviewAtHillCheckpoints`.
- Phase gate review (`oat_phase_review_gate`): enabled for p05, review_type code, exit_nonzero_on important.
- Dispatch policy: managed/high (project state); cursor target `gpt-5.6-sol-high` (enforced, model arg).

## Progress Overview

| Phase                               | Status    | Tasks | Completed |
| ----------------------------------- | --------- | ----- | --------- |
| Phase 1: Port + toolkit integration | completed | 4     | 4/4       |
| Phase 2: §2 queue + genericization  | completed | 9     | 9/9       |
| Phase 3: Dispositions               | completed | 3     | 3/3       |
| Phase 4: Docs                       | completed | 2     | 2/2       |
| Phase 5: Validation + release       | completed | 5     | 5/5       |
| Phase 6: Explainer integration      | completed | 4     | 4/4       |

**Total:** 41/41 tasks completed

---

## Phase 1: Port + toolkit integration

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- Both wave skills live verbatim in `.agents/skills/` (byte-identical to frozen sources, reviewer-verified per file at commit A) with `bootstrap-group.sh` executable.
- Workflow pack manifest + bundle script registered (bundle-consistency RED→GREEN); full CLI suite green.
- Provider views synced: 4 manifest entries (claude + cursor × 2 skills); codex reads natively from `.agents/skills` (adapter declares `nativeRead: true`).
- Fix loop shipped a real toolkit bug fix: `copyDirectory` now preserves file modes (fresh installs previously stripped the execute bit from nested skill scripts — first nested executable ever bundled).

**Key files touched:**

- `.agents/skills/oat-wave-execute/**`, `.agents/skills/oat-wave-program/**` — verbatim port
- `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`, `packages/cli/scripts/bundle-assets.sh` — registration
- `packages/cli/src/fs/io.ts` (+2 regression tests) — mode-preservation fix
- `.oat/sync/manifest.json` + claude/cursor view symlinks

**Verification:**

- Run: bundle-consistency + full CLI suite (250 files / 3001 tests), lint, type-check, byte-diff port purity, fresh temp-repo install with built CLI.
- Result: pass (round 2; round 1 failed on the install execute-bit Critical, fixed in `3aa46d5c`).

### Task p01-t01: Verbatim copy — **completed**, commit `5a3179a4`

### Task p01-t02: Manifest + bundle registration — **completed**, commit `27126351` (+ fix commit `3aa46d5c` from review round 1). p01-t03 intentionally unused (merged at plan review).

### Task p01-t04: Provider views — **completed**, commit `3d1ff180` (4 views + manifest; no unrelated deletions — B3-class inspection clean)

### Task p01-t05: Fresh-install verification — **completed**, no commit (verification-only)

**Evidence (re-run after fix):** `pnpm build && bash packages/cli/scripts/bundle-assets.sh`; temp repo via `mktemp -d` + `git init`; `node packages/cli/dist/index.js --cwd "$tmp" tools install workflows --scope project` (36 skills); `providers set --enabled claude,cursor,codex`; `sync --scope project`. Asserted: both skill trees + SKILL.md, all 3 asset templates, installed `bootstrap-group.sh` mode 755 + `test -x` pass, no `tests/` dir, 4 wave manifest entries, claude+cursor views on disk, codex native-read. Temp dir cleaned. (Round-1 evidence was invalid — original check only verified the bundle copy, not the installed copy; reviewer's independent reproduction caught it.)

**Notes / Decisions:**

- `pnpm run cli` source-dev wrapper cannot auto-sync an external `--cwd` (repo-relative tsconfig resolution); built CLI unaffected — candidate observation for p03-t03 triage.
- Gate-tooling observation for p03-t03: cross-family gate prompts that name a reviewer-dispatching skill can recurse (two concurrent gate runs observed during plan gate).

---

## Phase 2: §2 queue + genericization

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- All six §2 queue items applied, one commit each (B1 `52c59aa8`, B2 `98267802`, B3 `1ef49623`, B4 `db8b28a0`, B5 `d6440606`, B6 `4b32c611`); traceability table below in Implementation Log.
- Genericization complete with 69-row equivalence checklist (`references/equivalence-checklist.md`), reviewer-sampled adversarially (21 rows): intent preserved everywhere; one over-deleted provenance citation caught in review and restored (`7601d2d6`).
- Versions: `oat-wave-execute` 1.5.0, `oat-wave-program` 1.1.0; release-collapse (1.4.1+1.5.0 → 1.5.0) recorded in the t08 commit body; no dogfood/status prose remains.
- p02-t09 resolved as a **verified no-op**: provider views are symlinks, so text edits flow through; re-run `oat sync --scope all` reports "No changes required."

**Verification:** lint + type-check green; bash-3.2 syntax + construct checks on `bootstrap-group.sh`; byte-identical asset templates vs frozen sources; reviewer round 1 FAIL (1 Important) → round 2 PASS.

**Notes / Decisions:**

- Mid-phase sync-cleanliness event: `oat sync --scope all` materialized 24 supported-catalogue cursor dispatch-variant roles (oat-managed). Implementer correctly refused to stage (task-boundary discipline = the just-codified B3 class); root committed them separately (`08d7b205`); sync now idempotent-clean.

### Tasks

- p02-t01..t06: **completed** (queue commits above)
- p02-t07: **completed**, `d544b622` (checklist 69 rows: 44 execute / 25 program)
- p02-t08: **completed**, `de16cb5d` + fix `7601d2d6` (restored DR-260713-extract provenance citation; EX-I07 corrected)
- p02-t09: **completed (no-op)** — see Phase Summary; root catalogue commit `08d7b205` adjacent but outside task scope

---

## Phase 3: Dispositions

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- validate-plan rejection + help now state the singleton rule and the ungrouped-phase alternative (`cefdc4a2`, TDD).
- Ten §3 dispositions durable: 4 active deferred items with owner/trigger/groupings (`68906d88` + owner fix `2d889c19`); tracked-config guard filed-and-archived `wont_do` with root-cause rationale; triage closed 2 as already-fixed on main (`--scope all` placement; resolver flag conflict — both independently re-verified by the reviewer) and filed 3 (`BL-260718-harden-full-surface-gate` with both fresh gate observations, `BL-260718-add-generated-runbook`, `BL-260718-warn-when-oat-sync-uses`) (`50396aa3`).
- Every packet §3 row has a traceable disposition (reviewer cross-checked row-by-row).

**Verification:** CLI suite 250 files / 3002 tests; lint; type-check; pjm lifecycle checks. Review round 1 FAIL (1 Critical: missing owners) → round 2 PASS.

**Notes / Decisions:**

- Pre-existing `oat pjm doctor` baseline failure (10 older records, template frontmatter; exit 2 at phase base too) — out of scope; candidate for a follow-up backlog item at closeout.

### Tasks

- p03-t01: **completed**, `cefdc4a2`
- p03-t02: **completed**, `68906d88` + fix `2d889c19` (owner lines; repo convention keeps `assignee: null`)
- p03-t03: **completed**, `50396aa3` (dispositions: 2 closed-as-fixed, 3 filed)

---

## Phase 4: Docs

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome:** wave-workflow docs page shipped (`4648e3d8`) with authored `## Contents` navigation, descriptive artifact-format section + explicit "not a stable contract" note pointing at the deferred backlog grouping; generated index regenerated + docs build green (`4b86f380`); review round 1 caught a judgment-attribution error ("composes" assigned to oat-wave-program) — fixed in `1a6359ec`, round 2 PASS with independent ownership-language sweep.

**Notes / Decisions:**

- `oat docs nav sync` is MkDocs-only; Fumadocs equivalent = explicit generate-index + build. Filed `BL-260718-support-fumadocs-in-oat-docs`.
- Bare `oat docs generate-index` writes a stray repo-root index.md (cwd-relative defaults). Filed `BL-260718-fix-oat-docs-generate-index`.

### Tasks

- p04-t01: **completed**, `4648e3d8` + fix `1a6359ec` (orchestrator-judgment wording)
- p04-t02: **completed**, `4b86f380`

---

## Phase 5: Validation + release readiness

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-18

### Phase Summary

**Outcome (what changed):**

- Mini-wave fixture shipped (`5d06bdb9`, 16 files): throwaway-repo materializer under `$TMPDIR`, 3 toy plans + index (p01+p02 write-disjoint, p03 ungrouped finale), DoD gate toggleable via `FIXTURE_GATE_FAIL=1`; bash-3.2 verified; bundle-excluded.
- Dry-run procedure README (`dbdb8631`): six stages with pass criteria, happy + unhappy legs.
- Dry-run EXECUTED against the promoted skills (`2b36ddd3`) — record below.
- Lockstep release bumps 0.1.73 → 0.2.0 across all five public packages + regenerated `public-package-versions.json` (`7f16bc02`); `release:validate` + full gates green (implementer AND reviewer runs).
- W6 handoff mini-runbook (`c05982d9`): pins `@open-agent-toolkit/cli@0.2.0`, migration sequence (delete repo-local copies → `oat tools update` → `oat sync --scope all`), row-stomp observation task closing `BL-260718-remove-post-w6-reviews-row`, regression protocol via equivalence checklist + lockstep patch.

### Dry-Run Record (p05-t03, executed 2026-07-18)

- Setup: clean fixture under `$TMPDIR`; gate executable.
- Program `new`: coverage invariant 3 indexed plans ↔ 3 program rows — PASS.
- Composition: p01+p02 write-disjoint group; p03 ungrouped — PASS.
- Bootstrap: bash 3.2; both lanes `view-parity=ok`, `git_clean=pass` — PASS.
- Happy leg: 6 task commits, 3 asserted `--no-ff` merges with pre-merge pwd/branch asserts, rebase choreography, both fan-in gates — PASS.
- Unhappy leg: `FIXTURE_GATE_FAIL=1` → gate exit 1 → closeout parked → stored verification record written (B5 discipline) → rerun passed and unparked — PASS.
- Wave-close: 3 rows → `done`; ledger records merged status, fixture PR, SHA, completion record — PASS.
- Findings dispositioned: (1) fixture pnpm hygiene — node_modules ignore + normalized lockfile committed (fixture-scoped); (2) README formatter-resolution + bootstrap assertions clarified (`git_clean=pass` required); (3) **zero promoted-skill-text or bootstrap-group.sh defects found**.

### Tasks

- p05-t01: **completed**, `5d06bdb9` — fixture + toggleable gate
- p05-t02: **completed**, `dbdb8631` — procedure README
- p05-t03: **completed**, `2b36ddd3` — dry-run executed; fixture-only fixes; checklist outcome appended (69 prior rows byte-preserved)
- p05-t04: **completed**, `7f16bc02` — 5×0.2.0 + version asset; release:validate green
- p05-t05: **completed**, `c05982d9` — W6 runbook (lowercase `w6` in subject: commitlint constraint, verified no lost commit)

---

## Phase 6: Explainer integration

**Status:** completed (2026-07-18/19)
**Gate:** opened 2026-07-18 (RC f212d630 verified + vendored); gate-open plan revision (2 rounds → clean) preceded execution; acceptance re-pinned to the post-p06 FINAL RC per explainer sequencing.

### Phase Summary

- p06-t01 `fdf358fe`: program-recap recipe (explainer-kit.recipe/v1), interim home under wave-execute assets (re-home follow-up recorded).
- p06-t02 `92cfd169`: optional close-callers in both skills (1.6.0/1.2.0) — schema-exact contracts; reviewer-confirmed safely inert for explainer-less repos (W6-safe).
- p06-t03 `d65bc6af` + continuation `ce473258`/`70dfb97f`/`38e843fb` + fix `ed5ca542`: INSTALLABLE personal-explainer-kit scaffold (SKILL.md, acceptance.mjs with six-test matrix + verified sanitization + schema-asserted publish request, config seams) + migration runbook with fresh-agent executor model (operator decision).
- p06-t04 `c8cf04af`: lockstep 0.2.2 prepared; PUBLISH-HOLD respected.
- Scope-boundary notes (`08e3c516`): W6 runbook + equivalence checklist now bound the zero-regression bar to the 1.4.0+§2 surface; p06 additions = ordinary-defect handling.
- Reviews: round 1 PASS (as-shipped) → extension round 2 FAIL (1 Important: publish-request keys; 1 Minor) → fix → round 3 PASS (1 low-impact Minor recorded: requireKeys presence-vs-undefined, non-blocking).

**Pending externals (not tasks):** ~~acceptance run~~ **RESOLVED 2026-07-19**: fresh-agent acceptance executed against final RC `985d0abd` — ALL SIX GATES PASS (vault, Google Docs, presets, personal-destinations e2e, manifest consumption, rollback); sanitized `private-wrapper-result.json` + verification record landed via cherry-pick of `53fb1d48` (`references/p06-t03-private-wrapper-acceptance-2026-07-19.md`); sanitization spot-check clean; laptop state: packaged 1.0.0 installed, allowPublish re-latched false, 0.4.1 rollback intact. ~~Remaining external: stoa W6 evidence only.~~ **ALL EXTERNALS RESOLVED 2026-07-20**: stoa W6 = ZERO-REGRESSION ACCEPTANCE PASS (packaged 1.6.1/1.2.1 @ cli 0.2.6; 11/11 lanes, 10 round-one passes, 12 conflict-free merges; every 1.4.0+§2 mechanical behavior reproduced; 0.2.1 exec-bit fix verified live; STOP→park→resume and final-gate fix loop first live exercises). Reviews-row observation CLEAN (3 gate rounds, watch never fired) → BL-260718-remove-post-w6-reviews-row archived closed, restore-watch retired from skill text. Report: `references/w6-acceptance-report-2026-07-20.md`. New explainer defect (manifest immutableHashes coverage) routed to the explainer fix batch. NFR1 acceptance criteria: SATISFIED — two independent consumers (stoa W6 + Orc 4-wave program).
SUPERSEDED + FINALIZED (2026-07-19 evening): explainer PR #166 merged; post-merge final RC `7fea9e53` (0.2.6, commit `1f9be47e`, CLI `ec3ff847…`, subtree `2cf98952…` unchanged) FULLY ACCEPTED — wrapper retest + packaged S3/CDN smoke passed first-attempt (canonical evidence + promotion approval: `origin/tkstang/explainer-kit-rc` @ `7bab4f25`; `validate-explainer-acceptance.mjs --gate all` passes). The 985d0abd evidence is historical. Re-home follow-up EXECUTED: interim recipe copy removed (registry copy on main verified byte-identical); execute 1.6.2; lockstep 0.2.7. Environmental note: `release:validate` visual leg fails identically on pristine main on this machine (keyboard-navigation probe, headless Chromium 147) — passes laptop-side per explainer handoff; package leg 5/5 both sides.

---

### Revision Received: GitHub PR #158 Bugbot Review

**Date:** 2026-07-18
**Source:** PR #158 Bugbot comments (4 Medium: 3609070068 fixture grep, 3609072481 sync-commit status, 3609072482 unquoted FILES, 3609163349 stale p06 state)

**New tasks added:** prev1-t01..t03 (Phase p-rev1) — completed 2026-07-18: 57c1ce7f, a7dc345c, 582eeff2; review passed (1 Medium root-fixed: residual stale p06 prose)

**Next:** Execute revision tasks via oat-project-implement.

### Revision Received: stoa W6-migration report

**Date:** 2026-07-18
**Source:** references/w6-migration-report-2026-07-18.md (2 findings: installer exec-bit defect via npm mode-stripping; runbook §2 stale-view gap) + §1 content-verify improvement

**New tasks added:** prev2-t01..t03 — completed same day: 2533d6a0 (chmod fix, both install paths, RED→GREEN on 0644 fixtures), 10481e1a (runbook hardening), f9257c72 (lockstep 0.2.1). Review: round 1 PASS clean; reviewer confirmed the fix would have prevented stoa's defect on both paths.

### Revision Received: Orc first-consumer handoff (signals 1-10)

**Date:** 2026-07-20
**Source:** references/2026-07-20-wave-skills-first-run-handoff.md (4-wave autonomous program, PRs #24-27; fan-in-gate pattern reproduced 4-for-4) + operator recap-disposition observation + log-verified Q&A.

**Shipped (p-rev3, 5 tasks):** gate-row terminal-state fix (S8) `503d034f`; same-shell compound merge guard + append-only fix rounds + --no-commit probe (S5,S7) `f92bc8db`; worktree commit fallback, background gate posture, pipefail, single-writer artifacts (S1-S4) `7e32eac4`; CI waiver + rule-9 second citation + optional-step disposition + versions 1.7.0/1.3.0 `9a8c8a80`; closeout full completion tail (S10) `3f47e5a7`. Reviews: t01-t04 clean; t05 addendum clean. Routed elsewhere: S9 (explainer recap sections) → explainer fix batch; -auto companion → BL-260720-add-oat-project-complete-auto (three-layer firing guard per operator).

### Revision Received: operator program-boundary design (p-rev4)

**Date:** 2026-07-20
**Source:** operator direction — program-scope recap (not per-wave); autonomous archive-tail deferral with ONE human-gated program-end checkpoint.

**Shipped:** `9be02819` (recap default = program close; per-wave deferral dispositions), `ec66872d` (checkpoint + deferral + versions 1.7.1/1.3.1), fix `70d00635` (program recap → program ledger). Review R1 1-Important → R2 clean; the complete-before-merge vs deferred-archive seam explicitly reconciled. Parked with operator: demote BL-260720-add-oat-project-complete-auto.

### Revision Received: W6 recap-defects handoff (p-rev5)

**Date:** 2026-07-20
**Source:** references/w6-recap-defects-handoff-2026-07-20.md (defect 2 HIGH: no content-authoring seam; wave-side ask only — both core defects routed to the explainer batch with report-back requested on the seam interface).

**Shipped:** `8b735858` — caller-owns-prose-authoring paragraphs in both recap-caller sections (insertion-only; run-19af6e55 evidence; two compliant paths; upstream seam cited as pending). Review: bounded round PASS clean. Follow-up pending: update "pending" citation to the concrete seam contract when the explainer batch reports back.

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below._

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

### Run 1 — 2026-07-18 (in progress)

- Branch: `wave-skills-promotion`; Tier 1 (Cursor-native subagents); policy managed/high → `gpt-5.6-sol-high` (enforced, model arg); retry limit 2 (default).
- Phase Outcomes:

| Phase  | Implementer                                                 | Tasks | Review                                                           | Fix loops                                   | Result |
| ------ | ----------------------------------------------------------- | ----- | ---------------------------------------------------------------- | ------------------------------------------- | ------ |
| p01    | oat-phase-implementer-gpt-5-6-sol-high (resumed for fix)    | 4/4   | round 1 FAIL (1 Critical, 1 Important) → round 2 PASS (0/0/0/0)  | 1 (installer mode-preservation, `3aa46d5c`) | pass   |
| p02    | oat-phase-implementer-gpt-5-6-sol-high (resumed for fix)    | 9/9   | round 1 FAIL (1 Important) → round 2 PASS (0/0/0/0)              | 1 (provenance citation restore, `7601d2d6`) | pass   |
| p03    | oat-phase-implementer-gpt-5-6-sol-high (resumed for fix)    | 3/3   | round 1 FAIL (1 Critical) → round 2 PASS (0/0/0/0)               | 1 (owner lines, `2d889c19`)                 | pass   |
| p04    | oat-phase-implementer-gpt-5-6-sol-high (resumed for fix)    | 2/2   | round 1 changes-requested (1 Important) → round 2 PASS           | 1 (ownership wording, `1a6359ec`)           | pass   |
| p05    | oat-phase-implementer-gpt-5-6-sol-high                      | 5/5   | round 1 FAIL (1 Important — root bookkeeping gap) → round 2 PASS | 1 root-side (`1e336990`, impl record)       | pass   |
| p-rev1 | oat-phase-implementer-gpt-5-6-sol-high                      | 3/3   | round 1 PASS (1 Medium, root-fixed inline)                       | 0                                           | pass   |
| p-rev2 | oat-phase-implementer-gpt-5-6-sol-high                      | 3/3   | round 1 PASS (0/0/0/0 — first clean round 1)                     | 0                                           | pass   |
| p06    | oat-phase-implementer-gpt-5-6-sol-high (2 continuations)    | 4/4   | R1 PASS → extension R2 FAIL (1 Important) → R3 PASS              | 1 (`ed5ca542`)                              | pass   |
| p-rev3 | oat-phase-implementer-gpt-5-6-sol-high (1 continuation)     | 5/5   | t01-t04 PASS clean + t05 addendum PASS                           | 0                                           | pass   |
| p-rev4 | oat-phase-implementer-gpt-5-6-sol-high (1 fix continuation) | 2/2   | R1 changes-requested (1 Important) → R2 PASS                     | 1 (`70d00635`)                              | pass   |
| p-rev5 | oat-phase-implementer-gpt-5-6-sol-high (continuation)       | 1/1   | bounded round PASS clean                                         | 0                                           | pass   |

- Dispatch stamps: `Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-gpt-5-6-sol-high` · `Dispatch: scope=p01 action=review role=reviewer producer=oat-phase-implementer-gpt-5-6-sol-high provenance=declared model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`
- Selection reason: native-catalog; candidates: [gpt-5.6-sol-high]. Fix continuation resumed the original implementer handle (continuation event 1); re-review resumed the original reviewer handle (round 2).
- Parallel groups: none (sequential plan).
- Outstanding: round-1 Important (implementation.md evidence) resolved by this bookkeeping entry.

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-18

**Session Start:** 11:25 CDT

- Preflight: Tier 1 (Cursor-native subagents, available without auth); dispatch policy managed/high → `gpt-5.6-sol-high` (enforced).
- HiLL: `['p05','p06']` per-delta final interpretation of `hillCheckpointDefault: final` (p06 gated); auto-review enabled.

**Blockers:**

- (resolved 2026-07-18) Phase 6 RC gate opened and phase completed; see Phase 6 section.

### Phase 2 queue traceability (implementer-provided)

| Item | Description                                                                     | Commit SHA                                 |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| 1    | Scaffold placeholder handling is verify-only on oat ≥0.1.65.                    | `52c59aa8bd4831ee9e106092da17f017b6c64dce` |
| 2    | Every merge is preceded by mandatory cwd and branch assertions.                 | `98267802ec7ebbf2d0e074856c941e3dd9922cc9` |
| 3    | Bootstrap verifies provider-view parity and choreography inspects sync commits. | `1ef49623f96a99800ac079fe6954469479d0e769` |
| 4    | Integration gates after every fan-in are a named standing rule.                 | `db8b28a08506363a4252d6f2f6b0a0c2d3506491` |
| 5    | Every fix disposition produces a stored verification record.                    | `d6440606a3384c6b08b36a2747c72c8296a8470a` |
| 6    | Fix continuations prefer resuming the live original implementer handle.         | `4b32c611423fdbfcfe221f0594e408abcbefdf36` |

---

## Deviations from Plan / Design

| Task / Review | Source Artifact | Planned / Documented                                 | Actual / Accepted                                 | Reason                                               | Source of Truth    | Follow-up                                             |
| ------------- | --------------- | ---------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ------------------ | ----------------------------------------------------- |
| HiLL config   | plan.md         | `final` = literal final phase (p06)                  | `['p05','p06']` — final phase per mergeable delta | p06 is RC-gated; literal reading = 0 pauses this run | plan.md            | none                                                  |
| p02-t09       | plan.md         | re-sync commits wave-view changes                    | verified no-op (symlinked views; sync idempotent) | text edits flow through symlinked views              | Phase 2 notes      | none                                                  |
| p06-t01       | plan.md         | recipe under `.agents/skills/explainer-kit/recipes/` | interim home under `oat-wave-execute/assets/`     | explainer-kit Phase 3 has not merged yet             | p06 gate-open plan | re-home the recipe after explainer-kit Phase 3 merges |

## Test Results

| Phase | Tests Run                                                                                                | Passed | Failed | Coverage |
| ----- | -------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| 1     | CLI suite 3001 tests (250 files) + 2 new regression tests; lint; type-check                              | all    | 0      | n/a      |
| 2     | lint + type-check + bash-3.2 + citation-set + asset byte-diffs                                           | all    | 0      | n/a      |
| 3     | CLI suite 3002 tests + lint + type-check + pjm lifecycle checks                                          | all    | 0      | n/a      |
| 4     | docs build (build:docs) x3 runs + content rg checks                                                      | all    | 0      | n/a      |
| 5     | release:validate + lint + type-check + tests (123 smoke) + fixture both legs ×2 (implementer + reviewer) | all    | 0      | n/a      |

## Final Summary (for PR/docs)

_Covers the phases 1–5 mergeable delta. Phase 6 (explainer integration) is
RC-gated and ships as a separate, separately-versioned PR when the
explainer-kit v1 RC exists._

**What shipped:**

- `oat-wave-execute` 1.5.0 and `oat-wave-program` 1.1.0 as canonical workflow-pack skills (`.agents/skills/`), promoted from stoa's dogfooded 1.4.0/1.0.0 with all six §2 queue items applied (one traceable commit each) and stoa-isms genericized under a 69-row behavioral-equivalence checklist — no rule deleted or weakened.
- Toolkit integration: pack manifest + bundle registration (bundle-consistency-tested), provider views for claude/cursor, codex native-read.
- Also in this branch (disclosed): 24 oat-managed cursor dispatch-variant agent roles (`.cursor/agents/oat-{phase-implementer,reviewer}-*`, ~9k generated lines, commit `08d7b205`) — supported-catalogue materializations produced by `oat sync --scope all` on CLI 0.1.73 during p02, committed root-side as managed sync state (siblings of the already-tracked base roles; sync is idempotent-clean after tracking them). Verification: `oat sync` re-run reports "No changes required"; these are generated managed views, not hand-authored code.
- Installer bug fix exposed by the port: `copyDirectory` now preserves file modes (fresh installs previously stripped the execute bit from nested skill scripts); 2 regression tests.
- validate-plan now documents the singleton-group rule + ungrouped-phase alternative (message + help, TDD).
- 12 durable backlog dispositions: every packet §3 row traceable (wave CLI family, artifact-format contract, bootstrap-group TS rewrite, post-W6 watch removal, tracked-config guard archived `wont_do` with root cause); upstream triage (2 closed-as-fixed, verified; 3 filed with fresh evidence); 2 docs-CLI defects found live during p04.
- Wave-workflow docs page with authored navigation and a descriptive (explicitly non-contract) execution-program artifact format section.
- Mini-wave validation fixture (bash-3.2, toggleable-fail DoD gate) + documented dry-run procedure; dry-run EXECUTED green on both legs against the promoted skills with zero skill defects.
- Lockstep release bumps 0.1.73 → 0.2.0 across the five public packages + regenerated version asset; W6 handoff mini-runbook (version pin, migration sequence, row-stomp observation task, regression protocol).

**Behavioral changes (user-facing):**

- Workflow pack installs two new skills; installed nested skill scripts retain execute permissions; validate-plan singleton rejection message/help expanded.

**Key files / modules:**

- `.agents/skills/oat-wave-execute/**`, `.agents/skills/oat-wave-program/**` — the promoted skills
- `packages/cli/src/fs/io.ts` — mode-preservation fix
- `packages/cli/src/commands/project/validate-plan/**` — singleton guidance
- `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`, `packages/cli/scripts/bundle-assets.sh` — registration
- `apps/oat-docs/docs/**` wave-workflow page; `.oat/repo/pjm/backlog/**` dispositions

**Verification performed:**

- Per-phase: root-owned reviews (each phase 1 bounded fix round → pass); p05 cross-runtime gate (codex, 2 rounds → pass).
- Fixture dry-run: happy + unhappy legs, twice (implementer + reviewer re-execution).
- Repo gates: `pnpm release:validate`, tests (CLI 3002 + workspace suites + 123 smoke), lint, type-check, build, docs build — all green; origin/main merged mid-run with green fan-in gates.

**Design deltas:**

- p02-t09 re-sync was a verified no-op (provider views are symlinks) — recorded in Deviations.
- HiLL `final` interpreted per mergeable delta (`['p05','p06']`) — recorded in Deviations.
- Fixture-only hygiene fixes during dry-run (node_modules ignore, lockfile normalization); no repo-behavior drift.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
- **plan:** ---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-18
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: [] # confirmed sequential (operator declined p03/p04 parallel group)
oat_plan_hill_phases: ['p05', 'p06'] # from workflow.hillCheckpointDefault=final: p05 ends this run's mergeable delta; p06 is a separately merged RC-gated delta
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_phase_review_gate:
  enabled: true
  phases: ['p05'] # operator choice: cross-runtime gate at end of implementation only (p06 is RC-gated, merges separately)
  review_type: code
  exit_nonzero_on: important
oat_plan_source: spec-driven # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: wave-skills-promotion

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Upstream `oat-wave-execute` (→1.5.0) and `oat-wave-program` (→1.1.0) from stoa into the workflow pack with the §2 queue applied, stoa-isms genericized, every §3 row dispositioned, docs + fixture validation, and an RC-gated explainer-integration phase.

**Architecture:** Prose skills ported via a four-pass commit choreography (verbatim A → queue B1–B6 → genericization C → conventions D) with a behavioral-equivalence checklist as the zero-regression enforcement artifact. Toolkit touchpoints: pack manifest, bundle script, validate-plan help, docs app, pjm backlog.

**Tech Stack:** Markdown skills + bash 3.2 script; TypeScript (manifest/validate-plan edits); Fumadocs; pnpm/Turborepo.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter (sequential — operator confirmed)
- [x] Phase gate review configured (selected: p05 — end-of-implementation cross-runtime gate)

---

## Parallelism

Candidate: `p03` (CLI help + backlog files) and `p04` (docs app) are file-disjoint. Declared only on user confirmation; default sequential.

---

RED/GREEN/Refactor is the recommended default where work is testable, not a validator requirement. Prose/skill-text tasks use edit → verify → commit shape with concrete verification commands.

## Phase 1: Port + toolkit integration (FR1, FR4, NFR4)

**Goal:** both skills installable from the workflow pack, verbatim vs the frozen sources.

### Task p01-t01: Verbatim copy of both skill sources (commit A)

**Files:**

- Create: `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`, `.agents/skills/oat-wave-execute/assets/wrapper-plan-template.md`, `.agents/skills/oat-wave-execute/assets/orchestration-log-template.md`
- Create: `.agents/skills/oat-wave-program/SKILL.md`, `.agents/skills/oat-wave-program/assets/execution-program-template.md`

**Step 1: Copy**

Copy the six files byte-for-byte from `.oat/projects/shared/wave-skills-promotion/references/skill-sources/`. Preserve the execute bit on `bootstrap-group.sh` (`chmod +x`).

**Step 2: Verify**

Run: `diff -r .oat/projects/shared/wave-skills-promotion/references/skill-sources/oat-wave-execute .agents/skills/oat-wave-execute && diff -r .oat/projects/shared/wave-skills-promotion/references/skill-sources/oat-wave-program .agents/skills/oat-wave-program && test -x .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`
Expected: no diff output; exit 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute .agents/skills/oat-wave-program
git commit -m "feat(p01-t01): port oat-wave-execute + oat-wave-program verbatim from stoa"
```

---

### Task p01-t02: Register skills in pack manifest + bundle script (RED→GREEN)

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-assets.sh`

**Step 1: Manifest edit (RED)**

Add `'oat-wave-execute'` and `'oat-wave-program'` to `WORKFLOW_SKILLS` (alphabetical position: after `oat-worktree-bootstrap-auto`, before `oat-wrap-up`).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: FAIL — manifest lists skills absent from `bundle-assets.sh` (proves the consistency guard sees the change). If the test file lives elsewhere, locate via `rg -l "bundle-consistency" packages/cli/src`.

**Step 2: Bundle-script edit (GREEN)**

Add `oat-wave-execute` and `oat-wave-program` to the `SKILLS=(...)` array (keep the existing grouping order).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts && pnpm --filter @open-agent-toolkit/cli test`
Expected: consistency test passes; full CLI suite green.

**Step 3: Commit (one atomic manifest+bundle change)**

```bash
git add packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/scripts/bundle-assets.sh
git commit -m "feat(p01-t02): register wave skills in workflow pack manifest + bundle"
```

_(Task ID p01-t03 intentionally unused — merged into p01-t02 during plan review; IDs stay stable, monotonicity preserved.)_

---

### Task p01-t04: Generate provider views

**Files:**

- Create: provider views under `.claude/skills/`, `.codex/`, `.cursor/` (tool-managed)
- Modify: `.oat/sync/manifest.json` (tool-managed)

**Step 1: Sync**

Run: `oat sync --scope all` (fallback: `pnpm run cli -- sync --scope all`).

**Step 2: Verify (all configured providers, manifest-derived)**

Run: `rg -n "oat-wave-execute|oat-wave-program" .oat/sync/manifest.json && ls .claude/skills/oat-wave-execute/SKILL.md .claude/skills/oat-wave-program/SKILL.md`
Then assert every provider view path the manifest records for both skills exists (check `.codex` and `.cursor` entries explicitly — do not stop at Claude). Fail on any absent path.
Also run: `git status --short` and inspect for unrelated deletions (B3's own failure class) before staging.

**Step 3: Commit (stage only verified sync-managed paths; no error suppression)**

```bash
git add .oat/sync/manifest.json
git add <the exact provider-view paths verified in Step 2>
git commit -m "chore(p01-t04): sync provider views for wave skills"
```

---

### Task p01-t05: Fresh-install verification (real install, not bundle inspection)

**Files:** none in-repo (verification only; temp dir); result recorded in `implementation.md`

**Step 1: Build + bundle (prerequisite check)**

Run: `pnpm build && bash packages/cli/scripts/bundle-assets.sh && test -x packages/cli/assets/skills/oat-wave-execute/scripts/bootstrap-group.sh && test ! -d packages/cli/assets/skills/oat-wave-execute/tests`
Expected: bundle contains both skills; script executable; tests dir stripped.

**Step 2: Fresh install into an isolated temp repo (FR1 acceptance path)**

Materialize an empty temp repo (`mktemp -d`, `git init`), then run the BRANCH-LOCAL CLI's non-interactive workflow-pack install against it (e.g. `pnpm run cli -- tools install workflows --scope project` with cwd in the temp repo, or the current `init tools` equivalent — verify exact command via `pnpm run cli -- help` first).

**Step 3: Assert installed materialization**

In the temp repo, assert: both skill trees present with SKILL.md, all asset templates (2 execute + 1 program), `bootstrap-group.sh` present WITH execute bit, and provider views generated for every provider enabled in the temp repo's config after `oat sync`.
Expected: all assertions pass; cleanup temp dir.

**Step 4: Record**

No repo commit (verification-only). Record the install evidence (commands, assertions, result) in `implementation.md` phase notes.

---

## Phase 2: §2 queue + genericization (FR2, FR3, FR4, NFR3)

**Goal:** promoted text = 1.4.0 + queue, repo-neutral; one commit per queue item for traceability.

### Task p02-t01: Queue item 1 — Step 3.2 becomes verify-only (B1)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

Rewrite Process Step 3.2: scaffold-placeholder handling becomes a verification guard on oat ≥ 0.1.65 (check placeholders are already substituted; fix only on unexpected survivors), keeping the lifecycle-advance and wave-specific values as orchestrator-owned edits.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && git diff .agents/skills/oat-wave-execute/SKILL.md`
Expected: full diff shows changes confined to the Step 3.2 region (visual confirm).

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t01): queue item 1 - scaffold placeholder check verify-only on oat >= 0.1.65"
```

---

### Task p02-t02: Queue item 2 — pre-merge cwd/branch assert (B2)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

In merge choreography (Step 5) add: mandatory `pwd` + `git branch --show-current` assertion immediately before EVERY `git merge`, with the wave-5 wrong-branch-via-cwd-persistence evidence note.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && git diff .agents/skills/oat-wave-execute/SKILL.md`
Expected: full diff shows changes confined to the merge-choreography region (visual confirm).

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t02): queue item 2 - mandatory pwd+branch assert before every merge"
```

---

### Task p02-t03: Queue item 3 — view-parity guard + sync-commit inspection (B3)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`
- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Script edit (bash-3.2 only — no mapfile/declare -A)**

Add a `verify_view_parity()` function to `bootstrap-group.sh`: compare provider-view file lists between the new worktree and the root checkout after the worktree's sync; emit a structured `STATUS view-parity=<ok|MISMATCH>` line; on mismatch print the diagnostic comparing `node_modules/.bin/oat --version` (if present) vs `oat --version`.

**Step 2: Skill-text edit**

Merge choreography: add sync-commit content inspection before dispatch. Frame per the design amendment — a regression guard for the named stale-local-binary failure class (stale locally-resolved CLI shadowing the global thrashes managed files), with the version-compare diagnostic. Do not imply an unexplained toolkit corruption bug.

**Step 3: Format + Verify**

Run: `/bin/bash --version | head -1 && /bin/bash -n .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh && pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && rg -n "mapfile|declare -A" .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh | wc -l`
Expected: interpreter reports 3.2.x (macOS system bash — log the version as evidence); syntax OK under it; zero bash-4 constructs. Runtime execution under `/bin/bash` is exercised by the p05 dry-run.

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t03): queue item 3 - provider-view parity guard + sync-commit inspection"
```

---

### Task p02-t04: Queue item 4 — named fan-in gate rule (B4)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

Promote "integration gates after every fan-in" from practice to a numbered standing rule (rule 10): the only detector for cumulative-timing defect classes; never skip on an all-lanes-passed wave; cite the W5 embed-teardown catch.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && rg -n "fan-in" .agents/skills/oat-wave-execute/SKILL.md`
Expected: rule present in the Standing Rules list.

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t04): queue item 4 - fan-in integration gates as named standing rule"
```

---

### Task p02-t05: Queue item 5 — stored verification record for every fix disposition (B5)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

Fix-loop guidance: every fix disposition — including root-verified bounded fixes — produces a minimal stored verification record (what was verified, how, where recorded); cite the W5 final-gate audit-gap evidence.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && rg -n "verification record" .agents/skills/oat-wave-execute/SKILL.md`
Expected: requirement present.

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t05): queue item 5 - stored verification record for fix dispositions"
```

---

### Task p02-t06: Queue item 6 — resumed-handle continuation note (B6)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

Docs note in the fix-loop/dispatch guidance: prefer resuming the original implementer handle for fix continuations while it is alive (cheaper, retains design context); fresh same-target agent only when the handle is gone.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md`
Expected: clean.

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "docs(p02-t06): queue item 6 - prefer resumed implementer handle for fix continuations"
```

---

### Task p02-t07: Genericization pass + equivalence checklist (commit C)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`
- Create: `.oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md`

**Step 1: Build the checklist skeleton FIRST**

One row per standing rule / process step / inherited invariant across both skills, columns: `source text (cite) | promoted text | intent preserved? | divergence rationale`. Seed from the frozen sources before editing.

**Step 2: Genericize (design component 2 inventory)**

Neutral phrasing per the design: pnpm/nvm/better-sqlite3/oxfmt/lint-staged/`.codex`-trust/DoctorJsonResponse/lane-addenda items → "the repo's DoD gates / formatter / env setup / provider-conditional guidance", stoa specifics kept as parenthetical evidence examples; stoa DR/BL slugs kept as citations noted as living in the source program's repo. Never delete a rule; fill each checklist row as edited.

**Step 3: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md .oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md && rg -c "intent preserved" .oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md`
Expected: checklist has a row for every rule (spot-check count vs the 9+ standing rules + inherited invariants + program contract items).

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md .oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md
git commit -m "feat(p02-t07): genericize stoa-isms with behavioral-equivalence checklist"
```

---

### Task p02-t08: Convention alignment + versions (commit D)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`
- Modify: `.oat/projects/shared/wave-skills-promotion/implementation.md` (traceability table — FR2's verification artifact)

**Step 1: Edit**

Remove "repo-local dogfood draft" status prose and the stoa decision-record slug from the frontmatter `description:` (keep body citations); set `version: 1.5.0` (execute) and `version: 1.1.0` (program); align frontmatter fields with toolkit skill conventions (compare against `oat-project-implement`'s frontmatter). Commit body records the release-collapse: ledger items tagged 1.4.1 (items 1–2) and 1.5.0 (items 3–5) land together as 1.5.0.

**Step 1b: Record queue-item traceability table**

Append the six-row queue-item ↔ commit traceability table (item # + one-line description + commit SHA from p02-t01..t06, or written rejection rationale) to `implementation.md` phase notes — this is FR2's verification artifact.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md .oat/projects/shared/wave-skills-promotion/implementation.md && head -8 .agents/skills/oat-wave-execute/SKILL.md && head -8 .agents/skills/oat-wave-program/SKILL.md && pnpm lint`
Expected: versions 1.5.0 / 1.1.0; no "dogfood draft" strings remain (`rg -n "dogfood" .agents/skills/oat-wave-*` → empty); `implementation.md` contains six distinct queue rows, each with a resolvable SHA or a written rejection rationale (no placeholder cells).

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md .oat/projects/shared/wave-skills-promotion/implementation.md
git commit -m "feat(p02-t08): toolkit conventions + versions 1.5.0/1.1.0

Release-collapse note: stoa ledger items queued as 1.4.1 (scaffold
verify-only, pre-merge assert) and 1.5.0 (view-parity, fan-in rule,
verification records) land together as 1.5.0 so ledger citations resolve."
```

---

### Task p02-t09: Re-sync provider views after text passes

**Files:**

- Modify: provider views (tool-managed)

**Step 1: Sync + Verify**

Run: `oat sync --scope all && git status --short`
Expected: only wave-skill views changed; no unrelated deletions.

**Step 2: Commit**

```bash
git add -- .claude .codex .cursor .oat/sync/manifest.json 2>/dev/null || true
git commit -m "chore(p02-t09): re-sync provider views after queue + genericization passes"
```

---

## Phase 3: Dispositions (FR5, FR6, FR7)

**Goal:** every §3 row dispositioned durably; 10 backlog items accounted for.

### Task p03-t01: validate-plan singleton-group guidance (TDD)

**Files:**

- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.test.ts`
- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.ts`
- Modify: `packages/cli/src/commands/project/validate-plan/index.ts` (help text, if description lives there)

**Step 1: Write test (RED)**

Extend the singleton-rejection test: error message must include the alternative, e.g. match `/run a solo lane as an ungrouped phase/`. Add/extend a help-output test asserting the rule is stated.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan/validate-plan.test.ts`
Expected: FAIL (RED).

**Step 2: Implement (GREEN)**

Extend the existing rejection string (validate-plan.ts ~line 75): `singleton groups are not allowed — run a solo lane as an ungrouped phase (ungrouped phases execute sequentially in plan order)`. Add the same rule to the command help description.

Run: same test command.
Expected: PASS (GREEN).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm type-check`
Expected: green.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/validate-plan/
git commit -m "feat(p03-t01): document singleton-group rule + ungrouped alternative in validate-plan"
```

---

### Task p03-t02: File deferred-work backlog items (5 items)

**Files:**

- Create: 5 items under `.oat/repo/pjm/backlog/` (+ regenerate index per backlog conventions)

**Step 1: Create items via `oat backlog new`** (follow `oat-pjm-add-backlog-item` conventions)

1. `oat wave new/refresh/close` CLI family — grouped with item 2; trigger: operator prioritization after W6.
2. Execution-program artifact format as stable OAT contract — grouped with item 1; trigger: second consumer (wave CLI or recap recipe).
3. `oat worktree bootstrap-group` TS command — rationale from design (proven bash ports as-is; rewrite later).
4. Post-W6 reviews-row restore-watch removal — trigger: W6 clean final-gate observation reported back via the mini-runbook.
5. Tracked-config guard — rejected: root-caused to stale local binary in consuming repo; cure is dependency hygiene there; CLI guard unnecessary.

**Step 2: Archive the rejected item per the PJM terminal lifecycle**

Active `backlog/items/` is for active work only. Immediately archive item 5:
Run: `oat backlog archive <item-5-id> --wont-do --summary "root-caused to stale locally-resolved CLI in consuming repo; dependency hygiene there is the cure; CLI-level guard unnecessary"`
Expected: item 5 moved to `backlog/archived/` with terminal `wont_do`; index + completed ledger regenerated by the command.

**Step 3: Verify**

Run: `oat pjm doctor && git status --short .oat/repo/pjm/`
Expected: doctor clean; items 1–4 in active backlog, item 5 archived; only produced files modified. Resolve the exact created paths from the git status output.

**Step 4: Commit (stage only the produced files)**

```bash
git add <exact item files, archived item path, regenerated index/ledger files from Step 3>
git commit -m "docs(p03-t02): file deferred-work backlog items for wave-skills promotion"
```

---

### Task p03-t03: Triage upstream feedback (4 items) + sync version-stamp candidate (1 item)

**Files:**

- Create/modify: items under `.oat/repo/pjm/backlog/`

**Step 1: Triage each against current main before filing**

1. Configurable per-target gate timeout — check gate config surface (`rg -n "timeout" packages/cli/src/commands/gate/ | head`); file or close-with-rationale.
2. Runbook verify-commands pass (doc drift) — file with ledger evidence.
3. `--scope all` flag-placement drift — check current arg parsing; file or close.
4. Resolver `--candidate-model`/`--preferred` conflict — check resolver flags; file or close (untracked since wave-0).
5. NEW: `oat sync` warns when invoking binary version ≠ version that produced the last sync (stamp CLI version in sync manifest) — evidence: root-caused stale-binary thrash class.

**Step 2: Verify**

Run: `git status --short .oat/repo/pjm/backlog/ | wc -l && pnpm exec oxfmt --write .oat/repo/pjm/`
Expected: ~5 new-or-modified records for this task (p03-t02's 5 items are already committed); 10 total dispositions across p03-t02/t03 verifiable via `git log --oneline -- .oat/repo/pjm/backlog/` or the backlog index.

**Step 3: Commit (stage only the produced files)**

```bash
git add <exact item files + regenerated index files from Step 2's git status>
git commit -m "docs(p03-t03): triage upstream feedback + file sync version-stamp candidate"
```

---

## Phase 4: Docs (FR8)

**Goal:** wave workflow documented; docs build green.

### Task p04-t01: Wave-workflow docs page + authored navigation

**Files:**

- Create: docs leaf page under `apps/oat-docs/docs/` (exact location per `apps/oat-docs/AGENTS.md` conventions — read it first)
- Modify: the nearest authored `index.md` (`## Contents` link — the docs contract makes unlisted pages invisible to navigation)

**Step 1: Author the leaf page**

Required frontmatter: `title` + `description`. Sections: what waves are (program layer over per-project lifecycle); the two skills and their split; mechanical/judgment ownership boundary; composition with `oat-project-implement` (wrapper projects, worktree groups); descriptive execution-program artifact format section with the explicit "documented, NOT a stable contract" note and pointer to the contract+CLI backlog grouping.

**Step 2: Wire authored navigation**

Add a `.md`-suffixed link for the new page to the nearest authored `index.md` `## Contents` map, then run `oat docs nav sync`.

**Step 3: Format + Verify**

Run: `pnpm exec oxfmt --write <leaf page path> <authored index path> && rg -n "not a stable contract" apps/oat-docs/docs/ -i && rg -n "<leaf-page-filename>" <authored index path>`
Expected: note present; Contents link present.

**Step 4: Commit (exact files, not the whole app)**

```bash
git add <leaf page path> <authored index path> <nav-sync outputs if any>
git commit -m "docs(p04-t01): add wave-workflow documentation"
```

---

### Task p04-t02: Regenerate docs index + build

**Files:**

- Modify: `apps/oat-docs/index.md` (generated — never hand-edit)

**Step 1: Regenerate + build**

Run: `oat docs generate-index && pnpm build:docs`
Expected: index includes the new page; build green.

**Step 2: Commit**

```bash
git add apps/oat-docs/index.md
git commit -m "docs(p04-t02): regenerate docs index for wave workflow page"
```

---

## Phase 5: Validation + release readiness (FR9, NFR1, NFR2, NFR3)

**Goal:** pre-W6 confidence + shippable release.

### Task p05-t01: Fixture tree + setup script

**Files:**

- Create: `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh`
- Create: `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/fixture/` (tiny source tree, 3 toy plans, plan index, minimal `.oat/` scaffolding, no-op DoD gate script)

**Step 1: Author `setup-fixture.sh` (bash-3.2; `set -euo pipefail`)**

Functions: `materialize()` (copy fixture tree to `$TMPDIR/mini-wave-<ts>`, `git init` + initial commit), `main()` (arg parse, print fixture path). DoD gate script honors `FIXTURE_GATE_FAIL=1` → exit 1 (the toggleable unhappy path). Plans: p01+p02 write-disjoint (group candidates), p03 ungrouped solo finale.

**Step 2: Verify**

Run: `/bin/bash --version | head -1 && /bin/bash -n .agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh && /bin/bash .agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh && rg -n "mapfile|declare -A" .agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh | wc -l`
Expected: interpreter reports 3.2.x (log as evidence); syntax + full execution succeed under `/bin/bash`; materializes under `$TMPDIR`; zero bash-4 constructs.

**Step 3: Verify bundle exclusion**

Run: `bash packages/cli/scripts/bundle-assets.sh && test ! -d packages/cli/assets/skills/oat-wave-execute/tests`
Expected: exit 0 (tests dir stripped).

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/tests/
git commit -m "feat(p05-t01): add mini-wave validation fixture with toggleable DoD gate"
```

---

### Task p05-t02: Dry-run procedure README

**Files:**

- Create: `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md`

**Step 1: Author the agent-executed procedure**

Steps: setup → `oat-wave-program new` (assert coverage invariant: 3 plans ↔ 3 rows) → compose wave (p01+p02 group, p03 ungrouped) → `oat-wave-execute` happy path (bootstrap script STATUS lines incl. view-parity, briefs, merges with pre-merge asserts, fan-in gate) → unhappy leg (`FIXTURE_GATE_FAIL=1` → verify fix-loop bookkeeping/park semantics + stored verification record) → `wave-close` (ledger row flips, PR/SHA recorded). Each step lists its pass criteria.

**Step 2: Format + Commit**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md`

```bash
git add .agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md
git commit -m "docs(p05-t02): document mini-wave dry-run procedure with unhappy-path leg"
```

---

### Task p05-t03: Execute the dry-run + record results

**Files:**

- Modify: `.oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md` (dry-run outcome column/section)
- Create: dry-run record in `implementation.md` phase notes

**Step 1: Execute** the README procedure end-to-end (happy + unhappy legs) against the PROMOTED skills.

**Step 2: Disposition findings**

Fix skill-text/script defects found (amend via normal task-fix flow); record each finding + fix in the dry-run record.

**Step 3: Verify**

Both legs pass on re-run. Run: `pnpm exec oxfmt --write .oat/projects/shared/wave-skills-promotion/`

**Step 4: Commit**

```bash
git add .oat/projects/shared/wave-skills-promotion/ .agents/skills/oat-wave-execute .agents/skills/oat-wave-program
git commit -m "test(p05-t03): mini-wave dry-run executed - findings dispositioned"
```

---

### Task p05-t04: Lockstep version bumps + release validation

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json` (generated by `bundle-assets.sh` from the bumped manifests; published in the CLI's assets dir)

**Step 1: Bump** all five public packages together (bundled assets = shipped CLI functionality), then regenerate the bundle: `bash packages/cli/scripts/bundle-assets.sh`.

**Step 2: Verify**

Run: `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test && git status --short packages/`
Expected: all green; `public-package-versions.json` records the bumped versions (spot-check vs the five manifests); no expected release artifact left unstaged after Step 3.

**Step 3: Commit (exact declared files)**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p05-t04): lockstep public package bumps for wave skills release"
```

---

### Task p05-t05: W6 handoff mini-runbook

**Files:**

- Create: `.oat/projects/shared/wave-skills-promotion/references/w6-handoff-runbook.md`

**Step 1: Author** (design amendment — runbook, not note)

1. Exact released package version placeholder + instruction to pin it in stoa's W6 program artifact for provenance.
2. Migration sequence: delete repo-local skill copies → `oat tools update` → `oat sync`.
3. Row-stomp observation task: W6 operator logs the final-gate Reviews-row observation and reports back → closes the deferred watch-removal backlog item.
4. Regression protocol: on any W6 behavioral divergence, diff the equivalence-checklist row, restore source phrasing, patch release.

**Step 2: Format + Commit**

Run: `pnpm exec oxfmt --write .oat/projects/shared/wave-skills-promotion/references/w6-handoff-runbook.md`

```bash
git add .oat/projects/shared/wave-skills-promotion/references/w6-handoff-runbook.md
git commit -m "docs(p05-t05): W6 handoff mini-runbook"
```

---

## Phase 6: §4 explainer integration (FR10) — RC GATE OPEN (f212d630)

**Goal:** program-recap recipe + close-callers + personal-wrapper migration support against the frozen RC.

> **GATE STATUS (2026-07-18): OPEN.** RC `sha256:f212d630…50b854` @ frozen commit `534a408e` verified (record self-consistency; 4/5 tarballs byte-match a pristine rebuild; all 11 schemas+recipes and both skill hashes match; CLI whole-tarball divergence reported upstream, confined outside explainer surfaces). Frozen build inputs are vendored at `references/explainer-rc-f212d630/` — build ONLY against those copies, never the explainer-kit source tree. Operator sequencing: p06 → operator acceptance → RC promotes → publish 0.2.1 (HOLD until then).
>
> Task bodies below were refined at gate-open (2026-07-18) per the mandatory checkpoint; phase-scoped plan re-review required before execution.

### Task p06-t01: program-recap recipe

**Files:**

- Create: `.agents/skills/oat-wave-execute/assets/program-recap.recipe.json` (the task's ONLY output — pure `explainer-kit.recipe/v1` JSON, no comment fields). Context: the final home `.agents/skills/explainer-kit/recipes/` arrives with explainer-kit's Phase-3 merge; record the interim-home deviation and the re-home follow-up in `implementation.md`'s Deviations table + the follow-up ledger, never inside the JSON.

**Step 1: Author** in `explainer-kit.recipe/v1` format matching the frozen schema (`references/explainer-rc-f212d630/schemas/recipe.schema.json` if present, else validate structurally against the three vendored recipe examples): `schemaVersion: "explainer-kit.recipe/v1"`, `id: "program-recap"`, `version: "1"`, `sourceRoles`: one required `program` role (accepts file/directory/git; `minBindings: 1`, `maxBindings: 1` — one program source set containing the program artifact + wave records), `requiredNarrative`: program-shape sections (program-overview, wave-map, per-wave-outcomes, convention-evolution, aggregate-numbers, follow-up-ledger), `artifacts`: one required hub (`id: "program-recap"`, `type: "hub"`, `template: "house-style"`, `required: true`), `discoveryLimits` mirroring project-recap (2 consecutive no-new-findings rounds, max 8). Reference implementation: the stoa program deck (packet §4); the vendored `project-recap.json` is the structural template.

**Step 2: Verify** — run exactly:

```bash
python3 - <<'PY'
import json
new = json.load(open('.agents/skills/oat-wave-execute/assets/program-recap.recipe.json'))
ref = json.load(open('.oat/projects/shared/wave-skills-promotion/references/explainer-rc-f212d630/recipes/project-recap.json'))
assert new['schemaVersion'] == 'explainer-kit.recipe/v1', new['schemaVersion']
assert set(new) == set(ref), (set(new) ^ set(ref))
assert set(new['sourceRoles'][0]) == set(ref['sourceRoles'][0])
assert set(new['artifacts'][0]) == set(ref['artifacts'][0])
assert set(new['discoveryLimits']) == set(ref['discoveryLimits'])
print('recipe shape OK: key sets match vendored explainer-kit.recipe/v1')
PY
```

Expected: `recipe shape OK`.

**Step 3: Commit** — `feat(p06-t01): add program-recap explainer recipe (explainer-kit.recipe/v1)`

---

### Task p06-t02: wave-close / program-close explainer callers

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md` (closeout step 8 gains the optional explainer caller)
- Modify: `.agents/skills/oat-wave-program/SKILL.md` (wave-close mode + a new program-close note gain the caller)

**Step 1: Author caller sections (mechanical-layer only — judgment stays with the orchestrator):**

- The ORCHESTRATOR synthesizes the fact base (judgment); the skill text specifies the mechanical contract: fact base conforms to `explainer-kit.fact-base/v1` (required keys exactly: `schemaVersion, generatedAt, mode, freshnessPolicy, sources, claims, unresolvedClaims, overrides`), sourced from the reconciled program artifact + wave summaries + completion records.
- Invocation: construct an `explainer-kit.run-request/v1` document (required keys exactly: `schemaVersion, recipe, slug, outputRoot, factBase, mode`) with `recipe: { "id": "program-recap", "version": "1" }` (the schema requires an OBJECT with exactly id+version), `factBase` as a supplied binding per the schema's factBaseBinding def — required keys `mode, freshnessPolicy` with `mode: "supplied"` plus `path` pointing at the synthesized fact-base file — and `outputRoot: .oat/repo/explainers/<slug>/`.
- Consumption: the skill reads back `explainer-kit.manifest/v1` (required keys: `schemaVersion, runId, slug, recipe, createdAt, source, theme, artifacts, immutableHashes, outcome, buildRecord, warnings`) and records `runId` + `outcome` in the wave/program ledger row.
- Publishing stays HUMAN-GATED (destination-contract.md); the caller never invokes publish.
- Frontmatter versions: execute → 1.6.0, program → 1.2.0 (separate minor; §4 delta independently revertible).

**Step 2: Verify** — run exactly:

```bash
python3 - <<'PY'
import json, re
base = '.oat/projects/shared/wave-skills-promotion/references/explainer-rc-f212d630/schemas/'
expect = {
  'explainer-kit.fact-base/v1': json.load(open(base+'fact-base.schema.json'))['required'],
  'explainer-kit.run-request/v1': json.load(open(base+'run-request.schema.json'))['required'],
  'explainer-kit.manifest/v1': json.load(open(base+'manifest.schema.json'))['required'],
}
text = open('.agents/skills/oat-wave-execute/SKILL.md').read() + open('.agents/skills/oat-wave-program/SKILL.md').read()
for sid, req in expect.items():
    assert sid in text, f'missing schema id {sid}'
    joined = ', '.join(req)
    assert joined in text.replace('`',''), f'required-key list drift for {sid}: expected "{joined}"'
print('schema ids + required-key lists match vendored schemas')
PY
rg -n "\[JUDGMENT\]" .agents/skills/oat-wave-program/SKILL.md | wc -l
```

Expected: match message printed; `[JUDGMENT]` count unchanged from pre-edit (2). Then `pnpm exec oxfmt --write` both files; `pnpm lint`.

**Step 3: Re-sync** — `oat sync --scope all`; verify no unrelated changes.

**Step 4: Commit** — `feat(p06-t02): explainer close-callers in wave skills (1.6.0/1.2.0)`

---

### Task p06-t03: Personal-wrapper migration support

**Scope extension (operator-confirmed via stoa Flag 2, 2026-07-18):** p06 ships the migration CODE as installable artifacts, not runbook-only — the wrapper source and personal credentials live on the operator's laptop, so the repo authors a complete scaffold with clearly-marked personal-config seams the operator fills at install.

**Files:**

- Create: `.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/` — the INSTALLABLE wrapper skill tree: `SKILL.md` (thin personal wrapper over the packaged `oat-explainer-kit`: constructs `explainer-kit.run-request/v1`, consumes `explainer-kit.manifest/v1`, personal destinations behind config seams) + `scripts/acceptance.mjs` (full test matrix: vault, Google Docs, presets, personal destinations, manifest consumption, rollback; emits sanitized `private-wrapper-result.json`; final-RC identifier placeholders pinned at freeze) + `config.seams.example.json` (every personal value the operator supplies, with provenance comments pointing at the 0.4.1 backup).
- Create: `.oat/projects/shared/wave-skills-promotion/references/personal-wrapper-migration.md` — the install/run companion runbook the OPERATOR executes against `~/.agents/skills/personal-explainer-kit` (copy tree → fill seams → run acceptance).

**Step 1: Author the runbook** from the vendored contracts: (a) backup exists (`~/.agents/skills-backup/oat-explainer-kit-0.4.1` — confirmed stoa-side); (b) replace with RC 1.0.0 skill content — ACCEPTANCE PINS THE SKILL SUBTREE, not the whole CLI tarball: install `package/assets/skills/oat-explainer-kit` whose content hash must equal rc.json's recorded `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654` (verify with the RC tool's own hashing via a rebuild record, or byte-compare against a rebuild). Artifact locator: deterministic rebuild procedure = temp worktree at `534a408e` → `pnpm install --frozen-lockfile && pnpm build` → `node tools/release/build-explainer-rc.mjs --output <tmp> --record <tmp>`; the rebuilt CLI tarball's whole-file hash is `sha256:296cfa27d678f269ff649b92ebd7…` (differs from rc.json's recorded whole-tarball hash — upstream provenance question msg_02337b3a27f4 — but the skill-subtree and all schema/recipe hashes match the record, which is what acceptance consumes); (c) wrapper invocation migrates to constructing `explainer-kit.run-request/v1` (exact required keys) and consuming `explainer-kit.manifest/v1` (runId/outcome/artifacts/immutableHashes) instead of pre-1.0 interfaces; (d) acceptance: SEQUENCING (explainer decision_gate 2026-07-18): acceptance runs against the POST-p06 FINAL RC (frozen by explainer-kit after merging our p06 delta), not f212d630 — the runbook carries placeholder fields for the final RC's rcId/commit/subtree-hash to be pinned at freeze; the f212d schemas remain the valid contract basis (p06 does not alter explainer schemas). Run `~/.agents/skills/personal-explainer-kit/scripts/acceptance.mjs` against that exact final RC covering vault, Google Docs, presets, personal destinations, manifest consumption, rollback; emit sanitized `private-wrapper-result.json`; (e) rollback: restore the 0.4.1 backup. Result feeds BOTH the explainer-kit RC acceptance and this project's p06-t03 verification record (stored-verification-record discipline, B5).

**Step 2: Verify** — run the same schema-fidelity Python check as p06-t02 Step 2 pointed at the runbook file (assert the three schema ids + joined required-key lists appear); `rg -n "2cf98952c03a60" <runbook>` shows the pinned subtree hash; `pnpm exec oxfmt --write`.

**Step 3: Commit** — `feat(p06-t03): personal-wrapper migration runbook for RC acceptance`

**Completion semantics:** task completes when the installable tree + runbook ship; the OPERATOR-run E2E result is recorded in implementation.md when it arrives (project completion may await it per the plan's acceptance criteria).

---

### Task p06-t04: Phase 6 release readiness (lockstep bumps for the separately merged delta)

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`, `packages/cli/assets/public-package-versions.json`

**Step 1:** Bump all five 0.2.1 → 0.2.2 (p06-t01/t02 change shipped `.agents/skills` assets; lockstep policy applies per separately-merged PR). Regenerate bundle (`bash packages/cli/scripts/bundle-assets.sh`).

**Step 2: Verify** — `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test`; version asset matches manifests.

**Step 3: Commit** — `chore(p06-t04): lockstep public package bumps for explainer-integration release`

**Publish-hold note:** 0.2.1 npm publish is HELD until the RC promotes post-acceptance (operator sequencing 2026-07-18); 0.2.2 publishes after this delta merges and the same acceptance sequencing completes.

---

## Phase p-rev3: Revision 3 — first-consumer feedback (1.7.0)

Source: Orc-repo 4-wave program handoff (`references/2026-07-20-wave-skills-first-run-handoff.md`, log-verified Q&A 2026-07-20) + operator recap-disposition observation. Signal 9 routed to the explainer project (not ours).

### Task prev3-t01: (revision) Gate-row status flow — passed is the only terminal state (S8)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1:** Fix the wave-0/1 precedent wording (Step 4 plan gate + closeout final gate + step 6.5): plan gates MAY PROCEED at `fixes_completed`; every gate row MUST flip to `passed` once its fix dispositions carry verification records (B5) — `passed` is the only terminal state for gate rows; step 6.5's restore-watch presumes it.

**Step 2: Verify** — `rg -U -n "only\s+terminal\s+state" .agents/skills/oat-wave-execute/SKILL.md` (wrap-tolerant); commit `fix(prev3-t01): gate rows terminate at passed - proceed-point vs terminal state (S8)`.

### Task prev3-t02: (revision) Merge + fix-round discipline (S5, S7)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1:** Sharpen the pre-merge guard (B2 text) to the prescribed one-invocation compound shape: `cd /abs/repo/root && [ "$(git branch --show-current)" = "wave-N-execution" ] || exit 1 && git merge --no-ff …` with the rationale (cwd is healable via explicit cd; branch drift hard-aborts; advisory prints in separate invocations proved worthless — W2 incident + 2 saves).

**Step 2:** New standing rule: fix rounds are APPEND-ONLY — never amend a reviewed SHA (amending invalidates stored review verdicts citing it); fix-round briefs MUST state append-only; a worker refusal of an amend instruction is correct role behavior (p10 precedent).

**Step 3:** Step 3.1 `--no-commit`: add a preflight `oat project new --help` probe with both branches (flag present → use it; absent (version skew) → expect auto-commit and land wrapper artifacts in a follow-up commit), styled like rule 8's ≥0.1.65 check.

**Verify** — rg for the compound guard + "append-only" + the probe; commit `fix(prev3-t02): same-shell merge guard, append-only fix rounds, --no-commit probe (S5,S7)`.

### Task prev3-t03: (revision) Gate execution mechanics (S1, S2, S3, S4)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1 (S1):** Condition rule 3's "gate reviewers commit their own artifacts" on primary-checkout execution; from linked worktrees (git metadata outside the sandbox) the ORCHESTRATOR commits gate artifacts on the reviewer's behalf — environment-conditional refinement, both consumers' evidence cited (stoa waves 2–3; Orc W1–W4).

**Step 2 (S2):** New dispatch-posture rule alongside 6/8: gates dispatch in BACKGROUND by default with a completion watcher (orchestrator-host foreground tool ceilings — e.g. 600s — are shorter than legitimate wave-scoped reviews); foreground only for short scopes; rule 8 remains the recovery path (used once in Orc W2, worked).

**Step 3 (S3):** Standing rule: piped DoD/gate verification chains run under `set -o pipefail` or capture the raw exit code pre-filter (Orc W4: `pnpm test | grep` masked a 1-failed-test run).

**Step 4 (S4):** Single-writer-until-committed rule for review artifacts: an uncommitted review artifact is exclusively owned by whichever agent is live on it; orchestrator dispositions land as immediate commits or wait for agent termination; lock/suffix conventions rejected (fragment the audited review chain).

**Verify** — rg each; commit `fix(prev3-t03): gate posture, artifact ownership, pipefail, worktree commit fallback (S1-S4)`.

### Task prev3-t04: (revision) Bootstrap CI waiver + rule-9 citation + program-skill optional-step disposition (S6 + Q5 + recap)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`

**Step 1:** Closeout/merge-wait guidance: a wave merging into a repo with NO CI records a one-line explicit waiver in the wave plan ("merge gate = local DoD only"); the CI-introducing wave's first green run certifies the cumulative merged tree and is recorded as waiver closure; no retroactive gate re-runs.

**Step 2:** Rule 9 gains the second-consumer citation (Orc: regex vs oxfmt padding at wave-close; line-based transform required) — text otherwise verbatim.

**Step 3 (program skill):** Optional-step disposition rule in wave-close: an autonomous orchestrator NEVER silently drops an optional step — wave-close bookkeeping records either the recap manifest runId/outcome or an explicit "recap: not run — {reason}" ledger entry (silent discretion is indistinguishable from oversight).

**Step 4:** Versions: execute frontmatter → 1.7.0, program → 1.3.0. Re-sync provider views. (Lockstep 0.2.7 already present on this branch/PR.)

**Verify** — version greps; `oat sync --scope all` clean; `pnpm lint`; commit `feat(prev3-t04): CI waiver rule, optional-step disposition, versions 1.7.0/1.3.0`.

### Task prev3-t05: (revision) Closeout step 7 names the full completion tail (S10)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1:** Rewrite closeout step 7: the requirement is the full `oat-project-complete` PROCESS, not its nearest CLI command — name the tail explicitly (complete-state → `oat project archive` [CLI-owned local move + summary export + S3 sync when `s3SyncOnComplete`] → active-pointer clear → bookkeeping commit), state that `oat project complete-state` ALONE does not satisfy it (Orc first-run evidence: 4 wrapper projects left unarchived until operator audit), and note that under autonomous execution the interactive skill is model-invisible (`disable-model-invocation: true`) — execute its SKILL.md as a document, resolving gates from config, until an `oat-project-complete-auto` companion exists (see backlog).

**Step 2: Verify** — `rg -U -n "complete-state.*alone|full.*tail|archive" .agents/skills/oat-wave-execute/SKILL.md | head`; commit `fix(prev3-t05): closeout step 7 names the full completion tail (S10)`.

## Phase p-rev4: Revision 4 — program-boundary closeout semantics (operator design feedback 2026-07-20)

Source: operator direction after the Orc program: (1) recap belongs at PROGRAM scope, not per-wave; (2) under autonomous execution, per-wave completion may defer the archive tail — merge and move on — with ONE operator checkpoint at program end: "all waves merged — run the completion tail across all wave wrappers now?"

### Task prev4-t01: (revision) Program-scope recap; per-wave recap default-off

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`

**Step 1 (program skill):** The recap caller's DEFAULT scope is the program: at the wave-close that completes the FINAL pending wave (program close), offer/run the program-recap caller. Per-wave recaps are default-OFF; a wave-close that skips one records the explicit disposition "recap: deferred to program close" (satisfies the optional-step disposition rule — no silent omission).

**Step 2 (execute skill):** Closeout step 8's recap pointer aligns: per-wave recap only on explicit operator request; the program recap is the deliverable, generated at program close from the reconciled program artifact + ALL wave records.

**Verify:** `rg -U -n "program close|deferred to program close" both files`; commit `feat(prev4-t01): recap defaults to program scope with explicit per-wave deferral`.

### Task prev4-t02: (revision) Autonomous archive deferral + program-end completion checkpoint

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`

**Step 1 (execute skill, step 7):** Add the autonomous-mode branch: per-wave, `complete-state` + bookkeeping run as today, but the ARCHIVE TAIL (archive → S3 → pointer clear) MAY be deferred program-scoped; each deferral is recorded in the wave ledger row ("completion tail: deferred to program close") — explicit disposition, never silent. Interactive runs unchanged (full tail per wave remains valid).

**Step 2 (program skill):** Program close gains the OPERATOR CHECKPOINT: when the final wave's ledger row flips done and all merges are recorded, ask exactly one question — "All waves are merged and the program is complete. Run the completion tail (oat-project-complete: archive + S3 + pointer clear) across all N wave wrapper projects now?" On yes: run the tail per wrapper (via oat-project-complete-auto when it ships; as-document until then), flip each ledger deferral note to done. On no/defer: record the standing deferral with owner. This checkpoint is HUMAN-GATED even in autonomous runs — it is the program's completion gate, mirroring the recap publish gate.

**Verify:** rg evidence both files; versions: execute → 1.7.1, program → 1.3.1 (patch: semantics additions, no rule removals); commit `feat(prev4-t02): program-end completion checkpoint + autonomous archive deferral`.

## Phase p-rev5: Revision 5 — recap authoring-ownership docs (W6 recap defects)

Source: `references/w6-recap-defects-handoff-2026-07-20.md` (defect 2, HIGH: unattended recap has no content-authoring seam; raw artifact text published-grade-approved by every automated gate). Wave-side ask only — core fixes are the explainer batch's.

### Task prev5-t01: (revision) Recap callers own prose authoring

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`

Caller sections state: prose authoring is CALLER-owned (like critic execution and fact-base synthesis); until the explainer authoring seam ships, callers either author the content document from the fact base + recipe outline or skip the unattended build with a recorded disposition. No mechanical-contract changes; no version bump (PR diff already bumps both skills).

**Verify:** `rg -U -n "prose|authoring" both files`; commit `docs(prev5-t01): recap callers own prose authoring (W6 raw-dump evidence)`.

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status          | Date       | Artifact                                                             |
| ------ | -------- | --------------- | ---------- | -------------------------------------------------------------------- |
| p01    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p01-review-2026-07-18T164109Z.md               |
| p01    | code     | passed          | 2026-07-18 | reviews/archived/code-p01-review-round2-2026-07-18T165109Z.md        |
| p02    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p02-review-2026-07-18T171810Z.md               |
| p02    | code     | passed          | 2026-07-18 | reviews/archived/code-p02-review-round2-2026-07-18T172343Z.md        |
| p03    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p03-review-2026-07-18T174325Z.md               |
| p03    | code     | passed          | 2026-07-18 | reviews/archived/code-p03-review-round2-2026-07-18T174858Z.md        |
| p04    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p04-review-2026-07-18T175753Z.md               |
| p04    | code     | passed          | 2026-07-18 | reviews/archived/code-p04-review-round2-2026-07-18T180320Z.md        |
| p05    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p05-review-2026-07-18T183116Z.md               |
| p05    | code     | passed          | 2026-07-18 | reviews/archived/code-p05-review-round2-2026-07-18T183353Z.md        |
| p05    | code     | fixes_completed | 2026-07-18 | reviews/archived/p05-review-2026-07-18T184321Z.md                    |
| p05    | code     | passed          | 2026-07-18 | reviews/archived/p05-review-2026-07-18T185045Z.md                    |
| p06    | code     | fixes_completed | 2026-07-19 | reviews/code-p06-review-round2-2026-07-19T010226Z.md                 |
| p06    | code     | passed          | 2026-07-19 | reviews/code-p06-review-round3-2026-07-19T010826Z.md                 |
| p06    | code     | passed          | 2026-07-19 | reviews/code-p06-review-2026-07-19T004731Z.md                        |
| final  | code     | fixes_completed | 2026-07-18 | reviews/archived/final-review-2026-07-18T191920Z.md                  |
| final  | code     | passed          | 2026-07-18 | reviews/archived/final-review-round2-2026-07-18T193844Z.md           |
| p-rev1 | code     | passed          | 2026-07-18 | reviews/code-prev1-review-2026-07-18T221306Z.md                      |
| p-rev2 | code     | passed          | 2026-07-18 | reviews/code-prev2-review-2026-07-18T234907Z.md                      |
| p-rev3 | code     | passed          | 2026-07-20 | reviews/code-prev3-review-2026-07-20T143119Z.md (+ addendum 143712Z) |
| p-rev4 | code     | fixes_completed | 2026-07-20 | reviews/code-prev4-review-2026-07-20T154506Z.md                      |
| p-rev4 | code     | passed          | 2026-07-20 | reviews/code-prev4-review-round2-2026-07-20T154934Z.md               |
| p-rev5 | code     | passed          | 2026-07-20 | reviews/code-prev5-review-2026-07-20T170942Z.md                      |
| plan   | artifact | passed          | 2026-07-18 | -                                                                    |
| spec   | artifact | pending         | -          | -                                                                    |
| design | artifact | passed          | 2026-07-18 | -                                                                    |
| plan   | artifact | passed          | 2026-07-18 | -                                                                    |
| plan   | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T141952Z.md          |
| plan   | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T142403Z.md          |
| plan   | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T150023Z.md          |

_Design-row provenance: operator-relayed external review by the stoa-side packet author (2026-07-18); no artifact file was produced — verdict and amendments recorded in the design revision commit `5237cd57`._

_Gate-open p06 plan re-review (last plan row): in-session structured review, 2 rounds (1 Critical + 4 Important applied → clean), phase-scoped per the p06 gate contract; no artifact file — findings applied in the gate-open revision commits._

_First plan-row provenance: in-session structured review (`oat-reviewer` subagent, inherited parent model, 3 attempts → clean, 2026-07-18); no artifact file — findings F1–F7 applied in the plan draft commits. The next two rows are the cross-family gate reviews (codex gpt-5.6-sol/max); all 18 findings were remediated in commit `a634db1c`. The final row is the delta-scoped gate re-run that verified every remediation and returned 0 findings (verdict ok, run 87f67c9f) — advancing all three gate events to `passed`._

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no unresolved Critical/Important/Medium)

---

## Phase p-rev1: Revision 1

Source: GitHub PR #158 Bugbot review comments (2026-07-18; 4 Medium findings)

### Task prev1-t01: (revision) Fix fixture program-row coverage grep

**Files:**

- Modify: `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md`

**Step 1:** Both PROGRAM_COUNT sites (~L53-57, ~L214-216): match template-correct link-style rows AND plain rows, e.g. `grep -cE '^\| \[?mini-p0[123]'`. Bugbot comment 3609070068.

**Step 2: Verify**
Run: `printf '| [mini-p01](./x.md) |\n| mini-p02 |\n' | grep -cE '^\| \[?mini-p0[123]'`
Expected: 2

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md
git commit -m "fix(prev1-t01): fixture coverage grep matches link-style program rows"
```

### Task prev1-t02: (revision) Honest sync-commit failure in bootstrap script

**Files:**

- Modify: `.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`

**Step 1:** Drop the unquoted `$FILES` args from the sync commit (the set is already staged; commit the staged set). Bugbot 3609072482.

**Step 2:** On sync-commit failure, mark the phase failed: STATUS line emits `status=failed reason=sync-commit` (not success) and the script's exit code reflects the failure, per the bootstrap-auto contract. Keep bash-3.2 (`/bin/bash -n`, no bash-4 constructs). Bugbot 3609072481.

**Step 3: Verify**
Run: `/bin/bash -n .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh && rg -n 'FILES=' .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh | wc -l`
Expected: syntax OK; 0 (variable removed). Re-run the fixture happy leg to confirm STATUS unchanged on success.

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh
git commit -m "fix(prev1-t02): sync-commit failure fails bootstrap status honestly"
```

### Task prev1-t03: (revision) Align state.md p06 gate frontmatter + prose

**Files:**

- Modify: `.oat/projects/shared/wave-skills-promotion/state.md`

**Step 1:** Frontmatter `oat_blockers` (now a multi-line YAML list after oxfmt) → `[]` with the RC-opened comment; Progress line "⧗ p06 ... BLOCKED on explainer-kit v1 RC" → "⧗ p06 ... RC gate OPEN; executes after PR #158 merges"; Next Milestone drops "when the RC ships" phrasing. Bugbot 3609163349. Use anchored regex + substitution-count assert (rule-9 discipline — the prior edit no-opped on oxfmt re-formatting).

**Step 2: Verify**
Run: `rg -n "BLOCKED on explainer" .oat/projects/shared/wave-skills-promotion/state.md | wc -l`
Expected: 0; `oat project status --project-path .oat/projects/shared/wave-skills-promotion --json` shows no p06-RC blocker.

**Step 3: Commit**

```bash
git add .oat/projects/shared/wave-skills-promotion/state.md
git commit -m "fix(prev1-t03): align p06 RC-gate state frontmatter with prose"
```

## Phase p-rev2: Revision 2

Source: stoa W6-migration report (references/w6-migration-report-2026-07-18.md) + superseded explainer RC (2026-07-18)

### Task prev2-t01: (revision) Installed skill scripts get execute bits regardless of source mode

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/copy-helpers.ts` (or the shared install seam both paths use)
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts`, `packages/cli/src/commands/tools/update/update-tools.test.ts`

**Step 1: Write test (RED)** — simulate npm's mode normalization: seed a bundled skill fixture whose `scripts/*.sh` is 0644 (no exec bit), install via BOTH paths (workflows install AND tools update skill path), assert the installed script is executable. Root cause: npm strips exec bits at pack time (verified: 0.2.0 tarball ships bootstrap-group.sh as rw-r--r--), so mode-preserving copy is insufficient from a published package.

**Step 2: Implement (GREEN)** — after copying a skill directory, chmod 0755 files under its `scripts/` subdirectory (mirror the existing `.oat/scripts` pack-asset chmod at update-tools.ts ~L272). Put the chmod in the shared seam (copyDirWithStatus/copyDirWithVersionCheck callers or a helper) so init, install, and update paths all get it. Keep the copyDirectory mode preservation (still correct for repo-checkout installs).

**Step 3: Verify** — targeted tests, then `pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm type-check`.

**Step 4: Commit** — `fix(prev2-t01): chmod installed skill scripts executable (npm strips modes)`

### Task prev2-t02: (revision) Runbook hardening from stoa migration findings

**Files:**

- Modify: `.oat/projects/shared/wave-skills-promotion/references/w6-handoff-runbook.md`

**Step 1:** §2 gains a cleanup step: repos migrating FROM repo-local copies must remove pre-packaged provider-view entries (e.g. stale `.cursor/skills/oat-wave-*` symlinks) and confirm `oat status --scope all` ends clean. §1's version-verify upgraded to CONTENT verification: `npm pack @open-agent-toolkit/cli@<ver>` + inspect for the six skill files (0.1.76 shipped same-day WITHOUT them — existence of a version is not evidence). Note the §2 chmod workaround as retired once prev2-t01 ships in a patch release.

**Step 2: Verify** — `rg -n "npm pack|status --scope all|chmod" <runbook>` shows all three; oxfmt clean.

**Step 3: Commit** — `docs(prev2-t02): harden W6 runbook - view cleanup + content verify`

### Task prev2-t03: (revision) Lockstep patch bumps for the installer fix

**Files:**

- Modify: five public package manifests + `packages/cli/assets/public-package-versions.json`

**Step 1:** Bump all five 0.2.0 → 0.2.1; regenerate bundle; `pnpm release:validate && pnpm test && pnpm lint && pnpm type-check`.

**Step 2: Commit** — `chore(prev2-t03): lockstep 0.2.1 for installer exec-bit fix`

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks - Port + toolkit integration (p01-t03 merged into p01-t02 at plan review)
- Phase 2: 9 tasks - §2 queue + genericization
- Phase 3: 3 tasks - Dispositions (validate-plan, backlog)
- Phase 4: 2 tasks - Docs
- Phase 5: 5 tasks - Validation + release readiness
- Phase 6: 4 tasks - §4 explainer integration + its own release choreography (RC-gated)
- Phase p-rev1: 3 tasks - PR #158 Bugbot revision
- Phase p-rev2: 3 tasks - stoa migration findings (installer exec-bit, runbook, 0.2.1)
- Phase p-rev3: 5 tasks - Orc first-consumer feedback (1.7.0/1.3.0)
- Phase p-rev4: 2 tasks - program-boundary closeout semantics (operator)
- Phase p-rev5: 1 task - recap authoring-ownership docs (W6 defects)

**Total: 41 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Authoritative scope: `references/2026-07-17-wave-skills-promotion-packet.md`
- Evidence ledger: `references/2026-07-17-wave-signal-ledger.md`
- Frozen skill sources: `references/skill-sources/`
- **spec:** ---
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

**FR7: File the deferred-work backlog dispositions**

- **Description:** The five deferred items from discovery become durable
  backlog dispositions (amended at design review after the sync-drift
  root cause landed): four ACTIVE items with owner/trigger — wave CLI
  family (grouped with the artifact-format-contract item), artifact
  format as stable contract, `oat worktree bootstrap-group` command,
  post-W6 reviews-row watch removal — plus ONE terminal `wont_do`
  archived rejection for the CLI-level tracked-config guard (root-caused
  to a stale local binary in the consuming repo; dependency hygiene there
  is the cure). A tenth disposition — the `oat sync` version-stamp
  warning candidate — was accepted as a design-review amendment.
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
- Backlog disposition set (4 deferred + 1 closed rejection + 4 triage + 1 new upstream candidate = 10)
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
- 6/6 §3 rows dispositioned; 10 backlog dispositions recorded (4 deferred
  - 1 archived `wont_do` rejection + 4 triage + 1 new upstream candidate).
- Fixture dry-run green before W6 handoff.
- `pnpm release:validate` + full repo quality gates green.
- §4: personal-wrapper E2E green against the frozen RC (when gated phase
  unblocks).

## Requirement Index

| ID   | Description                                               | Priority | Verification                                           | Planned Tasks                      |
| ---- | --------------------------------------------------------- | -------- | ------------------------------------------------------ | ---------------------------------- |
| FR1  | Port both skills into workflow pack with scripts/assets   | P0       | integration: install + sync + bundle-consistency tests | p01-t01, p01-t02, p01-t04, p01-t05 |
| FR2  | Apply all six §2 queued changes (or reject in writing)    | P0       | manual: per-item traceability checklist                | p02-t01..t06, p02-t08              |
| FR3  | Genericize stoa-isms via neutral phrasing                 | P0       | manual: rule-by-rule intent-preservation review        | p02-t07                            |
| FR4  | Preserve mechanical/judgment split + log discipline       | P0       | manual: ownership-boundary + closeout-order review     | p02-t07, p02-t08                   |
| FR5  | validate-plan singleton-group help/docs                   | P1       | unit: validate-plan help + rejection message           | p03-t01                            |
| FR6  | Triage four upstream feedback items to backlog            | P1       | manual: backlog items exist with evidence              | p03-t03                            |
| FR7  | Record deferred-work backlog dispositions (4 + 1 wont_do) | P0       | manual: backlog items with owner/trigger/groupings     | p03-t02                            |
| FR8  | Wave-workflow docs incl. descriptive artifact format      | P1       | integration: docs build + index regeneration           | p04-t01, p04-t02                   |
| FR9  | In-repo fixture + mini-wave dry-run                       | P0       | e2e: dry-run procedure against fixture                 | p05-t01..t03                       |
| FR10 | §4 explainer integration (RC-gated)                       | P0\*     | e2e: personal-wrapper E2E vs frozen RC (operator)      | p06-t01..t04                       |
| NFR1 | Zero-regression bar vs 1.4.0 + §2                         | P0       | e2e: fixture dry-run + manual equivalence checklist    | p02-t07, p05-t03, p05-t05          |
| NFR2 | Release conventions (lockstep bumps, release:validate)    | P0       | integration: release:validate + repo gates             | p05-t04, p06-t04                   |
| NFR3 | bootstrap script bash-3.2 portability                     | P0       | manual + e2e: fixture dry-run on macOS system bash     | p02-t03, p05-t01                   |
| NFR4 | Provider portability of promoted skills                   | P1       | integration: sync views generated for all providers    | p01-t04, p02-t09                   |

\* FR10 is P0 within its gate; the gate (explainer-kit RC) blocks only the
final phase, not the rest of the project.

## Open Questions

None remaining. Both spec-time questions were resolved at design review
(2026-07-18):

- **Versioning:** continue stoa's lineage — `oat-wave-execute` 1.5.0,
  `oat-wave-program` 1.1.0, with the 1.4.1+1.5.0 release-collapse recorded
  so signal-ledger citations resolve.
- **W6 handoff shape:** normal npm release consumed via `oat tools update`
  - `oat sync`; no pre-release channel. Delivered as a mini-runbook
    (pinned version, migration sequence, row-stomp observation task).

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
- **summary:** ---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-21
oat_generated: false
oat_summary_last_task: prev5-t01
oat_summary_revision_count: 5
oat_summary_includes_revisions: [p-rev1, p-rev2, p-rev3, p-rev4, p-rev5]
---

# Summary: wave-skills-promotion

## Overview

The stoa repo dogfooded two wave-orchestration skills — `oat-wave-execute`
and `oat-wave-program` — across a six-PR, 48-plan execution program (waves
0–5), hardening them until every standing rule was evidence-cited in a
signal ledger. This project upstreamed both skills into the OAT toolkit's
workflow pack so any repo can install them, applying the queued
evidence-backed change backlog and dispositioning the CLI-absorption list,
under a zero-regression bar: stoa's wave 6 ran on the promoted skills and
returned a zero-regression acceptance pass (11/11 lanes), with an Orc
4-wave autonomous program as an independent second consumer.

## What Was Implemented

- **`oat-wave-execute` 1.5.0 and `oat-wave-program` 1.1.0** as canonical
  workflow-pack skills: verbatim port (byte-verified) followed by three
  traceable edit passes — the six §2 queue items (one commit each: scaffold
  verify-only, pre-merge cwd/branch asserts, provider-view parity guard +
  sync-commit inspection, named fan-in gate rule, stored verification
  records for fix dispositions, resumed-handle preference), a
  genericization pass under a 75-row behavioral-equivalence checklist, and
  toolkit-convention alignment recording the 1.4.1+1.5.0 release-collapse.
- **Toolkit integration:** pack manifest + bundle registration, provider
  views (claude/cursor symlinks; codex native-read), and a real installer
  bug fix the port exposed — `copyDirectory` now preserves file modes
  (fresh installs previously stripped execute bits from nested skill
  scripts; two regression tests).
- **Asset-level genericization:** the bundled wrapper/orchestration-log
  templates use instantiation placeholders (stoa commands kept as labeled
  examples) and `bootstrap-group.sh` gained conditional env setup plus
  `OAT_WAVE_BOOTSTRAP_CMD`/`OAT_WAVE_BASELINE_CMD` hooks with pnpm-shaped
  detection — validated in pnpm-shaped, hook-set, and non-pnpm fixture legs.
- **Dispositions:** validate-plan documents the singleton-group rule +
  ungrouped alternative; 12 durable backlog dispositions covering every
  packet §3 row, upstream-feedback triage (2 closed-as-fixed after
  independent verification, 3 filed with fresh evidence), and 2 docs-CLI
  defects found live during execution.
- **Docs:** a wave-workflow page (program layer, mechanical/judgment split,
  lifecycle composition, descriptive-not-contract artifact format).
- **Validation + release:** a bash-3.2 mini-wave fixture with a
  toggleable-fail DoD gate, an executed dry-run (happy + unhappy legs, zero
  promoted-skill defects), lockstep 0.1.73 → 0.2.0 public-package bumps,
  and a W6 handoff mini-runbook (version pin, migration sequence, row-stomp
  observation task, regression protocol).
- **Explainer integration (p06, RC-gated):** program-recap recipe
  (`explainer-kit.recipe/v1`), schema-exact optional close-callers in both
  skills (inert without the explainer), an installable
  personal-explainer-kit acceptance scaffold (six-gate `acceptance.mjs`,
  sanitized wrapper evidence), executed against the frozen then final RC —
  all six wrapper gates passed. The interim recipe copy was re-homed to the
  merged explainer registry once explainer-kit reached main.
- **Post-promotion hardening (five revision phases):** final skill versions
  `oat-wave-execute` 1.7.1 / `oat-wave-program` 1.3.1, lockstep 0.2.12,
  driven by three independent consumers (PR review, stoa W6, Orc 4-wave
  autonomous program) — see Revision History.

## Key Decisions

- **Port-first, defer-heavy:** the wave CLI command family and a TypeScript
  bootstrap-group rewrite were deferred to owned backlog items so stoa W6
  validates one change (packaged skills), not two.
- **Neutral-phrasing genericization** (no config schema): rules refer to
  "the repo's DoD gates / formatter / env setup" with stoa specifics as
  cited evidence; asset templates use instantiation placeholders.
- **Names kept** (`oat-wave-*`): "wave" is its own domain above the
  per-project lifecycle; artifact format documented descriptively with
  contract status deferred to a second consumer.
- **Versioning continues stoa's lineage** (1.5.0/1.1.0) so signal-ledger
  citations resolve; the queued 1.4.1+1.5.0 collapse is recorded.
- **HiLL `final` interpreted per mergeable delta** (`['p05','p06']`) since
  the plan-final p06 is RC-gated and cannot complete in this run.
- **Tracked-config guard rejected** (archived `wont_do`): the sync-thrash
  class was root-caused to a stale locally-resolved CLI shadowing the
  global; dependency hygiene in the consuming repo is the cure.
- **Program-scope recap, not per-wave:** recap generation defaults to
  program close from the reconciled program artifact; per-wave recaps are
  explicit-request only, with skip dispositions recorded so discretion is
  distinguishable from oversight.
- **Recap callers own prose authoring** (W6 evidence): the explainer
  pipeline validates structure and facts but nothing in it owns prose
  quality; unattended recap builds require a caller-supplied authoring
  path — now enforced upstream by the explainer author seam.
- **`-auto` companion deferred with a three-layer firing guard**
  (`BL-260720-add-oat-project-complete-auto`): autonomous closeout must be
  opt-in per program, human-checkpointed at program end, and never fire
  from task-completion alone.

## Design Deltas

- p02-t09 re-sync was a verified no-op — provider views are symlinks, so
  skill-text edits flow through without view diffs.
- The equivalence checklist was originally prose-scoped; the final review
  caught stoa-toolchain requirements surviving in bundled assets (Critical)
  and the checklist was extended with six asset rows (EX-A01..A06).
- 24 oat-managed cursor dispatch-variant roles (supported-catalogue
  materializations from `oat sync` on CLI 0.1.73) ride this branch as
  managed sync state, disclosed in the Final Summary.

## Notable Challenges

- **Independent review caught what self-checks missed, five for five:**
  every phase failed round 1 on exactly one finding — installer
  mode-stripping (implementer's own execute-bit check had validated the
  bundle copy, not the installed copy), an over-deleted provenance
  citation, missing backlog owners, a judgment-attribution error in docs,
  and a root-side bookkeeping gap. All fixed via resumed-handle
  continuations; round 2 passed cleanly each time.
- **Gate-tooling friction generated its own evidence:** full-surface plan
  gates exceeded the 900s budget at max effort (delta-scoping was the fix)
  and a gate prompt naming a reviewer-dispatching skill recursed into
  concurrent nested runs — both folded into the filed gate-hardening
  backlog item.
- **The first live unattended recap pasted raw artifacts as deck prose**
  (stoa W6, run-19af6e55): every structural gate passed while
  implementation.md rode in verbatim, frontmatter included. Root cause: no
  seam owned prose quality. Fixed on both sides — caller-ownership rules in
  the wave skills (p-rev5) and an enforced author callback in the
  explainer core.
- **Cross-machine RC verification surfaced real nondeterminism:** a
  pristine rebuild of the explainer RC differed in exactly three generated
  `.d.ts` files (declaration ordering) and a commit hook reformatted the
  provenance copies; resolved with extension-neutral raw copies and
  acceptance pinned to recorded tarball bytes.

## Revision History

- **p-rev1 (PR #158 Bugbot, 4 Medium):** fixture grep tightening,
  sync-commit failure status, unquoted `$FILES` removal, stale p06 state
  prose — all root-fixed same day.
- **p-rev2 (stoa W6 migration report):** the real installer defect of the
  arc — `npm pack` strips file modes, so `oat tools update` installed
  `bootstrap-group.sh` non-executable; fixed with explicit `chmod 0755` on
  both install paths (RED→GREEN), runbook hardened, lockstep 0.2.1.
- **p-rev3 (Orc 4-wave autonomous program, signals 1–10):** gate rows are
  terminal only at `passed` (S8); same-shell compound merge guards,
  append-only fix rounds, `--no-commit` probe (S5/S7); worktree commit
  fallback, background gate posture, `pipefail`, single-writer artifacts
  (S1–S4); CI-waiver rule, optional-step disposition; versions 1.7.0/1.3.0.
- **p-rev4 (operator program-boundary design):** recap becomes
  program-scope with per-wave deferral dispositions recorded in the
  program ledger; autonomous archive-tail deferral with one human-gated
  program-end checkpoint; versions 1.7.1/1.3.1.
- **p-rev5 (W6 recap-defects handoff):** caller-owns-prose-authoring
  paragraphs in both recap-caller sections with live W6 evidence; the
  "seam pending upstream" citation was replaced with the concrete shipped
  author contract once explainer PR #170 merged.

## Follow-up Items

- `BL-260718-add-oat-wave-lifecycle-cli` — wave CLI family (grouped with
  `BL-260718-document-execution-program` and
  `BL-260718-rewrite-worktree-bootstrap`)
- `BL-260720-add-oat-project-complete-auto` — autonomous-closeout
  companion with the three-layer firing guard (priority demotion parked
  with the operator)
- `BL-260718-harden-full-surface-gate`, `BL-260718-add-generated-runbook`,
  `BL-260718-warn-when-oat-sync-uses` — upstream triage outcomes
- `BL-260718-fix-oat-docs-generate-index`,
  `BL-260718-support-fumadocs-in-oat-docs` — docs-CLI defects found live
- `BL-260718-mandatory-skill-load-clause` — lifecycle steps that name
  skills must load them (evidence-enriched during this project)
- npm publish of the promoted versions (publish-hold released with the
  final RC acceptance; publish is operator-owned)
- Pre-existing `oat pjm doctor` baseline failure (10 older records,
  template frontmatter) — observed, out of scope, not yet filed.

_Closed during the project:_ `BL-260718-remove-post-w6-reviews-row`
(W6 observation clean, watch retired), stoa W6 acceptance
(zero-regression pass, 11/11 lanes), explainer-kit RC promotion
(final RC fully accepted; both W6 recap defects fixed in the merged
explainer batch).

## Unresolved claims

- None.
