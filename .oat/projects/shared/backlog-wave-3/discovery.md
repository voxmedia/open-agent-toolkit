---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-10-01
oat_generated: false
---

# Discovery: backlog-wave-3

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Deliver Wave 3 of the backlog as one PR, selected through `tackle-backlog` on
2026-10-01 and approved by the operator ("Approve as proposed"). The operator
asked that `BL-260927-expose-a-scoped-template` lead the wave because every
user-scope install currently breaks the lifecycle skills that copy templates,
asked that Fumadocs navigation be taught to `oat docs nav sync`, and asked that
the recon packet-publication failure reported in GitHub issue #333 be folded in
together with a Codex agent-limit note and one bounded retry.

Approved batch (14 backlog items):

- `BL-260927-expose-a-scoped-template` — one template resolver and a command
- `BL-260718-support-fumadocs-in-oat-docs` — Fumadocs `meta.json` from Contents maps
- `BL-261001-make-recon-s-packet-validator` — recon publication contracts
- `BL-261001-recover-recon-lanes-after` — Codex agent-limit note and one retry
- `BL-260806-fail-closed-when-configured` — closeout snapshot fail-closed check
- `BL-260902-decide-test-only-freshness` — operator-only exit-gate waivers
- `BL-261001-recompute-oat-project-next-s` — next-skill v2 fingerprint defect
- `BL-260928-keep-instructions-sync-force` — `--force` data-loss fix
- `BL-260909-give-the-dispatch-record` — remove journal persistence
- `BL-260826-decide-whether-test-only-paths` — test files skip the lockstep bump
- `BL-260830-add-strict-yaml-validation` — positioned YAML errors and key types
- `BL-260928-route-quick-mode-discovery` — quick discovery routes to quick-start
- `BL-260903-verify-the-packs-inventory` — narrow an overstated docs claim
- `BL-260829-order-phase-bookkeeping-before` — close from this wave's own run

## Clarifying Questions

### Question 1: Batch, topology, and roles

**Q:** Approve the 13-item batch (plus the next-skill defect filed during
reconnaissance) as five sequential phases and a fan-in, in one PR at lockstep
0.3.10? Which implementer and reviewer routes?
**A:** Approve as proposed. Same setup as Wave 2: Claude Opus 5.5 high phase
implementers, Codex `codex-6-sol-xhigh` as the independent reviewer with gates
on every phase plus the plan and final gates, dispatch policy managed/high.
**Decision:** One branch (`wave/2026-09-30-backlog-wave-3`), one PR, no merge.

### Question 2: Item-level product decisions

**Q:** Accept the seven recommendations from reconnaissance?
**A:** Accept all.
**Decision:** Recorded as Key Decisions 3–9 below.

### Question 3: BL-260829 closure

**Q:** Close on Wave 2's evidence or observe this wave?
**A:** Observe this wave.
**Decision:** This wave's per-phase reviews are the live evidence. The item
closes at the fan-in if a phase's reviewed head is its Step 7a bookkeeping
commit and that review raises no ledger or resume-pointer finding.

### Question 4: Issue #333 split

**Q:** How much of #333 joins the wave?
**A:** The publication-contract fix, plus the skills note and the bounded
retry. Mixed native and CLI continuation records stay deferred until the
friction recurs.
**Decision:** `BL-261001-record-mixed-native-and-cli` and
`BL-261001-make-recon-controller-setup` stay out of scope.

## Solution Space

The approach is fixed by the approved batch: implement each item against its
recorded acceptance criteria and decisions. The only structural choice was
sequencing, covered under Key Decisions.

## Key Decisions

1. **Sequencing:** Five sequential phases plus a fan-in. Phases share help
   snapshots, skill version pins, and several docs pages, so they do not run
   in parallel.
