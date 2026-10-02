# Editorial consensus (p06-t03)

Status: DRAFT by Fable (acting lead during the user-directed Codex pause),
awaiting challenge by a non-author Claude advisor. The plan calls for
Codex/Fable consensus; the takeover note substitutes Fable lead plus a
non-author advisor while Codex is paused. Both positions are kept below.

Inputs:

- `reviews/p06-persona-developer-initial.md` — source-blind developer persona,
  visual browser, frozen export built from `084053c35` (before skill guides and
  configuration guidance). 0 High, 4 Medium (M1–M4), 3 Low (L1–L3).
- `reviews/p06-persona-adoption-initial.md` — source-blind engineering-manager
  persona, rendered HTML text over HTTP (no visual browser), combined export
  built from `f2ffaa20c` plus new README draft. 7 High, ~20 Medium (F-xx).
- Five skill-guide verification reports and six configuration-guidance
  verifications under `references/fable-lanes/verification/` (already applied
  at combined commit `7537595f5`).

Rules carried from the plan: one editorial round, one fresh persona rerun, then
a bounded fix-now / residual triage. No removal or narrowing of documented
content or capabilities without explicit user approval. New claims must be
verified against source by a non-author before they ship. No product behavior
changes.

## Fable draft position

### Fix now — new pages (each needs source verification before publishing)

| ID  | Deliverable                                                                                                                                                                                                                                                                                                   | Reader question                                                    | Findings                    | Owner page (proposed)                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------- |
| E1  | "Your first ten minutes": obtain the CLI, confirm it runs, one read-only command, one small scoped win, with what each step writes                                                                                                                                                                            | "What is the smallest safe thing I can do and see?"                | Dev M1; EM F-05             | `getting-started/first-success.md`, first in Getting Started                  |
| E2  | "What OAT writes, and what to commit": repository files, home-directory files, remote refs; a commit-or-ignore table per path                                                                                                                                                                                 | "What changes in my repo and on my machine, and what goes in Git?" | EM F-06, F-07, F-08; Dev M1 | `reference/what-oat-writes.md`, linked from Getting Started and Provider Sync |
| E3  | "Rolling out to a team": week-one pilot checklist, what a new teammate does after cloning, enabling providers for a mixed-tool team, shared vs personal settings                                                                                                                                              | "How do I pilot this with one team?"                               | EM F-05, F-22, F-24, F-14   | `getting-started/team-rollout.md`                                             |
| E4  | "Backing out": how to stop using OAT and remove what it wrote (repo, home directory, remote refs)                                                                                                                                                                                                             | "How do we exit if the pilot fails?"                               | EM F-32                     | `reference/backing-out.md`                                                    |
| E5  | "What a human approves": per workflow mode, where a person approves, what runs without approval, defaults; plus a short recipe for "human approves the plan and the final result, an independent model reviews the code", including the honest statement about permission flags for unattended review targets | "How much does the agent do without me?"                           | EM F-12, F-13, F-15, F-16   | `workflows/human-approval.md`, linked from Choose a Workflow and Lifecycle    |

### Fix now — edits to existing pages

