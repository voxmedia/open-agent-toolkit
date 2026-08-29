---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-29
oat_generated: false
---

# Discovery: agent-provider-root

> Revalidation notice: this discovery is a starting point, not an exhaustive
> inventory. Revalidate the affected asset surface, provider formats, candidate
> roots, and current merged-PR state before design approval and again before
> implementation. New canonical skills, agents, providers, or sync contracts
> may change these conclusions.

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

> "Seems like maybe we should have a `${AGENT_PROVIDER_ROOT}` and then we can do
> `${AGENT_PROVIDER_ROOT}/skills` or `${AGENT_PROVIDER_ROOT}/agents`"

Raised by the user at the final HiLL checkpoint of the `portable-agent-references`
project, in response to a deferred Medium finding that project's final review had
just re-scoped. The user then asked for this project to be scaffolded with seeded
discovery so the provenance, the problem, and the risks of deferring are all
preserved.

Backlog item: `BL-260829-unified-agent-provider-root` (priority high, scope L).

## Problem

Skills that read canonical **agent** definitions still use bare repo-relative
paths, for example:

```
canonical role instructions from `.agents/agents/oat-reviewer.md`
```

These dangle when the owning pack is installed at user scope, because agent
assets install to a scope-relative destination:

```ts
// packages/cli/src/commands/tools/shared/pack-manifest.ts
function agent(name: string): PackAssetDefinition {
  return { kind: 'agent', source: `agents/${name}`, destination: `.agents/agents/${name}`, ... };
}
```

At user scope the file lives at `~/.agents/agents/<name>.md`, while the bare
path resolves against the consuming repo. This is the same defect class the
`portable-agent-references` project eliminated for cross-skill reads — but on a
path shape its ratchet cannot see. The matcher covers only `.agents/skills/`:

```
/(?<![/a-zA-Z0-9_.-])(?:(?:\.\.?\/)*\.agents\/skills\/|(?:\.\.\/)+)([a-zA-Z0-9_-]+)\/(SKILL\.md|references(?:\/[a-zA-Z0-9_.-]+)*\/?)/g
```

`.agents/agents/` appears nowhere in that alternation, so the entire skill→agent
direction is unenforced and new instances can land freely.

### Verified surface (2026-08-29)

Nine sites across five skills in two packs. Four are genuinely executable:

| Site                                                             | Nature                                |
| ---------------------------------------------------------------- | ------------------------------------- |
| `oat-project-review-provide/SKILL.md:649`                        | fresh Codex child fallback            |
| `oat-project-review-provide/SKILL.md:892`                        | inline Tier 3 review template pointer |
| `oat-project-plan-writing/SKILL.md:210`                          | fresh child fallback                  |
| `oat-project-implement/references/dispatch-and-dry-run.md:25-26` | fresh child fallback                  |

Descriptive or pointer-only, to be judged individually:
`oat-project-review-provide-remote/SKILL.md:119` and `:315`;
`skeptic/SKILL.md:116` and `:117` (these describe provider sync and are likely
exempt).

Owning packs are `workflows` and `research`, both `defaultScope: 'user'` — the
exact user-default surface the ratchet is meant to cover.

## How we got here

The finding was recorded as a deferred Medium in the very first
`portable-agent-references` phase review and carried forward through every
subsequent round. Its final review
(`.oat/projects/shared/portable-agent-references/reviews/final-review-2026-08-29T082359Z.md`)
corrected the recorded scope: the original finding named a single file, but the
real surface is nine sites across five skills, four executable. That correction
is the main reason this warrants its own project rather than a cleanup commit.

The reason it had no clean fix inside that project: **no portable spelling for
agent reads exists anywhere.** A sweep of all canonical skills on 2026-08-29
found zero `${...}`-bound agent-read conventions. Closing the finding requires
inventing a convention, which is a design decision — not a mechanical port of
an existing pattern.

## Solution Space

### Approach 1: Unified `${AGENT_PROVIDER_ROOT}` with `/skills` and `/agents` leaves _(Recommended, user-proposed)_

**Description:** Bind one provider root — `${HOME}/.agents`, then
`<repo-root>/.agents` — and derive both leaves from it.

**Why it fits:** The two existing candidate lists already share their last two
entries; only the leaf differs.

```
skills:  ${SKILL_DIR}/..  ->  ${HOME}/.agents/skills  ->  <repo-root>/.agents/skills
agents:                       ${HOME}/.agents/skills  ->  <repo-root>/.agents/skills
```

Both user and project tiers are `<X>/.agents/` plus a leaf, so the unified root
is a faithful refactor of what already exists rather than a new concept — and it
supplies the missing portable spelling for agent reads for free.

**Tradeoffs:** Touches a contract that was just shipped and documented; must
answer the loaded-tier and independent-roots questions below before it is safe.

### Approach 2: Extend the ratchet only, port sites with an agent-specific candidate list

**Description:** Leave `${...SKILLS_ROOT}` bindings alone; add a parallel
agent-root binding and teach the matcher the second path shape.

**Tradeoffs:** Smaller blast radius and no risk to the shipped skills contract,
but preserves the two-parallel-lists duplication the user's proposal removes and
adds a third convention to keep in sync.

### Approach 3: Remove the need — route role instructions through the dispatch layer

**Description:** Skills never read agent definition files directly; the dispatch
substrate supplies canonical role instructions.

**Tradeoffs:** Closes the finding without any new binding and arguably has the
best long-term shape, but is the largest behavioral change and touches the
fresh-child fallback contract that three of the four executable sites implement.

