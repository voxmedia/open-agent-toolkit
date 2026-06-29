---
oat_generated: true
oat_generated_at: 2026-06-28
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: /Users/tstang/orca/workspaces/open-agent-toolkit/workflow-end-triggers-feedback/.oat/projects/shared/workflow-gate-improvements
---

# Artifact Review: plan

**Reviewed:** 2026-06-28
**Scope:** `plan.md` artifact review (quick mode), aligned against `discovery.md`
**Files reviewed:** 2 (plan.md, discovery.md) + targeted repo verification of referenced files/commands/CI
**Commits:** n/a (artifact review)

## Summary

`plan.md` is well-structured, canonical-format conformant, and covers the
discovery scope comprehensively: all eight discovery success criteria and all
eight key decisions map to concrete tasks, and the open questions (severity
threshold, automatic-receive, verdict contract shape) are resolved in the plan.
Every referenced file, skill, agent, doc, CLI command, and verification script
exists in the repo, so the plan is materially actionable. No Critical issues.
The findings are one coverage/consistency gap (existing `oat-project-plan` /
`oat-project-implement` Gate Execution steps are not updated for the new review
handoff while quick-start/import-plan are), three Medium issues (final-sweep
verification omits the skill version-bump and `pnpm build` CI gates; the sync
task assumes copy-style views when the repo is all-symlink; underspecified
active-project resolution for `oat gate review` artifact discovery), and three
Minor polish items.

## Findings

### Critical

None

### Important

- **Review-gate handoff not propagated to the primary gate-aware lifecycle skills** (`plan.md:401-471` p02-t02; `plan.md:524-546` p03-t01)
  - Issue: Discovery Success Criterion "Gate Execution instructions tell the host
    what review artifact was produced and how it must be received before
    proceeding" (`discovery.md:184-186`) and Key Decision #4 "Receive Handoff"
    (`discovery.md:151-153`) apply to all gate-aware skills. The plan only adds
    the Gate Execution step + review-handoff language to `oat-project-quick-start`
    and `oat-project-import-plan` (p02-t02). It does not touch the existing Gate
    Execution steps in `oat-project-plan` (`.agents/skills/oat-project-plan/SKILL.md:505`)
    or `oat-project-implement` (`.agents/skills/oat-project-implement/SKILL.md:1423`),
    which are already gateable and are the primary surfaces where a review gate
    would run. The p02-t02 refactor note itself says to "Keep the Gate Execution
    wording consistent with `oat-project-plan` and `oat-project-implement`, but
    mention the review gate handoff" (`plan.md:448-452`) — which implies those
    canonical steps do NOT yet carry the handoff language, so quick-start/import
    would diverge from them and plan/implement gates would not surface the
    receive handoff via skill instructions.
  - Fix: Either (a) add a task (or extend p02-t01/p02-t02 file scope) to update
    the Gate Execution sections of `oat-project-plan` and `oat-project-implement`
    with the same review-artifact + `oat-project-review-receive` handoff note (and
    bump their `version:` in p04-t01), or (b) if the handoff is intended to be
    surfaced purely through `oat gate review` command output (p01-t02 already
    prints "the artifact path, verdict summary, and receive handoff",
    `plan.md:215-216`), state that explicitly in the plan and reword the p02-t02
    refactor note so it does not imply plan/implement need parity wording. Pick
    one model so the four gate-aware skills are consistent and the discovery
    criterion is unambiguously satisfied.
  - Requirement: Discovery Success Criterion (Gate Execution instructions),
    Key Decision #4 (Receive Handoff)

### Medium

- **Final verification sweep omits two CI gates: skill version-bump check and `pnpm build`** (`plan.md:685-714` p04-t02; `plan.md:454-462` p02-t02 step 4)
  - Issue: CI (`.github/workflows/ci.yml:40-46`) enforces, in addition to the
    plan's commands, `pnpm build` (line 40) and
    `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main`
    (lines 42-43). The plan's final sweep (p04-t02 step 2) runs `pnpm lint`,
    `pnpm type-check`, `pnpm test`, `pnpm build:docs`, `pnpm release:validate` but
    NOT `pnpm build` and NOT the skill version-bump validator. Verified that
    `oat:validate-skills` (run in p02-t01/p02-t02/p03-t02) maps only to
    `internal validate-oat-skills` (structural validation), and
    `release:validate` / `release:check-versions` validate public _package_
    versions, not per-canonical-skill `version:` bumps. So none of the plan's
    verification commands actually confirm the skill `version:` bumps required by
    the repo contract (`AGENTS.md`) and enforced in CI. A missing or incorrect
    skill version bump would pass local verification and fail only in CI.
  - Fix: Add `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main`
    and `pnpm build` to the p04-t02 verification sweep (and optionally to p02-t02
    step 4 right after the skill version bumps are applied) so local verification
    matches the CI gate set.

