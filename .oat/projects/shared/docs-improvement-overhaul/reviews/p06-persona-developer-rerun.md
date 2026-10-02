# Persona re-run: junior-to-mid developer adopting OAT

## Provenance

- **Persona:** a developer with two to four years of experience, told "our team is going to try OAT; get yourself set up and figure out how to use it". Uses Claude Code; a teammate uses Cursor. Has never seen OAT. Careful: does not want to break the repository, write somewhere unexpected, or push by accident.
- **Date:** 2026-10-02
- **Site:** http://127.0.0.1:59786/open-agent-toolkit/ (local build of the docs site)
- **Method:** I fetched rendered HTML over HTTP with curl and read the text of each page's `<article>`/`<main>` plus its sidebar links. I used no visual browser, so I could not see layout, and diagrams appeared only as their source text. I also read the README file and looked at its rendered image (`readme-image.png`).
- **Link discovery:** to learn the site's shape the way a reader skims the sidebar, I ran one crawl that collected `href`s from every page (89 URLs). That crawl collected links only; I did not read the text of the pages it fetched.
- **Pages read (33, plus README and image):**
  1. `/` (Home)
  2. `/getting-started/`
  3. `/getting-started/quickstart/`
  4. `/getting-started/concepts/`
  5. `/getting-started/bootstrap/`
  6. `/getting-started/tool-packs/`
  7. `/reference/what-oat-writes/`
  8. `/provider-sync/`
  9. `/provider-sync/pilot-with-a-team/`
  10. `/skills/`
  11. `/skills/research/`
  12. `/skills/diagnostics/`
  13. `/docs-tooling/`
  14. `/docs-tooling/workflows/`
  15. `/workflows/`
  16. `/workflows/choose-workflow/`
  17. `/workflows/approvals-and-automation/`
  18. `/workflows/projects/planning/starting-projects/`
  19. `/workflows/projects/planning/hill-checkpoints/`
  20. `/workflows/projects/execution/picking-up-projects/`
  21. `/workflows/advanced/dispatch-ceiling/`
  22. `/reference/configuration/`
  23. `/reference/troubleshooting/`
  24. `/workflows/projects/lifecycle/` (diagram check only)
  25. `/workflows/backlog-and-planning/`
  26. `/workflows/backlog-and-planning/backlog-lifecycle/`
  27. `/workflows/backlog-and-planning/remote-project-management/`
  28. `/reference/config-and-local-state/`
  29. `/reference/cli-reference/`
  30. `/reference/file-locations/`
  31. `/reference/oat-directory-structure/`
  32. `/provider-sync/instruction-sync/`
  33. `/docs-tooling/agent-instructions/`

  For pages 25–33 I searched the text for passages about `oat pjm init` and `AGENTS.md`, for re-test (c); I did not read them end to end.

- **Not read:** any source code, skill file, project or planning artifact, earlier review, or other file on the machine. I ran no `oat` or project command.

### Sidebar (top level, in order)

Home · Getting Started · Skills · Workflows · Provider Sync · Docs Tooling · Reference · Contributing

The second level below is in the order the sidebar shows it:

- **Getting Started:** Quickstart · Core Concepts · CLI Bootstrap · Tool Packs and Installed Assets
- **Skills:** Research and Evaluate a Decision · Brainstorm Before Choosing a Workflow · Diagnose Your OAT Setup · Summarize What Shipped · Explainer Kit · Repo Improve · Recon Evidence Packets
- **Workflows:** Choose a Workflow · Approvals and Automation · Projects (Lifecycle, Reviews, Planning, Execution, Closeout) · Ideas Workflow · Backlog and planning · Waves · Advanced
- **Provider Sync:** Pilot Provider Sync with One Team · Provider Interop Commands · Sync Config · Instruction Sync · Manifest and Drift · Providers · Provider Interop CLI Scope and Surface
- **Docs Tooling:** Add or Adopt Docs in a Repo · Documentation Commands · Docs Workflows · Improve Agent Instructions
- **Reference:** What OAT Writes · Configuration · Config and Local State · CLI Reference · File Locations · Docs Index Contract · `.oat` Directory Structure · Troubleshooting · Project Artifacts · State Machine · Repository PR Comment Analysis