| ID  | Change                                                                                                                                                                                                                                                                                                                                                                               | Findings                                                 | Pages                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E6  | Front door: remove migration and maintainer notes from Home, Getting Started index, Concepts description and Home Contents descriptions; restore the Home H1 to "OAT Documentation"; add the reusable-skills path to Quickstart and fix its CLI Utilities path; replace with three concrete outcomes and entry points. The source-of-truth list moves to Contributing (not deleted). | Dev L2; EM F-03, F-04, F-27                              | `index.md`, `getting-started/index.md`, `getting-started/quickstart.md`, `getting-started/concepts.md`, `contributing/index.md`                                                 |
| E7  | Resolve three contradictions by checking the code, then make both places agree: (a) configuration scope examples (`--user` example vs per-repository advice); (b) whether `oat pjm init` changes an existing root `AGENTS.md`; (c) whether sync replaces an untracked file at a view path (it does; `scope-and-surface.md` says destructive actions apply only to tracked entries)   | Dev M2, M3; EM F-09                                      | `reference/configuration.md`, `getting-started/tool-packs.md`, `provider-sync/scope-and-surface.md`                                                                             |
| E8  | Troubleshooting: separate adopter steps (installed `oat`) from contributor steps (`pnpm run cli`, `worktree:init`)                                                                                                                                                                                                                                                                   | EM F-28                                                  | `reference/troubleshooting.md`                                                                                                                                                  |
| E9  | Sweep reader pages for internal references a reader cannot follow (backlog IDs, test filenames, "Decision #11", "FR5"); replace with a plain statement or remove the reference only, keeping the fact                                                                                                                                                                                | EM F-29                                                  | site-wide, list produced first                                                                                                                                                  |
| E10 | Dispatch Policy: a short "which tier for which work" table and a provider support summary near the top (enforced on Codex and Claude; requested-not-verified on Cursor; advisory elsewhere); say plainly that OAT sets no prices                                                                                                                                                     | Dev L3; EM F-18, F-20                                    | `workflows/advanced/dispatch-ceiling.md`                                                                                                                                        |
| E11 | Catalog wording: column "Project applicability" with values `required/optional/none` becomes "Needs an active project?" with yes / optional / no (generator change plus test)                                                                                                                                                                                                        | internal-term pattern from verification                  | `apps/oat-docs/scripts/skill-catalog.ts`, `skills/index.md`                                                                                                                     |
| E12 | "How to run a skill" paragraph at the top of Skills (slash form, what a skill is versus a CLI command), and ordinary same-machine resume placed together: open, progress, next                                                                                                                                                                                                       | Dev L1                                                   | `skills/index.md`, `workflows/projects/execution/picking-up-projects.md`                                                                                                        |
| E13 | Plain-language "In short" opening (5–8 lines: what this page is for, who needs it, the three things to know) on the four densest pages; no restructuring, no deletions                                                                                                                                                                                                               | original user ask; EM "implementation contracts" verdict | `workflows/advanced/dispatch-ceiling.md`, `workflows/projects/lifecycle.md`, `workflows/projects/execution/implementation-execution.md`, `workflows/advanced/workflow-gates.md` |
| E14 | Carried items: `oat pjm init` warning also on the remote page; old `:::note` on Workflow Gates converted to the documented callout form; choose-workflow opening no longer says "Agentic Workflows is the OAT lane"; diagram label "Tracked Workflows" → "Workflows"                                                                                                                 | earlier reviews                                          | listed pages                                                                                                                                                                    |

### Residuals to report to the user (not fixed in this round)

- R1 Maturity, stability, support and non-goals statement (EM F-26): needs the
  owner's words; agents must not invent it.
- R2 Cost figures (EM F-18): OAT fixes no prices; docs can only give direction.
- R3 Product behaviors the docs now describe honestly but cannot fix: default
  install selects every pack including an always-on brainstorm skill (F-23);
  ad-hoc review cannot target a second model (F-35); unattended cross-runtime
  review needs permission-bypass flags (F-13); retro filing defaults upstream
  to `voxmedia/open-agent-toolkit` (F-31); release-to-release default changes
  with no changelog guidance (F-33).
- R4 Product defects found during verification (config wipe on `oat pjm init`,
  replace-mode update cap, binding location, skill-contract defects): for the
  user's backlog decision.

### Order and bounds

E7 and E6 first (accuracy and front door), then E1–E5 in parallel with
non-author verification, then E8–E14. One round. Anything not finished or not
verifiable becomes a residual, not a second round.

## Advisor position

Full text: `references/editorial-advisor-position.md` (independent Opus advisor,
non-author, read both persona reports and the current combined files).

Summary of the challenge:

1. Verify the shared facts once, by running OAT in a scratch repository with an
   isolated HOME and a bare origin, before any new page is written. E1, E2/E4
   and E3 rest on the same facts (what init, sync, tools install/remove and
   project creation write, and whether removal ends clean). Reading source alone
   misleads: for example `oat init --no-hook` removes an installed hook although
   its help says "Skip".
2. Three new pages instead of five: merge E2 and E4 into one Reference page
   ("What OAT writes and how to remove it"); fold E1 into a Quickstart rewrite
   (Quickstart has no install command today); shrink E3 to "Pilot Provider Sync
   with one team".
3. R2 (cost) was misread. The manager asked how many agent runs a project
   triggers, not for prices. That is derivable from the lifecycle skills and
   belongs as "automatic runs" rows in E5.
4. E5 must not imply permission bypass is required. Built-in review targets add
   no bypass flags; bypass appears only in user-written trusted-target
   examples. Publish no least-privilege recipe unless it is run end to end.
   Move F-14 (can a local setting override a team gate) into E5.
