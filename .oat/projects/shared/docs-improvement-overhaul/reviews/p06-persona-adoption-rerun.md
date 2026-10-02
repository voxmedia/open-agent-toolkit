# OAT adoption review: Engineering Manager persona (re-run)

## Provenance

- **Persona:** Engineering Manager / Tech Lead, 30-person product engineering org, mixed Claude Code / Cursor / Codex teams. About 45 minutes to decide whether to pilot OAT with one team, and to defend that decision to a skeptical staff engineer, a security reviewer and a director. Has never seen OAT before.
- **Date:** 2026-10-02
- **Site:** http://127.0.0.1:59786/open-agent-toolkit/ (local build of the docs site)
- **Method:** I fetched rendered HTML over HTTP with curl and Python and read it as extracted text. I used no visual browser, so I could not see layout, diagrams or styling. I found pages from the sidebar and in-page links, as a reader would.
- **README:** I read `persona-rerun/README.md` and viewed `persona-rerun/readme-image.png` as an image.
- **Pages read in full or in the relevant section (24 site pages, plus the README and its image):**
  1. `/` (Home)
  2. `/getting-started/`
  3. `/getting-started/quickstart/`
  4. `/getting-started/concepts/`
  5. `/getting-started/bootstrap/`
  6. `/getting-started/tool-packs/` (the install, update, remove, upgrade, core and workflows-pack sections)
  7. `/provider-sync/`
  8. `/provider-sync/pilot-with-a-team/`
  9. `/provider-sync/instruction-sync/` (opening section)
  10. `/reference/what-oat-writes/`
  11. `/reference/configuration/` (surfaces, preferences, choosing a layer)
  12. `/reference/troubleshooting/`
  13. `/workflows/`
  14. `/workflows/choose-workflow/`
  15. `/workflows/approvals-and-automation/`
  16. `/workflows/projects/planning/starting-projects/` ("Before your first project" and the project-entry sections)
  17. `/workflows/projects/planning/hill-checkpoints/`
  18. `/workflows/advanced/dispatch-ceiling/` (Dispatch Policy)
  19. `/workflows/advanced/workflow-gates/`
  20. `/workflows/advanced/autonomy/`
  21. `/workflows/projects/reviews/review-flavors/`
  22. `/skills/`
  23. `/skills/research/`
  24. the section indexes for Docs Tooling, Reference and Contributing (read for their navigation only)
- **Text scan only:** I fetched all 89 pages reachable from the site navigation and ran a plain-text search over them. I used it only for re-test items (m) and (n): internal IDs, test filenames, source paths and `pnpm` commands. I did not read those pages as a reader.
- **No source repository, skill file, project or planning artifact, earlier review, or other local file was read. I did not run `oat` or any project command.**

---

## Click-path log

