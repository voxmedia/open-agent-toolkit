---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260830-distinguish-external-plan.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260830-distinguish-external-plan
oat_issue_url: null
created: '2026-09-02T23:59:00Z'
---

# Enforce plan-readiness versus execution-readiness in oat-repo-improve

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Sequence after
> the W3 executable-backstops plan, which edits the same
> `validation/skills.test.ts` and is the normative reason this plan adds a
> contract test.

## Outcome

The `oat-repo-improve` skill and its plan template codify the operator rule
that has governed the last 25 plans by hand: candidates are evaluated for
plan readiness and execution readiness separately; plans record the full SHA
of the inspected `HEAD`, the fetched `origin/main` (or merge-base) SHA as
separate comparison evidence, and the planning date; frontmatter carries
`oat_execution_status: READY|BLOCKED`; every plan has a typed
`## Dependencies` table with named unblock states, a `## Landing-event impact`
table, and a `## Revalidation Before Execution` section; links run in both
directions; and a contract test guards the template so the rule cannot
silently regress. The contract has two modes: prospective authoring rules for
plans written after it lands, and a legacy-read mode for older plans (no
`oat_external_plan_date`, or dated before the contract) that accepts a short
SHA, missing sections, and a missing status (read as `READY`). External
execution-readiness fields are explicitly permitted; canonical OAT lifecycle
state remains forbidden.

## Source and live evidence

