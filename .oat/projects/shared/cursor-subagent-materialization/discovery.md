---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-15
oat_generated: false
oat_template: false
oat_template_name: discovery
---

# Discovery: cursor-subagent-materialization

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Operator (2026-07-15): the Cursor team confirmed that while the _native_ subagent model list is narrower than the full Cursor CLI model list, model-pinned subagent definitions are respected — a `model:` pin in an agent definition file uses "the exact model you specify" (now verified as documented behavior, not just verbal confirmation). This unlocks Codex-style materialized, model/effort-pinned subagent variants for Cursor, giving OAT dispatch access to Cursor's full **multi-family** catalogue (GPT/sol-family, Anthropic, Grok, Composer) — a capability no other provider offers. Materialize subagents for Cursor the way OAT already does for Codex.

## Current State (verified 2026-07-15 against main)

- **Codex is fully materialized:** `.codex/agents/oat-{reviewer,phase-implementer}-gpt-5-6-{luna,terra,sol}-{low,medium,high,xhigh}[,max].toml` — generated files (`oat-owner: supported-catalogue` markers) pinning `model` + `model_reasoning_effort` and embedding full role instructions. Generator: `packages/cli/src/commands/providers/codex/materialize.ts`; catalogue: hardcoded `SUPPORTED_CODEX_ROLE_TARGETS` in `packages/cli/src/providers/codex/codec/shared.ts`; owner system distinguishes `supported-catalogue | user-config | project-config` (user/project ladder cells outside the catalogue also get variants materialized).
- **Cursor has none:** `.cursor/agents/` holds only symlinks to canonical unpinned `.agents/agents/*.md`. Dispatch passes an opaque `dispatchArgs.model` string; the skills say "use the exact resolver-returned model value"; `runtimeIdentity` reports `not-reported` for Cursor.
- **The bundled dispatch-matrix recommendation's Cursor cells are gpt-only** (`2026-07-10.2`), while the operator's cloud environment already runs a **proven multi-family Cursor ladder** (`cloud-agent-env-node` `.cursor/oat-user-config.json`, marker version `2026-07-11.1`): Economy = `composer-2.5`, `claude-sonnet-5-high`, `gpt-5.6-luna-high/xhigh`; Balanced = `cursor-grok-4.5-high`, `gpt-5.6-terra-high`; High = `gpt-5.6-sol-medium/high`; Frontier = `claude-fable-5-thinking-high/xhigh`, `gpt-5.6-sol-xhigh/max`. That config also shows the existing availability-probe pattern (`cursor-agent --list-models | grep -Fq -- '<id>'`).

## Cursor Subagent Contract (docs-verified 2026-07-15, cursor.com/docs/subagents)

- **Frontmatter schema is exactly five fields:** `name` (lowercase+hyphens, defaults from filename), `description`, `model` (default `inherit`), `readonly` (default false), `is_background` (default false). **No `tools:` field** (Claude-only syntax). Body = system prompt.
- **Model pinning syntax (documented form):** base model ID + optional bracket params — `gpt-5.6-sol`, `claude-opus-4-8[effort=high]`, `composer-2.5[fast=false]`, combined `[effort=high,context=300k]`. Documented options: `effort`, `context`, `fast` ("available options depend on the model"). **Flat effort-suffixed IDs (`gpt-5.6-sol-high`) are never documented as frontmatter values** — they are the CLI `--list-models`/ladder surface; the two catalogues are not documented as interchangeable.
- **Fallback (not failure) when a pin can't be honored:** team admin restrictions, Max Mode required, plan limitations → "Cursor falls back to a compatible model"; plus legacy request-based plans run subagents on Composer regardless of config. No rejection signal is emitted.
- **Discovery locations:** `.cursor/agents/` plus `.claude/agents/` and `.codex/agents/` compat dirs (project and user level); project beats user; `.cursor/` wins name conflicts over compat dirs.
- **Runtime environment facts (verified live in this repo):** `CURSOR_AGENT=1` provider marker set; `CURSOR_CONVERSATION_ID` gives an agent its own session ID (transcript addressable at `agent-transcripts/<id>/<id>.jsonl`); **no model env var and no model field in transcripts** — a Cursor agent cannot verify its own model.

