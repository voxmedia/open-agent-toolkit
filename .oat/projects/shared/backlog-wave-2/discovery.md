---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-09-27
oat_generated: false
---

# Discovery: backlog-wave-2

## Initial Request

Deliver Wave 2 of the 2026-09-26 backlog review
(`.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md`, Section 5) as
one tackle-backlog wave, minus the deferred recap-export lane, plus the new
high-priority CLAUDE.md shim item. The operator approved the exact batch and
topology on 2026-09-27: twelve backlog items, five sequential phases, one PR,
Claude (Opus) implementing, Codex `codex-6-sol-xhigh` as the independent
reviewer for the plan gate, every phase gate, and the final review, and a
project dispatch policy of `high`.

Approved items:

| Item                                       | Title                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `BL-260903-close-manual-only-agents-md`    | Close manual-only AGENTS.md refresh loop (GitHub #322)                                               |
| `BL-260927-name-only-installed-pack`       | Name only installed pack locations in the OAT tools guidance block (#323)                            |
| `BL-260909-fix-the-agents-md-unsafe`       | Fix the agents-md unsafe-directory test race under parallel turbo                                    |
| `BL-260927-make-claude-md-shims-opt`       | Make CLAUDE.md shims opt-in now that Claude Code reads AGENTS.md                                     |
| `BL-260829-order-phase-bookkeeping-before` | Order phase bookkeeping before per-phase review dispatch                                             |
| `BL-260907-record-absorbed-projects`       | Record absorbed projects and backlog items for Lite consolidations                                   |
| `BL-260907-route-quick-mode-discovery`     | Route quick-mode discovery rows in oat-project-next and oat-project-progress straight to quick-start |
| `BL-260909-repair-the-bare-fences-that`    | Repair the bare fences that swallow headings outside .agents/skills                                  |
| `BL-260927-validate-recon-worker`          | Validate recon-worker assignment envelopes deterministically before launch (#295)                    |
| `BL-260909-give-packages-control-plane`    | Give packages/control-plane a check script so its formatting is CI-gated                             |
| `BL-260909-rewrite-inbound-references`     | Rewrite inbound references when oat backlog archive moves an item                                    |
| `BL-260904-stabilize-the-collection`       | Stabilize the collection-detach engine integration test                                              |

Each item file under `.oat/repo/pjm/backlog/items/` holds the authoritative
acceptance criteria; the plan maps every criterion to a task.

## Clarifying Questions

### Question 1: `oat tools where`

**Q:** `BL-260927-name-only-installed-pack` requires a recorded decision on
shipping an `oat tools where` command.
**A:** Defer it (operator, 2026-09-27).
**Decision:** Record an explicit deferral; ship only the guidance-block fix.

### Question 2: Live acceptance for bookkeeping ordering

**Q:** `BL-260829-order-phase-bookkeeping-before` requires verification on a
real multi-phase run, but gates and lifecycle skills run the installed release,
so this wave cannot observe the changed skill.
**A:** Ship the code and contract tests and keep the item open (operator,
2026-09-27).
**Decision:** The item is not archived; its note records that only live
observation on the next multi-phase project remains.

### Question 3: CLAUDE.md shims

**Q:** How should the new no-shim default treat existing shims, this
repository's shims, and scheduling?
**A:** Remove OAT-managed shims automatically, drop this repository's shims,
and schedule the item into this wave. Any CLAUDE.md that remains produces a
warning telling the user to remove it or to set a shim strategy and rerun sync
(operator, 2026-09-27; `DR-260927-claude-md-shims-are-opt`).

## Solution Space

The batch, its order, and its topology were settled during backlog review and
operator approval; the approach per item is fixed by each item's criteria and
the decision records below. Chosen direction: one quick project, five
sequential phases grouped by shared write sets, one PR.

## Key Decisions

1. **Topology:** Five sequential phases in one PR. Parallel worktrees are
   unsafe because `project-guidance.ts`, `oat-doctor/SKILL.md`, `pjm/init.ts`,
   and `help-snapshots.test.ts` are shared by p01 and p02;
   `named-skill-load-contract.test.ts` by p03 and p04; `.agents/agents/oat-reviewer.md`
   by both p04 items; and `packages/cli/src/validation/skills.test.ts` version
   pins by every phase that bumps a skill.
2. **Shim config key:** `documentation.instructionSyncStrategy`
   (`none | pointer | symlink | copy`, absent means `none`), placed beside the
   existing `documentation.instructionPointerExcludes` that governs the same
   `oat instructions` commands.
3. **`BL-260830-persist-instruction-sync`:** Closed as absorbed by the shim
   item. The strategy is persisted in project config; the init prompt it asked
   for is dropped because the default is now `none` and opting in is one
   `oat config set`. Its "migration preserves existing installations" criterion
   is superseded by `DR-260927-claude-md-shims-are-opt`.
4. **Bookkeeping ordering route:** Commit the phase's task ledger
   (`implementation.md` task/phase completion and the `state.md` resume
   pointer) before dispatching the per-phase reviewer, and name review-outcome
   bookkeeping (review rows, dispositions) as post-review and out of scope in
   the reviewer brief. The fix child still starts from a clean tree because the
   pre-review bookkeeping is committed, which preserves the reason the old order
   existed.
5. **Recon assignment validator home:** A script in the recon skill's
   `scripts/` beside `validate-packet.mjs`, reusing its contract library, so it
   ships with the pack that launches recon workers; `oat-reviewer.md` runs it
   before launch.
6. **Read-only guidance emission:** A read-only command prints the managed OAT
   tools guidance block (human and `--json`) without installing or upgrading
   assets; `oat-doctor` hints point at it.
7. **Inbound-reference AC3:** The executable bidirectional-link check is the
   external-plan contract test in `skills-bundled-docs-contract.test.ts`
   ("every current external plan is accepted under its date-selected mode"),
   which enforces plan-to-item backlinks. It is run on the tip after this
   wave's archives, alongside a sweep for remaining `pjm/backlog/items/<id>.md`
   references.
8. **Version bumps:** One lockstep bump (0.3.8 → 0.3.9) in the fan-in; one
   `metadata.version` bump per changed skill and one top-level `version:` bump
   per changed agent role across the whole PR.

## Constraints

- Repository Definition of Done (AGENTS.md): eight gates in CI order with
  explicit exit codes; forced turbo runs with an isolated `HOME` as evidence.
- Failing-first tests for every defect fix; neutralize-and-restore proof for
  load-bearing negative controls.
- Lanes run `oat sync --scope project`, never `--scope all`.
- Never edit `packages/cli/assets/skills/**` (build output).
- Gates run the installed CLI (0.3.7) and installed skills, not the branch.

## Success Criteria

- Every acceptance criterion of the eleven closable items passes with recorded
  evidence, and those items are archived with `oat backlog archive` in the PR.
- `BL-260829-order-phase-bookkeeping-before` ships its change and contract
  tests and stays open with the live-observation note.
- `BL-260830-persist-instruction-sync` is closed as absorbed.
- The full Definition of Done passes on the final head; independent phase gates
  and the final review pass or have dispositioned findings.

## Out of Scope

- `oat tools where` (deferred, recorded).
- The recap export change (`BL-260927-export-only-the-recap-page`, deferred by
  the operator).
- The three sibling flakes named in `BL-260909-fix-the-agents-md-unsafe`'s
  notes (`workflow.test.ts:476`, `tools/smoke/cursor-broker.test.mjs`,
  `capture-dirty-tree.test.mjs:694`).
- The dead duplicate applier in `init/tools/workflows/index.ts:116-300`
  mentioned in `BL-260903-close-manual-only-agents-md`'s description but absent
  from its criteria.
- Review-cap umbrella work and later backlog-review waves.

## Deferred Ideas

- `oat tools where [--json]` - deferred by the operator; the guidance-block fix
  removes most of the confusion it targeted.

## Open Questions

None blocking. Implementation-level choices (append detection algorithm,
reference-rewrite versus warn) are made in the owning tasks within each item's
criteria.

## Assumptions

- The Claude Code `agents-md` plugin behavior at tag v2.1.278 is the reference
  for shim documentation.
- `stabilize-the-collection`'s fix already landed at `ddddba079`; only the
  ten-uncached-run evidence remains.

## Risks

- **Shim removal deletes tracked files in user repositories:** Removal is
  restricted to exact OAT-managed shapes; hand-written files are reported,
  never deleted; `--dry-run` lists removals.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Exact-shape matching, negative-control tests, release
    notes.
- **Append path races a concurrent writer:** Append-only writes never touch
  existing bytes; a concurrent-edit fixture proves user content survives.
  - **Likelihood:** Low
  - **Impact:** High
  - **Mitigation Ideas:** `O_APPEND` with trailing-newline check; negative
    control.
- **Hidden shared test pins cause cross-phase conflicts:** Sequential phases
  and one bump per skill avoid it.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Sequential phases; bump in the first touching task.

## External Integration Evidence

- Claude Code built-in `agents-md` plugin, `anthropics/claude-code`
  `mods/agents-md/README.md` at tag v2.1.278 (read 2026-09-27 via `gh api`):
  `instructionFiles` defaults to `claude-md-or-agents-md`; any `CLAUDE.md`,
  `.claude/CLAUDE.md`, or `CLAUDE.local.md` from the project root down to the
  working directory makes the plugin stand down for the whole project (a
  user's `~/.claude/CLAUDE.md` does not count); the option is read only from
  user, `--settings`, or managed settings. Coverage limit: behavior of later
  Claude Code releases is not verified.
- No other external systems are involved; all other evidence is local source at
  the wave base.

## Workflow Decisions (Autonomous)

- **QS-01:** Working tree clean at start; no dirty-tree decision needed.
- **QS-04 (design depth):** Straight to plan. Rationale: every item has
  operator-approved scope, recorded decisions (`DR-260927-*`), and verified
  file-level write sets from three read-only recon lanes at `c7d08e496`; the
  remaining choices are implementation-local and settled above.
- **QS-05 (requirements gate):** Auto-confirmed under the non-interactive
  branch; the confirmed requirement set is the Key Decisions, Constraints, and
  Success Criteria above.

## Next Steps

Quick mode, straight to plan.