2. **Versions:** Each skill gets one `metadata.version` bump in the final PR
   diff, made by the first phase that changes it (later phases check
   `git diff origin/main` and do not bump again), so every phase gate sees a
   passing `check:skill-bumps`. The fan-in owns the five-package lockstep bump
   from 0.3.9 to 0.3.11 (`main` took 0.3.10 for #334 during the wave).
3. **Template command shape:** `oat template resolve <name> [--json]
[--output <path>]`. It reports the matching tier (repository, user,
   bundle) and returns a filesystem path only for the repository and user
   tiers. `--output` copies the resolved content, so skills never need a
   package-manager path. Precedence is repository, user, bundle per
   `DR-260927-templates-resolve-repository`; the Cursor-cloud skill's reversed
   order is brought in line.
4. **Fumadocs unlisted pages:** Strict. Generated `meta.json` lists exactly the
   Contents-map entries with no `"..."` rest entry; pages a Contents map does
   not list are reported (human output and `--json`), not silently shown.
5. **Fumadocs cross-folder entries and titles:** A Contents link to a page in
   another folder is written as a Fumadocs link entry. Folder titles come from
   the `index.md` frontmatter `title`, falling back to its first H1. Output is
   formatted the way the repository formatter would format it, so a second run
   writes nothing.
6. **Recon coverage contract:** Keep the forced downgrade of claims affected by
   a material coverage finding, and drop the publication check that also
   requires the coverage reviewer's per-statement disposition to be `gap`.
7. **Recon unresolved issues:** Become structured (affected claim IDs or an
   explicit global scope). Existing string-only entries are read as global.
   This reverses the documented string-only rule and two tests that reject
   object entries.
8. **Codex agent-limit note location:** The Codex provider mechanics reference
   used by `oat-dispatch-subagents`, with a pointer from recon, because recon
   forbids copying provider mechanics into the skill.
9. **Dispatch record:** Delete the journal persistence path, `--project`, and
   the fallback lineage logic that only the journal consumed. Redaction
   coverage moves to the validate-only output.
10. **Design depth (QS-04):** Straight to plan. Every item has recorded
    decisions or acceptance criteria and reconnaissance mapped the files; no
    open architecture or component-boundary question remains.
11. **Fail-closed check placement:** In the CLI. No executable code parses
    `oat_post_implement_sequence` today, and `oat project complete-state`
    already owns the completed-state transition. A read-only CLI check reports
    the closeout invariant for `oat-project-implement`, `oat-project-next`,
    `oat-project-complete`, and `oat-project-autonomous`, and `complete-state`
    refuses the same configured-but-absent or incomplete state. A CLI command
    is reachable from every skill without cross-skill script paths and is
    testable at the transition level.

## Constraints

- The template precedence order, the dispatch-record outcome, the test-only
  publishable-path rule, and the operator-waiver rule are fixed by
  `DR-260927-templates-resolve-repository`, `DR-260927-dispatch-record-validates`,
  `DR-260927-test-only-paths-skip`, and `DR-260927-operator-waiver-for-test-only`.
- Exit-gate waivers are operator-only and never self-issued under
  `OAT_AUTONOMOUS`; they must cover both `effective-delta-v1` and
  `effective-delta-v2` generations.
- Recon briefs stay blind: no full manifest or worker provenance is added to
  fix source binding. Negative controls must still fail closed and be proven
  by neutralizing each guard.
- The `--force` fix must not change any non-linked behavior; it keeps and
  reports a `CLAUDE.md` that an `AGENTS.md` resolves to.
- This wave's gates run the installed 0.3.7/0.3.8 CLI and user-scope skills, so
  new gate or lifecycle behavior is probed with the branch build
  (`node packages/cli/dist/index.js`) where feasible.
- Tests that exercise the template bundle tier inject an isolated `HOME`.
- Repository Definition of Done (`AGENTS.md`) gates the PR, with explicit exit
  codes and uncached test runs.

## Success Criteria

- Every acceptance criterion of the 14 items passes, with failing-first
  evidence for behavior changes and neutralize-and-restore proofs for negative
  controls.
- A user-scope-only install can run the lifecycle skills that copy templates.
- `oat docs nav sync` writes committed `meta.json` files for `apps/oat-docs`,
  and `pnpm build:docs` passes.
- Recon's production helpers produce a packet the validator accepts in an
  end-to-end test.
- `pnpm run release:check-versions` passes on a branch that changes only test
  files.
- The full Definition of Done passes, and the PR opens at lockstep 0.3.11 with
  the items archived.

## Out of Scope

- `BL-260711-skip-re-review-for-bookkeeping` (belongs to the
  `review-gate-integrity` project; sequenced after `bind-each-gate-review`).
- `BL-260718-harden-full-surface-gate` (pairs with `add-activity-aware-gate`).
- `BL-260911-support-per-tool-scope` (needs a per-tool intent model decision).
- `BL-261001-record-mixed-native-and-cli`, `BL-261001-make-recon-controller-setup`.
- `BL-261001-route-quick-mode-plan` (adjacent router drift, filed for later).

## Deferred Ideas

- A no-direct-copy validation rule for skills that read `.oat/templates/` —
  the grep check in this wave's acceptance is enough for now.

## Open Questions

None. The one planning question (where the fail-closed check lives) is Key
Decision 11.

## Assumptions

- The 2026-09-26 backlog ratings still hold for unchanged items; the shortlist
  was re-verified against `main` at `8f6d5b1d2` on 2026-10-01.
- Codex v2 agent-residency behavior is as cited in #333 (openai/codex
  `rust-v0.159.2`, `residency.rs`, `spec_plan.rs`); the note documents it as
  cited, not re-verified.
- Fumadocs `meta.json` semantics are as implemented by the installed
  `fumadocs-core` 16.10.2 (`source/schema.js`, the page-tree loader).

## Risks

- **Large skill fan-out:** About fourteen skills change across phases, with
  shared version pins in `validation/skills.test.ts`.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** The first phase to change a skill bumps it and
    its pins once (Key Decision 2).
- **Lifecycle self-reference:** Phase 4 edits the implement and next skills
  this run uses through user-scope links.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Probe with branch artifacts; record any behavior
    change observed mid-run in the learnings log.
- **Formatter round-trip:** Generated `meta.json` must survive the pre-commit
  formatter unchanged.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** A second-run no-op test after formatting.

## External Integration Evidence

- **Fumadocs:** schema and loader read from the installed
  `fumadocs-core` 16.10.2 in this repository's dependencies; no remote source
  needed.
- **Codex v2 agent lifecycle:** primary-source links recorded in GitHub issue
  #333 comments; not re-fetched (coverage limit recorded).
- **GitHub:** `gh` read access verified (PR and issue listing).

## Next Steps

Quick mode, straight to plan (QS-04): proceed directly to `plan.md`.
