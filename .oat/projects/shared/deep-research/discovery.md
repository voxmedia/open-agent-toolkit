---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-14
oat_generated: false
---

# Discovery: deep-research

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Build five new OAT-compatible agent skills forming a research, analysis, verification, and synthesis suite:

| Skill                       | Slash command    | Output                       | Relationship                                             |
| --------------------------- | ---------------- | ---------------------------- | -------------------------------------------------------- |
| Adversarial claim evaluator | `/skeptic`       | Inline                       | Self-contained                                           |
| Comparative analysis        | `/compare`       | Inline or artifact           | Standalone + sub-agent of /deep-research                 |
| Deep research orchestrator  | `/deep-research` | Artifact (always)            | Orchestrator, dispatches /compare                        |
| Multi-angle deep analysis   | `/analyze`       | Artifact (always)            | Analyzes existing artifacts/systems from multiple angles |
| Multi-source synthesizer    | `/synthesize`    | Artifact (default) or inline | Consumes outputs from any of the above                   |

These skills form a layered system: `/skeptic` is self-contained, `/compare` is standalone but also invokable as a sub-agent from `/deep-research` and `/analyze`, `/deep-research` is the research orchestrator, `/analyze` is the analysis orchestrator (analyzing what you _have_ rather than researching what you _don't know_), and `/synthesize` sits at the end of the pipeline — merging outputs from any of the above (potentially from different agents/models) into a single coherent report.

Brainstorming was completed in a Claude Chat session (see `reference/brainstorming.md`). A draft SKILL.md for `/skeptic` was produced (see `reference/skeptic-SKILL.md`). `/synthesize` and `/analyze` were added during the design phase.

## Key Decisions

1. **Adversarial-first posture for /skeptic:** When invoked, the evaluator's primary job is to disprove the claim first. Supporting evidence is only noted after exhausting contradicting evidence. This matches the user's intent — they're already skeptical.

2. **Context-aware evidence sourcing:** "Going external" means finding the best evidence for the claim type in the current environment — not always web search. Sources include local files, lockfiles, git history, docs MCP, npm registry, web search depending on claim type.

3. **Sub-agent tier system:** Three tiers for evaluation dispatch — Tier 1 (dedicated sub-agent), Tier 2 (self-evaluation fallback, recommended), Tier 3 (inline, user-requested). Graceful degradation across providers.

4. **Four verdict frames for /skeptic:** Holds up, You were right to be skeptical, Nuanced, Genuinely inconclusive. Always attempt a clear lean.

5. **/compare: domain-aware dimensions.** Evaluation criteria are domain-dependent (npm packages vs architectural approaches vs business strategies). Classification upfront determines dimensions.

6. **/compare: dual output modes.** Inline by default, artifact via explicit `--save` flag. Artifact mode uses the `comparative` extended schema shared with /deep-research.

7. **/deep-research: always produces an artifact.** The artifact is the deliverable. Output target resolution: Obsidian vault → specified path → default artifact/download.

8. **Schema hierarchy for /deep-research.** Base template (executive summary, sources, methodology) extended by domain schemas: technical, comparative (shared with /compare), conceptual, architectural.

9. **Cross-provider compatibility.** All five skills must work across Claude Code, Cursor, Codex, and Claude.ai with graceful degradation. Sub-agent spawning, question asking, and tool availability adapt per environment.

10. **/analyze: multi-angle analysis of existing artifacts/systems.** Input is something concrete (file, directory, codebase, document, deck, idea). The skill classifies the input type, selects applicable analysis angles, dispatches sub-agents per angle, and produces an artifact. Always artifact output.

11. **/analyze: six analysis angles.** Adversarial/critical, gap analysis, opportunity analysis, structural/organizational, consistency/coherence, audience/clarity. All six are always applicable; the skill emphasizes angles most relevant to the input type.

12. **/analyze: `--context` flag for evaluation criteria.** The primary input is the thing to analyze; `--context` provides the criteria to evaluate against (e.g. security policy, business requirements, style guide). This is a cross-cutting flag also available on `/compare` and `/deep-research`.

13. **/synthesize: superset output schema.** Output schema is a superset of the input type — includes all fields from the input schema plus synthesis-specific fields (agreement/disagreement tracking, provenance attribution, confidence from multi-source convergence).

14. **/synthesize: artifact by default, not required.** Default output is an artifact, but inline is available for simple cases.

15. **/synthesize: auto-detect from directory.** Primary input mode is directory-based auto-detection (scan for structured artifacts via frontmatter). Optional explicit file path arguments as override.

16. **/synthesize: flag + lean for conflicts.** When sources disagree, the synthesis flags the disagreement and notes a lean — but explicitly marks it as a lean, not a decided fact.

17. **`--context` flag (cross-cutting).** `/compare`, `/deep-research`, and `/analyze` support a `--context path` flag that points to a file (or directory) providing additional context — links, file paths, constraints, evaluation criteria, background. The skill reads it and incorporates into its work. Not applicable to `/skeptic` (claim is the context) or `/synthesize` (inputs are the context).

18. **Model-tagged filenames (cross-cutting).** When /compare, /deep-research, or /analyze write artifacts to a shared directory, they must add the model identifier to the filename (e.g. `topic-opus-4-6.md`, `topic-gpt-5-4.md`). The agent self-identifies its model. This prevents collisions when multiple agents target the same output directory and enables /synthesize to attribute findings by source.

## Constraints

- Skills must follow OAT skill conventions (frontmatter, SKILL.md structure, `.agents/skills/` canonical location)
- **Provider-agnostic sub-agent dispatch** — must follow the 3-tier pattern established in `oat-project-review-provide`: Tier 1 (provider-native dispatch), Tier 2 (fallback), Tier 3 (inline). Skill body uses portable language; provider-specific tool names only in detection logic sections.
- Cross-provider compatibility required (Claude Code, Cursor, Codex, Claude.ai)
- /skeptic output is always inline — never produces a file
- /deep-research output is always an artifact — never inline-only
- /analyze output is always an artifact — never inline-only
- /synthesize output defaults to artifact but can be inline
- Shared `comparative` schema between /compare artifact mode and /deep-research
- **`--context` flag** — `/compare`, `/deep-research`, and `/analyze` accept `--context path` for supplementary evaluation criteria or background
- **Model-tagged filenames** — /compare, /deep-research, and /analyze must add model identifier to output filenames when writing artifacts, preventing collisions when multiple agents target the same directory
- Step logging follows the established OAT convention (phase banner, `[N/N]` steps, `→` for long ops)

## Success Criteria

- Five SKILL.md files that work as standalone skills
- /skeptic adversarially evaluates claims with cited evidence and confidence scores
- /compare produces domain-appropriate comparisons with clear recommendations
- /deep-research orchestrates parallel research and produces structured artifacts
- /analyze produces multi-angle analysis of existing artifacts/systems with prioritized recommendations
- /synthesize merges multiple artifacts (including multiple analyses) into a single coherent report with provenance tracking
- /compare can be invoked as a sub-agent from /deep-research and /analyze using the shared comparative schema
- Multiple agents targeting the same output directory produce distinct, non-colliding filenames
- All skills degrade gracefully when sub-agent dispatch or specific tools are unavailable
- `/compare`, `/deep-research`, and `/analyze` accept and correctly incorporate `--context` supplementary input

## Out of Scope

- Global vs repo-local install decision — defer to user preference per deployment
- Obsidian MCP integration details for /deep-research output

**Scope expanded during design (acknowledged):**

- Schema template files (base + extended) — originally deferred, now included as reference files alongside the deep-research skill. Needed for structured artifact output.
- Sub-agent definition file (skeptical-evaluator) — originally deferred, now included as a dedicated agent definition. Needed for Execution Tier 1 dispatch.

## Open Questions

- **/compare scoring:** Resolved — qualitative by default (clear winner declaration), numeric matrix only if user explicitly requests it.
- **/compare auto-artifact:** Resolved — explicit `--save` flag only. No complexity-based auto-trigger.
- **/deep-research depth control:** Resolved — interactive classification upfront by default, with `--depth` flag (surface/standard/exhaustive) as optional override.
- **/deep-research repo cloning:** Deferred — start without repo cloning. Can add as opt-in later when docs MCP coverage is assessed.
- **/deep-research focus narrowing:** Resolved — supports `--focus` argument (e.g. `--focus security`, `--focus performance`) to narrow research to a specific angle.

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
