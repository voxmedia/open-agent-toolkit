---
oat_generated: true
oat_generated_at: 2026-05-13
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/subagent-model-selection
---

# Code Review: final

**Reviewed:** 2026-05-13
**Scope:** Final code review for `subagent-model-selection` (independent fresh-eyes pass)
**Files reviewed:** 11 (plus 5 publishable package.json bumps)
**Commits:** `177d67f5..HEAD` (9 implementation + bookkeeping commits in scope)

## Summary

Independent fresh-eyes review of the override-only / runtime-selection dispatch design. The implementation faithfully realizes Approach B' across every surface called out in the design: the plan template, plan-writing skill, import-plan skill, implementation orchestrator, both dispatched agents, and the plan-review advisory. Codex managed `.toml` views are byte-identical to canonical agents after stripping wrappers. The five publishable packages are all bumped 0.0.60 → 0.0.61 in lockstep, and each modified canonical SKILL.md has a corresponding `version:` bump. One internal-consistency Minor was found in `oat-project-implement` where the Phase Scope / Review Scope packet templates omit the `dispatch_control` / `dispatch_rationale` fields that the agents document as inputs.

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **`dispatch_control` documented as agent input but omitted from orchestrator Scope templates** (`.agents/skills/oat-project-implement/SKILL.md:461-475`, `.agents/skills/oat-project-implement/SKILL.md:531-540`)
  - Issue: The Runtime dispatch selection section (lines 194-199) says to "Include the resolved dispatch control and rationale in the Phase Scope / Review Scope packet when practical" with explicit `dispatch_control:` and `dispatch_rationale:` keys. However, the canonical Phase Scope template (Step 5, lines 461-475) and Review Scope template (lines 531-540) do not list those fields. Meanwhile, both `oat-phase-implementer.md` (line 36) and `oat-reviewer.md` (line 47) document `dispatch_control` as one of their declared inputs and explicitly reference it in their report formats (`**Dispatch control:** {dispatch_control if provided, otherwise "not provided"}`). The agents tolerate absence gracefully, so this is not a correctness defect, but it creates producer/consumer documentation drift: a Tier 2 inline run that follows the templates literally will not even consider passing the field through.
  - Suggestion: Add `dispatch_control:` (and `dispatch_rationale:` when known) to the Phase Scope block at lines 461-475 and to the Review Scope block at lines 531-540, with a clarifying note that they may be omitted when unknown — mirroring the "when practical" wording already in the Runtime dispatch selection section.

## Spec/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md` (workflow mode: quick).

### Chosen-direction alignment (Approach B': override-only + runtime selection)

| Design property                                                                         | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No planner-generated Dispatch Profile rows                                              | implemented | Template (`.oat/templates/plan.md:54-63`) marks the section optional and "do not generate rows by default"; plan-writing skill (`.agents/skills/oat-project-plan-writing/SKILL.md:54-77`) says "omitted by default" and warns against routine hand-tuning; import-plan skill (`.agents/skills/oat-project-import-plan/SKILL.md:153-159`) explicitly forbids generating recommendation rows. |
| Runtime selection logic with dispatch logging                                           | implemented | `oat-project-implement` §"Runtime dispatch selection" (lines 162-199) documents inputs, selection rule, host-auto fallback, low-confidence preemptive escalation, and the `Dispatching {phase_id} with {dispatch_control}: ...` log shape.                                                                                                                                                  |
| Lowest-confident-tier policy                                                            | implemented | Rule 2 in selection logic (line 177) and rule 4 (line 179) ("low confidence -> choose a stronger available control before dispatch rather than knowingly underpower the phase").                                                                                                                                                                                                            |
| Reviews use strongest available tier by default                                         | implemented | `.agents/agents/oat-reviewer.md:45-51` Dispatch Control section; mirrored in `oat-project-implement` Step 14 final-review guidance still routes through this agent.                                                                                                                                                                                                                         |
| `host-auto` supported when controls not exposed                                         | implemented | `oat-project-implement` selection rule 3 (line 178) and example log lines (line 191); reviewer agent line 51 honors host-auto with rationale.                                                                                                                                                                                                                                               |
| Confidence-based escalation triggers (low confidence, BLOCKED, repeated review failure) | implemented | `oat-project-implement` §"Confidence-Based Dispatch Escalation" (lines 500-516) covers all four design triggers (low confidence, reasoning/capability blockage, two substantive review failures, repeated-class-of-error). Counts against the bounded retry budget as design requires.                                                                                                      |
| Already-strongest-available terminal handling                                           | implemented | Step 4 of escalation (line 516) explicitly says "do not invent a stronger tier" and lists the four design responses (more context / split / revise / stop).                                                                                                                                                                                                                                 |
| Dispatch decision log in `implementation.md`                                            | implemented | Orchestration Run template (lines 660-686) adds a `#### Dispatch Notes` section.                                                                                                                                                                                                                                                                                                            |

### Skill / agent internal consistency

