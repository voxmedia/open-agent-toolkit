# Open Agent Toolkit (OAT)

Define skills, agents and rules once and use them across Claude Code, Cursor, Codex, GitHub Copilot and Gemini CLI (rules where the tool supports them). Add as much workflow structure as your team needs. Open Agent Toolkit (OAT) is an open-source CLI, skill library and optional project workflow system, not another agent runtime.

<img alt="Skills, agents and rules in .agents/ flow through oat sync to provider views; optional tool packs and tracked projects work on their own or together" src=".github/assets/readme/oat-at-a-glance.svg">

## What OAT Offers

- **One source for every coding tool.** Edit skills, agents and rules in one place. OAT writes copies for the tools that need them, since some read the source folder directly, and reports drift when a copy no longer matches. See [Provider Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync).
- **Ready-made skills.** Research and compare options, review code, brainstorm or capture ideas from inside your agent, without starting a tracked project. Browse the [skills](https://voxmedia.github.io/open-agent-toolkit/skills).
- **Tracked projects that survive a new session.** Work moves through a plan, implementation, review and a pull request, with a discovery step in the fuller modes. A written record lets the next session pick up where the last one stopped. Choose how much process to use, from a one-sitting fix to a multi-milestone goal, or bring a plan you already have. See [Choose a Workflow](https://voxmedia.github.io/open-agent-toolkit/workflows/choose-workflow).
- **Reviews and human approvals.** Reviewer agents check each phase and the final result, and the plan too by default. You approve at the checkpoints the workflow sets, and OAT never merges a pull request for you. See [Approvals and Automation](https://voxmedia.github.io/open-agent-toolkit/workflows/approvals-and-automation).
- **Hands-off runs when you want them.** An autonomous run carries a tracked project (other than a multi-milestone goal) to a pull request. It stops and reports when it needs a person, such as for a decision, a missing credential or a blocking review finding. Waves coordinate a batch of plans you already have. See [Autonomous Execution](https://voxmedia.github.io/open-agent-toolkit/workflows/advanced/autonomy).
- **Docs that stay maintained.** Set up plain Markdown or a docs site, check it for broken links, navigation and diagram errors, and have your agent analyze it and apply the changes you approve. See [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling).
- **Planning records as plain files.** Backlog, roadmap and decision records live in the repository next to the code, and can link to GitHub, Linear or Jira. See [Backlog and Planning](https://voxmedia.github.io/open-agent-toolkit/workflows/backlog-and-planning).

After manual lifecycle edits to a project’s `state.md` frontmatter, run
`oat project check-state /path/to/project` before committing or continuing. The
read-only check requires parseable YAML with a mapping; repair any reported
error and rerun it.
Completion supports an already merged PR:
for shared and synced projects it observes the original live, prepares bookkeeping on a fresh branch from its
updated base, and uses a separate follow-up PR within existing explicit authority.
The original merged identity and body stay intact. Local-only projects record
the live status on their current branch without a bookkeeping PR.

Provider sync and standalone skills need no tracked project. Start with one part and add others later.

## Tool Packs

Skills ship in packs that you install with the CLI. Pack skills run inside your coding agent, not your shell: type `/name` (or `$name` in Codex).

| Pack               | Adds                                                        |
| ------------------ | ----------------------------------------------------------- |
| workflows          | Tracked projects, reviewer agents and waves (needs utility) |
| docs               | Docs setup, analysis and upkeep                             |
| research           | Research, comparison and synthesis                          |
| project-management | Backlog, roadmap and decision records                       |
| ideas              | Idea capture and promotion                                  |
| brainstorm         | Brainstorming with a visual companion                       |
| utility            | Code review, repo upkeep and subagent dispatch              |
| core               | Setup diagnostics and the bundled docs                      |

- **Packs install per repository or for your user account.** The core pack is user-only.
- **Tracked projects sync to your `origin` remote by default.** Choose local storage to keep project records on this machine.

[Tool Packs](https://voxmedia.github.io/open-agent-toolkit/getting-started/tool-packs) covers each pack and the install options.

## First Success: Inspect a Repository

Requires Node.js 22.17 or newer and Git 2.31 or newer. Install the CLI, then run it in an existing repository:

```bash
npm install --global @open-agent-toolkit/cli
cd /path/to/your-repo
oat init --scope project
oat status --scope project
```

Initialization creates canonical directories and sync state; status reports provider assets and drift. Follow the provider prompts and skip optional guided setup if you only want sync. This does not create a tracked OAT project.

Next, preview the sync or add a pack:

```bash
oat sync --scope project --dry-run
oat tools install utility --scope project     # needed by workflows
oat tools install workflows --scope project   # then run /oat-project-quick-start
oat tools install docs --scope project        # then run /oat-docs-bootstrap
```

Use `--scope user` instead to install a pack for all your repositories. [CLI Bootstrap](https://voxmedia.github.io/open-agent-toolkit/getting-started/bootstrap) covers the rest of setup.

## Go Deeper

The [documentation](https://voxmedia.github.io/open-agent-toolkit/) owns the full guides and command reference:

- [Quickstart](https://voxmedia.github.io/open-agent-toolkit/getting-started/quickstart) — choose an adoption path.
- [Instruction Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync/instruction-sync) — validate nested `AGENTS.md` files and configure optional `CLAUDE.md` shims; no shims are created by default.
- [CLI Reference](https://voxmedia.github.io/open-agent-toolkit/reference/cli-reference) and [Configuration](https://voxmedia.github.io/open-agent-toolkit/reference/config-and-local-state) — find commands, options, and local-state behavior.
- [Project status and known limits](https://voxmedia.github.io/open-agent-toolkit/getting-started#project-status) — OAT is versioned 0.x; read what is not yet supported before you adopt it.
- [Stability and support](https://voxmedia.github.io/open-agent-toolkit/getting-started/stability-and-support) — how stable OAT is, best-effort support through GitHub issues, and non-goals.

## Contributing

To develop OAT itself, clone this repository and initialize your checkout:

```bash
pnpm run worktree:init
pnpm run cli -- help
```

The bootstrap installs dependencies, builds the workspace, and prepares local configuration and provider views. Follow the [contributor guide](https://voxmedia.github.io/open-agent-toolkit/contributing) and the ordered Definition of Done in [`AGENTS.md`](AGENTS.md) before submitting changes.

The workspace contains the [CLI](packages/cli/README.md), [read-only project control plane](packages/control-plane/README.md), and Fumadocs [configuration](packages/docs-config/README.md), [theme](packages/docs-theme/README.md), and [transforms](packages/docs-transforms/README.md) packages. The docs site lives in `apps/oat-docs`, bundled skills in `.agents/skills`, and templates, project artifacts, repository reference, and sync state in `.oat`.