| #   | Task                                        | Path (hops from where I started)                                                                                                       | Looking for                                                            | Found?                                                             |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | README in 60 seconds                        | README (0) and its image (0)                                                                                                           | What OAT is, what my team gets, the smallest thing to adopt            | Yes                                                                |
| 2a  | Adopt one capability                        | Home → Provider Sync (1)                                                                                                               | Can sync be adopted alone?                                             | Yes ("You can adopt this layer on its own")                        |
| 2b  | Week-one pilot                              | Provider Sync → Pilot Provider Sync with One Team (2). The page also appears in the sidebar under Provider Sync.                       | A week-one plan and the teammate steps                                 | Yes                                                                |
| 2c  | First steps                                 | Home → Start here → Quickstart (1)                                                                                                     | Smallest install and first result                                      | Yes                                                                |
| 3   | Repository and machine footprint            | Quickstart → "What OAT Writes" (2). Also Reference → What OAT Writes (2).                                                              | What gets committed or ignored, home-directory writes, pushes, removal | Yes, very thorough                                                 |
| 4a  | Approvals                                   | Home → Workflows → Choose a Workflow (2) → "read Approvals and Automation" (3)                                                         | Where a human approves, and the defaults                               | Yes                                                                |
| 4b  | Plan, final approval and independent review | Approvals → "Set it up the way you want" (same page) → Workflow Gates (4) → HiLL Checkpoints (4)                                       | A recipe, and whether I can trust it                                   | Recipe found. Trust is undermined by a contradiction (H1).         |
| 4c  | Can a developer weaken team rules?          | Approvals → "Can a teammate weaken a team rule?" (3)                                                                                   | A plain answer                                                         | Yes ("Yes, on their own machine")                                  |
| 4d  | Reviewer permissions                        | Approvals → "Permissions for unattended review" (3) → Workflow Gates, trusted targets (4)                                              | What an unattended review needs                                        | Yes, but no narrow allowlist is offered                            |
| 5   | Cost and model bounds                       | Approvals → "How many agent runs" (3) → Dispatch Policy (4), then scrolled to "Which tier for which work" at the end of the page       | Tier meanings, what to choose, run estimate                            | Yes. The guidance is at the bottom of a page that opens in jargon. |
| 6   | Team versus personal configuration          | Reference → Configuration (2) → "Choosing a config layer" and "Choosing the right surface" (bottom of page); Pilot → "Mixed tools" (2) | Shared versus personal layers; mixed-tool behaviour                    | Yes                                                                |
| 7   | Limits and status                           | Home → Getting Started (1) → Project status, Known limits; What OAT Writes → "Things that surprised us"                                | An honest status and limits statement                                  | Yes                                                                |
| 8   | Upkeep and exit                             | What OAT Writes → Backing out / Remove everything (2); Tool Packs → Upgrading from an earlier CLI (2)                                  | Upgrade cost and a credible removal procedure                          | Mostly. Cursor and Codex cleanup is not covered (M8).              |
| 9a  | Review a risky change with a second model   | Skills (1) → catalog "Review" table → `oat-review-provide` → Review Flavors #oat-review-provide (2)                                    | Right skill, an example, what it does without asking                   | Yes                                                                |
| 9b  | Research and compare two approaches         | Skills (1) → Research and Evaluate a Decision (2) → `compare`                                                                          | Right skill, an example, what it does without asking                   | Yes, an excellent page                                             |

**Sidebar order and labels (top level):** Home, Getting Started, Skills, Workflows, Provider Sync, Docs Tooling, Reference, Contributing.

- **Getting Started:** Quickstart, Core Concepts, CLI Bootstrap, Tool Packs and Installed Assets.
- **Provider Sync:** opens with "Pilot Provider Sync with One Team", which is where an evaluator needs it.
- **Workflows:** opens with "Choose a Workflow", then "Approvals and Automation". That is also good placement.
- **Reference:** "What OAT Writes" is the first entry.

**Diagrams:**

- The README image shows four adoption cards. The prose under it says what it shows ("The image shows terminal commands and agent skills separately"), and the alt text describes the four cards.
- On Core Concepts the text before "Commands below the diagram" lists the same four paths, so a text reader loses nothing.
- On Review Flavors, the "Flow map" text explains only the dotted branch ("The dotted branch marks the only flavor that may spawn a nested managed reviewer child"). It does not say what the rest of the picture shows.

---

## Task 1: README in 60 seconds

**What is OAT?**
"An open-source CLI, skill library, and optional project workflow system—not another agent runtime." That is clear, and "not another agent runtime" answers my staff engineer's first objection.

**What would my team get?**
Four independent options:

- keep coding tools aligned
- skills for single tasks
- resumable tracked workflows
- docs tooling

**What is the smallest thing we could adopt?**
"Provider Sync does not require project workflows." The "First Success" block (`oat init --scope project`, `oat status --scope project`) is small and safe.

**Does the image help?**
Yes. "Start with any one. Each works on its own" and the four command blocks are the fastest summary of the product. Two caveats:

