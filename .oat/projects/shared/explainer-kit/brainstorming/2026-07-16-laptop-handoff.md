# Explainer Kit Brainstorm — Laptop Restart Handoff

Use this prompt to restart the brainstorm from the laptop:

> `/oat-brainstorm`
>
> We are continuing the active spec-driven OAT project at
> `.oat/projects/shared/explainer-kit/`. Start by reading:
>
> 1. `.oat/projects/shared/explainer-kit/discovery.md`
> 2. `.oat/projects/shared/explainer-kit/brainstorming/2026-07-16-skill-map.html`
> 3. The three existing skill drafts under
>    `.oat/projects/shared/explainer-kit/references/skill-drafts/`
>
> Run the brainstorm visual companion locally on this laptop and use the
> committed HTML as the initial working map. It is provisional, not an approved
> architecture.
>
> Scope correction from the operator: only `explainer-kit` and
> `oat-explainer-kit` are in scope. `personal-explainer-kit` should be removed
> from this project's intended deliverables.
>
> Continue exploring these questions, one at a time:
>
> - Inspect the actual installed/source versions and provenance of
>   `visual-explainer:*`, `engineering-explainer`, `skeptic`, and
>   `ovm-gdoc-sync` before deciding their roles. The current draft names them,
>   but we do not yet know which are external MIT-licensed sources, personal
>   wrappers, or overlapping capabilities.
> - Minimize mandatory dependencies. Determine whether useful behavior should
>   be adapted with attribution into OAT, wrapped as optional capabilities, or
>   absorbed directly into the generic core.
> - Preserve the core boundary: `explainer-kit` must remain generic,
>   destination-blind, config-file-blind, and runnable without OAT.
> - Define an OAT "project explainer" generated after planning/review. It should
>   turn discovery, requirements/spec, design decisions, and the plan into a
>   more consumable visual briefing.
> - Define an OAT "project recap" generated after autonomous implementation and
>   final review. It should explain the original request, agent decisions,
>   as-built architecture, implementation record, validation evidence, and
>   outcome.
> - Decide the lifecycle checkpoints and opt-in state for both products:
>   explicit invocation, a project-level request recorded during discovery or
>   autonomous kickoff, automatic generation after plan review, and/or
>   automatic generation after final review/summary.
> - Revisit the existing discovery agenda after this expanded scope:
>   palettes, packaging, typed config, publish contract, and template
>   neutrality.
>
> If using two Cursor peers, call them **Sol** and **Fable**. Follow
> `session-observer-collab`, but first verify whether the laptop topology
> provides real Orca terminal handles. Logical Orca orchestration handles may
> work even when sidebar agents are not terminal-backed; test the channel before
> relying on it. Keep both peers read-only except for one explicitly assigned
> writer.
>
> During brainstorming, update `discovery.md` only when decisions genuinely
> converge. Do not begin implementation or formal design yet.

## Context from the interrupted Mini session

- The initial shared interpretation was that the kit's unique value is the
  end-to-end production method: source reconciliation, cited fact base,
  adversarial challenge, narrative gate, shared shells, render/cohesion QA,
  publishing, and verification—not merely pointing to diagram/deck generators.
- The likely shape is one generic engine plus one OAT adapter, with lifecycle
  products implemented as recipes or modes rather than duplicate engines.
- The first visual map intentionally marks dependency disposition and lifecycle
  timing as unresolved.
- The Mini-side collaboration was stopped before substantive architecture
  discussion began, so no peer consensus should be inferred.
