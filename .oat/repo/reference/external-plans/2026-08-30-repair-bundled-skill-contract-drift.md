---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260819-repair-verified-bundled-skill.md
oat_external_plan_commit: 845462e78468265c7e2e2b2f6c64731472731ecb
oat_external_plan_date: '2026-08-30'
oat_execution_status: READY
oat_backlog_items:
  - BL-260819-repair-verified-bundled-skill
oat_issue_url: null
created: '2026-08-30T23:40:20Z'
---

# Repair four bundled-skill truthfulness contracts

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** The implementation choice for the brainstorm
> mismatch is deliberately bounded to removing the unsupported promise. Do not
> introduce a new persistence or doctor-observability subsystem.

## Outcome

Four verified bundled-skill claims match their executable contracts: doctor
lists every current pack, brainstorm no longer promises impossible later
diagnosis, idea summarization declares the shell tool it invokes, and analyze
uses one ten-step progress model. A focused corpus test prevents those exact
surfaces from drifting again, and all required skill/package versions move once
for the release-shaped change.

## Source and live evidence

- Source backlog item:
  [BL-260819-repair-verified-bundled-skill — Repair verified bundled skill contract drift](../../pjm/backlog/items/BL-260819-repair-verified-bundled-skill.md)
- Planned at: `origin/main` commit
  `845462e78468265c7e2e2b2f6c64731472731ecb` on `2026-08-30`.
- Verified evidence:
  - `.agents/skills/oat-doctor/SKILL.md:148-165` labels its inline inventory a
    source of truth but omits the brainstorm pack.
  - `packages/cli/src/commands/tools/shared/pack-manifest.ts:22-31` and
    `:324-328` include `brainstorm` and `oat-brainstorm` in the canonical pack
    manifest.
  - `.agents/skills/oat-brainstorm/SKILL.md:188-195` says a conversation-only
    Node-missing note is state that doctor can pick up later; doctor has no
    persisted input that could satisfy that promise.
  - `.agents/skills/oat-idea-summarize/SKILL.md:1-8` omits `Bash`, while
    `:79-85` requires `oat config get/set` shell commands.
  - `.agents/skills/analyze/SKILL.md:50-60` advertises nine steps, while
    `:224-245` and the remaining workflow use ten-step denominators.
  - `packages/cli/src/validation/skills.test.ts:6431-6463` is the existing
    pack-aware corpus-test seam, but no test binds these four claims.
- Related decisions:
  - [DR-260731-canonical-policy](../decisions/DR-260731-canonical-policy.md)
    makes `.agents/skills` the canonical edit surface.
  - [DR-260624-lockstep-release-bump-batched](../decisions/DR-260624-lockstep-release-bump-batched.md)
    governs the single lockstep package bump for a release-shaped batch.

## Dependencies

| Type         | Dependency                                                                                         | Required state                                                                                                    | Current state                            |
| ------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Hard policy  | [DR-260731-canonical-policy](../decisions/DR-260731-canonical-policy.md)                           | Edit canonical skills and regenerate managed views; never patch provider copies.                                  | Accepted; enforce during implementation. |
| Hard release | [DR-260624-lockstep-release-bump-batched](../decisions/DR-260624-lockstep-release-bump-batched.md) | Exactly one PR-scoped bump per changed skill and one lockstep bump of all five public packages before completion. | Accepted; satisfiable inside this plan.  |

