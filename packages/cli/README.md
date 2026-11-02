# @open-agent-toolkit/cli

Open Agent Toolkit command-line interface for provider sync, docs tooling, workflow utilities, and diagnostics.

The CLI also supports project-scoped instruction sync for nested `AGENTS.md` files. By default it creates no `CLAUDE.md` shims, because Claude Code reads `AGENTS.md` itself, and removes the shims OAT created earlier once no `CLAUDE.md` with its own content remains; pointer, symlink, and hard-copy shim strategies are opt-in through `instructions.claude.shims`, and Claude-only `CLAUDE.md` files are adopted into `AGENTS.md`.

## Install

```bash
npm install -g @open-agent-toolkit/cli
```

Run without a global install:

```bash
npx @open-agent-toolkit/cli --help
```

## Quick Start

```bash
oat init --scope project
oat status --scope project
oat sync --scope project
oat config describe
```

Additional useful entry points:

- `oat tools install`
- `oat instructions validate`
- `oat instructions sync --dry-run`
- `oat docs init --app-name my-docs`
- `oat pjm init` - initialize the project-management repo-reference surface after installing the pack
- `oat config dump --json`
- `oat project status --json`
- `oat project list --json`
- `oat project log --help`
- `oat project complete-state /path/to/project`
- `oat project archive /path/to/project`
- `oat repo archive sync`
- `oat doctor`

## Docs scaffolding

`oat docs init --framework fumadocs --app-name my-docs` creates a docs app with app-root `AGENTS.md`, a reader-first Getting Started stub and contributor/toolchain guides. The CLI owns these templates for both Fumadocs and legacy MkDocs; the bootstrap skill guides inspection and setup. Existing files and plain Markdown adoption are preserved.

