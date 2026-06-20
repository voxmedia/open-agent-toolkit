---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-06-20
oat_generated: false
---

# Discovery: workflow-end-triggers

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Add a **trigger / gate mechanism** to OAT workflows — and potentially OAT skills in
general. The idea: a skill (or workflow step) can have a configured final
step — a **gate** — that **must run before the skill is considered fully
executed**. Defined per-skill in OAT config. Like a stop hook, but specific to
the skill it is attached to: if a gate exists for a skill, you run it.

The flagship motivation is **cross-model / cross-provider verification**. For
`oat-project-implement`, the gate would dispatch an _independent_ review in a
fresh session — e.g. if Claude implemented, Codex runs `oat-project-review-provide`
as an independent final review (or vice versa). The same mechanism on
`oat-project-plan` would force an independent agent to review the plan before it
is considered done. The gate command is generic, though: it can be any CLI/bash
command or npm/pnpm script the user wants run as a dependency of "done."

## Solution Space

This was an exploratory brainstorm. The design converged through a series of
forks, each captured below as a Key Decision. The headline shape:

**A per-skill gate, defined in OAT config, that runs a generic command as the
final step of a skill and governs whether that skill is "done."** "Trigger" and
"gate" collapse into one mechanism — a trigger is just a gate whose failure
behavior is advisory.

### Chosen Direction

**Approach:** A thin, per-skill gate config (`description` + `command` +
`onFailure` + `maxAttempts`) that the executing agent runs as a final skill
step. The command is generic (exit code is the universal pass/fail signal); the
intelligence lives inside the command (e.g. a cross-model reviewer prompt or an
OAT review skill). Context is resolved implicitly via OAT state + the invoked
skill — no plumbing. Feedback flows back via captured stdout plus any artifacts
the command writes; the `description` tells the orchestrating agent how to
process that feedback and what to do next.

**Rationale:** Keeps the mechanism dumb and the command smart. One field
(`onFailure`) spans the whole enforcement spectrum from hard auto-remediation to
advisory note. Leans on OAT's existing strength — implicit context via state —
so the flagship cross-model review case needs zero new context-passing
machinery.

**User validated:** Yes — converged interactively across the full brainstorm.

## Key Decisions

1. **Unified gate/trigger model:** One mechanism, not two. A "trigger" is just a
   gate with `onFailure: warn`. Gate vs trigger collapses into the failure-behavior
   field.

2. **Generic command, exit-code contract:** The gate runs _any_ command (bash,
   npm/pnpm script, `codex exec`, `claude -p`, …). The universal success signal
   every command already shares is the **exit code** — exit 0 = pass, nonzero =
   fail. No bespoke verdict schema. The command carries its own pass logic.

3. **`onFailure` spans the spectrum** with three values:
   - `block` — **autonomous remediation loop.** On nonzero exit, the agent reads
     the feedback, dispositions/addresses it on its own judgement, re-runs, and
     proceeds when clean. "Figure this out before proceeding." Escalates to the
     human only when genuinely stuck.
   - `prompt` — surface the failure and ask the human to decide disposition.
   - `warn` — advisory; record it and continue (this is the "trigger" case).

4. **`block` is bounded by `maxAttempts` (default 2), then escalate.** Prevents
   an overzealous / non-deterministic reviewer from wedging the loop or churning
   tokens indefinitely. After N failed remediation rounds, auto-escalate to the
   human with accumulated feedback. (Chosen over convergence-detection or an
   unbounded "trust the agent to self-terminate" approach.)

5. **Agent-enforced baseline.** The gate is run by the executing agent as a real
   final skill step (not a dumb shell check), because `block`'s auto-remediation
   loop inherently requires agent judgement. This is provider-portable. A
   deterministic CLI-boundary enforcement is available _additionally_ wherever an
   `oat` subcommand owns the boundary (the strongest "MUST" guarantee), but the
   portable agent-enforced step is the baseline.

6. **Context is implicit via OAT state + the invoked skill.** The flagship gate
   command is just `oat-project-review-provide` run in a fresh session; the skill
   already knows how to resolve project/diff/scope from OAT state and git. The
   gate config passes no context. Fresh session = independence (clean context,
   ideally a different model).

7. **Feedback handoff: stdout always captured + artifacts when present (the "C"
   option).** Exit code is the pass/fail signal; stdout/stderr is always captured
   and shown to the remediating agent; when the gate is an OAT review skill, the
   richer review artifact (e.g. under `reviews/`) is the primary structured
   source. A dumb `pnpm lint` gate works on stdout alone.

