---
oat_generated: true
oat_generated_at: 2026-07-28T03:21:37Z
oat_review_scope: p01
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
oat_review_request_id: explainer-improvements-p01-review-20260728T030636Z
oat_implementation_request_id: explainer-improvements-p01-20260728T015427Z
oat_phase_base: 5d964f2205315149fa31e8f3813f36504f52a750
oat_reviewed_head: d2a2af8c1291d46174a72c16cce925129e5252f6
oat_review_range: 5d964f2205315149fa31e8f3813f36504f52a750..d2a2af8c1291d46174a72c16cce925129e5252f6
oat_tracking_baseline: 4b7b2ab926ff5f813e4cf1161b00d3d45a855e55
oat_tasks: [p01-t01, p01-t02, p01-t03, p01-t04]
oat_reviewer_target: oat-reviewer-gpt-5-6-sol-high
oat_model_axis: selected:gpt-5.6-sol-high
oat_effort_axis: not-applicable
oat_dispatch_policy: high
oat_dispatch_ceiling: gpt-5.6-sol-high
oat_dispatch_stamp: 'Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high'
---

# Code Review: Phase p01

**Reviewed:** 2026-07-28T03:21:37Z
**Phase:** p01 — Compliance and bounded quality baseline
**Review request:** `explainer-improvements-p01-review-20260728T030636Z`
**Implementation request:** `explainer-improvements-p01-20260728T015427Z`
**Tasks:** `p01-t01`, `p01-t02`, `p01-t03`, `p01-t04`
**Base:** `5d964f2205315149fa31e8f3813f36504f52a750`
**Head:** `d2a2af8c1291d46174a72c16cce925129e5252f6`
**Range:** `5d964f2205315149fa31e8f3813f36504f52a750..d2a2af8c1291d46174a72c16cce925129e5252f6`
**Current committed tracking baseline:** `4b7b2ab926ff5f813e4cf1161b00d3d45a855e55`
**Reviewer target:** `oat-reviewer-gpt-5-6-sol-high`
**Dispatch axes:** `model_axis=selected:gpt-5.6-sol-high`; `effort_axis=not-applicable`
**Dispatch stamp:** `Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high`
**Files in authoritative diff:** 37
**Commits:** 5
**Reconnaissance:** not-attempted

## Verdict

**BLOCKED.** Phase p01 does not pass the blocking threshold because it has two
Important findings. The packed license bodies, five-package lockstep release,
backlog terminal-state mechanics, successor ordering, and generated asset
parity are sound, but notice provenance and the golden benchmark oracle do not
meet their declared acceptance contracts.

Findings: 0 critical, 2 important, 3 medium, 0 minor

**Blocking threshold:** Failed — zero Critical but two Important findings.
**Blocking fixes required:** Yes.

## Evidence Sources

The project uses import workflow mode. Review evidence used:

- `.oat/projects/shared/explainer-improvements/references/imported-plan.md`
- `.oat/projects/shared/explainer-improvements/plan.md`
- `.oat/projects/shared/explainer-improvements/implementation.md`
- `.oat/projects/shared/explainer-improvements/state.md`
- The complete authoritative Git range and all 37 changed files
- Repository backlog lifecycle instructions and the cited archived project summary
- Upstream license files at the referenced Obra Superpowers and
  visual-explainer tags and the current shadcn/improve source

`spec.md`, `design.md`, and `discovery.md` are absent, which is allowed for this
import-mode project.

## Findings

### Critical

None.

### Important

- **I1 — The archived notice acceptance contract is not fully met**
  (`NOTICES.md:117`)
  - Issue: The visual-explainer entry identifies only a plugin and author, not
    its upstream repository URL. The archived backlog item explicitly requires
    every upstream URL alongside its complete MIT text
    (`.oat/repo/pjm/backlog/archived/BL-260727-ship-mit-notices-inside.md:25`).
    The package contract checks the copyright lines and full permission body,
    so real packing still passes when this URL is omitted.
  - Impact: The item is canonically archived as complete while one acceptance
    criterion remains false in the durable notice shipped to CLI consumers.
    This is a provenance-completeness defect, not a defect in the MIT body:
    all three copyright and permission texts match their upstream licenses.
  - Fix: Change the visual-explainer source field to
    `https://github.com/nicobailon/visual-explainer` and extend packed notice
    validation to require each source URL and version marker as well as each
    complete copyright/permission block. Re-run the focused package-contract
    test and `pnpm release:validate`.
  - Requirement: `p01-t01` step 1 and the archived backlog acceptance criteria.