- Source backlog item:
  [BL-260830-distinguish-external-plan — Distinguish external-plan readiness from execution readiness](../../pjm/backlog/items/BL-260830-distinguish-external-plan.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/oat-repo-improve/SKILL.md:182` — "Record `git rev-parse
--short HEAD`", a working-tree short SHA; `references/plan-template.md:22`
    and `:51` mirror it.
  - `references/plan-template.md:15-27` — no `oat_external_plan_date`, no
    `oat_execution_status`; every plan under
    `.oat/repo/reference/external-plans/2026-08-30-*.md` and
    `2026-09-02-*.md` carries both.
  - `references/plan-template.md` section list — no `## Dependencies`,
    `## Landing-event impact`, or `## Revalidation Before Execution`; the
    practiced plans have all three (for example
    `2026-08-30-warn-on-non-sync-manifest-restamps.md:84`, `:271`; every
    2026-09-02 plan carries a full landing-event table, for example
    `2026-09-02-defer-activeproject-clearing-on-archive-completions.md`).
  - `references/plan-template.md:5` — "must not contain OAT phase IDs, task
    IDs, lifecycle readiness, review tables, or implementation bookkeeping";
    read literally, `oat_execution_status` is "lifecycle readiness", so the
    template must distinguish external execution-readiness metadata (allowed)
    from canonical lifecycle bookkeeping (forbidden).
  - `2026-08-19-hermetic-cli-assets-root.md:9` — `oat_external_plan_commit:
6f443c08` (short SHA), no `oat_external_plan_date`, no status, none of the
    three sections: the legacy shape the validator must keep accepting.
  - The 31 plans in the 2026-08-31 execution program stamp
    `oat_external_plan_commit` with the `origin/main` SHA whose content they
    inspected (they were authored against main content on a planning branch);
    legacy mode accepts that provenance as-is, and the new rule applies only
    to plans authored after this lands.
  - `.oat/repo/pjm/backlog/reviews/priority-alignment.md:47-70` — the
    operator rule and the clause "until that item ships, apply this section
    as the operator rule".
  - `SKILL.md:213-222` — reverse links exist item → plan only.
  - `packages/cli/src/validation/skills.test.ts:5330` — pins
    `oat-repo-improve` at `2.1.2`; `:5372`, `:5447` and
    `skills-bundled-docs-contract.test.ts:1571` (`binds repo-improve dispatch
and orchestration references independently`) guard only root bindings and
    a heading (re-anchored 2026-09-04). Nothing guards `plan-template.md`.
  - `pack-manifest.ts:276-285` — `oat-repo-improve` is a utility-pack,
    user-scope-default, bundled asset, so installed copies predate any change.
- Constraining decisions: none govern external plans; the rule lives in the
  alignment artifact. Recording it as a decision is offered, not required.

## Dependencies

| Type             | Dependency                                                                                                                                                            | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Current state                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Soft integration | [Require executable backstops for contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md)                                                  | Land first; both edit `validation/skills.test.ts`, and its rule justifies step 4 here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Pending (W3).                                                                                              |
| Soft ordering    | W5 group 2 plan [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md) | Runs before this plan; both add cases to `skills-bundled-docs-contract.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Pending.                                                                                                   |
| Soft ordering    | W5 group 3 plan [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md)                 | Runs after this plan; both write `packages/cli/src/validation/skills.test.ts` (this plan: the `:5330` pin and a contract case; recap: the `oat-explainer-kit` `:1197` and `oat-project-complete` `:4002` version pins), so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Pending.                                                                                                   |
| Soft ordering    | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                                            | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                          | Affected | Files in common                                                                             | Required update                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03)           | Minor    | `validation/skills.test.ts` (new case), `skills-bundled-docs-contract.test.ts` (rewritten). | Rebase; re-anchor the `:5296` version pin and the `:1770` pattern case before editing. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch. |
| `review-plan-workflow` (draft PR #190, head `63161897dd40a66e1b29cf19e286665895c40dde`) merges | Minor    | `packages/cli/src/validation/skills.test.ts`.                                               | Re-anchor the `:5330` pin and the new contract case against the merged file before editing; confirm the `oat-repo-improve` skill and template are still absent from the #190 diff.      |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-repo-improve packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/tools/shared/pack-manifest.ts apps/oat-docs/docs/workflows/skills/repo-improve.md .oat/repo/pjm/backlog/reviews/priority-alignment.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If the skill's Step 4/5/6 numbering or the template's section order changed,
re-anchor before editing.

## Repository conventions

- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps`, `pnpm format` (covers `.agents/skills/**/*.md`).
- Contract tests: from `packages/cli`,
  `pnpm exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`.
- Implementation pattern: the practiced plan
  `2026-08-30-warn-on-non-sync-manifest-restamps.md` and this plan's own
  structure; `skills-bundled-docs-contract.test.ts:1571` for the test shape.
- Shipped skills require the five-package lockstep bump, owned by the wave
  fan-in in lane mode (see Scope).

## Scope

### In scope

- `oat-repo-improve/SKILL.md` — Step 4 candidate table gains `plan_ready`
  and `execution_ready` columns and the "dependency state alone does not
  disqualify" rule; Step 5 replaces the short-HEAD command with a provenance
  block that records full `git rev-parse HEAD` as the inspected baseline,
  records `git fetch origin main && git rev-parse origin/main` and
  `git merge-base HEAD origin/main` separately as comparison evidence, and
  requires `git status --porcelain` to be empty or every dirty path to be
  named in the plan's evidence section; adds the readiness, typed-dependency,
  landing-event, bidirectional-link, and revalidation requirements; Step 6
  requires the plan body to link back to its source item; Success Criteria
  and Troubleshooting updated; `version:` bump.
- `references/plan-template.md` — frontmatter fields (`oat_external_plan_commit`
  as the inspected `HEAD`, new `oat_external_plan_main_commit` for the
  comparison SHA, `oat_external_plan_date`, `oat_execution_status`), the
  IMPORTANT execution-status callout, `## Dependencies`,
  `## Landing-event impact`, `## Revalidation Before Execution`, a STOP
  condition for unsatisfied hard dependencies, Quality Gate assertions, and a
  rewrite of the line-5 sentence so it forbids canonical lifecycle state
  (phase IDs, task IDs, review tables, implementation bookkeeping) while
  explicitly permitting external execution-readiness metadata. Add a
  "Legacy plans" paragraph stating the schema boundary: a plan without
  `oat_external_plan_date`, or dated before this contract's landing date, is
  read in legacy mode. Keep example rows short.
- `packages/cli/src/validation/skills.test.ts:5330` version pin; new contract
  cases in `skills-bundled-docs-contract.test.ts` (pattern `:1571`) including
  a legacy fixture read from `2026-08-19-hermetic-cli-assets-root.md` and a
  corpus sweep over every `.oat/repo/reference/external-plans/2026-0[89]-*.md`
  plan, plus a fixture where the recorded `HEAD` and `origin/main` differ.
- `apps/oat-docs/docs/workflows/skills/repo-improve.md:36-46`.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- Retrofitting existing plans — they already satisfy the contract by hand,
  and older `2026-08-19-*` plans must stay readable.
- `references/audit-playbook.md`; `priority-alignment.md` (owned by the
  backlog review; note that its "until that item ships" clause becomes stale
  after this lands and offer that edit separately).
- `oat-project-import-plan`, `oat-wave-program`, `oat-wave-execute` — making
  consumers read `oat_execution_status` is a later item.
- The backlog field contract.

## Current state

The skill already requires dated filenames and item → plan reverse links and
has a dependencies column in the candidate table. It lacks the readiness
split, full-SHA provenance, typed dependencies, execution status, landing
events, and revalidation. The template's fence nesting is fragile around
lines 33–69; insertions must be verified as rendered.

## Implementation steps

### 1. Extend the frontmatter contract and declare the schema boundary

Add `oat_external_plan_date`, `oat_execution_status: READY|BLOCKED`, and
`oat_external_plan_main_commit`; make `oat_external_plan_commit` the full SHA
of the inspected `HEAD` (never a fetched tip whose content was not reviewed);
record the fetched `origin/main` or merge-base SHA in
`oat_external_plan_main_commit` as comparison evidence only. Write the
"Legacy plans" paragraph: plans without `oat_external_plan_date`, or dated
before the contract's landing date, are read in legacy mode, where a short
SHA, a missing main-commit field, missing sections, and a missing status
(read as `READY`) are all accepted and never rewritten. Rewrite line 5 so the
forbidden set is canonical lifecycle state and the permitted set names
`oat_execution_status` and the dependency/landing/revalidation sections.

**Verify:** `pnpm exec oxfmt --check '.agents/skills/oat-repo-improve/**/*.md'` → clean.

### 2. Add the template sections

Insert `## Dependencies` (four-column typed table) after the evidence section,
`## Landing-event impact` after it, the IMPORTANT status callout in the header
block, an unsatisfied-hard-dependency STOP condition, and
`## Revalidation Before Execution` after STOP conditions with the five named
triggers plus "a named in-flight project or PR lands". Verify the fence
structure renders.

**Verify:** `pnpm oat:validate-skills` → exit 0.

### 3. Codify the readiness split and the provenance rule in the skill

Steps 4, 5, and 6 as scoped above; Success Criteria; Troubleshooting entry for
a dependency-blocked candidate. In Step 5 the provenance block records the
inspected `HEAD`, the comparison SHA, and the dirty-tree disposition, and the
skill's revalidation guidance says a plan executed inside a wave refreshes
its drift check against the exact execution `HEAD` after predecessor lanes
integrate, not only from the authored SHA to `origin/main`. Note explicitly
that the 31 program plans authored before this contract stamped `origin/main`
SHAs and are accepted in legacy mode.

**Verify:** `pnpm oat:validate-skills` → exit 0 and
`pnpm exec oxfmt --check '.agents/skills/oat-repo-improve/**/*.md'` → clean.

### 4. Add the executable backstop and bump the version

New cases in `skills-bundled-docs-contract.test.ts`: (a) the readiness clause
and columns in the skill, the three sections plus status enum in the template,
the legacy-plans paragraph, the rewritten line-5 permission, and the absence
of `git rev-parse --short HEAD`; (b) a legacy fixture that parses the real
`2026-08-19-hermetic-cli-assets-root.md` frontmatter (short SHA, no date, no
status) and asserts it is accepted with status `READY`; (c) a corpus sweep
that parses every `2026-0[89]-*.md` plan in `external-plans/` and asserts each
is accepted under the mode its date selects, without editing any of them;
(d) a synthetic prospective fixture whose `oat_external_plan_commit` and
`oat_external_plan_main_commit` differ and is accepted, and one whose
commit field is a short SHA with a post-contract date and is rejected. Update
the `:5330` pin; bump `oat-repo-improve` `version:`.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
→ pass; `pnpm run check:skill-bumps` → pass.

### 5. Docs mirror, bump, gates

Update `repo-improve.md`; format.

**Verify (lane mode, the default under the execution program):** bump the
`oat-repo-improve` `version:` field and its pin at
`packages/cli/src/validation/skills.test.ts:5330`; run the focused tests
above, then `pnpm check`, `pnpm type-check`, and `pnpm run check:skill-bumps`
with captured exit codes, plus `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` because this plan changes `.agents/skills`. Do not
edit lockstep release files or run `pnpm release:check-versions` /
`pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. **Standalone mode only:** bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md
gates in order.

## Test plan

- `requires plan readiness to be evaluated separately from execution readiness`.
- `plan template carries typed dependencies, landing events, execution status, and revalidation`.
- `plan provenance pins the full inspected HEAD SHA and a separate comparison SHA`.
- `legacy plans without a date are read in legacy mode and default to READY`
  (real fixture: `2026-08-19-hermetic-cli-assets-root.md`).
- `every current external plan is accepted under its date-selected mode`
  (corpus sweep, read-only).
- `a post-contract plan with a short SHA is rejected; HEAD and origin/main may differ`.
- Version pin tuple updated at `skills.test.ts:5330`.
- Regression proved: the template can no longer silently lose the contract,
  and neutralizing the legacy branch makes the legacy fixture case fail.

## Done criteria

- [ ] Skill and template encode the readiness split, inspected-`HEAD`
      provenance with separate comparison SHA, typed dependencies, landing
      events, status, links, and revalidation.
- [ ] The schema boundary is explicit: legacy plans (short SHA, no date, no
      sections, no status) are accepted and read as `READY`; none were edited;
      external readiness fields are permitted while lifecycle state stays
      forbidden.
- [ ] New contract cases pass, including the real legacy fixture and the
      31-plan corpus sweep; version pin and skill bump consistent.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is
      edited. Standalone mode: one lockstep bump and all eight gates pass.

## STOP conditions

Stop and report instead of improvising when:

- a template rule would make existing plans invalid or unimportable (the
  legacy mode exists precisely to prevent this; do not narrow it);
- satisfying the contract requires a retrofit sweep of durable plans;
- the version pin and bump gate cannot both be satisfied in one commit;
- the template's fence nesting cannot be kept renderable; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, the alignment
rule, and the two contract-test files when substantial time passes, main
advances materially from `49aeb5075971180b48c131bbd2b21b82d455bfc9`, the
executable-backstops plan or the truthfulness project lands, the skill's
step numbering changes, or a load-bearing claim cannot be reproduced. Apply
the landing-event table above.

## Review focus

- Additive, backward-compatible fields only; the legacy/prospective boundary
  is tested with a real older plan, not a synthetic one.
- `oat_external_plan_commit` is the inspected `HEAD`, never a fetched tip.
- Example table rows stay narrow enough for the formatter.
- Consumers of `oat_execution_status` are deferred, not implied.