For an approved fresh reader model, pass `--ia-preset <preset> --planned-pages <count>` together. The six presets materialize reader tracks at 15 or more anticipated pages, or grouped flat headings below 15; `flat-small` always stays flat. Canonical page templates go under excluded `contributing/templates/`, with a track table in framework app-root AGENTS or Markdown contributing guidance. Existing surfaces route to analyze/apply. See [preset selection and template subsets](../../apps/oat-docs/docs/docs-tooling/commands.md#approved-preset-readers). Direct init without both inputs retains its starter; selection does not create an IA decision.

Fumadocs static exports include `llms.txt`, `llms-full.txt` and `llms/<page-slugs>/content.md` (root `llms/content.md`) for loaded `.md` readers. These retain authored Markdown and source-relative-link guidance; configured non-readers and MDX are excluded. Use authored Contents maps and `oat docs nav sync`, followed by `--check`, for navigation changes.

`oat docs check [--target-dir <dir>] [--rule <id>...] [--json]` performs read-only reader, navigation, contributor-command and Mermaid/SVG checks without a site build. Errors exit 1; warnings exit 0. Configure validated severities, numeric thresholds and reason-bearing exceptions under `documentation.check`. Mermaid syntax parsing lazily loads the pinned Pele parser, which needs no DOM and never renders; Node 22.17 remains the minimum. See [checker rules and configuration](../../apps/oat-docs/docs/docs-tooling/check.md).

`oat docs literals [--target-dir <dir>] --page <content-relative-reader.md> --source-root <repo-relative-dir> [--source-exclude <pattern>] --json` supplies read-only inline-code occurrence candidates for a matching triad IA mirror. Repeat each single-value selection flag as needed. Sources stay within narrow explicit implementation roots; searched/skipped evidence and first source physical lines are reported. Once-only strict HTML entity decoding and case-sensitive line-local substring matching do not establish runtime validity; analyze judges canonical relevance and authored IA acceptance. Completed not-found/not-applicable exits 0, input/config errors 1, unexpected failures 2. See [literal helper scope and limits](../../apps/oat-docs/docs/docs-tooling/commands.md#oat-docs-literals).

Fumadocs starters constrain `mdast-util-to-markdown` to 2.1.2 for the current upstream handler compatibility defect. New independent install roots get `pnpm-workspace.yaml`; workspace members get manual setup advice for the existing root YAML, with approval/conflict preservation in bootstrap. No member-local boundary or root dependency-policy merge is performed; `--no-root-patch` still controls build scripts only. Keep the effective policy and lockfile and verify actual resolution before building.

Framework starters expose `docs:check` and run it before build; MkDocs `test` is a real check. Bootstrap proposes approved PR CI edits with explicit generated-manifest freshness. Markdown needs neither an app build nor a default manifest.

## Update Notifications

On ordinary interactive command runs, OAT may print a passive notice when npm's stable `latest` CLI version is newer than the installed version. The cache normally limits checks to once every 24 hours and same-version notices to once every 72 hours; overlapping CLI processes can each perform a check or print a notice.

`oat init`, `oat tools install`, and `oat tools update` are different because they copy tools bundled with the running CLI. Before an eligible interactive mutation, a known newer CLI triggers a warning that the current CLI can only install its own bundled tool versions and that the available CLI may bundle newer versions. OAT then offers, defaulting to no, to run `npm install --global @open-agent-toolkit/cli@<validated-version>` for the exact validated stable version. Acceptance updates the CLI package, stops before changing tools, and asks you to rerun the original command. Declining or aborting continues with the current bundle after a warning. An installer failure stops the tool mutation and reports the command you can retry.

This warning does not mean tools installed from the current bundle are incompatible with the current CLI; it only identifies that a newer CLI release may include newer bundled tool versions. Dry-run, JSON, non-interactive, CI, test, source-development, and ephemeral package-runner invocations do not prompt or install. Ordinary eligible commands remain passive.

Set `NO_UPDATE_NOTIFIER` to a truthy value (for example, `1`, `true`, `yes`, or `on`) to suppress checks for one process; empty, `0`, and `false` do not suppress them. Or persist the user-level preference:

```bash
oat config set updateNotifications false --user
```

## Inspection Commands

Use these commands when you want structured runtime/project state out of the CLI:

- `oat config dump --json` - emit merged OAT config with per-key source attribution
- `oat project status --json` - emit the active project's full parsed control-plane state
- `oat project list --json` - emit summary state for tracked projects under the configured projects root
- `oat project closeout-check <project-path> --json` - report whether a configured, autonomous, or lite closeout's `oat_post_implement_sequence` snapshot permits terminal completion and, for a goal project, whether the declaration, outcome audit, and delivery coverage boundary holds, and which step, approval, or skill owns it next (read-only)
- `oat project delivery check --project <path> --subject <mNN|dNN> --json` - read-only goal delivery evidence report for a milestone or registered delivery (`status: ok`, or `undeliverable` with exit 1)
- `oat project complete-state <project-path>` - emit the canonical completed lifecycle shape into a tracked project's `state.md`; refuses the same incomplete closeout `closeout-check` reports

`oat project delivery check --project <path> --subject mNN --recovery --json` checks the matching committed phase-only `oat_goal_recovery` scope. The record must have `delivery_id: null` and a nonempty, unique, canonical phase set in plan order, owned by the milestone and accepted. Commit the recovery record before checking; unrelated local state edits are allowed. Ordinary milestone checks retain full milestone scope; registered delivery recoveries use the ordinary `--subject dNN` check.

Delivery re-review after an observed member-base change binds a new, delivery-owned timestamped review to the actual observed bases and heads. Keep the registered member bases and first endpoint attainment unchanged; an old or sibling review cannot authorize rebinding. Git evidence reads allow up to 64 MiB per output stream and fail closed if output exceeds that bound.

Final-PR preflight preserves historical planning-review entries recorded as `structured (no artifact); …`. These annotations do not supply file evidence or satisfy code-review gates; real artifact paths still have to resolve.

## Requirements

- Node.js `>=22.17.0`

## Docs

- [Docs Home](https://voxmedia.github.io/open-agent-toolkit/)
- [CLI Utilities](https://voxmedia.github.io/open-agent-toolkit/reference#general-cli-adoption-guidance)
- [Provider Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync)
- [Instruction Sync](https://voxmedia.github.io/open-agent-toolkit/provider-sync/instruction-sync)
- [Reference](https://voxmedia.github.io/open-agent-toolkit/reference)
