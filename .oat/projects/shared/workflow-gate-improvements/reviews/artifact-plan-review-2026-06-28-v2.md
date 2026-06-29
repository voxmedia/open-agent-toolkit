---
oat_generated: true
oat_generated_at: 2026-06-28
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: /Users/tstang/orca/workspaces/open-agent-toolkit/workflow-end-triggers-feedback/.oat/projects/shared/workflow-gate-improvements
---

# Artifact Review (Re-Review v2): plan

**Reviewed:** 2026-06-28
**Scope:** `plan.md` artifact re-review (quick mode), aligned against `discovery.md`
**Files reviewed:** 2 (plan.md, discovery.md) + targeted repo verification of referenced files/commands/CI/sync manifest + prior review artifact + implementation.md disposition map (context only)
**Commits:** n/a (artifact review)

## Summary

This is a re-review of the revised `plan.md` (now 873 lines, up from 789). All
eleven prior findings (I1, M1, M2, M3, m1, m2, m3, U1-U4) are genuinely resolved
in the artifact text — verified line-by-line, not trusted from the disposition
map. The I1 review-handoff gap is fully closed: p02-t02 was renamed "Normalize
Gate-Aware Skill Handoff", now spans all four gate-aware skills (`oat-project-plan`,
`oat-project-implement`, `oat-project-quick-start`, `oat-project-import-plan`),
and its refactor note no longer implies plan/implement lack parity. The revision
introduces no Critical or Important regressions. However, the 84-line growth
introduced two new Medium consistency gaps: (1) the final verification sweep
still does not fully mirror CI — it runs `pnpm lint` where CI runs `pnpm check`
(lint + oxfmt format-check), so formatting violations would pass locally and fail
in CI (same class as the resolved M1); and (2) skill/agent `version:` bump
ownership is now split and partially contradictory between p02-t02 step 2 and
p04-t01, with p02-t01's three changed files having no explicit bump owner. Two
Minor cross-artifact/internal-consistency nits round out the findings.

## Prior Findings Re-Verification

Each prior finding verified against the **current** `plan.md` text (line numbers
are current-plan line numbers) and against the underlying repo facts.

| Prior ID | Disposition claimed | Verified status | Evidence (current plan / repo)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1       | resolve_in_artifact | **Resolved**    | p02-t02 renamed + Files now include `oat-project-plan`/`oat-project-implement` (`plan.md:430-431`); RED test asserts all four skills surface the same handoff (`plan.md:441-447`); GREEN updates plan/implement Gate Execution (`plan.md:465-466`); refactor note consistent across all four (`plan.md:482-484`). Confirmed both skills already have `Gate Execution` sections (plan.md:505, implement:1423) so the edits target real surfaces.            |
| M1       | resolve_in_artifact | **Resolved**    | p04-t02 final sweep now includes `pnpm build` (`plan.md:781`) and `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main` (`plan.md:784`). Both are real CI gates (`.github/workflows/ci.yml:40,43`). See new finding M-N1 for a still-missing format-check gate.                                                                                                                                                                   |
| M2       | resolve_in_artifact | **Resolved**    | p02-t03 reworded for symlink semantics: "Provider views in this repo are normally symlink-backed... content edits may therefore produce no diffs" (`plan.md:519-523`); "empty diff is acceptable" (`plan.md:543`); empty-diff-tolerant commit (`plan.md:559`). Verified manifest is 142/142 `"strategy": "symlink"`.                                                                                                                                       |
| M3       | resolve_in_artifact | **Resolved**    | p01-t02 now requires explicit project resolution: RED test (`plan.md:166-169`) and GREEN "resolves the project before dispatch using the same active-project semantics as `oat review latest`; if no project or more than one plausible project... fail with an actionable error" (`plan.md:206-209`). Discovery window now uses resolved `<PROJECT_PATH>` (`plan.md:218-220`). Verified `oat review latest` takes `--project <path>` (latest.ts:319-320). |
| m1       | resolve_in_artifact | **Resolved**    | `oat_plan_hill_phases` removed from frontmatter entirely (`plan.md:1-15`); Planning Checklist now reads "Deferred HiLL checkpoint selection to `oat-project-implement`" (`plan.md:42`). Consistent.                                                                                                                                                                                                                                                        |
| m2       | resolve_in_artifact | **Resolved**    | p03-t01 step 2 now uses explicit user-level target config "rather than dispatch ceiling inference or built-in defaults" (`plan.md:606-609`); prior "prefer the generated reviewer variant/profile mechanism" prose removed. Example and prompt now both use `codex-5.5-xhigh` (`plan.md:186,614`), resolving the prior `codex-review-xhigh` mismatch.                                                                                                      |
| m3       | resolve_in_artifact | **Resolved**    | spec/design rows retained with explanatory note (`plan.md:832-834`). Kept as `pending` rather than a non-legend `n/a` status — the more table-conformant choice. Rows not deleted (preservation rule honored).                                                                                                                                                                                                                                             |
| U1       | resolve_in_artifact | **Resolved**    | Trusted noninteractive flags documented as user config "not baked into OAT built-ins" (`plan.md:590-602`); p03-t02 preserves "user-level gate target configuration... not new built-in defaults" (`plan.md:678-679`).                                                                                                                                                                                                                                      |
| U2       | resolve_in_artifact | **Resolved**    | Child output surfacing in p01-t02 RED test (`plan.md:176-178`) + GREEN "streams provider child output by default, or captures and prints buffered output on failure" (`plan.md:217-220`) + smoke test "Provider permission-denial output is visible" (`plan.md:803-804`).                                                                                                                                                                                  |
| U3       | resolve_in_artifact | **Resolved**    | p02-t01 preserves `disable-model-invocation: false` and the prose Model Invocation Gate (`plan.md:350-353`, `374-379`). Verified review-provide currently documents `oat_review_invocation: { manual\|auto }` (review-provide:642), so adding `gate` is accurate.                                                                                                                                                                                          |
| U4       | resolve_in_artifact | **Resolved**    | p02-t01 expands review-provide `allowed-tools` for reading/writing artifacts, running `oat`/`pnpm`, and committing bookkeeping (`plan.md:354-360`, `380-383`).                                                                                                                                                                                                                                                                                             |