## Solution Space

### Approach A: Extend the existing materializer (chosen)

**Description:** Generalize the Codex materialization path to a provider-parameterized one. Same canonical `.agents/agents/` sources, same owner-marker system, emitting `.cursor/agents/oat-<role>-<catalogue-id>.md` — a near-pure copy of the canonical file with `model:` frontmatter added (plus managed/owner markers). New `SUPPORTED_CURSOR_ROLE_TARGETS` catalogue constant; sync/doctor/strays machinery generalized.
**Tradeoffs:** touches providers/sync core; but the codec is trivial (frontmatter-only — no instruction re-embedding like Codex TOML) and the mechanism is proven.

### Approach B: Hand-authored variant files

**Tradeoffs:** fast to ship; ~30 files × every future role-instruction change = the drift factory the Codex generator exists to prevent. Rejected.

### Approach C: Dynamic pinning at dispatch time

**Tradeoffs:** no file proliferation, but diverges from the proven Codex launch contract (exact native agent type first) and fights Cursor's agent-discovery model. Rejected.

### Chosen Direction

**Approach:** A — extend the materializer.
**Rationale:** the provider asymmetry is the bug; A removes it with machinery that already works, and the Cursor codec is the cheapest possible codec.
**User validated:** Yes (2026-07-15).

## Key Decisions

1. **Frontmatter-only codec, documented syntax only:** emitted `model:` values use the documented base-ID + bracket form. Flat suffixed IDs never go into generated frontmatter.
2. **Catalogue is an explicit mapping table:** each entry pairs the ladder-surface flat string with its frontmatter form. Known-clean mappings: `gpt-5.6-{luna,terra,sol}-<effort>` → `gpt-5.6-{family}[effort=<effort>]` (incl. `sol-max` → `[effort=max]`); `claude-sonnet-5-high` → `claude-sonnet-5[effort=high]` (docs-example shape); Composer explicitly `composer-2.5[]` (standard) / `composer-2.5[fast=true]` (fast) — bare `composer-2.5` may default fast, so always bracket-explicit. **Awkward entries flagged for the verification lane, not guessed:** `claude-fable-5-thinking-high` (likely base `claude-fable-5-thinking` + `[effort=high]`, since `thinking` is not a documented bracket option and must be part of the family name) and `cursor-grok-4.5-high-fast` (plausibly `cursor-grok-4.5[effort=high,fast=true]`).
3. **Verification lane is a requirement:** implementation launches one pinned test subagent per syntax family and confirms the pin took before a mapping entry is trusted; ambiguous entries are corrected or excluded (mapping is data — one-line fixes). Bonus check: whether flat IDs happen to work (undocumented; never relied upon).
4. **Catalogue scope is multi-family, seeded from the proven cloud ladder** (the operator-authored `2026-07-11.1` set above), not a Codex mirror: gpt-5.6 ladder + Claude family + Grok (Balanced tier per operator) + Composer. Two roles (`oat-reviewer`, `oat-phase-implementer`) × catalogue ≈ 30 files. Cursor-exclusive models ARE the point — that's the differentiating capability.
5. **Bundled `dispatch-matrix-recommendation.json` Cursor cells are enriched in the same project** (multi-family tier placement promoted from the cloud ladder; Grok in Balanced). Variants no ladder cell can select are dead files. The catalogue (capability) stays broader than any one operator's ladder (selection policy) — the operator keeps their own ladder narrow; the layer separation is exactly the existing Codex owner-marker architecture.
6. **Resolver/skill adoption is in scope:** the resolver's Cursor cells emit the materialized variant name Codex-style (launch as native subagent type first), and the dispatch skills' Cursor rules update from "pass the opaque model value" accordingly.
7. **Provenance is launcher-owned, `configured` confidence:** Cursor cannot self-report model identity (no env var, no transcript field, model self-belief unreliable) and pin fallback is silent — so the dispatch audit claims "configured to run X via variant file," never "verified running X." Variant instructions have the agent report `CURSOR_CONVERSATION_ID` (session identity — verifiable) into its output for transcript-precise correlation.

