---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-10-03
oat_generated: false
---

# Discovery: backlog-wave-5

## Initial Request

Deliver the approved ten-ticket Wave 5 as one Quick project and one PR. Execute autonomously through a mergeable PR, with Codex GPT-6.1 Sol at high effort implementing and independent Claude Opus 5.5 at high effort reviewing the plan, every phase, and final integration. Merge and release are not authorized.

The scope combines two validators, two lifecycle/review guidance changes, PJM configuration preservation, structured blocker preservation, one shared exact-path commit primitive, its archive and knowledge-refresh consumers, and single-page recap export plus migration. Requirements are settled in the ten authoritative backlog items; this project records bounded technical choices in its canonical plan.

## Clarifying Questions

**Workflow and topology:** The user approved one ten-ticket Quick wave and one PR; no extra spec, design, imported plan, or program artifact is needed.

**Recap layout:** The approved edit to the recap ticket requires one dated, self-contained HTML file per project, mirroring project summaries. Preserve the complete original run and QA/source evidence in the project archive; no tracked replacement sidecar.

**Execution and review:** Exact implementer/reviewer routes are user constraints, not permission to substitute targets. Normal planning self-review remains separate from the independent Claude review. Root owns commits, lifecycle state, review launches, backlog closeout, and publication.

## Solution Space

The request is well-understood. Keep the existing CLI and lifecycle boundaries, repair their specific contracts, and test their actual producers and consumers. A broad Git framework, new test harness, recap-authoring replacement, and generic review campaign would widen the approved scope.

## Key Decisions

1. **QS-04 — straight to plan:** Resolve the design-depth gate noninteractively from the approved Quick scope. The tickets settle product behavior and contain bounded compatibility constraints. Record implementation choices in `plan.md`; do not add `design.md` or `spec.md`.
2. **QS-05 — requirements confirmed:** Auto-confirm from the user's approved ten-ticket slate and the current item acceptance criteria, including the approved recap amendment. No unresolved material product question prevents task generation. The acceptance matrix in the plan maps every criterion to tasks and evidence.
3. **Commit ownership:** One narrow exact-path primitive serves existing CLI callers and skill lifecycle commits. Hooks remain enabled; unrelated staged and unstaged work survives, bounded lock retry never deletes another writer's lock, and retries identify already-completed work.
4. **Dependency order:** Build the commit primitive before archive/knowledge adoption. Change recap export and report together with completion/resume/summary consumers before migrating existing exports.
5. **Preservation before cleanup:** Verify source hashes and preserve original archived evidence before removing tracked recap support files. Rewrite only exported pages and maintained references; never rewrite original archived source evidence.
6. **Parallelism:** Evaluate disjoint validator work, then prefer sequential phases because lifecycle skills, shared validators, Git index/bookkeeping, release assets, and final integration overlap. At most two isolated implementation lanes would be permissible after root proves disjoint ownership; this plan declares none.

## Constraints

- Workspace: `/Users/tstang/Code/open-agent-toolkit`; branch: `wave/2026-10-03-backlog-wave-5`; planning entry HEAD: `91e5fb0c6`; current integration base: `6ec5313b91e2595893eb89bb6372c028c0284ab4`. Revalidate main before implementation and each phase.
- No prior active-project pointer existed before root scaffolded this project. Do not retire or absorb another project.
- Preserve the recap-ticket amendment and worktree-init sync-manifest update committed in setup; do not include unrelated work in commits.
- Keep the explicit phase review gate unchanged: enabled, all phases, code review, blocking at High. No model-target YAML, no new HiLL key during drafting.
- Use current canonical Quick and plan-writing contracts, repository/PJM guidance, docs-app conventions, and deliberate-testing author guidance.
- One PR, exact ten-ticket closure, handoff deletion when present, all repository gates, documentation, version bumps, generated projections, and independent reviews. No live provider or credential calls are needed for feature probes.
- Assurance evidence is reproduction-grade and proportional. Keep machine logs and baselines in ignored `.oat/**/analysis/`; tracked artifacts retain short evidence summaries.

## Success Criteria

- Every acceptance criterion in the plan's ten-ticket matrix has evidence from its named public boundary.
- Init and migrate preserve unowned PJM settings; structured blocker fields reach JSON consumers without breaking legacy strings or human output.
- Validators reject unbumped shared-doc vendors and invalid H1 counts while valid controls pass.
- Kickoff discloses effective recovery limits and owning hard stops without changing failed-attempt terminality; changed consequential review boundaries require credible probes or a blocking finding.
- Shared lifecycle commits protect unrelated Git state with real index-managing hooks and concurrent writers. Archive reports complete affected paths without staging. Knowledge refresh preserves manual notes.
- Future and existing recap exports contain one dated HTML page per project, have resolvable links, preserve all original evidence in the archive, and support idempotent recovery and attempt-owned rollback.
- All eight CI gates and additional applicable lint/format/docs checks pass on the reviewed head; one PR is mergeable with no merge or release performed.

## Out of Scope

- Fresh issues #339, #341, #345, #349 and deferred #340, #344; unrelated backlog closures.
- Continue-after-failed-recovery policy, model efficacy claims, new review harnesses or broad testing campaigns.
- Recap authoring replacement, changing whether completion generates recaps, Git history rewrites, provider integration changes, or credential setup.
- Manually invented versions, duplicated generated provider assets, or tracked machine evidence packages.

## Open Questions

No unresolved material product questions. Implementation must escalate unexpected ownership collisions, unavailable source artifacts, mismatched archive evidence, or preservation that cannot be proved before deletion. These are execution proof boundaries rather than permission to change scope.

## Assumptions

- The authoritative ticket files reflect the approved requirements. Re-read them before their tasks; do not replace them with this summary.
- Seven tracked recap packages are present at planning time, plus the stray fact-base JSON. Re-inventory at migration start because the approved criterion covers every current package.
- Existing local project archives can provide the original run evidence. Existence alone is not integrity proof; migration verifies every file and preserves missing evidence before removal.
- Feature probes use disposable repositories and real local Git/hooks; external archive synchronization is tested through existing offline seams, without new live S3 or provider operations.

## Risks

- **Git hook/index interference:** Formatting hooks can change both temporary and real index state; test the actual index-managing hook and compare unrelated staged blobs, unstaged bytes, committed content, and final status.
- **Contract drift:** Main or current installed tooling may differ from the branch. Fetch before phases; probe changed behavior through the branch CLI build and real consumers.
- **Recap data loss:** Legacy and v2 packages differ. Inventory each manifest, preserve all existing bytes, and stop before cleanup if any source/evidence integrity claim is unresolved.
- **Review overreach:** Probe obligations must follow changed boundaries and credible failures. Preserve containment, accepted launch policy, independent review, and existing severity/blocking models.

## Sources and Next Steps

Authoritative requirements are the ten item files under `.oat/repo/pjm/backlog/items/` listed with titles in `plan.md`. Current source inspected includes shared skill-bump validation, docs Markdown parser/validator, PJM init/migrate, control-plane parser/status consumers, project-log commit recovery, scaffold/promote/ref-sync, backlog archive, knowledge refresh, recap export/report, completion scripts, autonomy and reviewer contracts, and decision `DR-260911-explainers-are-agent-authored`.

Root has completed discovery through the owning CLI and reviews the canonical plan with normal Sol-high self-review and independent Opus-high review, records results without deleting review rows, and only then marks the plan implementation-ready. Discovery has been marked complete through the owning CLI; the plan remains in progress until its review/readiness transition.
