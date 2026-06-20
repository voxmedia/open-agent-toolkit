---
id: bl-e6fc
title: 'Gates V2: same-target execution + target-level detection (workflow-end-triggers follow-up)'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: L # XS | S | M | L | XL | XXL
labels: [gates, workflow-end-triggers, cross-provider, v2]
assignee: null
created: '2026-06-20T17:40:00Z'
updated: '2026-06-20T17:40:00Z'
associated_issues: [{ type: project, ref: 'workflow-end-triggers' }]
oat_template: false
---

## Description

Follow-up to the **workflow-end-triggers** project (per-skill gates + cross-runtime
review execution). V1 ships cross-**runtime** independence only — `avoid: same-runtime`,
where the gate's `oat gate cross-provider-exec` picks a different _runtime_ (Codex ↔
Claude) and detection is **runtime-level only**. This item captures the deferred
**same-target** layer so it doesn't have to be re-derived.

**The deferred capability:** let a gate stay on the _same runtime_ but switch to a
different _execution target_ (model / effort) — e.g. "review on Codex but with a
different model," or "same Cursor session, different model." This is `avoid: same-target`,
and it requires **target-level identity/detection**, which is the brittle part V1
intentionally skips.

### Why deferred

Same-target avoidance drags in target-level detection, which is hard and provider-specific:
there is no reliable runtime signal for "I am model X at effort Y inside this session."
V1 sidesteps it entirely by avoiding at the runtime level. This item is where the
target-detection machinery lands once it's worth the complexity.

### Design already settled (Codex session 2026-06-20)

Builds on V1's config shape `workflow.gates.{ execTargets, skills }`.

- **`execTargets`** registry, keyed by opaque target id (OAT never parses the id; semantics
  live in `baseCommand`):

  ```jsonc
  "execTargets": {
    "codex-default":      { "runtime": "codex",  "baseCommand": ["codex","exec"], "priority": 100 },
    "codex-gpt55":        { "runtime": "codex",  "baseCommand": ["codex","exec","--model","gpt-5.5"], "priority": 90 },
    "claude-default":     { "runtime": "claude", "baseCommand": ["claude","-p"], "priority": 100 },
    "claude-opus":        { "runtime": "claude", "baseCommand": ["claude","-p","--model","opus"], "priority": 90 },
    "claude-opus-xhigh":  { "runtime": "claude", "baseCommand": ["claude","-p","--model","opus","--effort","xhigh"], "priority": 80 },
    "cursor-default":     { "runtime": "cursor", "baseCommand": ["cursor-agent","-p","--force"], "priority": 70 }
  }
  ```

  Target fields: `runtime` (logical family for independence rules), `baseCommand` (argv —
  avoids shell-quoting), `hostDetectionCommand?`, `availabilityCommand?`, `priority`,
  optional `targetDetectionCommand?` / `targetIdentity?` (V2). Built-ins for codex/claude/cursor;
  keyed **partial** merge across layers (a partial object overrides built-in fields; `null`
  disables a target) — distinct from `skills.<skill>` which is whole-object replacement.

- **Per-skill `execPolicy`** override on `gates.skills.<skill>`:

  ```jsonc
  "execPolicy": {
    "avoid": "same-target",                 // same-runtime (V1) | same-target | none
    "targetPriority": ["claude-opus-xhigh","codex-gpt55","claude-default"],  // optional per-skill order/filter
    "onUnknownTarget": "degrade-to-same-runtime"  // degrade-to-same-runtime (default) | allow
  }
  ```

- **Selection algorithm** (extends V1's runtime-only version):
  1. Merge target registry (built-ins + config layers).
  2. Sort by descending `priority` (or `targetPriority` if set).
  3. Determine current target: declaration-first (`OAT_CURRENT_TARGET` stamped by launcher) →
     `targetDetectionCommand` / built-in probe → unknown.
  4. `avoid: same-target` → exclude exact current target; `avoid: same-runtime` → exclude all
     targets sharing the current runtime.
  5. Run `availabilityCommand` for candidates in priority order; first exit-0 wins.
  6. Exec `baseCommand + [prompt...]`; pass through stdout/stderr; exit with child status.

- **`onUnknownTarget: degrade-to-same-runtime` (conservative default):** if `avoid: same-target`
  but OAT can't pin the exact current target, fall back to avoiding the whole current runtime
  (preserves independence — never risk re-selecting the same target). `allow` opts into
  same-runtime fallback for power users.

- **Cursor target detection (built-in best-effort):** `cursor-agent --list-models | awk -F' - '
'/\(current\)$/ {print $1; exit}'`, centralized in OAT (not user awk). Caveats: undocumented
  surface (`(current)` not a formal contract); ~1.5–3s latency per probe (fine once-per-gate);
  **slug-vs-variant gotcha** — `--list-models` may report `composer-2.5` while the dispatch slug
  is `composer-2.5-fast` (with `fast: true` in `~/.cursor/cli-config.json`). Do not auto-normalize
  `composer-2.5` ≡ `composer-2.5-fast` without a tested rule; exact match → detected, else unknown
  → degrade. Prefer `oat internal cursor-current-target matches <slug>` over raw shell in config.

### Load-bearing rules (carried from V1, must hold in V2 too)

- **No fallback after dispatch.** Pre-dispatch fallback (provider unavailable/unauthenticated)
  is fine; once the chosen target _runs_ and exits nonzero, that IS the gate result — never try
  another target, or a real failed review gets masked.
- **Declaration over introspection** for current-target identity (env stamped by the launcher),
  with detection commands only as best-effort fallback.

## Acceptance Criteria

- `execPolicy.avoid: same-target` is supported on per-skill gates, alongside V1's `same-runtime`.
- `cross-provider-exec` resolves the current **target** (declaration-first via `OAT_CURRENT_TARGET`,
  then `targetDetectionCommand` / built-in probe, then unknown) and excludes it under `same-target`.
- `onUnknownTarget` defaults to `degrade-to-same-runtime`; `allow` is opt-in.
- Built-in best-effort Cursor target detection exists and is centralized in OAT, documented as
  best-effort with the slug-vs-variant caveat handled conservatively (exact match or degrade).
- The no-fallback-after-dispatch rule and declaration-over-introspection rule are preserved.
- Multiple targets can share a `runtime` (model/effort variants) without OAT parsing target ids.
- Depends on V1 (`workflow-end-triggers`): config shape `gates.{execTargets,skills}`, the
  `oat gate cross-provider-exec` command, and runtime-level detection must already exist.
