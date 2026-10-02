# Errata: fact-sheet-writes-and-removal.md

Fact sheet: `.oat/projects/shared/docs-improvement-overhaul/references/fact-sheet-writes-and-removal.md`
(amphipod worktree). Corrections come from the independent verifier's report
(`corrections/fact-sheet-pages.verify.md`) and were re-confirmed on 2026-10-02
against `packages/cli/src` at `0062ba850` (CLI 0.3.14) in the
docs-overhaul-readme-visual worktree, with scratch repositories from
`mktemp -d`, an isolated `HOME`, and the CLI run from source.

## E1. C5: plain `oat status` exit code (wrong)

- Sheet says: with an unsynced (`✗ missing`) skill, "The exit code stays 0 in
  text mode."
- Correct fact: plain `oat status --scope project` exits **1** whenever any
  entry is not in sync: missing, drifted, or a stray file in a provider folder.
  It exits 0 only when every entry is in sync, or when there are no entries
  (`No managed entries found.`). `--hook` exits 1 for missing or drifted, and 0
  for strays only (it prints one info line,
  `oat: unmanaged provider files detected - run 'oat status --scope project' to review`).
- Evidence: `packages/cli/src/commands/status/index.ts:1247`
  (`hasIssues = summary.total > 0 && summary.inSync !== summary.total`),
  `:1249-1259` (hook branch), `:1586` (`process.exitCode = hasIssues ? 1 : 0`).
  Re-run: clean plain=0; stray only plain=1, hook=0; missing skill view plain=1,
  hook=1 (`oat: managed provider views are out of sync - run 'oat sync --scope project'`).

## E2. C8 and summary item 16: existing `.codex/config.toml` (incomplete)

- Sheet says: sync "kept those lines at the top and appended OAT's
  `[features]`, `[agents]` and `[agents.*]` tables. Nothing was overwritten",
  and the pre-existing `.codex/config.toml` content "survived".
- Correct fact: OAT upserts the shared keys. It sets `[features] multi_agent =
true` and `[agents] max_depth` to at least 2, so a user's `multi_agent =
false` becomes `true` and `max_depth = 1` becomes `2`; it adds
  `[agents.<name>]` tables. Other settings (`model`, `[mcp_servers.*]`) stay.
  The sheet's run had no conflicting values, so it could not see this.
- Evidence: `packages/cli/src/providers/codex/codec/config-merge.ts`
  `mergeCodexConfig` (`agents.max_depth = Math.max(2, target ?? 2, inherited ?? 2)`;
  `features: { ...features, multi_agent: true }`). Re-run with a pre-seeded
  `model = "o3"`, `multi_agent = false`, `max_depth = 1`: after
  `oat sync --scope project` (claude,cursor,codex) the diff was
  `multi_agent = false -> true`, `max_depth = 1 -> 2`, plus the
  `[agents.my-agent]` table; `model = "o3"` unchanged.

## E3. Deleted canonical file -> view removed (incomplete: agents)

- Sheet says (F-section, line ~734): deleting a canonical skill and syncing
  logs `removed .agents/skills/hello-demo`. Only skills were tested, and the
  pages generalized it to "sync removes a view whose canonical file was
  deleted".
- Correct fact: true for skills and rules, and for Claude agent links when
  Cursor is not enabled. With Cursor enabled, after deleting or renaming
  `.agents/agents/<name>.md`, `oat sync --scope project`, `--dry-run` and
  `oat status` exit 1 with
  `Cursor agent definition is a symbolic link at .cursor/agents/<name>.md whose target escapes the sync scope.`
  After that link is deleted by hand, the same error names
  `.claude/agents/<name>.md`; only after both dangling links are deleted does
  sync exit 0. Codex's `.codex/agents/<name>.toml` and its `[agents.<name>]`
  table in `.codex/config.toml` are never removed, with or without Cursor.
- Evidence: `packages/cli/src/providers/cursor/codec/materialize.ts:183-190`
  (discovery throws on a symlink whose real path leaves the scope). Re-run
  (claude,cursor,codex): delete agent -> dry-run exit 1, sync exit 1, status
  exit 1; unlink `.cursor/agents/my-agent.md` -> sync exit 1 naming
  `.claude/agents/my-agent.md`; unlink that -> sync exit 0, with
  `.codex/agents/my-agent.toml` and the `[agents.my-agent]` table still
  present. Deleting the toml and the table by hand -> sync exit 0, status
  exit 0, and neither is recreated. Verifier: claude,codex only -> sync exit 0,
  toml stays; claude only -> skill, agent and rule views all removed.

## E4. `oat tools install` default scope (misleading wording)

- Sheet says: `oat tools install --help`: `--scope` (default **all**). The page
  turned this into "`oat tools install` defaults to scope `all`".
- Correct fact: the help text says `all`, but `oat tools install <pack>` with no
  `--scope` installs a pack that is not yet installed under the home directory
  only (user scope), leaving the repository untouched; an already-installed
  pack stays where it is.
- Evidence: re-run in a fresh repo after `oat init --scope project`:
  `oat tools install docs` printed `Scope: user` and
  `Run: oat sync --scope user`; `.agents/skills/` in the repo stayed empty and
  the skills landed in `$HOME/.agents/skills/`. Agrees with tool-packs.md,
  bootstrap.md and scope-and-surface.md ("every reusable pack defaults to user
  scope on a fresh install").

## E5. Other incomplete statements used on the pages

- **Init writes "only these files".** True non-interactively. In a terminal,
  `oat init` also prompts for providers (writes `.oat/sync/config.json`), the
  hook, and, on a fresh init, guided setup, which installs packs in the home
  directory even with `--scope project`. Evidence:
  `commands/init/index.ts:989-1020` (provider select), `:565-574` (hook
  prompt), `:1303` (`setupMayRun = !!setupFlag || (context.interactive && freshInit)`).
  Interactive runs were read from source only.
- **Sync after a project-scope pack install.** With no provider enabled and no
  `.claude/` folder, `oat tools install workflows --scope project` creates no
  Claude views; `oat providers set --scope project --enabled claude` plus
  `oat sync --scope project` then links `.claude/skills/oat-project-quick-start`.
  Claude is the only provider without `nativeRead` for skills
  (`providers/{cursor,codex,copilot,gemini}/paths.ts` set `nativeRead: true`).
  Re-run confirmed.
- **Manifest rewrite.** A no-op sync leaves `.oat/sync/manifest.json`
  byte-identical (re-run); a sync that changes a view, or runs under a
  different CLI version, rewrites it and restamps `oatVersion` (verifier).
- **Prune and origin data.** Deleting `refs/oat/projects/<name>` on origin
  leaves the project's objects unreachable but present until the host
  garbage-collects (verifier: 10 unreachable objects on the bare remote).
