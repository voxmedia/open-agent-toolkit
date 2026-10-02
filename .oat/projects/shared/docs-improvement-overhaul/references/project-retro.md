---
oat_retro_project: docs-improvement-overhaul
oat_retro_generated: 2026-10-02T19:33:13Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: review-artifacts
    status: used
  - source: git-history
    status: used
  - source: ci-checks
    status: used
  - source: codex-root-transcript
    status: used
  - source: codex-child-transcripts
    status: used
  - source: codex-child-task-prompts
    status: unavailable
  - source: claude-session-transcript
    status: used
  - source: claude-subagent-transcripts
    status: used
oat_retro_promotions: proposed
oat_retro_filing: proposed
oat_generated: true
oat_template: false
---

# Project Retrospective: docs-improvement-overhaul

## Executive Summary

The project delivered what it set out to do: a reader-first docs site, a guide
section for every one of 71 skills, configuration decision guidance, a new
README, and two persona reviews whose reruns found the earlier problems fixed.
It is all in PR #342, which is green on CI. The project ran for about 21
hours, and much of that time was not productive. About 6h45m went to the
driving agent stopping to wait on a peer or a user decision. About 2h30m went to a
phase-1 navigation compiler that main had already shipped a few hours before
that phase started. A further share went to proof machinery (section hashes,
receipts, negative controls, three-round reviews) applied to a docs-only page
move. The checks that paid off were the ones that ran the CLI: independent
verification lanes in scratch repositories found real errors in nearly every
drafted claim, and about 46 product defects along the way.

What should change: check the base against main before planning and at each
phase start, scale evidence and review rounds to the risk of the change, and
never let an agent end its turn on a peer dependency it can work around.

## Evidence and Review Method

Root synthesis by Claude (Fable), from three read-only Opus reconnaissance
lanes plus direct reads:

- **Durable artifacts:** `project-log.md` (7 structural entries), `state.md`,
  `plan.md`, `implementation.md`, `design.md`, `discovery.md`, all 22 files in
  `reviews/`, the named `references/` files, `references/fable-lanes/`, and
  `git log origin/main..amphipod` (about 100 commits).
- **Codex root session:** the rollout for 2026-10-01T17:21 CDT, streamed in
  full (1,020 tool calls, 11 compactions), plus its 23 child sessions. Child
  task prompts and reasoning are encrypted and were not readable; child scope
  was reconstructed from names and final answers.
- **Claude session:** this session's transcript and its 58 Opus subagent
  transcripts.
- **CI:** `gh pr checks 342`.
- **Unavailable:** `oat-execution-learnings.md` does not exist for this
  project.

Times below are UTC. Claims are confirmed by durable evidence unless marked
**Hypothesis** or **Inconclusive**.

## Outcome Snapshot

| Area                     | Result                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Information architecture | Sections reordered reader-first; pages moved with a section-hash conservation check                                                                         |
| Skills                   | 71 guide sections, each with an example scenario and a "What it does without asking" note; generated catalog with a parity check                            |
| Configuration            | "Choosing…" guidance on 18 pages                                                                                                                            |
| New pages                | Approvals and Automation, What OAT Writes, Pilot Provider Sync with One Team; Quickstart rewritten                                                          |
| Visuals                  | Four Mermaid diagrams with text equivalents; README SVG                                                                                                     |
| Theme                    | Skills-site type system with the explainer "executive" palette and a derived dark variant (`b76c6ed0a`, added after final QA)                               |
| Persona reruns           | Developer: 6 of 6 earlier problems fixed. Evaluator: 11 of 14 fixed, 2 partly, 1 then addressed in `a554e9e46`                                              |
| Verification             | All eight gates exit 0 at `e1c6b7d94` with a forced, isolated-HOME test run; CI green on #342                                                               |
| Product defects          | About 46 findings grouped into 25 `BL-261002-*` backlog items; no product behavior changed                                                                  |
| Lifecycle                | `pr_open`. The plan's Reviews table still lists p03–p06 and final code review as `pending`: no native `oat-reviewer` artifact was produced for those phases |