**Re-verification tally: 11 resolved / 0 partial / 0 not-resolved.**

Note on M1: its two _specifically named_ asks (`pnpm build`, version-bump
validator) were met, so M1 itself is Resolved. The broader principle behind M1
(mirror the CI gate set) surfaced one CI gate the prior review did not enumerate;
that is raised below as new finding **M-N1**, not as an M1 regression.

## Findings

### Critical

None

### Important

None

### Medium

- **Final verification sweep runs `pnpm lint`, but CI runs `pnpm check` (lint + format) — oxfmt format-check gate is still missing** (`plan.md:779`, p04-t02 step 2)
  - Issue: This is the same class as the resolved M1 (final sweep must mirror CI),
    and was not caught in the first review. CI's "Check" step runs `pnpm check`
    (`.github/workflows/ci.yml:30-31`), which fans out via Turborepo to each
    package's `check` script. The CLI package's `check` is `oxlint . && oxfmt --check .`
    (verified in `packages/cli/package.json`), i.e., lint **and** formatting. The
    plan's p04-t02 step 2 runs `pnpm lint` (`plan.md:779`) which is only `oxlint`
    (`turbo run lint`). It never runs `pnpm check` or `pnpm format`. A formatting
    violation (oxfmt) would therefore pass the entire local sweep and fail only in
    CI — exactly the failure mode M1 was meant to eliminate.
  - Fix: In p04-t02 step 2, replace `pnpm lint` with `pnpm check` (which covers
    both lint and format, matching the CI "Check" step exactly), or add a separate
    `pnpm format` line. Optionally add `pnpm format` after applying any auto-fixes
    in earlier doc/skill tasks so format drift is caught before the final sweep.
  - Requirement: Discovery Risk/Constraint that final verification mirror the
    repo/CI gate set (same intent as resolved M1).

- **Skill/agent `version:` bump ownership is split and partially contradictory between p02-t02 and p04-t01; p02-t01's changed files have no explicit bump owner** (`plan.md:470`, p02-t02 step 2; `plan.md:716-718`, `728-731`, p04-t01)
  - Issue: The I1 fix added `oat-project-plan`/`oat-project-implement` to p02-t02
    and also added the instruction "Bump each changed skill's frontmatter
    `version:` once for this PR." (`plan.md:470`) — so p02-t02 now bumps four
    lifecycle skills. But p04-t01's Files list also says "Modify: frontmatter
    `version:` in every changed canonical skill/agent that requires version
    tracking" (`plan.md:716-717`) and its step 2 says "Update skill-version test
    expectations for any changed skills" (`plan.md:731`). These overlap: an
    implementer who literally follows both will bump the same four skills twice
    (a double patch bump and duplicated test-expectation edits). AGENTS.md
    requires "one bump per changed skill in the final PR diff", so the duplication
    works against the stated contract even though `validate-skill-version-bumps`
    (which only checks the version increased) would still pass. Separately,
    p02-t01 changes three files — `oat-project-review-provide`,
    `oat-project-review-receive`, and the `oat-reviewer` agent — but has **no**
    version-bump instruction in p02-t01 itself; their only coverage is p04-t01's
    catch-all, which is the same instruction that contradicts p02-t02. Net effect:
    bump responsibility is ambiguous, with one set bumped in two places and another
    set bumped nowhere explicitly.
  - Fix: Pick a single ownership model. Recommended: centralize **all** skill/agent
    `version:` bumps (and the corresponding test-expectation updates) in p04-t01,
    and delete the "Bump each changed skill's frontmatter `version:` once for this
    PR" line from p02-t02 step 2 (`plan.md:470`) — leaving p02-t02 to change only
    content. Alternatively, have each content task bump its own skills (p02-t01
    bumps its 3, p02-t02 bumps its 4) and reduce p04-t01 to _verifying_ bumps
    rather than re-applying them. Either way, make exactly one task the canonical
    bump location so the "one bump per changed skill" contract is unambiguous.
  - Requirement: AGENTS.md skill-version-bump contract (one bump per changed
    skill); Discovery Risk "Release Churn (lockstep bumps)".

