---
oat_wrap_up_condensed: true
oat_generated: true
window_since: 2026-05-27
window_until: 2026-09-15
window_label: custom
generated_at: 2026-09-15T14:40:00Z
source_report: 2026-09-15-wrap-up-custom.md
---

# What shipped — 2026-05-27 → 2026-09-15

The short version: OAT's tools install once for all your repos, project artifacts are shared through Git refs instead of cluttering your PRs, and before work counts as done, a different AI model can review it. Around that, OAT gained a lighter workflow for small changes, smarter model routing for its helper agents, backlog sync with the trackers your team already uses, and a doctor that tells you exactly what's broken.

## The big ones

### **Install OAT's tools once, then initialize each repo.**

- You can install every tool pack at user scope, and it's available in every repo on your machine. Existing per-repo installs stay where they are.
- Each repo still needs `oat init`, which sets up its own foundation: the project directory, sync config and manifest, and agent instructions files such as `AGENTS.md`. `oat init --setup` walks you through it.
- Repo-owned planning, such as the backlog, roadmap, and decisions, stays in the repo and is set up with `oat pjm init`.
- `oat tools migrate` moves a pack between user and repo scope, and removes the old copy only after checking the new one.

### **Project artifacts stay shared but out of your PRs.**

- New projects default to the **synced** scope. Discovery, plans, reviews, and implementation logs are stored locally but saved as Git refs (`refs/oat/projects/<project>`), not as files on your branch.
- Those refs are pushed to `origin`, so teammates and your other machines or worktrees can pull and read the same artifacts.
- None of it lands in source control history. Your feature branch carries only a tiny pointer file, so PR diffs show just the code, and reviewers get links in the PR description to the exact version of each artifact.
- When a project is archived, it's retired cleanly and can't come back as active by accident.

### **A second model can review the work before it counts as done.**

- Workflow gates let a plan or implementation require review by Codex, Claude, or Cursor before the skill finishes.
- If the reviewer finds blocking issues, the gate fails. It no longer reports green regardless.
- Gates have sensible time budgets and can tell a stuck reviewer from a slow one. A single project can opt out when it needs to.

### **Helper agents get the right model for the job.**

- OAT can route subagents across Claude, Codex, and Cursor to an exact model and effort level, so cheap tasks stay cheap and hard ones get the strongest model.
- Reviewers default to a different model family from the one that wrote the code.
- The model guidance is now its own portable skill, `subagent-orchestration`, which you can install without the rest of OAT.

### **Small changes get a small workflow.**

- The new **Lite** mode runs one batched interview, writes one plan, asks for one approval, and implements. If the change grows, it upgrades to Quick without losing the plan.
- Re-reviews now cover only what changed since the last review, not the whole branch.
- Implementers can fix an obvious slip right after a commit without stopping to ask, up to a set limit.
- `oat-project-retro` turns a finished project into an evidence-backed retrospective, and can file the follow-ups for you.

### **Your backlog can talk to GitHub Issues, Linear, and Jira.**

- `oat pjm remote` links a local project or backlog item to GitHub Issues, Linear, or Jira Cloud. You approve a preview before anything is written.
- Repository planning is reorganized into live state and a durable record, with one file per decision and stable IDs that don't cause merge conflicts.
- `oat backlog new` and `oat backlog archive` handle the bookkeeping, and the doctor flags items that were closed but never archived.

### **One command tells you what's wrong with your setup.**

- `oat-doctor` 2.0 checks config, project management, agent instructions, docs, and tools in one pass, and gives an exact fix for every finding.
- If you approve, it runs that fix for you. `--summary` still gives you the quick dashboard.

## Quality-of-life wins

- **`recon` gathers evidence before you decide**, running quick, standard, or thorough research sweeps that come back as a checked, cited evidence packet.
- **Multi-wave execution programs** are available to any repo through `oat-wave-program` and `oat-wave-execute`.
- **Project recaps actually generate now**: one agent-authored page with an honest built, needs-review, or failed result.
- **The CLI tells you when an update is out**, and offers to update before it installs older tools.
- **`--help` finally shows global flags** such as `--json` on every command, and `--scope` appears only where it does something.
- **`oat config unset` and `oat config describe`** let you remove bad values and see which keys are deprecated.
- **Archive commands say what they do**: `oat repo archive sync` pulls and `oat project archive` pushes.
- **Cursor and Copilot read skills natively**, so no more mirror folders, and intentional provider-only files stop showing up as drift.
- **Docs authoring skills** help you write and restructure documentation to a consistent standard.
- **A September hardening pass** fixed dozens of places where OAT's output, help text, or skill instructions didn't match what it actually did.

## Footer

Questions, surprises, or "this doesn't do what I expected": reply in the thread.