5. Split R1 and R3: ship a facts-only "Project status" block (0.x versioning,
   license, releases, issue tracker, upgrade pointer) and a "Known limits" list
   linking limits the docs already state; ship the one-or-two-sentence docs
   halves of F-23, F-31, F-33, F-35. Stability, support and non-goal
   statements stay with the owner.
6. About ten small findings were missing from the draft (F-01/F-02, F-04, F-06,
   F-07/F-10, F-11, F-17, F-30, F-36, F-37; decisions on F-19, F-21, F-25).
   Dev M4 is already fixed in the README draft.
7. E7b: source appears to support "appends"; the stale text is on
   `tool-packs.md`. F-09 is now a contradiction inside `scope-and-surface.md`.
8. Cut line: E9 (internal-reference sweep), E13 ("In short" openings, mostly
   replaced by E5 pointers) and E11 (catalog column rename) drop first.

Recorded disagreements with the lead's draft: the R2 misread; writing E1–E5 in
parallel with separate verifications; any E5 wording that implies bypass is
required or publishes an untested least-privilege recipe.

## Agreed list

The lead accepts the advisor's position in full, with one exception noted at
the end. Order of work (S/M/L = rough size):

| #   | Item                                                                                                                                                                                                                                                                                                                    | Size |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 0   | Shared fact sheet, verified by running OAT in a scratch repo (isolated HOME, bare origin): what each first-run command writes, what goes to `origin`, how to obtain the CLI, and that the removal steps end clean                                                                                                       | M    |
| 1   | Resolve the three contradictions (config scope examples; `oat pjm init` and root `AGENTS.md`; sync replacing untracked files)                                                                                                                                                                                           | S    |
| 2   | Quickstart rewrite as a safe first success, plus front-door cleanup (Home, Getting Started index, Concepts), the README synced-scope sentence, and a facts-only "Project status" block with a "Known limits" list                                                                                                       | M    |
| 3   | New page "Where people approve and what runs automatically": approvals and automatic runs per workflow mode, when OAT pushes to `origin` and how to stay local, whether a local setting can override a team gate, and the truthful permissions statement; pointers from Choose a Workflow, Lifecycle and Workflow Gates | L    |
| 4   | New Reference page "What OAT writes and how to remove it" (merged E2 + E4), built from item 0                                                                                                                                                                                                                           | L    |
| 5   | New page "Pilot Provider Sync with one team" (shrunk E3): week-one checklist, new teammate steps, mixed-tool enablement                                                                                                                                                                                                 | M    |
| 6   | Small fixes batch: F-04, F-06 pointers, F-07/F-10, F-11, F-17, F-30, F-36, F-37, F-19, F-21, F-25, the docs halves of F-23, F-31, F-33, F-35, and the carried E14 items                                                                                                                                                 | S    |
| 7   | Troubleshooting: adopter versus contributor steps                                                                                                                                                                                                                                                                       | S    |
| 8   | "How to run a skill" on Skills, and same-machine resume (open, progress, next) together                                                                                                                                                                                                                                 | S    |
| 9   | Dispatch Policy: which tier for which work, provider support summary near the top                                                                                                                                                                                                                                       | S    |
| --  | Cut line: drop from here first if the round runs long                                                                                                                                                                                                                                                                   |      |
| 10  | Catalog column "Project applicability" → "Needs an active project?" (generator and test)                                                                                                                                                                                                                                | S    |
| 11  | Internal-reference sweep outside `contributing/`                                                                                                                                                                                                                                                                        | S-M  |
| 12  | "In short" openings on the densest pages, where item 3's pointers do not already cover it                                                                                                                                                                                                                               | M    |

Exception: the lead keeps item 10 above the cut in practice, because "Project
applicability" is the one internal term left on the main Skills page; it moves
below the line only if the generator change proves larger than a label.

Residuals reported to the user, not fixed: owner-worded stability, support and
non-goals statement; product behaviors and defects listed in the verification
reports (config wipe on `oat pjm init`, replace-mode update cap, binding
location, skill-contract defects, default pack selection, ad-hoc review
targeting, retro filing default).

Bounds: one round. New factual claims are verified by a non-author (item 0 for
write and removal facts; skill contracts for approval facts). No content or
capability is removed; moved maintainer notes go to Contributing.