## Constraints

- Canonical skills/agents edits require frontmatter version bumps; generated assets count as shipped functionality → lockstep five-package version bump + `pnpm release:validate`.
- Generated variant names must not shadow or be shadowed across Cursor's compat dirs (`.claude/agents/`, `.codex/agents/`) — name-collision check in the generator.
- The materializer must preserve the Codex owner-marker system (`supported-catalogue | user-config | project-config`) so user/project ladder cells outside the catalogue also materialize.
- Availability probing reuses the existing `cursor-agent --list-models` grep pattern (doctor check: variant pins a model no longer listed).
- Sequencing: independent of `gate-execution-hardening` implementation (no shared files beyond possible dispatch-skill prose adjacency — check at planning; both may touch `oat-dispatch-subagents` references, where gate-hardening p02-t06 adds dispatch-mode guidance).

## Success Criteria

- `.cursor/agents/` contains generated pinned variants for both roles across the catalogue; each body is byte-identical to canonical instructions, while frontmatter is projected to Cursor's documented fields plus managed comments and the mapped model pin.
- Managed Cursor dispatch resolves a ladder cell to a named materialized variant and launches it as the native subagent type; the dispatch audit records launcher-owned `configured` provenance.
- The bundled recommendation's Cursor cells are multi-family; `oat sync`/doctor/strays handle Cursor variants as they do Codex ones.
- Verification lane results recorded: every shipped mapping entry's pin confirmed live (or the entry excluded with a note).

## Out of Scope

- `context=300k`-style large-context variants (deferred idea — e.g. big final reviews).
- `is_background`-pinned variant flavors (deferred — intersects gate-hardening's dispatch-mode guidance; revisit after both land).
- Other roles beyond reviewer/phase-implementer (oat-codebase-mapper etc. — follow-up if the pattern proves out).
- Changing Claude-provider dispatch (unaffected).

## Deferred Ideas

- Large-context reviewer variants via `[context=…]` for oversized final reviews.
- Definition-level `is_background: true` reviewer variants (ties into the dispatch-mode guidance shipping in gate-execution-hardening p02-t06).
- Extending materialization to additional roles.

## Open Questions

- **Awkward mapping decompositions** (Key Decision 2): settle `claude-fable-5-thinking-*` and `cursor-grok-4.5-high-fast` via the verification lane; consult the models reference during implementation.
- **Variant file naming:** keep the ladder-surface flat string as the filename/agent name (`oat-reviewer-claude-fable-5-thinking-high`) for 1:1 resolver mapping, even though the frontmatter uses bracket syntax? (Lean yes — the resolver speaks flat strings.)
- **Does `name:` frontmatter need to be set explicitly** or is filename-derivation sufficient for the launch-by-agent-type contract? (Check at implementation; lowercase+hyphen rule is satisfied either way.)

## Assumptions

- Cursor honors definition-level pins in the operator's environments (docs-confirmed; fallback conditions absent per operator).
- The Codex materializer's structure generalizes without a rewrite (codec interface extraction is enough).

## Risks

- **Silent pin fallback in restricted environments** corrupts provenance claims.
  - **Likelihood:** Low (operator envs unrestricted) / **Impact:** Medium
  - **Mitigation Ideas:** `configured`-not-`verified` audit language (Key Decision 7); doctor availability check.
- **Cursor model-catalogue churn** (model IDs renamed/retired) rots the mapping table.
  - **Likelihood:** Medium / **Impact:** Low
  - **Mitigation Ideas:** availability probe in doctor; mapping is data with one-line fixes.

## Next Steps

Quick mode → **hand off to another agent** for `oat-project-quick-start` (straight to plan is plausible; lightweight design optional if the materializer generalization surfaces structure questions). Discovery is complete and operator-validated — do not re-run discovery.