## Current State

- **Promotions:** `proposed`. RP-01 and RP-02 are apply items at `proposed`.
- **Filing:** `proposed`. RP-03 to RP-06 and UP-01 to UP-06 are at
  `proposed` with no destination.
- **Unsettled items:** RP-01 and RP-02 (apply), RP-03 to RP-06 (file to the
  repository backlog), UP-01 to UP-06 (file upstream).

## What Went Well

- **Verification that ran the product.** Every configuration verification lane
  returned ACCEPT WITH CHANGES with at least one blocking error. The five
  skill-guide verifiers found 5 blocking and about 66 should-fix issues, mostly
  understated side effects. Running the CLI in scratch repositories with an
  isolated HOME is what caught the five fact-sheet errata (for example, plain
  `oat status` exits 1, not 0) and reproduced data-loss behavior in `oat sync`
  and `oat pjm init` (`references/fact-sheet-errata.md`,
  `references/fable-lanes/verification/`).
- **Drafter and verifier as separate agents.** A fresh verifier with no stake
  in the draft caught errors the drafter had stated confidently. The author
  then applied the verifier's wording, so no claim reached a page unchecked.
- **Source-blind personas with a rerun.** Initial reviews found 4 Medium
  problems (developer) and 7 High problems (evaluator). Each rerun re-tested
  every earlier problem by name and still found new ones, such as lite always
  opening a pull request (`reviews/p06-persona-*-rerun.md`).
- **The hash guard caught one real silent mutation.** During the page move an
  assembler matched inline `## Contents` prose; the build missed it and the
  guard did not (`references/p02-t02-prevention.md`).
- **A rendered tour caught what static checks did not:** four pages without an
  H1 and a diagram with 5.8px text on a phone (`reviews/final-visual-qa.md`).
- **The takeover handoff worked.** Codex wrote
  `references/fable-takeover-2026-10-02.md`, preserved three interrupted
  workers' worktrees, and Fable closed phases 3–6 in about two hours.

## Challenges and Struggles

### Phase 1 rebuilt a feature main had already shipped