- **I2 — The golden “reference evidence” is self-attested metadata, not a
  source-grounded quality oracle**
  (`.agents/skills/explainer-kit/tests/golden-conformance.test.mjs:99`)
  - Issue: The loader requires only one artifact summary, exact rubric field
    names, `status: reference-met`, and non-empty observations. It does not
    load representative personal-kit outputs, screenshots, browser metrics, or
    any file named by a rubric evidence path. It also does not validate claim
    source IDs, claim grounding, topology integrity, exact hub/architecture/deck
    membership, `producerVersion`, timestamps, or artifact evidence pointers.
    The checked-in `personal-kit-reference.json` files therefore contain prose
    summaries rather than the comparison outputs required by the task. This is
    not merely theoretical: the simple fixture claim at
    `.agents/skills/explainer-kit/tests/fixtures/golden/simple/source-input.json:25`
    says a threshold opens a recovery task, while the cited fact base describes
    a scheduled drift audit but contains no threshold or recovery-task claim.
  - Impact: Malformed, incomplete, or invented benchmark evidence can pass all
    three tests. Later runtime work can appear to conform to a benchmark whose
    quality and source assertions were never independently established.
  - Fix: Check in representative personal-kit outputs and retained evidence
    (or immutable content-addressed repository pointers) for each case. Make
    descriptors enumerate them and make the loader verify their existence and
    hashes, exact minimum-set membership, rubric-evidence resolvability,
    producer metadata, claim-to-source referential integrity, topology
    node/edge integrity, and fixture claims against the committed source.
    Replace or source the unsupported simple-case claim.
  - Requirement: `p01-t03` steps 1, 3, and 4; imported plan golden-conformance
    evidence requirements.

### Medium

- **M1 — The portability check accepts common absolute machine-local paths**
  (`.agents/skills/explainer-kit/tests/golden-conformance.test.mjs:24`)
  - Issue: Portability is enforced with five regular expressions. Paths such as
    `/tmp/operator/evidence`, `/private/var/...`, arbitrary POSIX roots,
    Windows drive paths outside `Users`, and UNC paths are not rejected.
    `isAbsolute` is applied only to descriptor paths, not source locators or
    evidence values.
  - Impact: A future fixture can pass locally while depending on an uncommitted
    machine path, defeating the portable benchmark contract.
  - Fix: Validate locator/evidence fields structurally. Reject POSIX,
    `win32`, and UNC absolute filesystem paths while allowing declared
    repository-relative paths and supported network URLs; add negative tests
    for temporary, arbitrary-root, drive, and UNC paths.

- **M2 — The regenerated backlog index preserves a now-false operating
  picture**
  (`.oat/repo/pjm/backlog/index.md:85`)
  - Issue: The curated overview still says
    `BL-260727-ship-mit-notices-inside` is open and describes the XL visual item
    as one unsplit substantive item, even though this phase archived the notice
    item and created five successors. The generated table is correct, but the
    human-facing overview directly contradicts it.
  - Impact: Backlog readers receive conflicting status and decomposition
    guidance from the canonical index.
  - Fix: Update only the curated overview to describe the archived notice work
    and five ordered successors, refresh `current-state.md` if its operating
    picture is affected, then regenerate the managed table and require no
    residual diff.

- **M3 — The p01-t04 task-count mutation left tracking text at nineteen
  tasks**
  (`.oat/projects/shared/explainer-improvements/state.md:101`)
  - Issue: The plan and implementation progress correctly total 20 tasks after
    adding bounded task `p01-t04`, but state still says “Five phases / 19 stable
    tasks normalized.” The implementation final-summary placeholder also says
    “after all 19 tasks.” These became stale when the root-owned correction was
    added.
  - Impact: Lifecycle tracking has two conflicting project totals and can
    mislead closeout or manual resume checks, although the canonical plan task
    headings and progress table are correct.
  - Fix: Update the two stale prose counts to 20 in the root-owned tracking
    follow-up. Do not alter task IDs or the justified one-file implementation
    scope of `p01-t04`.

