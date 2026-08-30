---
id: DR-260621-ship-workflow-gates-at-runtime
title: Ship workflow gates at runtime-level independence; defer same-target dispatch
date: 2026-06-21
status: accepted
legacy_id: ADR-022
---

### ADR-022: Ship workflow gates at runtime-level independence; defer same-target dispatch

- **Date:** 2026-06-21
- **Status:** accepted
- **Drivers:** Cross-provider review gates need a reliable V1 that works from Codex, Claude, and Cursor without making OAT parse model/effort semantics or depend on undocumented active-model signals.
- **Related:**
  - `.oat/projects/shared/workflow-end-triggers/`
  - `.oat/repo/pjm/backlog/items/BL-260830-re-evaluate-same-target-gate.md`
  - `packages/cli/src/commands/gate/index.ts`
  - `packages/cli/src/config/oat-config.ts`

#### Context

The workflow-end-triggers project set out to let gate-aware skills run a final configured command before they are considered done. The flagship use case is independent review: one runtime implements, then another runtime reviews through `oat gate cross-provider-exec`.

During design, the main ambiguity was the independence boundary. Codex CLI and Claude CLI are single-provider runtimes where "not the current runtime" is a practical V1 boundary. Cursor and other multi-provider hosts can run multiple models inside one runtime, which makes "same runtime but different model/effort target" useful but requires target-level detection that is brittle and provider-specific.

#### Options Considered

1. **Ship only raw gate commands.** Rejected because every user would have to encode runtime selection, fallback, and availability checks by hand.
2. **Ship runtime-level `cross-provider-exec` now and defer same-target detection.** Chosen.
3. **Ship same-target/model-level dispatch in V1.** Rejected because Cursor active-model detection is undocumented, slug/variant identity is unresolved, and there is no generic model/effort identity contract across providers.

#### Decision

V1 workflow gates ship with a runtime-level execution model:

- `workflow.gates.skills` stores per-skill gate commands.
- `workflow.gates.execTargets` stores keyed target definitions with opaque ids, `runtime`, argv-form `baseCommand`, optional detection/availability commands, and priority.
- `oat gate cross-provider-exec` defaults to `--avoid same-runtime`, detects the current built-in runtime by host detection command, chooses the highest-priority available non-current runtime, and exits with the child status.
- Built-in runtime detectors are intentionally concrete: `CLAUDECODE` for Claude, `CODEX_THREAD_ID`/`CODEX_SESSION_ID` for Codex, and `CURSOR_AGENT` for Cursor.
- `--target <id>` is the V1 precision escape hatch for manual dispatch, debugging, or deliberately local/user-specific overrides that should pin a specific configured target.
- Config-driven `execPolicy`, `avoid: same-target`, target-level detection, model/effort identity, and `onUnknownTarget` semantics are deferred to `bl-e6fc`.

#### Consequences

- Positive:
  - V1 covers the common cross-runtime review gate without prompt files or provider-specific code paths in skills.
  - Runtime detection is testable and limited to known signals.
  - Target ids and model slugs remain opaque; OAT does not infer model family or effort semantics.
- Trade-offs:
  - Cursor users who want "same Cursor runtime, different model" need the V2 follow-up.
  - Unknown hosts cannot be excluded by runtime unless users pin a target or add custom detection.
  - Same-target independence is not guaranteed by V1.

#### Follow-ups

- Implement `bl-e6fc` only when the same-target use case is worth the target-detection complexity.
- Keep V2 target detection conservative: declaration over introspection, exact target match where possible, and degrade to same-runtime when the current target is unknown.

---
