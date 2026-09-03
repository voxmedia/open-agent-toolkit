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
plan readiness and execution readiness separately; plans record the full
`origin/main` SHA and planning date; frontmatter carries
`oat_execution_status: READY|BLOCKED` (absent reads as `READY` for older
plans); every plan has a typed `## Dependencies` table with named unblock
states, a `## Landing-event impact` table, and a
`## Revalidation Before Execution` section; links run in both directions; and
a contract test guards the template so the rule cannot silently regress.

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
    `2026-08-30-warn-on-non-sync-manifest-restamps.md:79`, `:264`).
  - `.oat/repo/pjm/backlog/reviews/priority-alignment.md:47-70` — the
    operator rule and the clause "until that item ships, apply this section
    as the operator rule".
  - `SKILL.md:213-222` — reverse links exist item → plan only.
  - `packages/cli/src/validation/skills.test.ts:5296` — pins
    `oat-repo-improve` at `2.1.2`; `:5338`, `:5413` and
    `skills-bundled-docs-contract.test.ts:1770` guard only root bindings and a
    heading. Nothing guards `plan-template.md`.
  - `pack-manifest.ts:279` — `oat-repo-improve` is a utility-pack,
    user-scope-default, bundled asset, so installed copies predate any change.
- Constraining decisions: none govern external plans; the rule lives in the
  alignment artifact. Recording it as a decision is offered, not required.

## Dependencies

| Type             | Dependency                                                                                                           | Required state                                                                         | Current state |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- |
| Soft integration | [Require executable backstops for contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md) | Land first; both edit `validation/skills.test.ts`, and its rule justifies step 4 here. | Pending (W3). |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                          | Affected | Files in common                                                                             | Required update                                                                        |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` merges | Minor    | `validation/skills.test.ts` (new case), `skills-bundled-docs-contract.test.ts` (rewritten). | Rebase; re-anchor the `:5296` version pin and the `:1770` pattern case before editing. |
| `review-plan-workflow` (draft PR #190) merges  | No       | None.                                                                                       | None.                                                                                  |

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
  structure; `skills-bundled-docs-contract.test.ts:1770` for the test shape.
- Shipped skills require the five-package lockstep bump.

## Scope

### In scope

- `oat-repo-improve/SKILL.md` — Step 4 candidate table gains `plan_ready`
  and `execution_ready` columns and the "dependency state alone does not
  disqualify" rule; Step 5 replaces the short-HEAD command with
  `git fetch origin main && git rev-parse origin/main` and adds the
  readiness, typed-dependency, landing-event, bidirectional-link, and
  revalidation requirements; Step 6 requires the plan body to link back to
  its source item; Success Criteria and Troubleshooting updated;
  `version:` bump.
- `references/plan-template.md` — frontmatter fields, the IMPORTANT
  execution-status callout, `## Dependencies`, `## Landing-event impact`,
  `## Revalidation Before Execution`, a STOP condition for unsatisfied hard
  dependencies, and Quality Gate assertions. Keep example rows short.
- `skills.test.ts:5296` version pin; a new contract case in
  `skills-bundled-docs-contract.test.ts`.
- `apps/oat-docs/docs/workflows/skills/repo-improve.md:36-46`.
- Five public package manifests.

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

### 1. Extend the frontmatter contract

Add `oat_external_plan_date` and `oat_execution_status: READY|BLOCKED`; make
`oat_external_plan_commit` the full `origin/main` SHA; state that a missing
status reads as `READY`.

**Verify:** `pnpm exec oxfmt --check '.agents/skills/oat-repo-improve/**/*.md'` → clean.

### 2. Add the template sections

Insert `## Dependencies` (four-column typed table) after the evidence section,
`## Landing-event impact` after it, the IMPORTANT status callout in the header
block, an unsatisfied-hard-dependency STOP condition, and
`## Revalidation Before Execution` after STOP conditions with the five named
triggers plus "a named in-flight project or PR lands". Verify the fence
structure renders.

**Verify:** `pnpm oat:validate-skills` → exit 0.

### 3. Codify the readiness split in the skill

Steps 4, 5, and 6 as scoped above; Success Criteria; Troubleshooting entry for
a dependency-blocked candidate.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts` after step 4.

### 4. Add the executable backstop and bump the version

New case in `skills-bundled-docs-contract.test.ts` asserting the readiness
clause and columns in the skill and the three sections plus status enum in
the template, and that `git rev-parse --short HEAD` is absent; update the
`:5296` pin; bump `oat-repo-improve` `version:`.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
→ pass; `pnpm run check:skill-bumps` → pass.

### 5. Docs mirror, lockstep bump, gates

Update `repo-improve.md`; bump the five packages; format.

**Verify:** `pnpm check`, then the eight AGENTS.md gates in order with
captured exit codes.

## Test plan

- `requires plan readiness to be evaluated separately from execution readiness`.
- `plan template carries typed dependencies, landing events, execution status, and revalidation`.
- `plan provenance pins the full origin/main SHA`.
- Version pin tuple updated at `skills.test.ts:5296`.
- Regression proved: the template can no longer silently lose the contract.

## Done criteria

- [ ] Skill and template encode the readiness split, full-SHA provenance,
      typed dependencies, landing events, status, links, and revalidation.
- [ ] Older plans without a status still read as `READY`; none were edited.
- [ ] New contract test passes; version pin and skill bump consistent.
- [ ] Docs mirror, lockstep bump, format, and all gates pass; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- a template rule would make existing plans invalid or unimportable;
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

- Additive, backward-compatible fields only.
- Example table rows stay narrow enough for the formatter.
- Consumers of `oat_execution_status` are deferred, not implied.
