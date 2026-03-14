---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-13
oat_generated: false
---

# Discovery: deep-research

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Build three new OAT-compatible agent skills forming a research and verification suite:

| Skill                       | Slash command    | Output             | Relationship                             |
| --------------------------- | ---------------- | ------------------ | ---------------------------------------- |
| Adversarial claim evaluator | `/skeptic`       | Inline             | Self-contained                           |
| Comparative analysis        | `/compare`       | Inline or artifact | Standalone + sub-agent of /deep-research |
| Deep research orchestrator  | `/deep-research` | Artifact (always)  | Orchestrator, dispatches /compare        |

These skills form a layered system: `/skeptic` is self-contained, `/compare` is standalone but also invokable as a sub-agent from `/deep-research`, and `/deep-research` is the orchestrator that may dispatch both.

Brainstorming was completed in a Claude Chat session (see `reference/brainstorming.md`). A draft SKILL.md for `/skeptic` was produced (see `reference/skeptic-SKILL.md`).

## Key Decisions

1. **Adversarial-first posture for /skeptic:** When invoked, the evaluator's primary job is to disprove the claim first. Supporting evidence is only noted after exhausting contradicting evidence. This matches the user's intent — they're already skeptical.

2. **Context-aware evidence sourcing:** "Going external" means finding the best evidence for the claim type in the current environment — not always web search. Sources include local files, lockfiles, git history, docs MCP, npm registry, web search depending on claim type.

3. **Sub-agent tier system:** Three tiers for evaluation dispatch — Tier 1 (dedicated sub-agent), Tier 2 (self-evaluation fallback, recommended), Tier 3 (inline, user-requested). Graceful degradation across providers.

4. **Four verdict frames for /skeptic:** Holds up, You were right to be skeptical, Nuanced, Genuinely inconclusive. Always attempt a clear lean.

5. **/compare: domain-aware dimensions.** Evaluation criteria are domain-dependent (npm packages vs architectural approaches vs business strategies). Classification upfront determines dimensions.

6. **/compare: dual output modes.** Inline by default, artifact via `--save` flag or detected complexity. Artifact mode uses the `comparative` extended schema shared with /deep-research.

7. **/deep-research: always produces an artifact.** The artifact is the deliverable. Output target resolution: Obsidian vault → specified path → default artifact/download.

8. **Schema hierarchy for /deep-research.** Base template (executive summary, sources, methodology) extended by domain schemas: technical, comparative (shared with /compare), conceptual, architectural.

9. **Cross-provider compatibility.** All three skills must work across Claude Code, Cursor, Codex, and Claude.ai with graceful degradation. Sub-agent spawning, question asking, and tool availability adapt per environment.

## Constraints

- Skills must follow OAT skill conventions (frontmatter, SKILL.md structure, `.agents/skills/` canonical location)
- **Provider-agnostic sub-agent dispatch** — must follow the 3-tier pattern established in `oat-project-review-provide`: Tier 1 (provider-native dispatch), Tier 2 (fallback), Tier 3 (inline). Skill body uses portable language; provider-specific tool names only in detection logic sections.
- Cross-provider compatibility required (Claude Code, Cursor, Codex, Claude.ai)
- /skeptic output is always inline — never produces a file
- /deep-research output is always an artifact — never inline-only
- Shared `comparative` schema between /compare artifact mode and /deep-research
- Step logging follows the established OAT convention (phase banner, `[N/N]` steps, `→` for long ops)

## Success Criteria

- Three SKILL.md files that work as standalone skills
- /skeptic adversarially evaluates claims with cited evidence and confidence scores
- /compare produces domain-appropriate comparisons with clear recommendations
- /deep-research orchestrates parallel research and produces structured artifacts
- /compare can be invoked as a sub-agent from /deep-research using the shared comparative schema
- All skills degrade gracefully when sub-agent dispatch or specific tools are unavailable

## Out of Scope

- Full schema file definitions (base + extended) — capture as templates later if needed
- Sub-agent definition files (`.agents/agents/skeptical-evaluator.md`, etc.) — can be added after skills are stable
- Global vs repo-local install decision — defer to user preference per deployment
- Obsidian MCP integration details for /deep-research output

## Open Questions

- **/compare scoring:** Should scoring be numeric or qualitative? Brainstorming leaned toward qualitative with a clear winner declaration unless user requests a matrix.
- **/compare auto-artifact:** Should artifact mode trigger automatically based on complexity (options × dimensions), or only via explicit `--save` flag?
- **/deep-research depth control:** What's the right stopping condition? Options: interactive classification upfront, `--depth` flag (surface/standard/exhaustive), or both.
- **/deep-research repo cloning:** Should cloning repos for technical research be opt-in, or auto-triggered when docs MCP coverage is poor?
- **/deep-research focus narrowing:** Should it support a `--focus` argument (e.g. `--focus security`, `--focus performance`)?

## Assumptions

- OAT sync tooling will handle propagation of new skills to provider views (`.claude/skills/`, `.cursor/skills/`, `.codex/agents/`)
- The `Agent` tool (Claude Code) or equivalent is available for sub-agent dispatch in most environments
- Web search and web fetch tools are available in most environments for factual/documentation claims

## Risks

- **Schema coupling between /compare and /deep-research:** Shared `comparative` schema creates a coupling point. Changes to the schema affect both skills.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Keep schema definition in a shared reference location; version it

## Next Steps

Proceed to plan generation. The brainstorming doc is comprehensive enough that a lightweight design is optional — the key architecture (layered skill system, schema hierarchy, sub-agent tiers) is already well-defined in the brainstorming. Open questions can be resolved during implementation of /compare and /deep-research.