The order makes sense for a newcomer. The one mismatch is "Tool Packs and Installed Assets": it sits under Getting Started, but it reads like an internal specification (see M8).

## Click-path log

| #   | Looking for                                                    | Path (hops from Home)                                                                                                                         | Found?                                                                          |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | What OAT is and what it does                                   | README → Home (0)                                                                                                                             | Yes. Both the README and Home list the same four independent paths.             |
| 2   | First safe result                                              | Home → "Start here: Quickstart" (1) → What OAT Writes (2) for commit and undo                                                                 | Yes                                                                             |
| 3   | Sharing skills between Claude Code and Cursor                  | Home → Provider Sync (1) → "Piloting with a team?" → Pilot Provider Sync with One Team (2) → What OAT Writes § What to commit (3)             | Yes                                                                             |
| 4a  | A skill to compare two approaches                              | Home → Skills (1) → Research and Evaluate a Decision (2)                                                                                      | Yes                                                                             |
| 4b  | A skill for out-of-date docs                                   | Skills index "Example" paragraph (1). For exact behaviour: Home → Docs Tooling (1) → Docs Workflows (2)                                       | Yes                                                                             |
| 5   | Tracked bug fix with a plan and a review                       | Home → Choose a Workflow (1) → Approvals and Automation (2) → Workflows › Projects › Planning › Starting projects (4) for the lite invocation | Yes, but only after three pages                                                 |
| 6   | Resume yesterday's project on the same machine                 | Skills index → "Resume work on this machine" (2), or Workflows › Projects › Execution › Picking Up Projects (4)                               | Yes. The section is the first one on a page whose title says "Another Machine". |
| 7   | Personal versus team settings, and choosing a checkpoint value | Approvals and Automation § "Can a teammate weaken a team rule?" (2) → Reference › Configuration (2) → HiLL Checkpoints (4)                    | Yes                                                                             |
| 8   | Skills not appearing in my tool                                | Reference › Troubleshooting, first entry (2). Also Skills › Diagnose Your OAT Setup (2)                                                       | Partly. The steps are there but nothing helps me diagnose first.                |

## Task answers (as the developer)

### 1. What is OAT, and where do I start?

OAT is a command-line tool plus a library of "skills" (instructions my coding agent follows when I ask). It does four separate things, and each works on its own:

1. **Provider Sync.** I keep one copy of each skill, agent and rule in `.agents/`, and OAT creates the files Claude Code, Cursor, Codex and the others read. It also tells me when those files drift.
2. **Reusable skills.** Ready-made research, comparison, review and brainstorming helpers that need no project.
3. **Workflows.** Tracked, resumable projects with plans, reviews and approval points.
4. **Docs tooling.** Set up and maintain Markdown docs or a docs site.

Because my team has mixed tools, I would start with Provider Sync. Home says this outright ("Each of these works on its own"), and the README image shows the four paths as separate boxes.

### 2. First success without writing outside the repository or pushing

From Quickstart:

1. Install the CLI: `npm install --global @open-agent-toolkit/cli`, then check it with `oat --version`. This needs Node.js 22.17+ and Git 2.31+.
2. In the repository root, run `oat init --scope project`. If it offers guided setup, decline: Quickstart says guided setup can install packs in my home directory.
3. Run `oat status --scope project`. On a fresh repository it prints "No managed entries found."

**Files that change:** empty `.agents/skills/`, `.agents/agents/` and `.agents/rules/`; `.oat/sync/manifest.json`; and a `# OAT core` block appended to `.gitignore` and `.gitattributes` (either file is created if missing). Nothing is written in my home directory, nothing is committed, and nothing touches the remote.

**Undo:** What OAT Writes has a "Backing out" section with exact `git rm` and `rm` steps and a warning. There is no single uninstall command.

