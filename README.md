# Open Agent Toolkit (OAT)

Define agent capabilities once, use them across coding tools, and add as much workflow structure as your team needs. Open Agent Toolkit (OAT) is an open-source CLI, skill library, and optional project workflow system—not another agent runtime.

## Choose What You Need

Adopt these three capabilities independently or combine them:

1. **Keep coding tools aligned.** Maintain canonical skills, agents, and rules; sync provider views and inspect drift instead of maintaining separate copies. Start with [Provider Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync).
2. **Use skills for a task.** Research a decision, review code, or maintain documentation without adopting a tracked project lifecycle. Choose a [skill](https://voxmedia.github.io/open-agent-toolkit/skills) or explore [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling).
3. **Make longer work resumable.** Use plans, implementation records, reviews, and human checkpoints when you need a tracked workflow. [Choose a Workflow](https://voxmedia.github.io/open-agent-toolkit/workflows/choose-workflow) that fits the work.

Provider sync does not require project workflows. Standalone skills do not require an active OAT project; project-specific skills state their prerequisites in their guides.

```mermaid
flowchart TD
  BASE["Provider Sync\ncanonical assets, drift, provider views"] --> TOOLS["CLI Utilities and Skills\nbootstrap, packs, docs tooling, diagnostics"]
  TOOLS --> FLOW["Optional Workflows\ntracked projects, reviews, PR flow"]
```

## First Success: Inspect a Repository

Requires Node.js 22.17 or newer and Git 2.31 or newer. Install the CLI, then run it in an existing repository:

```bash
npm install --global @open-agent-toolkit/cli
cd /path/to/your-repo
oat init --scope project
oat status --scope project
```

Initialization creates canonical directories and sync state; status reports provider assets and drift. Follow the provider prompts and skip optional guided setup if you only want sync. This does not create a tracked OAT project.

Once you have canonical assets, preview changes with `oat sync --scope project --dry-run` before applying them. See [CLI Bootstrap](https://voxmedia.github.io/open-agent-toolkit/getting-started/bootstrap) for setup details and [Tool Packs](https://voxmedia.github.io/open-agent-toolkit/getting-started/tool-packs) to install skills separately.

## Go Deeper

The [documentation](https://voxmedia.github.io/open-agent-toolkit/) owns the full guides and command reference:

- [Quickstart](https://voxmedia.github.io/open-agent-toolkit/getting-started/quickstart) — choose an adoption path.
- [Instruction Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync/instruction-sync) — validate nested `AGENTS.md` files and configure optional `CLAUDE.md` shims; no shims are created by default.
- [CLI Reference](https://voxmedia.github.io/open-agent-toolkit/reference/cli-reference) and [Configuration](https://voxmedia.github.io/open-agent-toolkit/reference/config-and-local-state) — find commands, options, and local-state behavior.

## Contributing

To develop OAT itself, clone this repository and initialize your checkout:

```bash
pnpm run worktree:init
pnpm run cli -- help
```

The bootstrap installs dependencies, builds the workspace, and prepares local configuration and provider views. Follow the [contributor guide](https://voxmedia.github.io/open-agent-toolkit/contributing) and the ordered Definition of Done in [`AGENTS.md`](AGENTS.md) before submitting changes.

The workspace contains the [CLI](packages/cli/README.md), [read-only project control plane](packages/control-plane/README.md), and Fumadocs [configuration](packages/docs-config/README.md), [theme](packages/docs-theme/README.md), and [transforms](packages/docs-transforms/README.md) packages. The docs site lives in `apps/oat-docs`, bundled skills in `.agents/skills`, and templates, project artifacts, repository reference, and sync state in `.oat`.
