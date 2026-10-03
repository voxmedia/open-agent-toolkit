---
oat_generated: true
oat_generated_at: 2026-10-03T21:19:58Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/backlog-wave-5
oat_gate_headless: true
oat_gate_run_id: 7abeb986-214b-460e-8ec3-ccbb4cae81a1
oat_gate_target: claude-opus-5-5-high
oat_gate_runtime: claude
oat_invocation_model: claude-opus-5-5
oat_invocation_reasoning_effort: high
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-10-03
**Scope:** `plan.md` for backlog-wave-5 (quick mode), checked against `discovery.md`, the ten authoritative backlog items, and current source at `abba835844724079a86ff23122fa0f2027f78e2e`
**Files reviewed:** 2 (`plan.md`, `discovery.md`) plus the ten ticket files
**Commits:** not applicable (artifact review)
**Workflow mode:** quick
**Gate route:** inline (runtime=claude, cliRoot=/Users/tstang/Code/open-agent-toolkit)
**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`
**Reconnaissance:** not-attempted

## Summary

The plan covers all ten tickets: its 40 acceptance rows match the tickets' 40 acceptance bullets one for one, every named existing source file and skill exists, every named root script exists, and `project validate-plan` reports it valid. No blocking findings. Six Medium findings are places where a task names the wrong files or prescribes a command that fails or reaches outside the repository; each is a small plan edit and none changes the phase structure.

Findings by severity: 0 critical, 0 high, 6 medium, 4 low

## Findings

### Critical

None

### High

None

### Medium

**M1. p04-t02 names two skills that do not call `oat backlog archive`, and omits the four that do** (`plan.md:230`)

The task's Files line names `oat-project-complete/SKILL.md` and `oat-project-retro-file/SKILL.md`. Neither contains the string `backlog archive` (0 matches each). The actual callers are `oat-pjm-update-repo-reference` (5 matches), `oat-pjm-review-backlog`, `oat-doctor`, and `oat-wave-execute` (SKILL.md and `assets/wrapper-plan-template.md`), plus the templates `.oat/templates/pjm-agents.md`, `repo-agents.md`, and `repo-readme.md`. The "other actual call sites located by scoped inventory" clause would catch them, but acceptance row S2 rests on the caller, and the implementer is pointed first at two files with nothing to change. `.oat/templates` edits are bundled assets, so they also belong in the p06-t01 inventory.

Fix: replace the two named skills with the four real callers and the three templates; keep the inventory clause as a backstop.

**M2. p03-t03's closed skill list leaves out commit-bearing skills without a recorded reason** (`plan.md:200`)

The task says "these skills only" and lists 24. A grep for executable `git add`/`git commit` snippets also finds `oat-agent-instructions-apply/SKILL.md:385`, `oat-docs-apply/SKILL.md:248`, `oat-review-provide/SKILL.md:210`, and `oat-review-receive-remote/SKILL.md:186`. All four use the `git add <files>; git commit` form the ticket describes as committing everything staged. `oat-wave-execute/assets/wrapper-plan-template.md:123` and `.agents/agents/oat-phase-implementer.md:145` also carry commit instructions and are not in the "direct commit-bearing files" parenthetical. In the other direction, `plan-and-resume.md` is listed but has no commit snippet, and `oat-project-retro` appears only through its reference file, not in the skill list (so its version bump is easy to miss).

The same task says "report every adopted or intentionally excluded site", which contradicts "only". Acceptance row C1 ("one helper for CLI and skill commits") will be argued at the p03 review unless the exclusions are decided now.

Fix: either add the four non-project skills, or state in the task that non-project skills are excluded and why; add `oat-project-retro` to the list; drop `plan-and-resume.md`; say whether the wrapper plan template and the implementer agent's task commits are in or out.

**M3. p05-t03's format step fails on the files it names, and would break the page hash if it ran** (`plan.md:298`, `plan.md:59`)

The task says "Scoped formatter on flat HTML". `.oxfmtrc.jsonc:36` ignores `.oat/repo/reference/project-recaps/**`, with a comment that a formatter rewrite breaks the durability attestation. Running `pnpm exec oxfmt --check` on a recap HTML path exits 2 with "Expected at least one target file". If the ignore were bypassed, oxfmt does rewrite HTML (confirmed on a scratch file), which would change the exported bytes after p05-t01 has reported their SHA-256, so a later re-archive would see a mismatch and reject.

Fix: state that exported recap pages are never formatted, in p05-t01 and p05-t03 and as an exception to the general rule at line 59; format only the rewritten Markdown references; keep the `.oxfmtrc.jsonc` ignore entry, which still matches the flat files.

**M4. p06-t01 tells the implementer to run `oat sync --scope all`, which writes outside the repository** (`plan.md:310`)

`--scope all` also syncs user scope: it rewrites `~/.cursor/agents` and `~/.codex/agents` and restamps `~/.oat/sync/manifest.json` to the invoking CLI's version. This was recorded as an operator correction in wave 3 (lanes use `--scope project`; `--scope all` is operator-only). The task also does not say which `oat` runs the sync; the one on PATH is the released build, not the branch build that contains this wave's changes.

Fix: use `pnpm run cli -- sync --scope project` in p06-t01, and leave any user-scope refresh to the operator.

**M5. Phase 6 mixes root-executed tasks into an implementer-dispatched phase, and closes the tickets before the reviews that could reopen them** (`plan.md:50`, `plan.md:320-336`)

Line 50 assigns the Codex implementer to every phase. p06-t02 says "Root executes closeout after applicable reviews" and p06-t03's files are all root-owned, so two of the three p06 tasks are not implementer work, and the plan does not say how the phase is dispatched. p06-t02 also archives the ten items with "verified outcome" summaries and deletes handoffs before the p06 gate and the final review run; a fix task from either review would land after the tickets are recorded as complete.

Fix: state who executes p06-t02 and p06-t03 (root, outside the dispatched phase, or the implementer with root-owned files excluded), and state what happens to an already-archived item if a later review adds a fix task for it.

**M6. After p03-t03, lifecycle commits in this checkout depend on a command the PATH `oat` does not have** (`plan.md:172`, `plan.md:204`)

p03-t03 rewrites lifecycle skill snippets to call `oat internal commit-paths`. No skill calls any `oat internal` command today, and the released `oat` on PATH will not have this one until the wave ships. From p03 onward, any session that loads the repository's canonical skills and runs a bookkeeping commit for this project gets an unknown-command error. The plan says the branch CLI is used for the p06-t02 archive but is silent for the root's own lifecycle commits in p03 through p06.

Fix: state that from p03-t03 on, root lifecycle commits use the branch-built CLI, and have the skill text say what to do when the command is missing (stop with update guidance; do not fall back to a broad `git commit`).

### Low

**L1. p01-t03 points at the wrong docs directory** (`plan.md:112`). The autonomous guide is `apps/oat-docs/docs/workflows/advanced/autonomy.md`; nothing under `workflows/projects/execution/` mentions `oat-project-autonomous`. The "after locating its current source" wording would recover, but the path should be corrected.

**L2. Stale state claims.** Line 53 says to preserve "the approved dirty recap item and `.oat/sync/manifest.json`", but the working tree is clean at the reviewed head, so there is nothing dirty to preserve. `discovery.md` frontmatter says `oat_status: complete` while its last sentence and the plan checklist (line 42) say discovery is still to be completed.

**L3. The self-review row in the Reviews table uses non-standard cells** (`plan.md:428`). An artifact row carries `-` for Reviewed Head, Invocation, and Gate Target; this row has a SHA, "auto / inherited planning parent", and `codex:gpt-6.1-sol:high` in the Gate Target column although it was not a gate review. It is harmless to artifact reviews, but lineage matching reads these columns by name. This review appended its own row and left that one unchanged.

**L4. p03-t01 states outcomes but not the index strategy** (`plan.md:176`). The task requires hooks enabled, unrelated staged blobs preserved, and hook-formatted owned paths committed clean, without choosing how (for example a temporary index, or `git commit --only`). The real-hook tests will expose a wrong choice, so this is not blocking, but the task should tell the implementer to record the chosen mechanism in `implementation.md` and to escalate if the three requirements cannot hold together for a partially staged unrelated file.

## Spec/Design Alignment

### Requirements Coverage

Quick mode: the requirements sources are `discovery.md` and the ten ticket files. Status describes plan coverage, not implementation.

| Requirement                               | Status  | Notes                                                                                 |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| R1-R9 (recap page export, 9 bullets)      | covered | p05-t01/t02/t03, p06; seven packages and the stray JSON confirmed present; see M3     |
| C1-C5 (exact-path commit primitive)       | covered | p03-t01/t02/t03; CLI commit sites match the plan's list; see M2, M6, L4               |
| K1-K4 (knowledge refresh safety)          | covered | p04-t03; all eight current knowledge files carry `oat_generated: true`                |
| P1-P4 (preserve `pjm.*` on rerun)         | covered | p02-t01; the five named docs pages are the ones carrying the warning                  |
| V1-V3 (skill bumps follow vendored docs)  | covered | p01-t01; 18 vendoring symlinks across 8 shared docs exist today                       |
| H1-H3 (one H1 per docs page)              | covered | p01-t02; `apps/oat-docs/tests` and the named test command exist                       |
| A1-A3 (autonomous limits and hard stops)  | covered | p01-t03; see L1                                                                       |
| Q1-Q6 (proportional review probes)        | covered | p01-t04                                                                               |
| B1 (structured blockers)                  | covered | p02-t02; `types.ts:132`, `parser.ts:125`, `project.ts:65,138` are the typed consumers |
| S1-S2 (archive staging caller-owned)      | covered | p04-t01/t02, p06-t02; see M1                                                          |
| Discovery: one PR, no merge or release    | covered | Stated in the goal and the completion section                                         |
| Discovery: sequential phases, no HiLL key | covered | `oat_plan_parallel_groups: []`; phase review gate preserved                           |

Dispatch Profile advisory: the plan has no `## Dispatch Profile` section, which is normal and not a finding.

### Extra Work (not in requirements)

None

## Verification Commands

```bash
# M1: real archive callers
grep -rlE "oat backlog archive" .agents/skills .oat/templates | grep -v "/tests/"

# M2: commit-bearing skill files
grep -rlE "git commit" .agents/skills --include='*.md' --include='*.mjs' --include='*.sh' | grep -v "/tests/"

# M3: formatter refuses ignored recap paths (expect exit 2)
pnpm exec oxfmt --check .oat/repo/reference/project-recaps/20260914-agent-authored-recap/site/index.html; echo "exit=$?"

# L1: autonomous guide location
grep -rlE "oat-project-autonomous" apps/oat-docs/docs --include='*.md'

# Plan structure
oat --json project validate-plan --project-path .oat/projects/shared/backlog-wave-5
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