**Verdict:** I could do this confidently. This is the best part of the site.

### 3. One set of skills for Claude Code and Cursor

The Pilot Provider Sync with One Team page answers this well. One person works on a branch:

1. `oat init --scope project`
2. `oat providers set --scope project --enabled claude,cursor,codex --disabled copilot,gemini`
3. Add a skill at `.agents/skills/<name>/SKILL.md`
4. `oat sync --scope project --dry-run`, then `oat sync --scope project`
5. Commit and open a pull request

**What to commit** (from What OAT Writes): `.agents/`, `.oat/sync/config.json`, the OAT blocks in `.gitignore` and `.gitattributes`, and the `.claude/skills` symlinks. `.oat/sync/manifest.json` and the generated Cursor and Codex files are a team choice.

**My teammate after pulling:** install the same CLI version, run `oat status --scope project`, and run `oat sync --scope project` if any row is missing. Cursor reads `.agents/skills` directly, so it needs no skill files. Then start a new session.

### 4. Skills without a project

**Compare two approaches.** Type `/compare "A" "B" --context criteria.md --dimensions "..."` in the agent chat. Without asking, it researches each option (using web search when available) and answers in the conversation without writing anything. With `--save`, it asks where to save, writes one file (suggested `.oat/repo/analysis/`), and never commits or pushes. I get a recommendation with rationale and caveats.

**Docs are out of date.** Type `/oat-docs-analyze`. Without asking, it writes `.oat/repo/analysis/docs-<timestamp>.md` and updates `.oat/tracking.json`; it never edits pages and makes no commit. It needs `jq`. Then `/oat-docs-apply` shows a plan and changes nothing until I approve. After approval it creates branch `oat/docs-<timestamp>`, edits the files, commits, and asks before pushing or opening a pull request.