### Minor

None.

## Requirements and Design Alignment

Design alignment is not applicable because this import-mode project has no
design artifact.

| Task      | Status      | Evidence                                                                                                                                                                                                                                            |
| --------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p01-t01` | partial     | All three upstream MIT bodies are accurate; the real packed CLI includes and validates them; all five public packages are `0.2.22`. Visual-explainer URL provenance is missing.                                                                     |
| `p01-t02` | partial     | Archive mechanics, completed ledger, active statuses, five successors, dependencies, and non-linear rejection/rerouting criteria are coherent. The curated index overview is stale.                                                                 |
| `p01-t03` | partial     | Three fixture directories and exact rubric fields exist and avoid the paths currently present. The comparison evidence and loader do not establish source-grounded benchmark quality.                                                               |
| `p01-t04` | implemented | The tracked asset matches the four docs-scaffold package inputs at `0.2.22`; control-plane is correctly outside that consumer inventory while remaining part of the five-package release lockstep; release/build verification leaves no asset diff. |

### Extra Work

The root-owned `871a4e11` tracking commit is justified by clean-build
regeneration drift and is bounded to plan, implementation, and state tracking.
The implementation commit `d2a2af8c` changes only the generated asset declared
for `p01-t04`. Task commit messages and file boundaries otherwise align with
the plan. The lack of a `pnpm-lock.yaml` diff is defensible because the five
workspace package versions are represented through workspace links and real
packed release validation passed.

## Commands Run and Results

| Command                                                                                                           | Result                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git rev-parse 5d964f22... d2a2af8c... 4b7b2ab9... HEAD`                                                          | Exact base, reviewed head, tracking baseline, and current `HEAD` established; `HEAD` equals the supplied tracking baseline.                                                         |
| `git diff --name-status` / `--stat 5d964f22..d2a2af8c`                                                            | 37 changed files; 1,530 insertions and 76 deletions.                                                                                                                                |
| `git log --reverse --format='%H %s' 5d964f22..d2a2af8c`                                                           | Five commits, ordered as `p01-t01`, `p01-t02`, `p01-t03`, root tracking mutation, `p01-t04`.                                                                                        |
| `git diff --check 5d964f22..d2a2af8c`                                                                             | Passed with no whitespace errors.                                                                                                                                                   |
| `pnpm --filter @open-agent-toolkit/cli exec vitest run src/release/public-package-contract.test.ts`               | Passed 17/17; the real packed CLI notice test passed.                                                                                                                               |
| `node --test .agents/skills/explainer-kit/tests/golden-conformance.test.mjs`                                      | Passed 3/3; review found the semantic coverage gaps in I2 and M1 despite the green loader.                                                                                          |
| `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts` | Passed 25/25, including generated public-version inventory parity.                                                                                                                  |
| `pnpm release:validate`                                                                                           | Passed all five `0.2.22` tarballs and 65 visual measurements.                                                                                                                       |
| `git status --short && git diff --exit-code -- packages/cli/assets/public-package-versions.json`                  | Clean; validation introduced no tracked drift.                                                                                                                                      |
| `pnpm run cli:source -- --json pjm doctor`                                                                        | Exit 2 for unrelated pre-existing scaffold/template diagnostics; all scoped backlog terminal-status, status-enum, archive-status, duplicate-ID, and completed-ledger checks passed. |
| `gh api` license retrieval at Obra `v5.0.7`, visual-explainer `v0.8.1`, and shadcn/improve                        | All three checked-in copyright and MIT permission bodies match upstream.                                                                                                            |
| `pnpm exec oxfmt .oat/projects/shared/explainer-improvements/reviews/20260728-p01-code-review.md`                 | Passed; the review artifact was formatted.                                                                                                                                          |
| `pnpm exec markdownlint-cli2 .oat/projects/shared/explainer-improvements/reviews/20260728-p01-code-review.md`     | Could not run because `markdownlint-cli2` is not installed in this workspace; this path is outside the docs-only markdownlint gate.                                                 |

## Recommended Next Step

Convert I1 and I2 into bounded blocking fix tasks, retain M1-M3 as actionable
non-blocking tasks, and run the project review-receive workflow before Phase 2.