### Minor

- **Cross-artifact task-title drift: `implementation.md` task headings are stale relative to the renamed plan tasks** (`implementation.md:124,143` vs `plan.md:424,566`)
  - Issue: The revision renamed two tasks in `plan.md` — p02-t02 is now
    "Normalize Gate-Aware Skill Handoff" (`plan.md:424`) and p03-t01 is now
    "Document Stateful Review Gates and Trusted Targets" (`plan.md:566`) — but
    `implementation.md` still carries the old titles "Make Quick-Start and
    Import-Plan Gate-Aware" (`implementation.md:124`) and "Document Stateful Review
    Gates and Handoff" (`implementation.md:143`). When `oat-project-implement`
    resumes, the per-task headings will not match the plan, which can cause
    confusion during resume/bookkeeping. (`implementation.md` is out of primary
    review scope and reviewed for context only; flagged here only because the plan
    revision is what made these references stale — an artifact-alignment nit, not a
    plan defect.)
  - Suggestion: When applying these findings (or at implementation start), sync the
    `implementation.md` task headings to the current `plan.md` titles for p02-t02
    and p03-t01. The canonical source is `plan.md`.

- **p01-t02 commit `git add` includes files not in its Files list (already created/committed by p01-t01)** (`plan.md:157-159` vs `plan.md:260-261`)
  - Issue: p01-t02's Files section lists only `gate/index.ts`,
    `gate/index.test.ts`, and `help-snapshots.test.ts` (`plan.md:157-159`), but
    its step 5 `git add` also stages `gate/review-verdict.ts` and
    `gate/review-verdict.test.ts` (`plan.md:260-261`), which are created and
    committed in p01-t01 (`plan.md:63-64`, `145-147`). Staging unchanged tracked
    files is a harmless git no-op, so this is cosmetic, but the git-add diverges
    from the declared Files scope and could read as p01-t02 modifying the parser.
  - Suggestion: Drop `review-verdict.ts`/`review-verdict.test.ts` from p01-t02's
    `git add` (they are owned by p01-t01), or, if p01-t02 is expected to also
    adjust the parser, add them to p01-t02's Files list so scope and commit agree.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `discovery.md` (upstream requirements
source for quick mode), the archived prior review
(`reviews/archived/artifact-plan-review-2026-06-28.md`), and targeted repo
verification of referenced files, CLI gate command structure, `oat review latest`
flags, sync manifest strategy, root/package scripts, and the CI workflow.
`spec.md` and `design.md` are intentionally absent (quick mode) — not treated as
findings. `implementation.md` read for context only.

### Requirements Coverage (Discovery Success Criteria + Key Decisions)

The first review's coverage table remains accurate; the I1 fix upgrades the two
items previously marked `partial` to fully covered. Net coverage is now complete.