8. **Two distinct config fields with distinct audiences (refined late):**
   - `command` → speaks to the **gate runner**. Self-contained; it _is_ the gate
     agent's prompt. Everything the fresh session needs lives here or in the skill
     it invokes.
   - `description` → speaks to the **orchestrating / main agent**. _Why_ the gate
     exists, how to read its result, and **what to do next** (e.g. "run
     `oat-project-review-receive`, process findings, address blocking issues,
     re-run until clean"). No overlap with `command`; the earlier idea of also
     briefing the gate-runner via `description` was rejected as duplication.

## Reference Config Shape (illustrative — not a deliverable spec)

```jsonc
// OAT config, per skill
"gates": {
  "oat-project-implement": {
    // for the MAIN/orchestrating agent: why + how to process the result + next steps
    "description": "Independent cross-model review. On completion, run oat-project-review-receive, process findings, address blocking issues, re-run until clean.",
    // for the GATE runner: self-contained command / prompt; fresh session = independence
    "command": "codex exec 'Run oat-project-review-provide for the active project as an independent final review...'",
    "onFailure": "block",   // block (auto-remediate loop) | prompt (ask human) | warn (advisory)
    "maxAttempts": 2         // block only; then escalate to human
  }
}
```

## Constraints

- Mechanism stays **thin / dumb**; intelligence lives in the command and the
  skill it invokes.
- Must be **provider-portable** at the baseline (agent-enforced final step works
  for any provider/runtime).
- Pass/fail contract is the **process exit code** — no custom verdict format.
- Gate context resolution must reuse **existing OAT state/skill mechanisms** — no
  new context-passing plumbing for the OAT-native flagship case.

## Success Criteria

- A skill with a configured gate runs that gate as a final step before being
  considered "done."
- `onFailure: block` drives an autonomous remediation loop bounded by
  `maxAttempts`, escalating to the human on exhaustion.
- `onFailure: prompt` and `onFailure: warn` behave as surface-and-ask and
  advisory-note respectively.
- The flagship cross-model case works end-to-end with zero bespoke
  context-passing: implement (one model) → independent review gate (another
  model) → remediation loop → done.
- Gate output (stdout + any artifact) is available to the remediating agent, and
  the `description` orients it on next steps.

## Out of Scope

- Per-provider harness-level Stop-hook implementations (the purest un-skippable
  enforcement) — noted as a possible future layer, not this project.

## Open Questions

### Resolved during discovery discussion

- **Config location & precedence — RESOLVED.** Gates live in `workflow.gates`,
  keyed by skill name, supported in **all** config layers. Precedence follows the
  existing most-specific-wins model: local project config (`.oat/config.local.json`)

  > repo project config (`.oat/config.json`) > user config (`~/.../config.json`).
  > Merge is **keyed on the skill** — no within-gate value merging across layers; a
  > layer that defines a skill's gate replaces the whole gate object, and a layer can
  > disable a single skill's gate (e.g. `null`) without affecting others. Provider
  > choice is user-specific, so **user config is the expected primary home** for the
  > cross-model gate; repo/local exist for project-specific overrides and disables.
  > (Exact resolver wiring to be confirmed in design — matches `workflow.*` resolution.)

- **Skill eligibility — RESOLVED (hybrid, opt-in marker).** A skill declares itself
  gate-aware via its own frontmatter (e.g. `oat_gateable: true`) plus a standard
  final "run configured gate" step. Config can only attach gates to skills that
  advertise the capability. Honoring the gate is part of the skill's own contract
  (not an external bolt-on), which satisfies "MUST run before done." Avoids the
  silent-no-op trap of pure config-convention and the drift of a central registry.
  Lifecycle skills (`implement`, `plan`) adopt the marker first; "any skill in
  general" becomes "any skill that adopts the marker" — an incremental path.

### Deferred to design (mechanism detail, not product decisions)

- **Enforcement boundary mechanics — design.** Largely settled by the
  agent-enforced baseline + opt-in marker: the enforcement boundary _is_ the skill's
  final gate-run step. Deterministic CLI-boundary enforcement stays out of scope for
  v1 (see Out of Scope). Design covers only the agent-enforced step.
- **Loop state / observability — design.** Keep lightweight: in-memory accumulation
  across the `maxAttempts` loop, surfaced into the escalation message and appended to
  existing tracking (`implementation.md` or equivalent) on escalation. No new
  persistent store. Design pins the exact landing spot.

## Next Steps

Open questions resolved (config location, skill eligibility) and design-level
items dispositioned. Proceed to **lightweight design** (`design.md`) covering the
gate config schema (`workflow.gates`), the `oat_gateable` opt-in marker + standard
gate-run skill step, the bounded remediation loop, and the feedback/escalation
landing spots.