- The "Reusable Skills" card (`oat tools install --scope user`) is not small. Quickstart says that command "installs all eight packs", including workflows and project-management, into the home directory.
- The "Workflows" card does not warn that projects push to `origin` by default. The paragraph under the image does: "pushes that ref to your `origin` remote".

**What the README lacks:** any maturity signal (0.x, pre-1.0) and any link to the three pages an evaluator most needs: the Pilot page, What OAT Writes, and Approvals and Automation.

---

## Findings

Severity: **High** = would stop me adopting, or could cause harm. **Medium** = I would have to ask someone or guess. **Low** = friction.

### High

**H1. The site contradicts itself on whether "independent review" is guaranteed.**

- Pages:
  - `/workflows/projects/reviews/review-flavors/`, "The four flavors" and "Independence and fail-closed semantics"
  - versus `/workflows/advanced/workflow-gates/`, "How independent the reviewer must be"
  - and `/getting-started/`, "Known limits"
- Quote (Review Flavors): "If the required independent target cannot be enforced, the gate fails closed — it does not downgrade to producer-context review."
- Quote (Workflow Gates): "The default, same-family , falls back to the best available reviewer when no reviewer from a different model family is available"
- What I expected: one answer. Exactly this claim goes to my security reviewer: "a different model reviewed this code."
- What I want instead:
  - Reconcile the pages.
  - If fail-closed independence exists, name the exact setting.
  - If it does not, remove the fail-closed language from Review Flavors and offer a strict option, such as an `--avoid` mode that refuses to run without a different-family reviewer.
  - Until then the only hard guarantee is the manual `--target` pin, which "Stored lifecycle gate commands refuse".

**H2. Quick and spec-driven projects have no plan-approval step. "Approval" means remembering to read a file.**

- Page: `/workflows/approvals-and-automation/`, "At a glance" and "A person approves the plan and the final result…"
- Quote: "Read plan.md before you run /oat-project-implement ; that reading is your plan approval."
- Quote: "Re-running /oat-project-quick-start on a ready plan starts implementation straight away."
- What I expected: my target posture is "a human approves the plan". I expected an explicit stop that a human must clear, recorded in the project.
- What I want instead: an opt-in plan-approval checkpoint for quick, spec-driven and imported projects (a config key with a recorded approval). At minimum, a recipe that enforces it outside the agent, for example "require a reviewed `plan.md` commit before implementation commits".
- Note: the documentation is now honest and easy to find. This is a product gap that blocks the workflow layer, not the Provider Sync pilot.

### Medium

**M1. The default project scope pushes to our shared remote on every save. The fix changes team config, and an environment variable can override it.**

- Pages: `/workflows/approvals-and-automation/`, "What OAT does without asking"; `/workflows/projects/planning/starting-projects/`, "Before your first project"; `/reference/what-oat-writes/`
- Quote: "the project's files live on their own Git ref, which is pushed to origin every time a skill saves it."
- Quote: "A few keys, such as projects.defaultScope , also take an environment variable that beats every file."
- What I expected: a pilot-safe default, or one switch the team can lock.
- What I want instead:
  - `shared` or `local` as the default, or a first-run question.
  - Say plainly what content those pushed refs carry. Plans, reviews and logs can include sensitive material, and my security reviewer will ask.
- The disclosure itself is now good: it appears on the README, Quickstart, Approvals and What OAT Writes.

**M2. Unattended cross-model review has two options: stall, or use provider permission-bypass flags. No narrower permission set is documented.**

- Pages: `/workflows/approvals-and-automation/`, "Permissions for unattended review"; `/workflows/advanced/workflow-gates/`, "Trusted target examples"
- Quote: "OAT documents no narrower permission allowlist for reviewers. If you build one, test it on an unattended gate before you rely on it."
- Quote: "A trusted user can opt into --dangerously-skip-permissions"
- What I expected: what my security reviewer will ask for, namely the minimum tool and command permissions a reviewer needs (read the repo, run `oat`, write the review file, commit).
- What I want instead: a tested least-privilege permission set for each of Claude, Codex and Cursor.
- Positive: the attended alternative (a fresh-session review) is now documented, and built-in targets never add bypass flags.