The branch was cut from main at 2026-10-01 12:53. Main merged Fumadocs
navigation sync (#336, 23:55) and its follow-up (#338, 00:24) while design was
under way. A navigation recon lane had reported "nav sync is MkDocs-only" 37
minutes before #336 merged, and nobody re-checked. The plan was approved at
03:32 and p01 ran from 03:46 to 06:16: about 1,000 lines of compiler code,
three code-review rounds, two fix rounds and three gate runs. The overlap
surfaced at 15:35 when `release:check-versions` failed against main; Fable
traced it to #336. Main was merged (`084053c35`) and main's implementation
was taken. Only the docs app's validators, tests and authoring guidance
survived from p01. None of about five plan and design review passes checked
the base against main. The plan now requires a fetch and diff at each phase
start.

### Three long stops waiting on a peer or a decision

The Codex root stopped three times: 56 minutes waiting for the user to confirm
draft-and-review, about 2 hours waiting on a dispatch-policy choice and a
Fable draft, and 3h49m (07:56–11:45) on "blocked on Fable's required map
review: its pane contains an unsent draft". Codex will not type over a human
draft, so it queued seven messages to an Orca inbox. Fable reads that inbox
only when something prompts it. The user asked "why did you guys stop?" and
said there was no unsent text. In response, Codex nudges the terminal even when
a draft is present and proceeds conservatively after a few minutes
(`references/orchestration-log.md`, "User override"). A later round of Fable
reviews still sat about 35 minutes for the same reason. Whether the draft
field was wrong or held stale text is **Inconclusive**.

### Proof machinery sized for code, applied to a page move

The page move was guarded by 816 section hashes, a link-span checker with
negative controls, receipts and a three-round map review. Round 1 found two
real problems; rounds 2 and 3 found nothing and one stale count. One table
that oxfmt re-padded (16 whitespace spans, no content risk) took a proposal,
two reviews, 13 negative controls and a guard-neutralization proof. 55 of
about 100 commits are `chore(oat)` bookkeeping, and project records are about
88% of the PR's added lines (route and capability baselines alone are 2.7 MB).
The user asked "Progress seems pretty slow. What is taking the most time?" at
15:20 and approved six adjustments: one review round per phase, gates once at
phase close, no receipts for docs-only changes, parallel lanes, fan-out by
skill family, fewer PRs. **Hypothesis:** the AGENTS.md rule requiring negative
controls for assurance-bearing contracts was read as covering a docs move, and
Fable's own early proposal to hash every section contributed.

### Review rounds that converged to nothing

p01 code review went 1 High/3 Medium/1 Low, then 1 Low, then 0. The p02 map
went 2 Medium, then 0, then 1 Low. Plan review needed a second native pass
and a final re-review that both came back clean. All of p01 was then thrown
away.

### Gate artifact rejected for formatting

Plan gate attempt 1 failed with `artifact_validation_failed` because the
reviewer wrote findings as bold paragraphs instead of list items, so the
parser miscounted them. The five findings were applied anyway and attempt 2
passed (`reviews/gate-attempt-01-recovery.md`).

### Moved pages broke tests no docs check covered

After the page move, 18 skill tests failed because recon and oat-doctor tests
hardcode docs paths, and six inline-code citations pointed at deleted files.
Only the root's isolated-HOME test gate and Fable's diff review found them.
Fixed in `777810f5b` and `ad71d9cd9`, using recovery attempt 1
(`project-log.md`, p02 entry).

### Fable's own errors

- Sent Codex a claim that the docs app had no CLI dependency before reading its
  own verification output, then withdrew it.
- Asked that every item on an old landing page be "accounted for
  individually", which produced router fragments pasted onto six pages, and
  then over-corrected by proposing to delete all six. Codex kept the one
  load-bearing claim.
- Tried visual QA in the user's own laptop browser while the user was working
  in it. A click may have opened a stray tab and keystrokes did not land.
  Playwright had been installed in the repository the whole time.
- Wrote a Playwright tour that assumed a `<main>` element (the site uses
  `article#nd-page`) and whose SPA content assertions read the previous page.
  Screenshots, not assertions, were the evidence.

### Records drifted from reality

`state.md` and `implementation.md` showed the pre-takeover state until the end
of the run. The plan names 12 evidence files that were never produced as
named; their substance is in `references/fable-lanes/`. The progress pull
request the user asked for at 15:23 never shipped; the user settled on one PR
at 18:45.

## Decision Register

| Decision                                                        | Rationale                                                       | Record                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Reader-first IA; skills in family guides with per-skill anchors | Navigation follows reader goals; a page per skill would be thin | `discovery.md` "Chosen Direction"                      |
| Moved URLs break, no aliases                                    | User decision; aliases add maintenance for a pre-1.0 site       | `design.md` "User decision: allow moved URLs to break" |
| Take main's nav sync, retire p01's compiler                     | Main shipped the feature; two implementations would diverge     | `plan.md` "Main-foundation consolidation"              |
| Speed amendment                                                 | User-approved after the throughput question                     | `plan.md` "User-approved speed amendment"              |
| Verify a shared fact sheet before writing new pages             | One run-verified source of claims for three pages               | `references/editorial-consensus.md`                    |
| Document product defects, do not fix them                       | Project scope was docs-only                                     | `references/product-defects-found.md`                  |

No missing decision record is justified: these are project-scoped.

## Rejected or Superseded Alternatives

- Ignored metadata plus an ownership sidecar for navigation (design): replaced
  by main's committed `meta.json`.
- Five new pages from the evaluator persona's findings: cut to three, with
  the rest folded into existing pages.
- Generalizing the table-format exception: rejected; it covers exactly one
  table.
- Laptop desktop-browser QA: abandoned for headless Playwright on the
  execution host.

## Where We Changed Course

- **Main shipped nav sync** → merged main, voided p01 as a deliverable, kept its
  validators.
- **"Progress seems pretty slow"** → speed amendment; Fable fanned out 27 Opus
  lanes within 40 minutes.
- **"Are we actually improving clarity, not just reorganizing?"** → phase 6
  added: personas, scenarios for every skill, configuration guidance.
- **Codex usage limit** → Fable took over execution and closed phases 3–6.
- **Laptop browser was the user's own window** → QA moved to Playwright on the
  Mini.

## Domain Learnings

- Behavioral claims in docs are wrong more often than they look. Every claim
  about what a command writes, exits with or overrides needs a run in a
  scratch repository, not a source read.
- Skill docs understate side effects. Pushes, pull requests and commits made
  without asking were the most common verifier finding. A required "What it
  does without asking" line per skill made them visible.
- A page move is a low-risk change. A section-hash diff and one review are
  enough; consumer sweeps (tests and inline-code paths) are where the real
  breakage hides.
- Diagram legibility depends on viewport width. Measure the smallest rendered
  text at 390px; a top-down flowchart with wide rows can drop below 6px.

## Gotchas for Humans

- Before approving a plan, ask whether main has shipped anything in the
  plan's area since the branch was cut.
- When an agent says it is blocked on another agent, check whether it can do
  other work meanwhile; a "blocked" turn can sit for hours.
- Give a headless browser on the execution host for visual QA, not your own
  desktop browser.
- A green `pnpm check` after a small CSS change is mostly a cache replay;
  10 of 11 tasks replayed for the theme commit.

## Gotchas for Autonomous Agents

- Fetch and diff `origin/main` before design, before plan approval and at each
  phase start. Recon findings about "what exists" expire when main moves.
- Finish an open merge before dispatching lanes that run the CLI in that
  worktree; verifiers B, C, E and F could not run the CLI because of conflict
  markers in `package.json`.
- Do not end a turn on a peer review you are waiting for. Work on independent
  tasks, nudge the peer, and after a few minutes proceed with the conservative
  option.
- Read your verification output before reporting a conclusion to a peer.
- Copy lane outputs into the project's `references/` as they arrive;
  session-temp storage lost one lane file.
- In Fumadocs exports, the content container is `article#nd-page`; wait for
  navigation to settle before asserting page content.

## Repo Improvements (Promotion Register)

### RP-01: Check the base against main before planning and at each phase start

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** proposed
- **Target:** AGENTS.md
- **Applied-ref:** —
- **Disposition-note:** —

Phase 1 rebuilt Fumadocs nav sync that main had merged between the branch cut
and the plan's approval; about 2h30m of implementation and review was
discarded. Add to Development Workflow: fetch `origin/main` and diff it against
the branch base before plan approval, at each phase start, and before
dispatching parallel lanes; if main touched the plan's target paths, stop and
reconcile first. Also: finish any open merge before fanning out lanes that run
the CLI.

### RP-02: Scope the negative-control rule and size evidence to risk

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** proposed
- **Target:** AGENTS.md
- **Applied-ref:** —
- **Disposition-note:** —

The Definition of Done paragraph requiring reproduction-grade negative controls
for assurance-bearing contracts was applied to a docs page move, producing
receipts, 13 negative controls for one whitespace table, and 2.7 MB of tracked
baselines. Add one sentence: docs-only moves and edits use a conservation diff
and one review round; negative controls and receipts are for security,
provenance, approval and publication contracts. Large machine baselines stay
in gitignored analysis paths, with a summary in the tracked reference.

### RP-03: Require exactly one H1 per docs page in `docs:validate`

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Four skill guides shipped without an H1. markdownlint disables MD025 and
frontmatter hides MD041, and `apps/oat-docs/scripts/validate.ts` has no
heading rule. Only the rendered tour found it (`7f508e58a`). Add a
one-H1-per-page check to `docs:validate` with a fixture test.

### RP-04: Commit a headless docs QA tour

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Final QA used an ad hoc Playwright script against a static export. It found
problems no static check found: missing H1s, 5.8px diagram text at 390px.
Commit it under `apps/oat-docs/scripts/`: crawl from Home; check one H1 per
page, horizontal overflow at 1440px and 390px, the smallest Mermaid text at
390px, and 404 recovery on removed routes. Use `article#nd-page` and wait for
navigation before asserting content.

### RP-05: Catch hardcoded docs paths in skill tests when pages move

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Moving pages failed 18 skill tests in `.agents/skills/{recon,oat-doctor}/tests`
that hardcode docs paths; only the isolated-HOME test gate caught it. Either
have `docs:validate` check docs-path references in skill tests, or have those
tests resolve paths from the docs tree.

### RP-06: Theme Mermaid diagrams and make them readable on phones

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

`@open-agent-toolkit/docs-theme` initializes Mermaid with the stock theme,
so diagrams ignore the new palette. The ideas-lifecycle diagram renders at
7.7px text on a 390px screen. Pass palette variables to Mermaid and give
diagrams a minimum width inside a horizontal scroll region on narrow screens,
as the skills site does.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Warn when main has moved under the plan

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Quick-start, plan and implement do not check whether the default branch has
changed the plan's target paths since the branch base. In this run main
shipped the exact feature phase 1 then built. Add a base-freshness check at
plan approval and phase dispatch that lists default-branch commits touching
planned paths and asks before continuing.

### UP-02: Re-review only when a round finds Critical or High issues

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Phase code reviews and artifact reviews ran until a clean round: 1 High, then
1 Low, then 0. Each extra round cost a dispatch, a fix and gates. Make the
default: fix Medium and Low findings in place without another review round;
re-review only after Critical or High findings; cap rounds.

### UP-03: Gate review parser rejects valid findings over formatting

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

`oat gate review` returned `artifact_validation_failed` because the reviewer
wrote findings as bold paragraphs rather than list items. Either accept that
shape or give the reviewer the exact required format in its prompt and
validate it with a clear message.

### UP-04: Flag pending reviews when a project reaches a pull request

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

This project reached `pr_open` with p03–p06 and the final code review still
`pending` in the plan's Reviews table, and nothing flagged it. The PR skills
should list pending required reviews and ask whether to run them, record a
waiver, or stop.

### UP-05: Size evidence to the change type and resume cleanly under a new driver

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

Implement gave a docs-only page move the same proof machinery as a code
change. When the driving agent changed mid-run, no step refreshed `state.md`
and `implementation.md`, which stayed stale until close. Let a plan declare
an evidence tier per phase (docs, code, assurance-bearing) that sets review
rounds and required artifacts. Give implement a takeover step that reconciles
tracking with git history before continuing.

### UP-06: Let skills declare their side effects in metadata

- **Status:** proposed
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** —

The most common verifier finding across 71 skill guides was an understated
side effect: commits, pushes and pull requests made without asking. If
`SKILL.md` frontmatter declared side effects (commit, push, open PR, delete,
write outside the repository), the docs catalog and `oat doctor` could show
them and validators could check the guides against them.

## Remaining Boundaries and Follow-Ups

- Orca relay problems (inbox delivery without a wake, the draft field blocking
  sends, stale terminal handles) are outside OAT. They are tracked in orc
  pull requests #46, #47 and #51.
- The about 46 product defects are in the 25 `BL-261002-*` backlog items.
- A project stability, support and non-goals statement needs the owner's
  wording.
- The theme commit `b76c6ed0a` was checked with screenshots of four pages, not
  a full tour.

## Reflections

The checks that carried this result were the ones that ran the product and
the ones written by an agent with no stake in the draft. A page reads well
whether or not its claims are true; only running the command shows which.
The ceremony that cost the most was the kind that guards against a mistake
the change could not make. Hashing 816 sections protected a move that a
diff could have checked. A third review round confirmed a clean second one.
The largest loss was simpler than any of that: nobody looked at main
in the sixteen hours after it shipped the feature the plan was about to build. Next
time, check what changed upstream before checking our own work in detail, and
let the risk of the change set the depth of the evidence.
