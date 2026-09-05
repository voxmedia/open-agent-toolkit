---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260819-repair-verified-bundled-skill.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
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

Four verified bundled-skill claims match their executable contracts: doctor's
declared inventory names every manifest-shipped skill under its correct pack,
brainstorm no longer promises impossible later diagnosis, idea summarization
declares both tools its steps invoke, and analyze uses one ten-step progress
model. A focused corpus test prevents those exact surfaces from drifting
again, and each changed skill's version moves once for the release-shaped
change.

## Source and live evidence

- Source backlog item:
  [BL-260819-repair-verified-bundled-skill — Repair verified bundled skill contract drift](../../pjm/backlog/items/BL-260819-repair-verified-bundled-skill.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/oat-doctor/SKILL.md:148-193` labels its inline inventory a
    source of truth but omits the brainstorm pack entirely and, within the
    packs it does list, omits shipped skills: the workflows pack list at
    `:154-165` lacks `oat-explainer-kit`, `oat-project-autonomous`,
    `oat-project-retro`, `oat-project-split`, `oat-wave-execute`,
    `oat-wave-program`, and `oat-wrap-up` among others named at
    `pack-manifest.ts:126-164`, and the project-management list at `:184-187`
    lacks `oat-pjm-decision`. Adding only brainstorm would leave the planned
    manifest-derived assertion failing (verified 2026-09-05).
  - `packages/cli/src/commands/tools/shared/pack-manifest.ts:32` and
    `:346-349` include `brainstorm` and `oat-brainstorm` in the canonical pack
    manifest (re-anchored 2026-09-04 after PR #248); `:126-164` enumerates the
    workflows pack skills and `:169-220` the per-pack `skill(...)` entries the
    test must derive from.
  - `.agents/skills/oat-brainstorm/SKILL.md:188-195` says a conversation-only
    Node-missing note is state that doctor can pick up later; doctor has no
    persisted input that could satisfy that promise.
  - `.agents/skills/oat-idea-summarize/SKILL.md:1-8` declares only `Read,
Write, Grep, AskUserQuestion`, while `:79-85` requires `oat config get/set`
    shell commands (Bash) and `:83` instructs "Use the Glob tool" in the
    missing-active-idea fallback (Glob). Both tools are undeclared; adding Bash
    alone would leave the fallback branch dependent on an undeclared tool.
  - `.agents/skills/analyze/SKILL.md:50-60` advertises nine steps, while
    `:224-245` and the remaining workflow use ten-step denominators.
  - `packages/cli/src/validation/skills.test.ts` has no existing seam for these
    four claims; the new test group stands alone (resolve any pattern by test
    title, not line, after PRs #248 and #255 grew the file).
- Related decisions:
  - [DR-260731-canonical-policy](../decisions/DR-260731-canonical-policy.md)
    makes `.agents/skills` the canonical edit surface.
  - [DR-260624-lockstep-release-bump-batched](../decisions/DR-260624-lockstep-release-bump-batched.md)
    governs the single lockstep package bump for a release-shaped batch.

## Dependencies

| Type          | Dependency                                                                                                                                                            | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Current state                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Hard policy   | [DR-260731-canonical-policy](../decisions/DR-260731-canonical-policy.md)                                                                                              | Edit canonical skills and regenerate managed views; never patch provider copies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Accepted; enforce during implementation.                                                                   |
| Hard release  | [DR-260624-lockstep-release-bump-batched](../decisions/DR-260624-lockstep-release-bump-batched.md)                                                                    | Exactly one PR-scoped bump per changed skill; exactly one lockstep bump of all five public packages, made by the wave fan-in in lane mode or by this PR in standalone mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Accepted; satisfiable inside this plan.                                                                    |
| Soft ordering | W5 group 2 plan [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md) | Runs after this plan; both edit `packages/cli/src/commands/tools/shared/pack-manifest.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Pending.                                                                                                   |
| Soft ordering | W3 group 2 plan [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md)                         | Runs after this plan; both edit `packages/cli/src/validation/skills.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pending.                                                                                                   |
| Soft ordering | W2 group 3 plan [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md)      | Runs after this plan; both edit `packages/cli/src/validation/skills.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pending.                                                                                                   |
| Soft ordering | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                                            | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

No external project or unshipped code dependency blocks execution.

## Landing-event impact

| Event                                                                                | Affected         | Files in common                                                                                                         | Required update                                                                                                                                              |
| ------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | See dependencies | Recorded in the Dependencies and Revalidation sections.                                                                 | Drift re-run 2026-09-03 and 2026-09-04; anchors refreshed where noted.                                                                                       |
| `review-plan-workflow` (draft PR #190) merges                                        | Minor            | `packages/cli/src/validation/skills.test.ts` (PR #190 head `63161897dd40a66e1b29cf19e286665895c40dde` edits this file). | If #190 merges first: rebase, re-run the corpus suite, and re-anchor the new contract group by test title before editing. If this lands first, #190 rebases. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-doctor/SKILL.md .agents/skills/oat-brainstorm/SKILL.md .agents/skills/oat-idea-summarize/SKILL.md .agents/skills/analyze/SKILL.md packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/validation/skills.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
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
- Git/PR convention: the change is release-shaped; the lockstep bump is owned
  by the wave fan-in in lane mode (see Scope). Do not push or open a PR unless
  instructed.

## Scope

### In scope

- Four canonical `SKILL.md` files named in the evidence.
- `packages/cli/src/validation/skills.test.ts` — one focused contract group for
  pack inventory, unsupported doctor promise, tool declaration, and progress
  denominator.
- `packages/cli/src/commands/tools/shared/pack-manifest.ts` — read-only source
  of truth for the test; change only if live inventory itself is wrong.
- Managed provider-view refresh required by repository policy.
- Four skill frontmatter versions; none of the four is pinned in
  `packages/cli/src/validation/skills.test.ts`.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

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

### Batch policy exception

The external-plan contract asks for one shippable outcome per plan. This plan
deliberately batches four independent defects and records that as an explicit
operator exception (Astra review 2026-09-05, finding W2-02): the four fixes
share the same corpus test file, the same managed-view refresh, and the same
skill-bump gate, so one ordered batch avoids four near-empty plans. The
exception holds only while each defect keeps its own acceptance criterion in
Done criteria, its own commit on the lane branch, and its own named contract
case, so any one fix can be reverted alone without disturbing the others.

## Implementation steps

### 1. Correct the four canonical skill contracts

- Reconcile doctor's entire declared inventory (`SKILL.md:148-193`) against
  the manifest: for every pack in `PACK_MANIFEST`, list every `kind: 'skill'`
  asset under a heading for that pack, add the missing brainstorm pack, and
  remove or move any name that is not a manifest skill of that pack. Preserve
  pack membership, not just names, and do not change current summary-mode
  behavior.
- Replace the Node-missing sentence in brainstorm with truthful immediate-only
  behavior; preserve silent offer suppression and
  `VISUAL_COMPANION = "unavailable"`.
- Add `Bash` and `Glob` to idea-summarize's canonical `allowed-tools` while
  preserving all existing tools and provider rendering rules; leave the
  `:83` fallback wording unchanged so the declaration matches an unchanged
  usage.
- Change analyze's initial progress list from `/9` to `/10` and include the
  missing output-destination step so it matches the workflow body.

Increment each changed skill's `version:` exactly once relative to the merge
base, regardless of how many edits occur during the branch.

**Verify:** `pnpm oat:validate-skills && pnpm run check:skill-bumps` → all four
skills validate and each has one required bump.

### 2. Add mechanically scoped regression assertions

In `packages/cli/src/validation/skills.test.ts`, add one named contract group
that:

- imports or otherwise reads `PACK_MANIFEST`, derives the per-pack set of
  `kind: 'skill'` asset names, extracts only doctor's declared
  bundled-inventory section, and fails when any pack heading is missing, any
  manifest skill is absent from its pack's list, or any listed name is not a
  manifest skill of that pack;
- rejects the unsupported doctor-later promise while retaining the immediate
  unavailable-state language;
- parses idea-summarize frontmatter and requires both `Bash` and `Glob`, and
  separately asserts that the missing-active-idea fallback branch still
  invokes the Glob tool and `oat config set`, so the declaration and the usage
  are tested together (no-active-idea branch as well as the normal Bash path);
  and
- requires ten-step denominators in analyze's progress list and workflow while
  rejecting stale `/9` indicators.

Avoid duplicating the pack list in the test; that would recreate the same drift
class.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/validation/skills.test.ts`
→ each new assertion executes and the corpus suite passes.

### 3. Refresh managed views

Run `oat sync --scope all`, inspect the diff, and retain only changes owned by
the configured managed-view contract. Commit each of the four fixes separately
(skill edit plus its contract case) so the batch exception above holds.

**Verify:** `pnpm lint && pnpm format && git status --short` → canonical skills,
expected managed views, and tests are the only changes.

### 4. Run the mode's gates

**Lane mode (default under the execution program):** bump changed skill
`version:` fields and update their pins in
`packages/cli/src/validation/skills.test.ts` where a pin exists; run the
focused tests above, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint`,
`pnpm format`, and `pnpm oat:validate-skills` because this plan changes
`.agents/skills`. Do not edit lockstep release files or run
`pnpm release:check-versions` / `pnpm release:validate`; the wave fan-in owns
the lockstep bump and the full definition-of-done sequence. **Standalone mode
only:** bump the five public packages above freshly fetched `origin/main` and
run the eight AGENTS.md gates in order.

Also run `pnpm test:skills` separately because canonical skill coverage is not
fully represented by the CI sequence. If a Turbo-driven gate only replays
cache, run `pnpm exec turbo run test --force` and record its exit code as the
executed evidence.

## Test plan

- Extend `packages/cli/src/validation/skills.test.ts` with the four exact
  regression claims and a manifest-derived doctor inventory.
- Use frontmatter parsing for the Bash/Glob check rather than a body
  substring; pair it with a fallback-branch usage assertion.
- Scope the doctor assertion to its inventory section and compare per pack.
- Assert analyze has ten distinct advertised steps and no stale `/9` marker.
- Run focused corpus tests, independent skill validation, and the mode's gates.

## Done criteria

- [ ] Doctor's declared inventory names every current manifest skill under its
      manifest pack and nothing else.
- [ ] Brainstorm makes no later-doctor observability promise.
- [ ] Idea summarization declares Bash and Glob and retains its prior tools.
- [ ] Analyze advertises and emits one ten-step model.
- [ ] All four changed skills have exactly one version bump, and each fix is
      its own commit with its own contract case.
- [ ] Managed provider views are synchronized without duplicated canonical files.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is edited.
      Standalone mode: one lockstep bump and all eight gates pass.
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
  `49aeb5075971180b48c131bbd2b21b82d455bfc9`;
- a cited skill, inventory, provider-view, test, or release contract changed;
- backlog/decision/project intent changed;
- another PR implemented part of the outcome; or
- a load-bearing mismatch can no longer be reproduced.

Update or supersede stale instructions before import or execution.

## Review focus

- Batch rationale: see the recorded policy exception under Current state;
  confirm each fix has its own commit and contract case so the exception's
  conditions hold.
- Check that the test has one authoritative list rather than two drifting lists.
- Confirm the brainstorm change removes only the unsupported future claim.
- Confirm frontmatter and progress assertions test semantics, not incidental
  whole-file mentions.
- Confirm skill and package versions each moved exactly once.