**M3. The docs admit that planning-stage gates may not treat a failed reviewer as a failure.**

- Page: `/workflows/advanced/workflow-gates/`, "When the gate finds blocking problems"
- Quote: "The implement and lite skills keep such failures blocked, but the wording in some planning skills is weaker, so check the gate outcome yourself."
- What I expected: every gate fails closed on a reviewer that never ran, or the docs name the skills that do not.
- What I want instead: list the affected skills, or fix them. "Check it yourself" defeats the purpose of a gate.

**M4. Team rules are advisory on every developer machine.**

- Page: `/workflows/approvals-and-automation/`, "Can a teammate weaken a team rule?"
- Quote: "These controls guide agents on a developer's machine; they are not an enforcement boundary."
- What I expected: this is the honest answer, and the page deserves credit for it.
- What I want instead: a short recipe for the enforcement I need, such as a CI check that the project's `state.md` and `plan.md` show gates not disabled and a gate artifact present. The page says to use branch protection and CI, but gives no CI recipe for OAT's own evidence.

**M5. Dispatch Policy (cost and model choice) opens in jargon, and the guidance I need is at the bottom.**

- Page: `/workflows/advanced/dispatch-ceiling/`, opening section, compared with "Choosing policy and ladder ownership" and "Which tier for which work" at the end
- Quote: "A candidate ladder is an ordered provider column stored in user, shared, or repo-local config."
- Also:
  - agent-directed text such as "The root must treat the warning as a dispatch-policy violation"
  - model code names (Sol, Luna, Astra, Terra) that are never explained
  - an unexplained Fable "retention policy" caveat
- What I expected: the tier table first ("Balanced for a first try; High for high-risk"), which is genuinely useful.
- What I want instead: move "Which tier for which work" to the top, and move the resolver, report and stamp contract to a separate implementer page.

**M6. Workflow Gates is mostly an implementer contract. The guidance a reader needs starts after roughly 800 lines.**

- Page: `/workflows/advanced/workflow-gates/`, from "Gate config" through "Incident-to-regression mapping", then "Choosing gate posture" at the end
- Quote: "When oat gate set recognizes a direct lifecycle oat gate review command, it requires the canonical global option placement oat --json gate review ."
- What I expected: a decision section first, and a gate command a lead can type correctly. The recommended command embeds a natural-language prompt and `"$PROJECT_PATH"` quoting.
- What I want instead:
  - Lead with "Choosing gate posture" and "How independent the reviewer must be".
  - Provide a one-flag setup (for example `oat gate set oat-project-implement --preset final-code-review --on-failure block --layer shared`), or at least a copy-paste block with nothing to substitute.

**M7. Pages disagree on where packs go when no scope is passed, and on what happens with core at project scope.**

- Pages: `/reference/what-oat-writes/`, "The short version"; `/getting-started/tool-packs/`, "oat tools install", "Core pack" and "Choosing packs"
- Quote (What OAT Writes): "Without --scope , oat init , oat sync and oat tools install default to scope all"
- Quote (Tool Packs): "Fresh installs default to user scope for every pack"
- Core pack with `--scope project`, three different answers:
  - Tool Packs: "is rejected rather than silently ignored"
  - Tool Packs, later: "requesting project scope still installs it in your home directory"
  - What OAT Writes: "prints Installed core tool pack. but writes nothing"
- What I expected: one behaviour. What OAT Writes was observed by running the CLI, so I am inclined to believe it, but then the other pages are wrong.
- What I want instead: reconcile the pages and say which one is authoritative.

**M8. The removal procedure does not cover the providers my team uses.**