### Chosen Direction

**Approach:** Not yet chosen. Approach 1 is the user's proposal and the working
favorite; Approach 3 deserves genuine consideration before committing.
**User validated:** Not yet — this discovery was seeded for a later design pass.

## Key Decisions

1. **Deferral was deliberate, not an oversight.** The `portable-agent-references`
   final review explicitly dispositioned this as acceptable to defer, having
   verified zero live cross-skill violations and zero non-portable reads across
   all 74 tracked generated agent views.
2. **This is a design project, not a patch.** Its cost is dominated by deciding
   the contract, not by editing files.

## Constraints

- Provider agent views are **not** format-identical to canonical sources:
  `.claude/agents/*.md` are symlinks to canonical, `.cursor/agents/` mixes
  symlinks with materialized model variants, and `.codex/agents/` holds
  transformed, name-mangled `*.toml` (for example
  `oat-phase-implementer-gpt-5-6-luna-high.toml`). The executable sites want
  canonical Markdown.
- The existing contract requires **independent roots per dependency**
  (`${DISPATCH_SKILLS_ROOT}`, `${ORCHESTRATION_SKILLS_ROOT}`) so a missing pack
  cannot silently satisfy another dependency's read.
- Changes under `.agents/skills` count as shipped CLI functionality, so any
  change here requires the five-package lockstep version bump per AGENTS.md.
- Every changed canonical skill needs a frontmatter `version:` bump in the same
  PR.

## Success Criteria

- A documented portable binding contract covering both skills and agents, with
  the eligible-tier decision made explicitly rather than by assumed symmetry.
- The four executable sites resolve portably at user scope.
- The ratchet detects bare `.agents/agents/` reads, proven live by a mutation
  test that fails with exact `source -> target` evidence.
- No regression to existing portable cross-skill reads or either current
  candidate order.

## Out of Scope

- Broadening the sync contract test beyond Codex to Claude and Cursor. That is a
  separate deferred Medium from `portable-agent-references` and a missing
  regression gate, not a live defect.
- The pre-existing `pnpm oat:validate-skills` failure on
  `oat-project-retro{,-file}/SKILL.md` (missing `## Progress Indicators` heading);
  it also fails on `origin/main`.

## Open Questions

- **Loaded-tier eligibility:** The stated reason agents get only two candidates
  is "no stable loaded-agent path across providers." That holds for an _agent_
  resolving its own directory, but not obviously for a _skill_ resolving an
  agent — `.claude/` and `.cursor/` both expose an `agents/` sibling next to
  `skills/`, so a loaded tier is derivable in this direction. But the format
  constraint above means a loaded tier could resolve to a transformed view
  rather than canonical Markdown. Should the `agents` leaf start at the user
  tier, or can a loaded tier be made safe?
- **Independent roots:** Does a single shared `${AGENT_PROVIDER_ROOT}` regress
  the per-dependency independent-binding requirement? Likely reconcilable by
  binding per dependency and deriving both leaves from each, but this must be
  decided, not assumed.
- **Should skills read agent files at all?** See Approach 3.
- **Naming:** `${AGENT_PROVIDER_ROOT}` versus something that reads correctly
  alongside the existing `${DISPATCH_SKILLS_ROOT}` / `${ORCHESTRATION_SKILLS_ROOT}`
  per-dependency names.

## Assumptions

- The nine sites enumerated above are complete as of 2026-08-29; re-verify at
  implementation time since new bare reads can land undetected.
- `${HOME}/.agents` then `<repo-root>/.agents` remains the correct user→project
  tier order for agent resolution.

## Risks

- **Silent failure in a degraded path:** An agent that cannot find canonical role
  instructions improvises them rather than erroring.
  - **Likelihood:** Low — requires user-scope-only install, a consuming repo with
    no `.agents/agents/`, and execution reaching a fallback path.
  - **Impact:** High — three of the four executable sites fire only _after_ a
    pre-start native role-selection rejection, so the failure lands exactly when
    dispatch has already degraded once.
  - **Mitigation:** Port the four executable sites first; the ratchet extension
    prevents recurrence.
- **Unbounded growth while deferred:** The ratchet cannot see this path shape, so
  new bare agent reads can land freely and the count can only increase.
  - **Likelihood:** Medium — the surface already grew from one recorded file to
    nine actual sites.
  - **Impact:** Medium.
  - **Mitigation:** Extend the matcher even if the binding decision is deferred.
- **Contract churn:** This modifies a contract shipped and documented days
  earlier in `0.2.40`.
  - **Likelihood:** Medium. **Impact:** Medium.
  - **Mitigation:** Resolve both design questions before implementing; keep the
    existing skills candidate order behaviorally identical.

## Why deferring was still correct

Nothing breaks today. Three conditions must hold simultaneously: the pack is
installed at user scope only, the consuming repo has no `.agents/agents/` of its
own, and execution reaches an affected path. In the OAT repo itself — the primary
dogfooding consumer — `.agents/agents/` exists at project scope, so all nine
sites resolve. The `portable-agent-references` branch was green, reviewed, and
scoped to cross-skill reads; folding an undesigned new convention into its fix
round would have tripled its scope under a "fix" label.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- **Quick mode → straight to plan:** proceed directly to `plan.md` when
  scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused
  `design.md` (architecture, components, data flow, testing) before
  planning. Choose this when discovery surfaced architecture choices
  or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed
  the scope is larger or more complex than expected.