| Surface                                                                                   | Status      | Notes                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---- | ----------- | ------ | ---- | ----- | ----------------------------------- |
| `oat-phase-implementer` — confidence + reasoning-blockage reporting                       | implemented | Lines 81 (tracking guidance), 122 and 187 (`Confidence:` rows in report formats), 119 and 184 (`Dispatch control:` rows).                                         |
| `oat-reviewer` — strongest-available default + host-auto rationale                        | implemented | Dispatch Control section (lines 45-51).                                                                                                                           |
| `oat-project-review-provide` — advisory rules vs design §3.8                              | implemented | Step 4.1 (lines 412-428) covers every Important / Medium / Minor rule from design §3.8 and explicitly says missing section is normal.                             |
| Plan-writing override syntax (`Phase` IDs, Claude/Codex tier enums, blank/auto semantics) | implemented | `.agents/skills/oat-project-plan-writing/SKILL.md:54-77` matches design §3.1 (`haiku                                                                              | sonnet | opus | auto`, `low | medium | high | xhigh | auto`, blank/auto = no constraint). |
| Plan template Dispatch Profile wording is override-only                                   | implemented | `.oat/templates/plan.md:54-63` says "Optional override surface", "Omit this section when runtime selection should choose", and "Do not generate rows by default". |

### Cross-file vocabulary

| Pair                                                                  | Status               | Notes                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator log shape vs agent input field name (`dispatch_control`) | partially consistent | Agents declare `dispatch_control`; orchestrator log uses `{dispatch_control}` substitution; orchestrator inline YAML at lines 197-199 uses `dispatch_control`/`dispatch_rationale`. The only drift is that the explicit Phase Scope / Review Scope templates at lines 461-475 and 531-540 don't list those keys. See Minor finding. |

### Codex managed views (`.codex/agents/*.toml`)

Both managed views are byte-identical to canonical content after stripping the `developer_instructions = """ ... """` wrapper and YAML frontmatter (verified with normalized Python comparison: 11117 bytes match for `oat-reviewer.toml`; 10607 bytes match for `oat-phase-implementer.toml`). `pnpm run cli -- sync --scope project --dry-run` reports both as "already in sync" along with `.codex/config.toml`.

### Lockstep package bumps

All five public packages bumped 0.0.60 → 0.0.61 in `f624a367`:

- `packages/cli/package.json` ✓
- `packages/control-plane/package.json` ✓
- `packages/docs-config/package.json` ✓
- `packages/docs-theme/package.json` ✓
- `packages/docs-transforms/package.json` ✓

### Skill version bumps

| Canonical skill                 | Old version | New version | Bumped                                                                                                                         |
| ------------------------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `oat-project-implement`         | 2.0.6       | 2.0.7       | yes                                                                                                                            |
| `oat-project-import-plan`       | 1.2.1       | 1.2.2       | yes                                                                                                                            |
| `oat-project-plan-writing`      | 1.2.1       | 1.2.2       | yes                                                                                                                            |
| `oat-project-review-provide`    | 1.3.2       | 1.3.3       | yes                                                                                                                            |
| `oat-phase-implementer` (agent) | 1.0.0       | 1.0.0       | n/a — agents do not have a `version:` bump rule in AGENTS.md; the AGENTS.md guardrail covers `.agents/skills/*/SKILL.md` only. |
| `oat-reviewer` (agent)          | 1.0.1       | 1.0.1       | n/a — same reason.                                                                                                             |

The four modified SKILL.md files all carry version bumps that satisfy the AGENTS.md guardrail. The two `.agents/agents/*.md` files were edited but, by the AGENTS.md wording, only canonical SKILL.md files require a version bump; flagging this is not necessary unless the project explicitly extends the rule to agents. (Worth noting for awareness but not a finding.)

### Plan-review advisory completeness vs design §3.8

| Design §3.8 rule                                                                          | Implementation (`oat-project-review-provide` Step 4.1)                                   | Match |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| Important: invalid phase ID                                                               | yes                                                                                      | ✓     |
| Important: unknown active-provider tier                                                   | yes                                                                                      | ✓     |
| Important: low-tier override on multi-file integration / architecture / review-heavy work | yes ("low-tier override for multi-file integration, architecture, or review-heavy work") | ✓     |
| Important: low-tier override with missing/generic rationale                               | yes                                                                                      | ✓     |
| Medium: malformed but recoverable table                                                   | yes                                                                                      | ✓     |
| Medium: mid-tier override for architecture-heavy without convincing rationale             | yes                                                                                      | ✓     |
| Minor: rationale present but weakly tied to phase scope                                   | yes                                                                                      | ✓     |
| Silent: missing section is normal                                                         | yes ("must not be flagged")                                                              | ✓     |

### Extra work (not in declared requirements)

None observed. No code outside the prompt/skill/template guidance scope. No CLI helpers were added (matches discovery constraint).

## Verification Commands

```bash
# Plan grep markers for runtime-selection + advisory surfaces
grep -n "override\|runtime selection" .oat/templates/plan.md
grep -n "override\|runtime selection" .agents/skills/oat-project-plan-writing/SKILL.md
grep -n "Dispatch Profile\|runtime selection" .agents/skills/oat-project-import-plan/SKILL.md
grep -n "Runtime dispatch selection\|host-auto\|low confidence\|Dispatch:" .agents/skills/oat-project-implement/SKILL.md
grep -n "Confidence\|reasoning" .agents/agents/oat-phase-implementer.md
grep -n "strongest available\|host-auto" .agents/agents/oat-reviewer.md
grep -n "Dispatch Profile override advisory\|invalid phase" .agents/skills/oat-project-review-provide/SKILL.md

# Codex managed-view drift check
pnpm run cli -- sync --scope project --dry-run

# Lockstep + release guardrails
pnpm release:validate
```

## Recommended Next Step

If the Minor finding is accepted as worth fixing, run `oat-project-review-receive` to convert it into a follow-up plan task. Otherwise, the implementation is ready for merge as-is — no Critical/Important/Medium findings were raised in this independent pass.