- Page: `/reference/what-oat-writes/`, "Remove everything" and "Supported removal commands"
- Quote: "If you had enabled Cursor, Copilot or Codex, OAT also created the paths in the provider table . Removing those was not part of this run."
- Also: `oat tools remove` leaves "all generated Cursor and Codex files", and `oat tools remove --all` "fails unless you add --scope user".
- What I expected: a verified removal for a Claude, Cursor and Codex repository. That is my pilot configuration.
- What I want instead: verified steps for `.cursor/agents`, `.cursor/rules`, `.codex/agents` and OAT's tables in `.codex/config.toml`, including how to remove only OAT's tables from a `config.toml` that has the team's own settings.

**M9. Fresh clones and Windows checkouts are untested.**

- Page: `/provider-sync/pilot-with-a-team/`, "What each teammate does"; also `/reference/what-oat-writes/`, "Not covered here"
- Quote: "The links and generated files were checked on macOS; a fresh clone, and how Windows checkouts handle committed links, were not tested."
- What I expected: a 30-person org will have some Windows or WSL users, and the "new teammate after cloning" story depends on committed symlinks.
- What I want instead: a tested Windows answer (`core.symlinks`, the copy strategy, WSL), or an explicit "macOS and Linux only for now".

**M10. Pages give conflicting advice on where to set the checkpoint default.**

- Pages: `/workflows/projects/planning/hill-checkpoints/`, "Setting a default…"; `/reference/configuration/`, "Recommended split for most users"; versus `/workflows/approvals-and-automation/`
- Quote (HiLL): "This is a personal preference — typically set at user scope so it applies to every repo"
- Quote (Approvals): "for the team run oat config set workflow.hillCheckpointDefault final --shared"
- What I expected: one recommendation. For a team, where the agent pauses is policy, not personal taste.
- What I want instead: say it is a team decision (`--shared`) when governance matters. Also flag that a configured default "replaces any checkpoint value already written in that project's plan.md".

**M11. The cost cap is not enforced in Cursor.**

- Pages: `/getting-started/`, "Known limits"; `/workflows/advanced/dispatch-ceiling/`, "How each provider applies the cap"
- Quote: "Cursor can substitute a different model without an error… OAT records the model it requested, not the model that ran."
- What I expected: this is honestly disclosed, which is good. For a Cursor-heavy team it means the cost bound is advisory.
- What I want instead: a short "If your team runs mostly in Cursor" note on cost control, for example relying on Cursor account-level model restrictions.

### Low

**L1. The README does not send evaluators to the pages they need.**

- Page: README, "Go Deeper"
- Quote: "[Quickstart] — choose an adoption path."
- I want: one line, "Evaluating for a team? Read Pilot Provider Sync, What OAT Writes, and Approvals and Automation", plus "0.x, pre-1.0".

**L2. "Reusable skills" is presented as small but installs every pack.**

- Pages: README image; `/getting-started/quickstart/`, "Reusable skills"
- Quote: "With no pack name, this installs all eight packs"
- I want: the card to show `oat tools install research --scope user` or a similarly narrow command.

**L3. The recommended "hold the PR" value is described as legacy.**

- Pages: `/workflows/approvals-and-automation/`; `/reference/configuration/`
- Quote: "oat config set workflow.postImplementSequence wait --shared (a legacy value that is still supported)"
- I want: the current equivalent in the structured form, or confirmation that `wait` is not being removed.

**L4. "Before your first project" still uses a bare `oat init`.**

- Page: `/workflows/projects/planning/starting-projects/`, "Before your first project"
- Quote: "Run oat init , then install the pack that contains the project skills."
- I want: `oat init --scope project`. Elsewhere the docs warn that a bare `oat init` writes to the home directory.

**L5. Committing the manifest is a team choice, but its consequence is unknown.**

- Page: `/reference/what-oat-writes/`, "Where 'Team choice' applies"
- Quote: "How OAT behaves in a clone without it is not covered here."
- I want: the answer, because it decides what we commit.

**L6. Skills catalog descriptions are written for the agent, and one note is for contributors.**

- Page: `/skills/`, "Supported Skill Catalog"
- Quote: "Do not edit this block; run pnpm docs:skills:generate after changing those sources."
- Descriptions include agent instructions such as "Do NOT auto-invoke".
- I want: reader-facing one-line descriptions, with the generator note kept in contributor docs.

