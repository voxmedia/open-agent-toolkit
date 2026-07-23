# Handoff: Split model-selection guidance into a `subagent-orchestration` skill

**Date:** 2026-07-22
**Origin:** Brainstorming/integration session in `internal-skills` (Cursor), working from a GPT-5 Pro research package dated 2026-07-21 (`~/Downloads/model-selection-guidance-2026-07-21/`).
**Target repo:** `open-agent-toolkit`
**Drafts in this directory are inputs for review, not files to copy blindly.**

## Decision Being Implemented

Restructure OAT's subagent guidance into two skills with progressive
disclosure:

1. **`subagent-orchestration` (new, generic)** — canonical source of
   model-selection policy: durable principles, five task classes, dated
   provider matrices with verification frontmatter, evidence/refresh rules.
   Readable guidance for humans and agents; no OAT-specific content.
2. **`oat-dispatch-subagents` (existing)** — dispatch machinery only: caller
   contract, capability/authorization, native-first routes, floors
   enforcement, catalog evidence, acceptance/recovery, dispatch records. Its
   Required Loading points at `subagent-orchestration` for all
   model-selection content instead of owning provider matrices.

Rationale: model matrices are the volatile, high-maintenance part and were
duplicated across harness files and skills. One canonical skill, N synced
distributions (a private team repo syncs `subagent-orchestration` verbatim
for plugin/direct installs). The intra-OAT dependency is safe because both
skills ship in the utility pack together.

## Drafts Provided Here

- `skills/subagent-orchestration/` — full draft of the new skill: SKILL.md
  (guidance layer), `references/model-selection-principles.md`,
  `references/evidence-and-refresh.md`, and three **selection-only** provider
  references.
- `skills/oat-subagent-dispatch/` — draft rewrite of `oat-dispatch-subagents`
  (directory name here is not a rename instruction; see Open Questions):
  SKILL.md v1.2.0 with rewritten Required Loading (progressive disclosure +
  fail-closed when the guidance skill is absent), `references/record-schema.md`
  (adds optional service-tier/reasoning-mode/guidance-evidence fields), and
  three **mechanics-only** provider references.

The split rule applied: model families, effort semantics, task-class
matrices, anti-recommendations, long-context floors, cyber exception →
selection references. Control surfaces, lifecycle/nested selection
procedures, dispatch mode/liveness, CLI/SDK routes, catalog-mismatch
advisory → mechanics references.

## Content Provenance and Corrections Applied

- Base content: the GPT-5 Pro package's proposed v1.2.0 upgrade of
  `oat-dispatch-subagents` (research verified 2026-07-21).
- **Grok 4.5 correction applied** (research treated it too narrowly):
  `cursor-grok-4.5-medium` is a primary intelligent-recon route and primary
  implementation alternative; `cursor-grok-4.5-high` is the hard-reasoning
  economy route; Grok is never the sole consequential reviewer; CursorBench
  caveat (Cursor repo data entered Grok's training mixture) recorded in the
  Cursor selection reference and `evidence-and-refresh.md`.
- **Safeguards restored:** the research draft condensed operational language
  in `provider-cursor.md`. The mechanics draft restores the full v1.1.5
  wording for Outer Lifecycle Native Selection (notably "Timeout,
  interruption, `BLOCKED`, missing telemetry, or self-report never authorizes
  fallback or replacement") and Reviewer-Local Nested Selection, merged with
  the v1.2.0 additions (service tier, guidance version, SDK control-surface
  row). Diff the mechanics files against current `main` to verify nothing
  else was lost.

## Implementation Checklist (OAT repo)

1. Create `.agents/skills/subagent-orchestration/` from the draft. Frontmatter
   conventions: current draft uses `user-invocable: true`, no
   `disable-model-invocation` (guidance should be discoverable); adjust to
   OAT norms as needed.
2. Rewrite `.agents/skills/oat-dispatch-subagents/` per the draft: SKILL.md +
   mechanics-only references + updated record-schema.
3. Add `subagent-orchestration` to `UTILITY_SKILLS` in
   `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` (same pack
   as `oat-dispatch-subagents` — this is the co-installation guarantee).
4. Update `packages/cli/src/validation/skills.test.ts`: it asserts content
   inside `oat-dispatch-subagents` (e.g. a regex requiring "read exactly one
   … active-provider … oat-dispatch-subagents/references" around line 842,
   and direct reads of `references/provider-cursor.md` / `record-schema.md`
   around lines 888-897). These must be updated for the two-skill layout and
   ideally extended to enforce the split (selection content absent from
   dispatch references and vice versa).
5. Run `oat sync --scope all` to refresh provider views and
   `.oat/sync/manifest.json`.
6. Run the repo's standard validation/test suite.

**Note:** the OAT working tree on `main` currently has an uncommitted diff on
`oat-dispatch-subagents` (the pre-split v1.2.0 draft, +367/−211 plus two new
reference files). It is a raw ingredient for this work — supersede it; do not
commit it as-is.

## Open Questions for the Implementing Agent / Operator

1. **Rename:** operator is considering renaming `oat-dispatch-subagents` →
   `dispatch-subagents` (the skill has almost no OAT-specific content — only
   branding, the `oat-project-dispatch-subagents` adapter pointer, and
   `oat-reviewer` as a named caller). Renaming ripples into
   `oat-project-dispatch-subagents`, `oat-reviewer`, skill-manifest, tests,
   and any skill that loads it by path. Not decided; do not rename without
   operator confirmation.
2. **Effort ladder for Opus/Fable:** research demoted Opus 4.8 relative to
   the operator's prior habits (hard-reasoning default is Fable 5 high, Opus
   as cyber exception + economy). Flagged as review-required, not settled.
3. `subagent-orchestration` may later become a user-scope pack install
   (like core/ideas/utility) so `~/.agents/skills/subagent-orchestration`
   is OAT-managed; global harness files already point at that path.

## Downstream Consumers (context, no action needed in OAT)

- `internal-skills` (private) distributes a verbatim synced copy of
  `subagent-orchestration` under `skills/` for Cursor plugin + direct
  installs; sync script and drift check live there and treat OAT's
  `.agents/skills/subagent-orchestration/` as the source.
- Operator's global `~/.codex/AGENTS.md`, `~/.claude/CLAUDE.md`, and
  `~/.cursor/rules/subagent-orchestration.mdc` now contain durable
  principles only and point at `~/.agents/skills/subagent-orchestration/`.
- Research provenance: personal vault
  `04 - Resources/AI/Agent Orchestration/Model Selection/` (report, decision
  matrix, inventory, sources, refresh policy + changelog);
  Slack-agent guidance in `gizmo-slack-app`
  `.oat/repo/reference/research/model-selection/` (commit `a369d456`).
