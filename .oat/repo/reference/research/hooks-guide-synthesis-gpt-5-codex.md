---
skill: synthesize
schema: synthesis
topic: 'Provider-Agnostic Hooks for Open Agent Toolkit'
model: gpt-5-codex
generated_at: 2026-04-05
source_count: 2
---

# Provider-Agnostic Hooks for Open Agent Toolkit — Synthesis

## Executive Summary

Both source artifacts converge on the same core conclusion: OAT should support hooks, but only through a portable-core abstraction rather than a Claude-shaped superset. The common portable center is command hooks over the overlapping Codex and Claude lifecycle events, with provider-specific capabilities captured as extensions instead of treated as universally available behavior.

The synthesis also converges on an architectural constraint: hooks do not fit OAT's current simple path-mapping model. Codex hooks synthesize into aggregate `hooks.json`, while Claude hooks live inside aggregate `settings.json` structures and can also appear in skill or agent frontmatter. That means hook support belongs in the provider-adapter and synthesized-config layer, closer to existing Codex role/config export logic than to current rule fanout.

The main disagreement is rollout timing. The Opus artifact argues for a documentation/scaffolding-first phase that defers sync until Codex stabilizes. The Codex artifact argues that phase 1 can already include portable subset export/import if OAT treats hooks as synthesized config rather than plain path mappings. The evidence leans toward a split rollout: phase 1a should establish canonical format, research docs, and scaffolding immediately; phase 1b should add portable subset import/export once a merge-safe synthesis spike validates Claude settings handling and Codex churn is acceptable.

## Synthesis Methodology

This synthesis consumed 2 research artifacts from the same directory:

- `hooks-guide-opus-4-6.md`
- `hooks-guide-gpt-5-codex.md`

Both sources were `deep-research` outputs on the same topic using the `architectural` schema. Reconciliation prioritized:

1. multi-source agreement
2. explicit contradictions
3. the more concrete source where one artifact referenced current OAT implementation details more directly
4. the more conservative operational recommendation when the disagreement was about rollout risk rather than end-state direction

The synthesis does not perform new research. It only reconciles the findings and recommendations already present in the two source artifacts.

## Source Agreement

### Portable-core hook abstraction is the right target

Both sources agree that OAT should define a canonical hook abstraction around the shared Codex/Claude subset instead of modeling Claude Code's full hook platform as the canonical baseline.

Convergent findings:

- the portable core is command hooks, not the entire Claude feature surface
- the overlapping lifecycle points are `SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, and `Stop`
- provider-only capabilities should be preserved through explicit extensions rather than hidden downgrades

Contributing sources:

- `hooks-guide-opus-4-6.md`
- `hooks-guide-gpt-5-codex.md`

### Hooks should become a canonical OAT content family

Both sources recommend treating hooks as first-class canonical OAT assets rather than leaving them as provider-local configuration fragments.

Convergent findings:

- introduce a new canonical hook namespace under `.agents/hooks/`
- package hooks as directory-based units with room for scripts and references
- add a dedicated authoring workflow similar to `create-agnostic-skill`

Contributing sources:

- `hooks-guide-opus-4-6.md`
- `hooks-guide-gpt-5-codex.md`

### Plain path mappings are insufficient

Both sources agree that hooks cannot be implemented as only another `PathMapping`.

Convergent findings:

- Codex export targets aggregate `.codex/hooks.json`
- Claude export targets aggregate `.claude/settings.json` hook blocks
- import/adoption has to split aggregate provider configs into canonical hook units
- provider synchronization for hooks therefore needs merge-aware synthesis logic

Contributing sources:

- `hooks-guide-opus-4-6.md`
- `hooks-guide-gpt-5-codex.md`

### Existing Claude hooks can be adopted, but only through classification

Both sources agree that OAT can and should help users adopt stray Claude Code hooks, but only with portability classification.

Convergent findings:

- portable command hooks on overlapping events are strong candidates for canonical adoption
- Claude-only advanced handlers and event families should either remain provider-local or be marked `providers.codex: false` / extension-only
- Claude-specific environment assumptions need normalization during adoption

Contributing sources:

- `hooks-guide-opus-4-6.md`
- `hooks-guide-gpt-5-codex.md`

### `create-agnostic-hook` is justified

Both sources independently conclude that a hook-authoring skill is warranted.

Convergent findings:

- scaffold canonical hook packages
- default to the portable subset
- expose compatibility guidance at creation time
- mirror the philosophy of `create-agnostic-skill` rather than pretending portability where it does not exist

Contributing sources:

- `hooks-guide-opus-4-6.md`
- `hooks-guide-gpt-5-codex.md`

### Hooks can improve OAT workflows directly

Both sources identify workflow-native OAT use cases beyond provider adaptation.

Common opportunities:

- stop-time continuation/quality gates
- session-start project hydration
- prompt submission guardrails
- Bash safety and post-Bash validation

Claude-leaning but still valuable opportunities:

- file/config drift detection
- worktree bootstrap and teardown
- subagent lifecycle review gates

Contributing sources:

- `hooks-guide-opus-4-6.md`
- `hooks-guide-gpt-5-codex.md`

## Contradictions

### Contradiction 1: how broad phase 1 should be

**Position A: scaffold-first phase 1, defer sync**

The Opus artifact recommends phase 1 as canonical format plus scaffolding skill only, explicitly avoiding sync integration until Codex hooks stabilize and the config-merge adapter pattern is validated.

Evidence cited there:

- Codex hooks are still experimental
- Claude merge semantics add implementation risk
- canonical docs and scaffolding already provide immediate value

Source:

- `hooks-guide-opus-4-6.md`

**Position B: include portable import/export in phase 1**

The Codex artifact recommends phase 1 include portable subset import/export for Codex and Claude, on the basis that the shared subset is already useful and OAT already has a precedent for synthesized provider config handling.

Evidence cited there:

- overlap is sufficient for a meaningful portable command-hook lane
- existing Codex role/config export provides an architectural precedent
- adoption of Claude settings hooks is central to user value

Source:

- `hooks-guide-gpt-5-codex.md`

**Lean**

Lean toward a split rollout:

- **Phase 1a**: canonical `.agents/hooks/`, hook docs, `create-agnostic-hook`, and example hooks
- **Phase 1b**: portable subset import/export once a spike proves merge-safe Claude settings synthesis and acceptable Codex churn

Rationale:

- this preserves the conservative delivery risk posture from the Opus report
- it also preserves the stronger product value argument from the Codex report
- the disagreement is about sequencing, not the target architecture

This is a lean, not a resolved fact.

### Contradiction 2: current Claude event count

**Position A**

The Opus artifact describes Claude Code as exposing 27 events.

Source:

- `hooks-guide-opus-4-6.md`

**Position B**

The Codex artifact describes the current official Claude docs as listing 26 documented events.

Source:

- `hooks-guide-gpt-5-codex.md`

**Lean**

Lean toward **26 current documented events** because the Codex artifact aligned this count to the current official event table it summarized directly. The difference does not materially change the architecture recommendation.

This is a lean, not a resolved fact.

## Unique Insights

### Unique to the Opus artifact

- A more detailed canonical `HOOK.md` proposal, including sections like `Behavior`, `Requirements`, and portable event enums.
- A concrete three-tier event portability model and adoption decision tree.
- Specific workflow opportunities around version bump reminders and pre-commit sync verification.
- A stronger documentation-first recommendation that positions canonical HOOK docs as valuable even without sync support.

Source:

- `hooks-guide-opus-4-6.md`

### Unique to the Codex artifact

- A clearer tie-in to the current OAT codebase limits: `ContentTypeSchema`, scanner assumptions, and path-mapping constraints.
- A stronger argument that hooks belong in a synthesized-config export layer analogous to existing Codex role/config handling.
- A sharper warning against making the canonical model too Claude-shaped.
- A more concrete split between portable opportunities and Claude-only workflow opportunities.

Source:

- `hooks-guide-gpt-5-codex.md`

## Consolidated Recommendations

1. Add hooks as a new canonical OAT content family under `.agents/hooks/`, using directory-based hook packages rather than a single aggregate file format.

2. Define the canonical schema around the shared Codex/Claude command-hook subset:
   - `SessionStart`
   - `PreToolUse`
   - `PostToolUse`
   - `UserPromptSubmit`
   - `Stop`

3. Represent provider-specific behavior explicitly through extensions such as `x_claude` and `x_codex`, instead of treating Claude's full hook surface as portable.

4. Implement hook sync through synthesized provider config, not only `PathMapping` fanout:
   - Codex: synthesized `.codex/hooks.json`
   - Claude: merge-aware synthesis into `.claude/settings.json`

5. Support adoption of existing Claude settings hooks into canonical hook packages, but classify them into:
   - portable portable-subset hooks
   - canonical but provider-limited hooks
   - provider-local hooks that should not be exported cross-provider

6. Add a `create-agnostic-hook` skill once the canonical hook contract is stable.

7. Sequence delivery in two close phases:
   - phase 1a: canonical format, docs, examples, scaffolding skill
   - phase 1b: portable subset import/export after a synthesis/merge spike validates the implementation risk

8. Use hooks to strengthen OAT workflows where the providers overlap first:
   - stop-time completion gates
   - session-start hydration
   - prompt guardrails
   - Bash policy and post-Bash validation

## Provenance Table

| Source File                                               | Skill           | Schema          | Model         | Generated At |
| --------------------------------------------------------- | --------------- | --------------- | ------------- | ------------ |
| `.oat/repo/reference/research/hooks-guide-opus-4-6.md`    | `deep-research` | `architectural` | `opus-4-6`    | `2026-04-05` |
| `.oat/repo/reference/research/hooks-guide-gpt-5-codex.md` | `deep-research` | `architectural` | `gpt-5-codex` | `2026-04-05` |

## Sources & References

### Synthesized source artifacts

1. `.oat/repo/reference/research/hooks-guide-opus-4-6.md`
2. `.oat/repo/reference/research/hooks-guide-gpt-5-codex.md`

### Underlying provider docs cited by the source artifacts

3. OpenAI, "Codex Hooks" - `https://developers.openai.com/codex/hooks`
4. Anthropic, "Claude Code Hooks" - `https://code.claude.com/docs/en/hooks`
5. Anthropic, "Automate workflows with hooks" - `https://code.claude.com/docs/en/hooks-guide`

### Local OAT references cited by the source artifacts

6. `packages/cli/src/shared/types.ts`
7. `packages/cli/src/engine/scanner.ts`
8. `packages/cli/src/engine/compute-plan.ts`
9. `packages/cli/src/providers/shared/adapter.types.ts`
10. `packages/cli/src/providers/shared/adapter.utils.ts`
11. `packages/cli/src/providers/codex/codec/export-to-codex.ts`
12. `packages/cli/src/providers/codex/codec/import-from-codex.ts`
13. `packages/cli/src/commands/shared/adopt-stray.ts`
14. `apps/oat-docs/docs/provider-sync/providers.md`
15. `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
16. `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`
17. `../../../../.agents/docs/provider-reference.md`
