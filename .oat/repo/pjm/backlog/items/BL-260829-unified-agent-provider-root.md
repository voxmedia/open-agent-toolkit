---
id: BL-260829-unified-agent-provider-root
title: Unified AGENT_PROVIDER_ROOT binding for portable skill and agent references
status: open
priority: high
scope: task
scope_estimate: L
labels:
  - portability
  - skills
  - agents
  - dispatch
  - contract
assignee: null
created: 2026-08-29T14:36:26.565Z
updated: 2026-08-30T18:45:00.000Z
associated_issues: []
external_plans: []
---

## Description

Skills that read canonical agent definitions still use bare repo-relative paths (`.agents/agents/<name>.md`). These dangle when the owning pack is installed at user scope, which is the same defect class the portable-agent-references project fixed for cross-skill reads — but on a path shape the ratchet does not cover. Proposal: introduce a single portable `${AGENT_PROVIDER_ROOT}` binding resolving to `${HOME}/.agents` then `<repo-root>/.agents`, with `${AGENT_PROVIDER_ROOT}/skills` and `${AGENT_PROVIDER_ROOT}/agents` as leaves, replacing the two parallel candidate lists that already share those roots.

## Implementation Outcome (2026-08-30)

Implemented on project branch `feature/feat/unified-agent-provider-root`, pending
merge. The approved contract uses a dependency-owned local
`${AGENT_PROVIDER_ROOT}` with loaded, user, then project candidates. A loaded
target is eligible only when the exact unsuffixed Markdown file is the direct
same-scope canonical file or a symlink resolving exactly to it. Seven live
reads were migrated, provider-native model/effort/variant selection remains
authoritative, and the shared typed classifier now enforces a zero-executable-
agent baseline. Mutation, provider-layout, dependency-isolation, sync,
release, documentation, and full repository gates passed; final lifecycle and
configured exit-gate reviews reported zero findings.

## Acceptance Criteria

- A portable `${AGENT_PROVIDER_ROOT}` binding contract is defined and documented,
  with an explicit decision on which tiers are eligible for the `agents` leaf
  (see Design Questions below) rather than assuming symmetry with `skills`.
- The nine bare `.agents/agents/<name>.md` sites are ported or deliberately
  exempted with recorded rationale. The four executable ones are mandatory:
  `oat-project-review-provide/SKILL.md:649` and `:892`,
  `oat-project-plan-writing/SKILL.md:210`, and
  `oat-project-implement/references/dispatch-and-dry-run.md:25-26`.
- The ratchet in
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
  detects bare `.agents/agents/` reads. Today `CROSS_SKILL_READ` matches only
  `.agents/skills/`, so this entire path shape is invisible to it.
- A mutation test proves the extended ratchet is live: injecting a bare agent
  read into a canonical skill must fail the suite with exact
  `source -> target` evidence.
- Independent per-dependency root binding is preserved (see Design Questions).
- The duplicate matcher at `packages/cli/src/validation/skills.test.ts:4695` is
  reconciled with the canonical matcher, or deleted in favour of it. It
  currently carries a copy of the pre-fix pattern with the single-`../` blind
  spot that `7f7dd6cfc` closed canonically. Harmless today only because the
  canonical ratchet already scans the same four agent files with the stronger
  pattern — but a knowingly divergent duplicate of a matcher will drift.
  (Added at retro filing 2026-08-29; scope broadening approved by the operator.)
- Existing portable cross-skill reads and both current candidate orders keep
  working; no regression in `PORTABLE_SKILLS_ROOT_CANDIDATES` or
  `PORTABLE_AGENT_SKILLS_ROOT_CANDIDATES` behavior.
- Docs updated without overstating enforcement, and the lockstep public package
  bump applied per AGENTS.md (changes under `.agents/skills` are shipped CLI
  functionality).

## Context: how this was found

Surfaced as a deferred Medium across every review round of the
`portable-agent-references` project and re-confirmed by its final review
(`reviews/final-review-2026-08-29T082359Z.md`), which corrected the recorded
scope: the finding had named a single file, but the real surface is **nine
sites across five skills in two packs**, four of them genuinely executable.