**L7. Review Flavors opens with internal references.**

- Page: `/workflows/projects/reviews/review-flavors/`, opening and "Quick Look"
- Quote: "Primary sources: oat-project-implement phase-execution mechanics, the oat-project-dispatch-subagents lifecycle-role table, and project design Decision #11."
- The page itself recommends skipping to "Choosing a Review Skill", which helps.

**L8. Autonomous runs write user config without asking.**

- Page: `/workflows/advanced/autonomy/`, "Dispatch-ladder scope selection"
- Quote: "Autonomous planning checks config-file existence in this fixed order without prompting… user config ( ~/.oat/config.json )"
- This is acceptable, but list it under "What it does without asking" with the push and PR behaviour.

**L9. Retro feedback goes to the upstream public repository by default when invoked.**

- Page: `/reference/configuration/`, "Workflow preferences"
- Quote: "That repository is workflow.retro.upstreamRepo when set and voxmedia/open-agent-toolkit when it is not."
- This is opt-in and confirmed for each item, with sanitisation described. My security reviewer would want it on the What OAT Writes page ("on origin and elsewhere").

**L10. The ad-hoc second-model review cannot be orchestrated.**

- Page: `/workflows/projects/reviews/review-flavors/`, "oat-review-provide"
- Quote: "to get a review from another model, invoke the skill in that model's agent tool."
- This is clear, but a manual step for every review. A CLI route for non-project diffs (like `oat gate review` without `--project`) would help.

### Positives (specific and decision-relevant)

- **The Pilot page** (`/provider-sync/pilot-with-a-team/`) is close to exactly what I needed:
  - one CLI version for everyone
  - explicit provider enablement, with the reason ("a provider you leave unset is still synced whenever its folder… exists")
  - a real `SKILL.md` example
  - a mixed-tools table
  - "What to watch for"
  - pass criteria and a one-commit back-out
- **What OAT Writes** was observed by running v0.3.14. It has a commit/ignore table, a new-teammate section and a "Things that surprised us" list that admits real bugs (EPIPE crash, misleading messages). That level of candour is what gets this past my staff engineer.
- **Approvals and Automation:**
  - the "At a glance" table, including the "Never" column (never merges, never force-pushes)
  - a "What OAT does without asking" list
  - three ready-made postures
  - a straight "Yes" to "Can a teammate weaken a team rule?"
- **Run-count estimate:** "a three-phase quick project… uses 8 agent runs… the phases alone can reach 18". This lets me budget roughly.
- **Getting Started** has "Project status" (0.x, MIT, releases, upgrading) and six specific "Known limits".
- **The Research skills page** gives each skill an invocation example, a scenario, "What it does without asking", the output location and next steps.

---

## Task 9: skills

**"Review a risky change with a second model."**

- Path: Skills → catalog "Review" → `oat-review-provide` → Review Flavors (2 hops).
- Invocation: `/oat-review-provide staged`.
- Without asking, it writes the review artifact to `.oat/projects/local/orphan-reviews/`, or to `.oat/repo/reviews/` when that is tracked, and "commits a tracked artifact only after asking you".
- The "second model" part is manual: run the skill in the other tool, using `$oat-review-provide` in Codex. The guide says so directly, and so does Known limits.
- Inside a tracked project, the second-model route is a gate, which brings in H1 and M2.
- Verdict: findable and understandable. Cross-model review is manual for ad-hoc work.

**"Research and compare two approaches before committing."**

- Path: Skills → Research and Evaluate a Decision → `compare` (2 hops).
- The example is realistic: `/compare "queue-backed import" "synchronous import" --context criteria.md --dimensions "…" --save`.
- Without asking, it researches with web search when available, and "Without --save it answers in the conversation and writes nothing"; it never commits or pushes.
- Prerequisite: `--save` needs the deep-research schema installed.
- The page also points to `skeptic` for testing the load-bearing claim.
- Verdict: excellent. My security reviewer would want a note that web search sends the comparison topic outside the company. The page does say "say so if it must stay with local sources".