- **Provider-sync task (p02-t03) assumes copy-style views; repo uses all-symlink sync** (`plan.md:475-519` p02-t03)
  - Issue: All 142 entries in `.oat/sync/manifest.json` use `"strategy": "symlink"`
    (e.g., `.claude/skills/oat-project-quick-start` is a symlink to the canonical
    skill, `contentHash: null`). Editing the _content/frontmatter_ of an existing
    skill therefore produces no provider-view file diff, and this plan adds no new
    skills/agents — it only modifies existing ones. Consequently p02-t03's
    expectations ("provider views update for changed canonical skills/agents",
    "generated changes correspond only to changed canonical skills/agents",
    `plan.md:491,502`) are inaccurate: the task will most likely produce no
    provider-view changes (at most manifest metadata/timestamp churn). An
    implementer following the stated expectations may think sync failed.
  - Fix: Reword p02-t03 to reflect symlink semantics: state that provider views
    are symlinks so content edits need no re-generation, and that this sync is
    hygiene to refresh `.oat/sync/manifest.json` metadata and catch any
    added/removed entries (none expected here). Make the commit step tolerant of
    an empty diff (mirror p04-t02's `git diff --cached --quiet || git commit`
    pattern at `plan.md:733`).

- **`oat gate review` active-project resolution for artifact discovery is underspecified** (`plan.md:198-216` p01-t02)
  - Issue: p01-t02 says the command "records a before/after review-artifact
    discovery window using `oat review latest --project <activeProject> --json`
    semantics or equivalent internal scanning of active top-level project reviews"
    and "loads the newest active review artifact produced by the dispatch", but it
    never specifies how `<activeProject>` is determined or how ambiguity (zero or
    multiple active top-level projects) is handled. Verified `oat review latest`
    requires/accepts `--project <path>` (`packages/cli/src/commands/review/latest.ts:320`).
    If the active project is misresolved, the gate parses the wrong artifact and
    returns a wrong pass/fail verdict — a correctness risk for the core feature.
  - Fix: Specify the active-project resolution rule in p01-t02 (e.g., reuse the
    exact project-resolution logic already used by `oat review latest`, require a
    single active top-level project, and error clearly on none/ambiguous), and
    add a test asserting the error path. This also de-risks Discovery's "Brittle
    Artifact Parsing" risk (`discovery.md:238-243`).

### Minor

- **`oat_plan_hill_phases: []` set during planning diverges from canonical guidance** (`plan.md:8`, `plan.md:43`)
  - Issue: `oat-project-plan` guidance is to leave `oat_plan_hill_phases` unset
    during planning and let `oat-project-implement` confirm it
    (`.agents/skills/oat-project-plan/SKILL.md:307,380`). The plan sets it to `[]`
    (which means "pause after every phase" per
    `.agents/skills/oat-project-implement/SKILL.md:1026`) and the Planning
    Checklist asserts "Confirmed HiLL checkpoints with user". `oat-project-implement`
    re-confirms on first run, so impact is low, but for a 10-task/4-phase quick
    iteration "pause after every phase" is a heavy default to bake in as
    "confirmed".
  - Suggestion: Either leave `oat_plan_hill_phases` unset (canonical) so implement
    confirms it, or confirm the intended checkpoint set explicitly; keep the
    frontmatter comment and the checklist claim consistent with the actual choice.

- **High-effort target guidance risks implying the dispatch-ceiling-coupled variant** (`plan.md:550-566` p03-t01 step 2)
  - Issue: The step says to "prefer the generated reviewer variant/profile
    mechanism already used by OAT where possible." The OAT reviewer variants are
    resolved via `oat project dispatch-ceiling resolve ... --role reviewer`
    (`.agents/skills/oat-project-implement/SKILL.md:315`), i.e., coupled to the
    dispatch ceiling — which Key Decision #6 explicitly says NOT to couple to gate
    effort (`discovery.md:157-159`). The concrete `oat gate target set
codex-review-xhigh ...` example is correctly decoupled, but the prose could
    push an implementer back toward ceiling inference.
  - Suggestion: Reword to make explicit gate-target config (referencing a target
    id via `--target`) the supported, decoupled path, and avoid implying that gate
    effort should be derived from the dispatch-ceiling reviewer-variant resolver.