The unified-root idea came from the user during final-checkpoint review, as a
simplification of the two parallel candidate lists that already share their
last two entries:

```
skills:  ${SKILL_DIR}/..  ->  ${HOME}/.agents/skills  ->  <repo-root>/.agents/skills
agents:                       ${HOME}/.agents/skills  ->  <repo-root>/.agents/skills
```

Both user and project tiers are `<X>/.agents/` plus a leaf, so the unified root
is a faithful refactor of what exists rather than a new concept — and it
supplies the missing portable spelling for agent reads. Verified 2026-08-29:
**no `${...}`-bound agent-read convention exists anywhere in canonical skills**,
which is precisely why this finding had no clean fix during the project.

## Risk of deferring

Not an immediate breakage. Three conditions must hold simultaneously: the pack
is installed at user scope only, the consuming repo has no `.agents/agents/` of
its own, and execution reaches one of the affected paths. In the OAT repo
itself — the primary dogfooding consumer — `.agents/agents/` exists at project
scope, so every site resolves today.

What makes it worth fixing rather than closing:

- **The failure is silent.** An agent that cannot find canonical role
  instructions improvises them; nothing raises an error.
- **It fires at the worst moment.** Three of the four executable sites sit in
  the "launch a fresh child after a pre-start native role-selection rejection"
  fallback — reachable only when dispatch has already degraded once.
- **Nothing detects regressions.** The ratchet cannot see this path shape, so
  new bare agent reads can land freely. The count can only grow.
- **The contract is asymmetric and undocumented.** Skills resolving agents is
  the one direction with no portable convention at all.

## Design Questions to resolve before implementing

1. **Which tiers are eligible for the `agents` leaf?** The stated reason agents
   get only two candidates is "no stable loaded-agent path across providers."
   That holds for an _agent_ resolving its own directory, but not for a _skill_
   resolving an agent: `.claude/` and `.cursor/` both have an `agents/` sibling
   next to `skills/`, so a loaded tier is derivable in this direction. Counter-
   constraint: provider agent views are not format-identical to canonical —
   `.claude/agents/*.md` are symlinks to canonical, `.cursor/agents/` mixes
   symlinks with materialized model variants, and `.codex/agents/` holds
   transformed, name-mangled `*.toml`. The executable sites want canonical
   Markdown role instructions, so a loaded tier may resolve to the wrong
   artifact. Decide deliberately; do not assume symmetry with the skills leaf.
2. **Does a shared root regress independent per-dependency binding?** The
   current contract requires independent roots where multiple dependencies
   exist (`${DISPATCH_SKILLS_ROOT}`, `${ORCHESTRATION_SKILLS_ROOT}`) so a
   missing pack cannot silently satisfy another's read. A single shared
   `${AGENT_PROVIDER_ROOT}` bound once and reused would regress that. Likely
   reconcilable by binding per dependency and deriving both leaves from each,
   but it must be answered, not assumed.
3. **Should skills reach agent files at all?** An alternative is routing role
   instructions through the dispatch layer so skills never read agent
   definitions directly. That would close the finding without a new binding.

## Affected sites (verified 2026-08-29)

Executable (mandatory):

- `.agents/skills/oat-project-review-provide/SKILL.md:649` — fresh Codex child fallback
- `.agents/skills/oat-project-review-provide/SKILL.md:892` — inline Tier 3 review template pointer
- `.agents/skills/oat-project-plan-writing/SKILL.md:210` — fresh child fallback
- `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md:25-26` — fresh child fallback

Descriptive / pointer (judge individually):

- `.agents/skills/oat-project-review-provide-remote/SKILL.md:119`, `:315`
- `.agents/skills/skeptic/SKILL.md:116`, `:117` — describe provider sync, likely exempt

Packs: `workflows` (the four OAT lifecycle skills) and `research` (`skeptic`),
both `defaultScope: 'user'` — i.e. the exact user-default surface the ratchet
is supposed to cover.