---

## Re-test of earlier manager-reader problems

|     | Earlier problem                                                                                  | Status                                                                       | Page that shows it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) | No guidance on what to commit versus ignore                                                      | **Fixed**                                                                    | `/reference/what-oat-writes/`, "What to commit" (per-path Ignored / Machine data / Commit it?). Residual: L5 (manifest consequence unknown).                                                                                                                                                                                                                                                                                                                                                                   |
| (b) | Nothing on what a new teammate does after cloning                                                | **Fixed**                                                                    | `/reference/what-oat-writes/`, "A new teammate after cloning"; `/provider-sync/pilot-with-a-team/`, "What each teammate does". Fresh clone untested (M9).                                                                                                                                                                                                                                                                                                                                                      |
| (c) | No exit or removal guide                                                                         | **Fixed** (with a gap)                                                       | `/reference/what-oat-writes/`, "Backing out" and "Remove everything" (verified run); Pilot, "Deciding after the pilot". Cursor and Codex cleanup not covered (M8).                                                                                                                                                                                                                                                                                                                                             |
| (d) | Could not find where a human approves the plan for quick or spec-driven projects, or the default | **Fixed** (findable; the answer is that there is no plan-approval step)      | `/workflows/approvals-and-automation/`, "At a glance" ("no plan approval"). Product gap: H2.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| (e) | Tracked projects pushing to the shared remote by default was hard to discover                    | **Fixed**                                                                    | README; `/getting-started/quickstart/` (Workflows); `/workflows/approvals-and-automation/`; `/reference/what-oat-writes/`; "Before your first project"                                                                                                                                                                                                                                                                                                                                                         |
| (f) | Warning that a bare sync writes to the home directory was buried                                 | **Fixed**                                                                    | `/provider-sync/` (WARNING at top); Pilot, "What to watch for"; What OAT Writes, "The short version". Residual bare `oat init` in "Before your first project" (L4).                                                                                                                                                                                                                                                                                                                                            |
| (g) | Unattended cross-model review appeared to need permission-bypass flags, with no alternative      | **Partly fixed**                                                             | `/workflows/approvals-and-automation/`, "Permissions for unattended review": the attended alternative is now described, and built-ins add no bypass flags. Unattended operation still needs bypass flags or a self-built allowlist (M2).                                                                                                                                                                                                                                                                       |
| (h) | No week-one pilot checklist                                                                      | **Fixed**                                                                    | `/provider-sync/pilot-with-a-team/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| (i) | Whether a local setting can override a team review gate was unclear                              | **Fixed**                                                                    | `/workflows/approvals-and-automation/`, "Can a teammate weaken a team rule?"; Workflow Gates, "Choosing gate posture"                                                                                                                                                                                                                                                                                                                                                                                          |
| (j) | No way to estimate agent runs or cost                                                            | **Fixed** (run counts and cost direction; prices deliberately not estimated) | `/workflows/approvals-and-automation/`, "How many agent runs does a project start?"; Dispatch Policy, "Which tier for which work"                                                                                                                                                                                                                                                                                                                                                                              |
| (k) | No project status, maturity or limits statement                                                  | **Fixed**                                                                    | `/getting-started/`, "Project status" and "Known limits". Not yet in the README (L1).                                                                                                                                                                                                                                                                                                                                                                                                                          |
| (l) | Maintainer and migration notes on the front door                                                 | **Fixed**                                                                    | `/` (Home) is clean. The README keeps contributor setup in a final "Contributing" section, which is acceptable. Upgrade notes live in Tool Packs.                                                                                                                                                                                                                                                                                                                                                              |
| (m) | Troubleshooting telling adopters to run contributor-only commands                                | **Partly fixed**                                                             | `/reference/troubleshooting/`: `pnpm` forms are now labelled "If you are working in the OAT source repository". The page still ends with "Reference artifacts" pointing at `packages/cli/src/commands/doctor/index.ts` and similar, and recommends the legacy `oat init tools`.                                                                                                                                                                                                                                |
| (n) | Internal backlog IDs, test filenames or decision numbers in reader text                          | **Still present**                                                            | `/workflows/advanced/dispatch-ceiling/` ("BL-260726-validate-cursor-pin-effort"); `/workflows/projects/reviews/review-flavors/` ("Decision #11"); `/workflows/waves/wave-workflows/` (BL-260718-…); `/workflows/projects/execution/implementation-execution/` (DR-260927-…); test files in `/reference/cli-reference/` (`status.test.ts`), `/reference/configuration/` (`public-package-contract.test.ts`), `/provider-sync/manifest-and-drift/` and `/skills/repo-improve/`. Fewer than before, but not gone. |

---

## Verdicts

- **Clear? Mostly.** The adoption-facing pages (Quickstart, Pilot, What OAT Writes, Approvals and Automation, Research) are clear and well routed. The governance deep pages (Dispatch Policy, Workflow Gates, Review Flavors) are still implementer contracts that bury the reader's decision at the bottom.
- **Well written? Mostly.** The new pages are plain, specific and honest, with "what it does without asking" sections and "Choose it when / What you give up" tables. They sit next to dense, agent-directed reference prose and some contradictions between pages (H1, M7, M10).
- **Helpful? Yes.** I answered almost every question I came with, including uncomfortable ones (pushes, home-directory writes, local overrides, run counts, removal), within about four hops of the home page.
- **Compelling? Partly.** I would pilot Provider Sync with one mixed-tool team next sprint using the Pilot page as written, and let individuals try the research skills. I would not adopt the tracked workflow layer, or promise "independent model review", until H1 and H2 are resolved.

### Three things that would most increase my confidence

1. Resolve the reviewer-independence contradiction and offer a strict fail-closed mode for "a different model family must review this". Show a tested least-privilege permission set for unattended reviewers in Claude, Codex and Cursor.
2. An explicit, recorded plan-approval checkpoint for quick and spec-driven projects, plus a CI recipe that checks OAT's own evidence (gate ran, not disabled, plan approved) so team rules are enforceable rather than advisory.
3. Tested coverage of a fresh clone and Windows checkouts, and verified removal of Cursor and Codex outputs (including only OAT's tables in a shared `.codex/config.toml`).

### The single biggest reason I might still say no

Maturity. OAT is 0.x, and its own docs say "defaults and exit codes can change between 0.x releases". The surprises list contains real bugs, and fresh-clone and Windows behaviour is untested. For a 30-person org, the upkeep cost (pinning versions, reading every release note, re-verifying views) is unknown, and I would carry it.

### Terms I had to guess, or learn from context

- **Defined on the page but still heavy:** canonical asset, provider view, scope (`project` / `user` / `all`), HiLL checkpoint, gate, dispatch policy.
- **Guessed:**
  - native-read
  - stray, adoption, adoption candidate
  - synced, shared and local project scope (defined, but "synced" is not intuitive)
  - `refs/oat/projects`
  - exec target
  - candidate ladder, named ceiling, phase target, tier ("Economy" to "Frontier")
  - "the root" (the main session agent)
  - "Tier 1 per-phase oat-reviewer gates"
  - self-review versus gate, review "flavors"
  - provide versus receive, receive-eligible, handoff
  - `diversity.achieved`
  - materialized roles, model-variant files
  - "model disabled" (skill visibility)
  - orphan-reviews
  - knowledge index
  - PJM / project management adoption
  - wave, wrapper project, external plans
  - recon evidence packet
  - explainer and recap
  - retained-override
  - dispatch stamp / Dispatch Report V1
  - `postImplementSequence` "legacy" values
  - model code names Sol, Luna, Astra, Terra, Fable, and the Fable "retention eligibility" caveat