Both answers were explicit. One gap: the research page never says which pack installs `compare` (Quickstart's pack list implies the research pack).

### 5. Small, clear bug fix with a plan and a review

Choose a Workflow tells me to "choose lite", and Approvals and Automation explains what that means:

- **I approve:** the plan, once.
- **The agent does on its own:** commits per task, runs a plan review, a phase review and a final review, and starts subagents.
- **Push and pull request:** lite _pushes my branch and opens a pull request by itself, and no setting removes this step_. In addition, the default "synced" project scope pushes a project ref to `origin` every time a skill saves.

So the answer is yes, lite pushes and opens a pull request without asking. To keep both tracking and control I would have to use quick mode, set `workflow.postImplementSequence wait`, and create the project with a local scope (for example via `export OAT_PROJECTS_DEFAULT_SCOPE=local`). That recipe exists only on the Approvals page, under "Maximum human control", which also says "do not use lite". This is finding H1.

### 6. Resuming yesterday's project

In my coding agent: `/oat-project-open <name>`, then `/oat-project-progress` (read-only), then `/oat-project-next`. The page warns that `next` "can commit, push your branch or open a pull request" without asking. That is clear. The surprise is that `progress` stops if the knowledge index is missing (M5).

### 7. Configuration

| Layer      | File                     | Use it for                                        |
| ---------- | ------------------------ | ------------------------------------------------- |
| `--user`   | `~/.oat/config.json`     | Personal preference for every repository          |
| `--shared` | `.oat/config.json`       | Team setting, committed                           |
| `--local`  | `.oat/config.local.json` | Personal override in one checkout, ignored by Git |

Precedence is local, then shared, then user. A team (shared) value beats my user value, but I can override it for myself with `--local`. Approvals and Automation states this plainly and adds that these controls are "not an enforcement boundary".

**Setting chosen:** `workflow.hillCheckpointDefault`. The HiLL page's "Choosing checkpoint frequency" table points me to "every phase" while I am new and want to steer, so I would leave the key unset and pick "Stop after each phase" at the first prompt. The two pages that teach the key disagree on what a newcomer should set, though (M4).

### 8. Skills not showing in my tool

Troubleshooting § "Skills not visible in host UI" says to run `oat sync --scope project --dry-run` and then `oat sync --scope project` (or `--scope user` for user packs), then reload the session. For Cursor, a separate entry explains that it reads `.agents/skills` directly, so sync creates nothing. Missing: a step that tells me _why_ the skill is missing (M6).

### 9. Vocabulary not explained where I first met it

| Term                                                                                       | First met                            | Explained later?                                                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| canonical skills, provider views                                                           | README "Keep coding tools aligned"   | Yes, Quickstart                                                                                                   |
| drift                                                                                      | README, Home                         | Yes, Pilot page                                                                                                   |
| core pack                                                                                  | README                               | Yes, Quickstart and Tool Packs                                                                                    |
| synced scope, Git ref                                                                      | README                               | Partly (Quickstart, Starting projects)                                                                            |
| HiLL gates, plan-phase checkpoints                                                         | Core Concepts                        | Yes, Approvals and HiLL page                                                                                      |
| stray adoption, provider strays                                                            | Core Concepts, Bootstrap             | Yes, Pilot page ("A stray is a file...")                                                                          |
| native-read                                                                                | Provider Sync index, What OAT Writes | Never plainly. I inferred it from Troubleshooting ("can read canonical skills without mirrored provider writes"). |
| PJM, `pjm` section, `pjm.remote`, Remote Project Management                                | Getting Started "Known limits"       | PJM is expanded only in the skills catalog: "project management (PJM)"                                            |
| review gate, reviewer independence, model family                                           | Getting Started "Known limits"       | Yes, Approvals                                                                                                    |
| TTY mode, JSON/non-TTY contract                                                            | CLI Bootstrap                        | No                                                                                                                |
| managed-block patch, contained symlink target, hard link                                   | Bootstrap, Tool Packs                | No                                                                                                                |
| transitive lease, `requiredBy`, realized placement, materialization, reachability evidence | Tool Packs                           | Partly, in dense prose                                                                                            |
| knowledge index (`oat-repo-knowledge-index`)                                               | Starting projects                    | Only the catalog line "codebase knowledge index using parallel mapper agents"                                     |
| Tier 1 per-phase reviewer gates                                                            | Configuration                        | No                                                                                                                |
| lifecycle review versus phase review versus final review                                   | Approvals                            | Partly                                                                                                            |
| coordination parent, nested checkout, arrival-aware                                        | Picking Up Projects                  | No ("coordination parent" is explained on Starting projects under split)                                          |
| auto artifact-review loop                                                                  | Docs Workflows                       | No                                                                                                                |
| disclosure / `ask_user`                                                                    | Docs Workflows (apply)               | No                                                                                                                |
| ladder, ceiling, tier                                                                      | Approvals, Starting projects         | Yes, defined inline                                                                                               |
| managed / inherit modes                                                                    | Dispatch Policy                      | Yes, table                                                                                                        |
| worktree                                                                                   | Approvals                            | Not explained (assumed Git knowledge)                                                                             |
| Fumadocs, MkDocs                                                                           | Docs Tooling                         | Not explained (assumed)                                                                                           |

## Findings

### High

**H1. The recommended mode for a solo bug fix (lite) always pushes and opens a pull request, and the recommendation does not say so.**

- **Where:** `/workflows/choose-workflow/` § "Which mode should I choose?"
- **Quote:** "If you are a solo developer fixing one well-understood bug, choose lite"
- **Contrary evidence:** `/workflows/approvals-and-automation/` lite row: "Opens a pull request by itself; no setting removes this step". The same page's "Maximum human control" says "do not use lite".
- **Mitigation present:** the top of Choose a Workflow says "Before you choose, read Approvals and Automation".
- **Why High:** the mode table's "What you give up" column for lite does not mention the push or the pull request. A reader acting on the one-line recommendation for exactly my case would push a branch and open a pull request without being asked, which is the thing I most want to avoid.
- **Expected / want:** add a "Pushes / opens PR?" column to the mode table, and qualify the solo-bug-fix advice: "lite always pushes and opens a PR; for a tracked fix with no automatic push, use quick with `postImplementSequence wait` and a local or shared scope."

### Medium

**M1. "Before your first project" tells me to run a bare `oat init`.**

- **Where:** `/workflows/projects/planning/starting-projects/` § "Before your first project"
- **Quote:** "Run oat init , then install the pack that contains the project skills." The code block shows `oat init` without `--scope`.
- **Problem:** Quickstart, the Pilot page and What OAT Writes all say a bare `oat init` defaults to scope `all` and writes under my home directory. The same paragraph tells me to add `--scope project` to the pack install, but not to `init`.
- **Want:** `oat init --scope project`.

**M2. The README calls a home-writing command "repository-scoped".**

- **Where:** README § "First Success"
- **Quote:** "use `oat tools install --scope project` for repository-scoped packs"
- **Problem:** What OAT Writes (`/reference/what-oat-writes/`, "The short version") says this command without a pack name "also installs the core pack under your home directory", and its "surprises" list says it adds a `.gitignore` block.
- **Want:** name a pack in the example (`oat tools install workflows --scope project`), or state the core-pack home write next to it.

**M3. Choose a Workflow does not tell me how to start the mode it recommends.**

- **Where:** `/workflows/choose-workflow/` § "Which mode should I choose?"
- **Quote:** "You pick it by running that mode's entry skill, and the skill creates the project for you."
- **Problem:** neither the mode table nor the page names `/oat-project-lite`, `/oat-project-quick-start` and the others. I found them three pages later, under Starting projects.
- **Want:** an "Entry skill" column with the slash command for each mode.

**M4. Pages disagree on the checkpoint default a newcomer should set.**

- **Where:** `/reference/configuration/` § "Recommended split for most users" (`oat config set workflow.hillCheckpointDefault final --user`), and `/workflows/projects/planning/hill-checkpoints/`, which repeats `final --user` as "typically set at user scope"
- **On the other side:** `/workflows/approvals-and-automation/` says the first-run prompt suggests "after every phase", and its "Maximum human control" recipe keeps "Stop after each phase".
- **Why it matters:** the HiLL page also warns that a configured default "replaces any checkpoint value already written in that project's plan.md". A newcomer who copies the "for most users" line loses the per-phase pauses.
- **Want:** recommend leaving it unset (and getting the prompt) until you trust the plans and reviews, and present `final --user` as the experienced-user option.

**M5. The "resume on this machine" recipe can stop at step 2.**

- **Where:** `/workflows/projects/execution/picking-up-projects/` § oat-project-progress
- **Quote:** "if that is missing, it asks you to run the knowledge-index skill and stops before the later project report."
- **Problem:** Starting projects says quick, lite, import and capture never check for the knowledge index. A lite or quick user following the three-step resume recipe (open, progress, next) would be stopped at step 2 by a prerequisite they were never told about.
- **Want:** a note in "Resume work on this machine", or progress continuing for non-spec-driven projects.

**M6. "Skills not visible" has no diagnose step and refers to an unexplained "AGENTS.md skills table".**

- **Where:** `/reference/troubleshooting/` § "Skills not visible in host UI"
- **Quote:** "Verify AGENTS.md skills table matches .agents/skills/\*/SKILL.md"
- **Problem:** I never created such a table. The entry offers no way to find out _why_ a skill is missing: it does not mention `oat status --scope project`, `oat doctor`, checking that the provider is enabled, or `oat tools info <name>`. The last of these, documented only on Tool Packs, prints per-provider view status and the exact repair command. The `/oat-doctor` skill is itself a skill, so it may also be invisible.
- **Want:** a short ladder: status → `oat tools info <skill>` → provider enablement → sync → new session, with the skills-table line removed or explained.

**M7. The opt-in AGENTS.md guidance block tells agents to write to everyone's home directory.**

- **Where:** `/reference/what-oat-writes/` § "Things that surprised us"; also the "Team choice" notes.
- **Quote:** "The AGENTS.md block from --project-guidance recommends oat sync --scope all , which also writes under your home directory."
- **Problem:** Tool Packs says the workflows pack "also offers guidance without the flag". If a teammate accepts it, every agent reading AGENTS.md is told to write under each reader's home directory. Only the surprises list mentions this; the guidance prompt descriptions on Bootstrap and Tool Packs do not.
- **Want:** warn at the prompt description, or have the block recommend `--scope project`.

**M8. A Getting Started page is an internal specification.**

- **Where:** `/getting-started/tool-packs/` (about 45k characters)
- **Quote:** "OAT records the research request as direct intent ( tools.research: true ) and a transitive lease under tools.requiredBy.utility"
- **Problem:** the newcomer facts (which pack holds what, where it installs, how to remove it) are buried among lease semantics, severity and exit-code tables, and resolver tiers. I had to hunt for "Install vs. initialize" and "oat tools remove".
- **Want:** a short newcomer page, with the specification moved to Reference.

### Low

**L1. "Known limits" on the Getting Started index uses PJM terms with no explanation.**

- **Where:** `/getting-started/` § Known limits
- **Quote:** "Re-running oat pjm init removes remote settings. It replaces the pjm section of .oat/config.json"
- **Want:** "PJM (the optional project-management feature)", and a note that this limit applies only if the repository adopted it.

**L2. The skills chooser contains an internal protocol section.**

- **Where:** `/skills/` § "Remote host execution loop"
- **Quote:** "binding clamps, purpose field grants, hard approval floors, or caller-owned authority evidence"
- **Want:** move it to the Remote Project Management page.

**L3. The research skills page does not say which pack provides these skills.**

- **Where:** `/skills/research/` (intro)
- **Quote:** "None of these skills needs an OAT project"
- **Want:** "Installed by the research pack: `oat tools install research --scope user`".

**L4. A legacy install command appears in a skill guide.**

- **Where:** `/docs-tooling/workflows/` § oat-docs, Prerequisites
- **Quote:** "install it with oat init tools core"
- **Problem:** every other page uses `oat tools install core`.

**L5. "Related commands" shows raw file names instead of links.**

- **Where:** `/getting-started/bootstrap/` § Related commands
- **Quote:** "oat tools ... (tool-pack install, update, remove, migrate, list, info): tool-packs.md"
- **Problem:** `tool-packs.md` and `../provider-sync/index.md` appear as plain text.

**L6. The page title and the sidebar label disagree.**

- **Where:** `/workflows/projects/execution/picking-up-projects/`
- **Quote:** "Picking Up a Project on Another Machine or From Another User"
- **Problem:** the first section is "Resume work on this machine", and the sidebar says "Picking Up Projects". A same-machine reader may skip the page.

**L7. Contributor and test internals in a user reference page.**

- **Where:** `/reference/configuration/` § Bundled assets root
- **Quote:** "The regression evidence is the negative pack control in packages/cli/src/release/public-package-contract.test.ts"

**L8. A "legacy value" is the documented way to stop automatic pull requests.**

- **Where:** `/workflows/approvals-and-automation/`
- **Quote:** "oat config set workflow.postImplementSequence wait --shared (a legacy value that is still supported)"
- **Problem:** I cannot tell whether it is safe to rely on. I want a non-legacy way to express "do not open a PR".

**L9. The tier guidance comes after a long run of ladder internals.**

- **Where:** `/workflows/advanced/dispatch-ceiling/`
- **Problem:** "Which tier for which work" is at the end of a page of about 33k characters. The top of the page links to it, which helps.

**L10. A user-level example sets a key to its default.**

- **Where:** `/reference/configuration/` § Setting preferences
- **Quote:** `oat config set workflow.autoNarrowReReviewScope true --user`
- **Problem:** the same page says this key defaults to `true`, so the example teaches a no-op.

### Positives (specific)

- **Quickstart** lists every file `oat init --scope project` writes, says plainly "It does not touch your home directory or your Git remote, and it commits nothing", and says which choices _would_ write to my home directory.
- **What OAT Writes** is the most trust-building page: a table per command (repository, home, origin), a "What to commit" table, "A new teammate after cloning", a full "Backing out" procedure with a warning, and an honest "Things that surprised us" list.
- **Pilot Provider Sync with One Team** is a ready-made week-one plan for my exact mixed-tool team, including what each teammate does and what to watch for.
- **Every skill guide** I read has a consistent "What it does without asking" paragraph that states commits, pushes and file writes outright.
- **Approvals and Automation** answers "will it push?" directly, counts agent runs, and says the controls are "not an enforcement boundary".
- **The Skills index "How to run a skill"** section, and its worked docs example, made invocation clear.

## Re-test of earlier problems

| #   | Problem                                                                                            | Status    | Evidence                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (a) | No self-contained first success without home writes, reachable from the opening pages              | **Fixed** | Home "Start here" → `/getting-started/quickstart/` "Your first result". The README "First Success" also works. Residual: M2 (README pack-install line).                                                                                                                                    |
| (b) | Copyable configuration examples set at user level what the next section says to set per repository | **Fixed** | `/reference/configuration/` § Setting preferences now puts `archiveOnComplete`, `postImplementSequence` and `createPrOnComplete` in the shared block and explains why. Residual: M4 (a checkpoint recommendation conflict, a different issue) and L10.                                     |
| (c) | Two disagreeing descriptions of whether `oat pjm init` changes an existing root AGENTS.md          | **Fixed** | `/getting-started/tool-packs/` "Install vs. initialize" and the `oat tools install` bullets now agree: append the missing sections; if a section differs, print a manual patch, exit non-zero, and leave the file unchanged. Troubleshooting and the backlog pages do not contradict this. |
| (d) | Knowing which skill to use but not how to invoke it                                                | **Fixed** | `/skills/` § "How to run a skill", and an "Invocation:" line in each skill guide. Residual: M3 (Choose a Workflow does not name entry skills).                                                                                                                                             |
| (e) | Home page carries contributor and migration notes                                                  | **Fixed** | `/` now has only the description, the four paths, "Start here", "Why OAT exists" and Contents. The upgrade note moved to the Getting Started index.                                                                                                                                        |
| (f) | Dispatch policy explains ceilings but not how to choose one                                        | **Fixed** | `/workflows/advanced/dispatch-ceiling/` § "Which tier for which work" (for example, a bug fix → Balanced) plus "Where the ladder lives". Residual: L9 (placement).                                                                                                                         |

## Verdicts

- **Clear? Mostly.** The opening path and the task pages (Quickstart, Pilot, Approvals, the skill guides) are plain and concrete, but Tool Packs, Configuration and Dispatch Policy read like internal specifications.
- **Well written? Mostly.** The newer pages are honest and specific about side effects, while a few older pages still use undefined jargon and give conflicting advice (checkpoint default, bare `oat init`).
- **Helpful? Yes.** I could answer every task from the docs, usually within two to four hops, including what gets written, what to commit and how to undo it.
- **Compelling? Mostly.** I would be glad to adopt Provider Sync and the standalone skills now; the workflow defaults (synced projects pushing to `origin`, lite always opening a pull request) make me want to configure carefully before my first tracked project.

## Three changes that would help me most

1. **Put the push and PR behaviour into the decision.** Choose a Workflow's mode table should show "pushes / opens a PR" and the entry skill for each mode. Its lite recommendation should state that lite always opens a PR and point to a no-push alternative for a tracked fix (H1, M3).
2. **Make every copyable setup command honour the "repository only" promise.** Use `oat init --scope project` on Starting projects, fix the README's `oat tools install --scope project` line, and stop the AGENTS.md guidance block from recommending `oat sync --scope all` (M1, M2, M7).
3. **Turn "Skills not visible" into a diagnose-first ladder:** `oat status --scope project`, then `oat tools info <skill> --scope project`, then provider enablement, then sync, then a new session. Remove or explain the "AGENTS.md skills table" (M6).
