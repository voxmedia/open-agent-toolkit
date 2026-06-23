---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-06-23
oat_generated: false
oat_template: false
---

# Discovery: pjm-refresh

## Initial Request

Restructure OAT's project-management repo-reference layer so concurrent
worktrees and the user's two-machine workflow no longer collide on shared
PJM artifacts. The audit bundle copied from the laptop is primary directional
intel, but each claim must be validated against this checkout before it is
designed or implemented.

Problem statement: the current PJM layer mixes allocator-visible-only state
with shared aggregate files. Backlog items are file-per-record, but their IDs
are hash IDs collision-checked only against the current worktree, and the
committed index is a full regenerated table. Decisions are worse: sequential
ADR/DR numbers live in one shared document with no allocator, command, or
collision guard. Roadmap and current-state are also shared prose files.

The target is the locked two-layer taxonomy:

- `pjm/` for active operational state: current-state, roadmap, backlog.
- `reference/` for durable append-mostly state: decisions, project summaries,
  research, brainstorms, imported plans, decks.
- Existing `knowledge/`, `analysis/`, and `reviews/` stay unchanged.

## Clarifying Questions

### Question 1: Scope Model

**Q:** Should this be a full spec-driven OAT project or a direct patch?
**A:** Full spec-driven project, named `pjm-refresh`.
**Decision:** Run discovery, design, plan, then implementation using OAT
project artifacts.

### Question 2: Design Authority

**Q:** Should the audit be treated as final truth?
**A:** Directional only. Validate against live source and current conventions.
**Decision:** Use the audit to seed decisions, but flag stale or contradictory
claims in design before coding.

### Question 3: Rollout Boundaries

**Q:** Is a fleet migration in scope?
**A:** No. Migration is per repo, one worktree at a time.
**Decision:** Ship a current-repo migration command and an agent-runnable
prompt. Do not build a "migrate all repos" flow.

### Question 4: Cleanup

**Q:** What should happen to the copied audit bundle after the project?
**A:** Remove it from this machine when done so it is not forgotten.
**Decision:** Track final cleanup for `/Users/tstang/code/oat-audit` and
`/tmp/oat-audit` in the implementation plan.

## Solution Space

### Approach 1: Structural Restructure With Committed Deterministic Indexes

**Description:** Move active PJM state into `pjm/`, split decisions into
file-per-record records, use allocator-free date+slug IDs, and keep indexes
committed but deterministic.

**When this is the right choice:** Best when the goal is offline, repo-local,
two-machine safe work without adding an external source of truth.

**Tradeoffs:** Some shared prose files remain and can still conflict, but the
highest-risk ID and shared-body conflict classes are removed.

### Approach 2: External Tracker as Source of Truth

**Description:** Move backlog and roadmap state into a central tracker and
render repo snapshots.

**When this is the right choice:** Useful for repos already standardized on an
external tracker and willing to depend on network/auth.

**Tradeoffs:** Out of scope. It does not solve decisions or current-state and
would not work for repos without tracker setup.

### Approach 3: Git Merge Plumbing Around Current Layout

**Description:** Keep the current files and add merge drivers or union merge
rules for generated/shared files.

**When this is the right choice:** A lowest-touch mitigation when storage
migration is not possible.

**Tradeoffs:** Rejected for this project. It mitigates text conflicts but does
not eliminate semantic sequential-ID collisions.

### Chosen Direction

**Approach:** Structural restructure with committed deterministic indexes.
**Rationale:** It directly removes the root cause: allocator/counter decisions
made from a partial worktree view and decision records stored in one shared
body.
**User validated:** Yes. The user supplied this as the locked direction and
explicitly excluded the Linear bridge and fleet migration.

## Key Decisions

1. **Taxonomy:** Use `pjm/` for active state and `reference/` for durable
   append-mostly artifacts.
2. **IDs:** Use `dr-YYMMDD-slug` and `bl-YYMMDD-slug`. ID equals filename
   stem. New records use no scan, hash, counter, or nonce.
3. **Decisions:** Store decisions as file-per-record under
   `reference/decisions/`, with a committed generated index.