| Requirement (discovery)                                                                     | Status (this re-review)   | Notes                                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| SC: gate returns nonzero/blocks on blocking findings                                        | implemented               | p01-t01 verdict parser + p01-t02 exit mapping                                                                    |
| SC: gate artifacts carry provenance, discoverable by receive/latest                         | implemented               | p02-t01 `oat_review_invocation: gate`; p01-t02 reuses `oat review latest` semantics                              |
| SC: Gate Execution instructions tell host produced artifact + how to receive                | implemented (was partial) | p02-t02 now covers all four gate-aware skills (`plan.md:441-447,465-466,482-484`) — **I1 closed**                |
| SC: quick-start & import-plan declare gate awareness + Gate Execution step                  | implemented               | p02-t02 adds `oat_gateable: true` + Gate Execution; verified plan/implement already `oat_gateable: true`         |
| SC: docs explain stateful gate reviews, handoff, high-effort target setup                   | implemented               | p03-t01 steps 1-2                                                                                                |
| SC: durable docs/config use `oat gate ...`                                                  | implemented               | p02-t02 + p03-t01; p01-t03 warns on dev-build paths                                                              |
| SC: warning/guidance for dev-build absolute gate commands                                   | implemented               | p01-t03 (verified `oat gate set --command` exists, gate/index.ts:797-800)                                        |
| SC: tests cover verdict mapping, provenance/handoff, gateability, polish                    | implemented               | p01-t01/t02, p02-t01/t02, p01-t03 tests; verified target test files exist                                        |
| KD1 Stateful Review Contract (no read-only mode)                                            | implemented               | p02-t01 refactor forbids read-only/inline-only behavior                                                          |
| KD2 Semantic Blocking                                                                       | implemented               | default threshold Critical+Important; `--exit-nonzero-on`                                                        |
| KD3 Gate Provenance                                                                         | implemented               | p02-t01 adds `gate` to current `{ manual\|auto }`                                                                |
| KD4 Receive Handoff                                                                         | implemented (was partial) | p02-t01 receive recognizes `gate`; p02-t02 now normalizes handoff across all four skills — **I1 closed**         |
| KD5 Gate Coverage (quick/import)                                                            | implemented               | p02-t02                                                                                                          |
| KD6 Effort Configuration (explicit, not ceiling-coupled)                                    | implemented               | p03-t01 step 2 reworded to explicit user config (`plan.md:606-609`) — m2 closed                                  |
| KD7 Command Reference Convention                                                            | implemented               | p02-t02, p03-t01, p01-t03; verified `oat gate`/`oat gate target` command shapes                                  |
| KD8 Polish Warning                                                                          | implemented               | p01-t03                                                                                                          |
| Open Q: verdict contract / automatic receive / severity threshold                           | resolved                  | dedicated `oat gate review` wrapper; explicit handoff (no auto-receive); default Critical+Important configurable |
| Out-of-scope boundaries (read-only, ceiling coupling, Gates V2, hook parsing, child-status) | respected                 | p01-t02 preserves generic `cross-provider-exec`; p03-t02 preserves Gates V2 boundary                             |
| Risk: Release Churn (lockstep bumps)                                                        | implemented (with caveat) | p04-t01 bumps all five public packages + asset + skill versions; see M-N2 on bump-ownership ambiguity            |

### Extra Work (not in declared requirements)

None material / no scope creep. The trusted provider-permission-flag docs added
in p03-t01 (Claude `--dangerously-skip-permissions`, Codex
`--dangerously-bypass-approvals-and-sandbox`, Cursor `--force`/`--yolo`) go
slightly beyond discovery's "high-effort target setup" wording, but they trace
directly to the approved receive feedback (U1/U2) from the prior cycle and are
explicitly framed as user-chosen trusted-environment config, not new built-in
defaults. Aligned, not creep. All ten tasks remain traceable to discovery
success criteria, key decisions, or stated risks/constraints.

## Verification Commands

These confirm the re-review's evidence (run from repo root):

```bash
# CI gate set the final sweep must mirror (Medium M-N1: note pnpm check vs pnpm lint)
grep -nE "pnpm check|pnpm build|validate-skill-version-bumps|release:validate|build:docs|type-check|pnpm test" .github/workflows/ci.yml

# What `pnpm check` actually runs per package (lint + oxfmt format-check)
node -e "const p=require('./packages/cli/package.json'); console.log('check =>', p.scripts.check, '| lint =>', p.scripts.lint)"

# I1 closure: plan/implement now have Gate Execution steps the plan edits
grep -n "Gate Execution" .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-implement/SKILL.md

# M2 truth: sync manifest is all-symlink
grep -oE '"strategy": "[a-z]+"' .oat/sync/manifest.json | sort | uniq -c

# Gate command shapes referenced by the plan exist (oat gate set / oat gate target set)
grep -nE "\.command\('set'\)|new Command\('target'\)" packages/cli/src/commands/gate/index.ts

# M-N2: version-bump instructions appear in two tasks
grep -n "frontmatter \`version:\`" .oat/projects/shared/workflow-gate-improvements/plan.md

# Minor: task-title drift between plan and implementation
grep -n "### Task p02-t02\|### Task p03-t01" .oat/projects/shared/workflow-gate-improvements/plan.md .oat/projects/shared/workflow-gate-improvements/implementation.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan
edits. The two Medium items (CI-parity format-check gap; version-bump ownership
duplication) and two Minor items are small artifact-alignment edits to `plan.md`
(plus a one-line `implementation.md` heading sync), not new implementation tasks —
they can be applied directly before starting implementation. After applying them,
update the `plan` row in the Reviews table to point at this v2 artifact.