- **Reviews table keeps perpetually-pending `spec`/`design` artifact rows in a quick-mode project** (`plan.md:747-748`)
  - Issue: In quick mode spec/design artifacts are intentionally absent and will
    not be produced, so the `spec` and `design` artifact rows will remain
    `pending` forever. This is not a defect (and rows must not be deleted per the
    preservation rule), but it can read as outstanding work.
  - Suggestion: Optionally annotate these rows as `n/a (quick mode)` or leave a
    one-line note under the table that spec/design reviews do not apply in quick
    mode, to avoid future confusion. Do not delete the rows.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md` (upstream requirements
source for quick mode), plus targeted repo verification of referenced files,
CLI commands, sync manifest strategy, release scripts, and CI workflow. `spec.md`
and `design.md` are intentionally absent (quick mode) — not treated as findings.
`state.md` and `implementation.md` read for context only.

### Requirements Coverage (Discovery Success Criteria + Key Decisions)

| Requirement (discovery)                                                                                    | Status                    | Notes                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| SC: gate returns nonzero/blocks on blocking findings                                                       | implemented               | p01-t01 verdict parser + p01-t02 `oat gate review` exit mapping                                                                         |
| SC: gate artifacts carry provenance, discoverable by receive/latest                                        | implemented               | p02-t01 `oat_review_invocation: gate`; p01-t02 reuses `oat review latest` (verified `--project`/`--json`)                               |
| SC: Gate Execution instructions tell host produced artifact + how to receive                               | partial                   | Covered for quick-start/import (p02-t02) + docs (p03-t01); existing plan/implement Gate Execution steps not updated (Important finding) |
| SC: quick-start & import-plan declare gate awareness + Gate Execution step                                 | implemented               | p02-t02 adds `oat_gateable: true` + Gate Execution; verified `oat_gateable` already used by plan/implement skills                       |
| SC: docs explain stateful gate reviews, handoff, high-effort target setup                                  | implemented               | p03-t01 steps 1-2                                                                                                                       |
| SC: durable docs/config use `oat gate ...`                                                                 | implemented               | p02-t02 + p03-t01; p01-t03 warns on dev-build paths                                                                                     |
| SC: warning/guidance for dev-build absolute gate commands                                                  | implemented               | p01-t03 (verified `oat gate set --command` exists)                                                                                      |
| SC: tests cover verdict mapping, provenance/handoff, gateability, polish                                   | implemented               | p01-t01/t02 tests, p02-t01/t02 validation tests, p01-t03 tests; verified target test files exist                                        |
| KD1 Stateful Review Contract (no read-only mode)                                                           | implemented               | p02-t01 refactor explicitly forbids read-only/inline-only behavior                                                                      |
| KD2 Semantic Blocking                                                                                      | implemented               | p01-t01/t02 default threshold Critical+Important                                                                                        |
| KD3 Gate Provenance                                                                                        | implemented               | p02-t01 (verified current `oat_review_invocation: {manual\|auto}`, adds `gate`)                                                         |
| KD4 Receive Handoff                                                                                        | partial                   | p02-t01 receive recognizes `gate`; plan/implement Gate Execution handoff gap (Important finding)                                        |
| KD5 Gate Coverage (quick/import)                                                                           | implemented               | p02-t02                                                                                                                                 |
| KD6 Effort Configuration (explicit, not ceiling-coupled)                                                   | implemented (with caveat) | p03-t01 example decoupled; prose caveat (Minor finding)                                                                                 |
| KD7 Command Reference Convention                                                                           | implemented               | p02-t02, p03-t01, p01-t03                                                                                                               |
| KD8 Polish Warning                                                                                         | implemented               | p01-t03                                                                                                                                 |
| Open Q: verdict contract shape                                                                             | resolved                  | dedicated `oat gate review` wrapper + post-dispatch artifact inspection                                                                 |
| Open Q: automatic receive                                                                                  | resolved                  | explicit handoff; no auto-receive (p02-t01, p03-t01)                                                                                    |
| Open Q: severity threshold                                                                                 | resolved                  | default Critical+Important, configurable via `--exit-nonzero-on`                                                                        |
| Out of scope items (read-only, ceiling coupling, Gates V2, hook parsing, cross-provider-exec child-status) | respected                 | p01-t02 preserves generic `cross-provider-exec`; p03-t02 preserves Gates V2 boundary                                                    |
| Risk: Release Churn (lockstep bumps)                                                                       | implemented               | p04-t01 bumps all five public packages + asset + skill versions                                                                         |

### Extra Work (not in declared requirements)

None material. All ten tasks trace to discovery success criteria, key decisions,
or stated risks/constraints. p03-t02 (refresh repo reference notes) is repo
hygiene aligned with Constraints/Out-of-Scope boundary preservation, not scope
creep.

## Verification Commands

These confirm the artifact's internal consistency and the accuracy of its file
references (run from repo root):

```bash
# Referenced source/test files exist
ls packages/cli/src/commands/gate/index.ts packages/cli/src/commands/review/latest.ts
ls packages/cli/src/commands/review/__tests__/latest.test.ts packages/cli/src/commands/help-snapshots.test.ts
ls packages/cli/src/validation/skills.test.ts packages/cli/assets/public-package-versions.json

# Sync strategy is all-symlink (Medium M2)
grep -oE '"strategy": "[a-z]+"' .oat/sync/manifest.json | sort | uniq -c

# CI gates the plan's final sweep should mirror (Important context for Medium M1)
grep -nE "pnpm build|validate-skill-version-bumps|release:validate" .github/workflows/ci.yml

# Existing Gate Execution steps that the handoff gap concerns (Important finding)
grep -n "Gate Execution" .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-implement/SKILL.md

# Current oat_review_invocation values to extend with `gate` (p02-t01)
grep -n "oat_review_invocation" .agents/skills/oat-project-review-provide/SKILL.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan
tasks (or accept the Important/Medium items as artifact-alignment edits to
`plan.md` before starting implementation).