4. **Indexes:** Keep backlog and decision indexes committed, not gitignored,
   with no merge driver. Conflict protocol is regenerate then `git add`.
5. **Migration:** Ship a per-repo migration command and bundled prompt. No
   fleet operation.
6. **Asset Shipping:** New templates, skills, prompts, and AGENTS docs must be
   registered in both bundle-assets and package validation surfaces.

## Constraints

- Lockstep public package version bump is required for shipped CLI, skill,
  template, doc, or bundled-asset behavior.
- `pnpm release:validate` is required before completion.
- `.agents/skills/*/SKILL.md` edits require one frontmatter version bump per
  changed skill in the final PR diff.
- The audit bundle was copied from `laptop`; it is not part of this repo and
  must be removed from this machine after project completion.
- Changes must be additive before path-flipping existing repos so new behavior
  can ship without breaking unmigrated consumers.

## Success Criteria

- New repositories can initialize the two-layer PJM structure.
- Existing PJM repositories can dry-run and apply a current-repo migration that
  preserves content and legacy IDs.
- Backlog and decision IDs are allocator-free date+slug IDs.
- Backlog and decision indexes regenerate byte-identically from the same record
  set across filesystem ordering differences.
- Skills and lifecycle flows target `pjm/` plus `reference/decisions/` and do
  not create inline decision records outside `oat decision`.
- Bundled assets include every new template, skill, AGENTS document, and
  migration prompt needed by npm consumers.
- Release validation, tests, lint, type-check, and build pass.

## Out of Scope

- Linear or any external tracker bridge.
- `verge-mobile-app` identity re-home.
- A fleet-wide migration command.
- Changing `knowledge/`, `analysis/`, or `reviews/` ownership.

## Deferred Ideas

- Let `oat sync` refresh arbitrary `.oat/repo/AGENTS.md` files if instruction
  sync later owns repo-reference docs.
- A generated or fragment-based roadmap/current-state model. This project keeps
  them as narrative docs with anti-conflict conventions.
- Broader lifecycle guidance generation for AGENTS.md beyond PJM routing.

## Open Questions

Resolved in design:

- **Decision Index:** Confirm exact marker and columns.
- **Phasing:** Ensure additive decision support lands before the path move.
- **AGENTS Ownership:** Decide whether `oat sync` owns new `.oat/repo/AGENTS.md`
  files or `oat pjm init` does.
- **Research Destination:** Decide how `deep-research` writes to
  `reference/research/` without tightly coupling the research pack to PJM.

## Assumptions

- Current live source is more authoritative than audit line references because
  the copied audit was generated on another machine.
- Existing OAT test conventions, aliases, Commander command style, and asset
  bundling tests remain the implementation guide.
- The current repo's project-management pack is enabled, so the new PJM doctor
  checks must be meaningful in this repo.

## Risks

- **Large Surface Area:** CLI, templates, skills, docs, and release packaging
  all change together.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Phase the work, keep tests close to each component,
    and run release validation before completion.
- **Audit Drift:** Some audit docs predate the locked design and propose
  conflicting hash or merge-driver approaches.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Use the locked user prompt and live source as final
    authority, and record stale claims explicitly in design.
- **Migration Loss:** Splitting legacy decision files could drop prose if the
  parser is too narrow.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Preserve bodies verbatim, count records before
    retiring monoliths, and provide dry-run output.

## Validation Notes

- Live source confirms no existing `oat decision` command group.
- Live source confirms backlog IDs still use a 4-hex hash plus local scan.
- Live source confirms backlog defaults still point at
  `.oat/repo/reference/backlog`.
- Live source confirms `oat pjm init` currently writes
  `current-state.md`, `roadmap.md`, `decision-record.md`, and backlog under
  `reference/`.
- Live source confirms PM pack templates still include `decision-record.md`.
- Live source confirms `oat-project-summary` and `oat-project-pr-final` do not
  currently create decision records; they summarize or prepare PR text.

## Next Steps

Proceed to design with the locked approach and the resolved open questions.