No external project or unshipped code dependency blocks execution.

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 845462e78468265c7e2e2b2f6c64731472731ecb..origin/main -- .agents/skills/oat-doctor/SKILL.md .agents/skills/oat-brainstorm/SKILL.md .agents/skills/oat-idea-summarize/SKILL.md .agents/skills/analyze/SKILL.md packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/validation/skills.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
```

A material change to any claimed mismatch, pack inventory, skill version, or
test seam is a STOP condition until the plan is refreshed or superseded.

## Repository conventions

- Build: `pnpm build` and `pnpm build:docs` → workspace and docs builds pass.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Focused test:
  `pnpm --filter @open-agent-toolkit/cli test -- src/validation/skills.test.ts`
  → the skill corpus suite passes.
- Skill validation: `pnpm oat:validate-skills` and
  `pnpm run check:skill-bumps` → structure and PR-scoped bumps pass.
- Lint/format: `pnpm lint && pnpm format` → required coverage for canonical
  skills passes without formatter drift.
- Provider refresh: `oat sync --scope all` → managed views reflect canonical
  sources; do not commit unmanaged duplicates.
- Git/PR convention: all five public packages move in lockstep; do not push or
  open a PR unless instructed.

## Scope

### In scope

- Four canonical `SKILL.md` files named in the evidence.
- `packages/cli/src/validation/skills.test.ts` — one focused contract group for
  pack inventory, unsupported doctor promise, tool declaration, and progress
  denominator.
- `packages/cli/src/commands/tools/shared/pack-manifest.ts` — read-only source
  of truth for the test; change only if live inventory itself is wrong.
- Managed provider-view refresh required by repository policy.
- Four skill frontmatter versions, five public package versions, and
  `pnpm-lock.yaml`.

### Out of scope

- Persisting brainstorm runtime events for later doctor inspection.
- Redesigning doctor to dynamically execute or import skill prose.
- General allowed-tools normalization across the skill corpus.
- Rewriting analyze workflow steps beyond the denominator/advertised model.

## Current state

The four mismatches are independent prose/frontmatter defects but form one
coherent release batch. The only choice in the source item is how to make the
brainstorm diagnostic truthful. This plan selects the smallest supported path:
retain the immediate conversation note and unavailable state, but remove the
claim that doctor can observe that transient state later.

Doctor may continue to carry a human-readable inventory, provided a test
derives expected pack skills from `PACK_MANIFEST` and confines its comparison
to the doctor's declared inventory section. A loose whole-file substring test
is insufficient because incidental mentions could conceal future drift.

## Implementation steps

### 1. Correct the four canonical skill contracts

- Add the brainstorm pack and `oat-brainstorm` to doctor's available-pack
  inventory without changing current summary-mode behavior.
- Replace the Node-missing sentence in brainstorm with truthful immediate-only
  behavior; preserve silent offer suppression and
  `VISUAL_COMPANION = "unavailable"`.
- Add `Bash` to idea-summarize's canonical `allowed-tools` while preserving all
  existing tools and provider rendering rules.
- Change analyze's initial progress list from `/9` to `/10` and include the
  missing output-destination step so it matches the workflow body.

Increment each changed skill's `version:` exactly once relative to the merge
base, regardless of how many edits occur during the branch.

**Verify:** `pnpm oat:validate-skills && pnpm run check:skill-bumps` → all four
skills validate and each has one required bump.

### 2. Add mechanically scoped regression assertions

In `packages/cli/src/validation/skills.test.ts`, add one named contract group
that:

- imports or otherwise reads `PACK_MANIFEST`, derives its canonical skill
  names, extracts only doctor's declared bundled-inventory section, and fails
  when any expected skill is absent;
- rejects the unsupported doctor-later promise while retaining the immediate
  unavailable-state language;
- parses idea-summarize frontmatter and requires `Bash`; and
- requires ten-step denominators in analyze's progress list and workflow while
  rejecting stale `/9` indicators.

Avoid duplicating the pack list in the test; that would recreate the same drift
class.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/validation/skills.test.ts`
→ each new assertion executes and the corpus suite passes.

### 3. Refresh managed views and apply release bookkeeping

Run `oat sync --scope all`, inspect the diff, and retain only changes owned by
the configured managed-view contract. Bump all five public package versions
together and update `pnpm-lock.yaml` through pnpm.

**Verify:** `pnpm lint && pnpm format && git status --short` → canonical skills,
expected managed views, tests, and release metadata are the only changes.

### 4. Run complete release validation

Run the repository Definition of Done in order, fetching main immediately
before the version gate:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
git fetch origin main
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Also run `pnpm lint`, `pnpm format`, `pnpm test:skills`, and
`pnpm oat:validate-skills` separately because canonical skill coverage is not
fully represented by the CI sequence. If `pnpm test` only replays Turbo cache,
run `pnpm exec turbo run test --force` and record its exit code as the executed
full-suite evidence.

## Test plan

- Extend `packages/cli/src/validation/skills.test.ts` with the four exact
  regression claims and a manifest-derived doctor inventory.
- Use frontmatter parsing for the Bash check rather than a body substring.
- Scope the doctor assertion to its inventory section.
- Assert analyze has ten distinct advertised steps and no stale `/9` marker.
- Run focused corpus tests, independent skill validation, uncached full tests,
  release gates, and docs build.

## Done criteria

- [ ] Doctor's declared inventory covers every current manifest skill.
- [ ] Brainstorm makes no later-doctor observability promise.
- [ ] Idea summarization declares Bash and retains its prior tools.
- [ ] Analyze advertises and emits one ten-step model.
- [ ] All four changed skills have exactly one version bump.
- [ ] Managed provider views are synchronized without duplicated canonical files.
- [ ] All five public packages have one lockstep version bump.
- [ ] Focused and full verification commands exit zero.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- implementation would require durable brainstorm event storage or a new
  doctor runtime source;
- live `PACK_MANIFEST` is no longer the authoritative tool-pack inventory;
- provider rendering cannot preserve the required Bash declaration from the
  canonical frontmatter;
- a changed canonical skill cannot receive a valid single PR-scoped bump;
- a named verification gate fails twice after one bounded correction; or
- the work expands into unrelated skill-corpus cleanup.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, both linked
decisions, canonical skills, pack manifest, tests, and package versions when:

- a dependency or policy record changed after planning;
- substantial time elapsed or main advanced materially from
  `845462e78468265c7e2e2b2f6c64731472731ecb`;
- a cited skill, inventory, provider-view, test, or release contract changed;
- backlog/decision/project intent changed;
- another PR implemented part of the outcome; or
- a load-bearing mismatch can no longer be reproduced.

Update or supersede stale instructions before import or execution.

## Review focus

- Check that the test has one authoritative list rather than two drifting lists.
- Confirm the brainstorm change removes only the unsupported future claim.
- Confirm frontmatter and progress assertions test semantics, not incidental
  whole-file mentions.
- Confirm skill and package versions each moved exactly once.
