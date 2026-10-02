# Provider sync: which configuration, and why

**Canonical assets**: what you edit in `.agents/` (or `~/.agents/`). **Provider views**: tool files OAT generates from them (`.claude/skills/x`). **Drift**: a view differs from what OAT wrote. **Stray**: an unmanaged provider file.

## 1. Which providers to enable

**The choice:** whether OAT maintains a tool's files. Set it with `providers.<name>.enabled` in `.oat/sync/config.json`, through `oat providers set --enabled … --disabled …`. What enabling writes:

- Claude: `.claude/skills`, `.claude/agents`, `.claude/rules`
- Cursor: `.cursor/agents`, `.cursor/rules` (skills are read from `.agents/`)
- Copilot: `.github/agents`, `.github/instructions`
- Codex: `.codex/agents/*.toml`, `.codex/config.toml`
- Gemini: nothing (reads `.agents/` directly)

| Option  | Choose it when        | You give up                     | In practice                                                                       |
| ------- | --------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `true`  | Someone uses the tool | Generated files appear in diffs | Active even before its folder exists, as in a fresh worktree                      |
| `false` | Nobody uses it        | Updates                         | Existing views stay on disk, unmaintained                                         |
| unset   | Never chosen          | Predictability                  | Active only if `.claude`, `.cursor`, `.codex`, `.gemini` or Copilot markers exist |

**Default:** unset (interactive `oat init` writes explicit values). **Why:** detection alone was inconsistent across fresh worktrees (DR-260216).

**Which should I pick**

- If the team is Claude-only, enable `claude` and disable the rest.
- If the team mixes Claude, Cursor and Codex, enable those three and set the rest to `false`, so stray folders can't activate them.

## 2. Scope

**The choice:** which roots a run touches. Set it with `--scope project|user|all` on `oat sync` and `oat status`.

| Option    | Choose it when                 | You give up                   | In practice                                                                                                                                    |
| --------- | ------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `project` | CI, scripts, shared repos      | Personal skills don't refresh | Repo `.agents/*` (with rules) syncs to repo provider folders, configured by `.oat/sync/config.json`                                            |
| `user`    | Personal skills for every repo | Rules and repo views          | `~/.agents/{skills,agents}` syncs to `~/.claude`, `~/.cursor/agents`, `~/.copilot/agents`, `~/.codex`, configured by `~/.oat/sync/config.json` |
| `all`     | Your own machine               | Home-directory writes         | Runs project, then user                                                                                                                        |

**Default:** `all` (`oat providers set`: `project`). **Likely rationale (inferred):** packs install to user scope by default. User scope never prompts about detected providers, so any `~/.cursor` syncs unless disabled.

**Which should I pick**

- In CI, always pass `--scope project`.
- For personal skills everywhere, put them in `~/.agents/skills` and run `--scope user`.

## 3. Sync strategy

**The choice:** links or copies. Set `defaultStrategy` in the sync config, or override per tool with `providers.<name>.strategy`. No command sets these; edit the JSON by hand.

| Option    | Choose it when                        | You give up                | In practice                                                                                                                                   |
| --------- | ------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto`    | Most teams                            | Nothing beyond `symlink`   | Per-entry links. Also adopts an existing exact whole-folder link such as `.claude/skills` pointing at `.agents/skills`, but never creates one |
| `symlink` | You don't want folder aliases adopted | Folder-alias adoption      | Per-entry links. Editing a view edits the canonical file                                                                                      |
| `copy`    | Symlinks break somewhere              | Edits stop flowing through | Banner-marked copies. Hand edits show as drift and the next sync overwrites them                                                              |

Rules are always copies. If the OS refuses a symlink, both link modes silently copy that entry.

**Default:** `auto`. **Likely rationale (inferred):** a single source that never goes stale.

**Which should I pick**

- In the normal case, keep `auto`.
- If you have Windows contributors, or CI or packaging that drops links, use `copy`. Views are committed as git symlinks.
- To surface hand edits in `.claude/` as drift, use `copy`.

## 4. CLAUDE.md shims

**The choice:** whether `oat instructions sync` keeps a `CLAUDE.md` beside each `AGENTS.md`. Set it with `instructions.claude.shims` in `.oat/config.json`; `--strategy` overrides one run.

| Option    | Choose it when                                     | You give up                                                       | In practice                                                                                                   |
| --------- | -------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `none`    | Contributors use current Claude Code with defaults | Older Claude Code, or `instructionFiles: claude-md`, sees nothing | Removes OAT-made shims, unless any `CLAUDE.md` has its own content, in which case it removes none and exits 1 |
| `pointer` | Some contributors need `CLAUDE.md`                 | One file per directory                                            | `@AGENTS.md`, which never goes stale                                                                          |
| `symlink` | Same, and links work everywhere                    | Link portability                                                  | `CLAUDE.md` links to `AGENTS.md`                                                                              |
| `copy`    | A consumer needs the full text (inferred)          | Each `AGENTS.md` edit needs `sync --force`                        | Byte copy                                                                                                     |

**Default:** `none`. **Why:** while any `CLAUDE.md` exists, Claude Code ignores every `AGENTS.md`, so partial shims hide instructions (DR-260927; see "Claude Code and AGENTS.md").

**Which should I pick:** if you are unsure what contributors run, or symlinks are a problem, use `pointer`, not `copy`.

## 5. Strays: adopt or keep

**The choice:** the disposition of each stray, offered in interactive `oat init` and `oat status`. Kept paths are recorded in `knownStrays`.

| Option         | Choose it when           | You give up              | In practice                                                                                                                                                  |
| -------------- | ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Adopt          | Every tool should get it | Tool-only placement      | Moves into `.agents/`, and the next sync fans it out to other tools                                                                                          |
| Keep tool-only | It only fits one tool    | Other tools never see it | Exact path saved to `knownStrays` and no longer reported. Offered only for Cursor and Copilot skills, and blocked when the name duplicates a canonical skill |
| Unresolved     | Undecided                | Repeated reports         | Nothing changes                                                                                                                                              |

Other strays get only an adopt option. To silence one, hand-add it to `knownStrays` or gitignore it.

**Default:** unresolved, with `knownStrays: []`. **Why:** each choice is made explicitly (DR-260718-require-an-explicit-decision).

**Which should I pick:** adopt shared items. Keep personal tool-specific items at user scope, and team ones at project scope.

## Proposed home

- Sections 1 and 3 go in `config.md`, as a new "## Choosing providers and strategy" after "## Purpose".
- Section 2 goes in `scope-and-surface.md`, after "## Scope".
- Section 4 goes in `instruction-sync.md` "### Choosing a strategy", merged with "## Supported Strategies".
- Section 5 goes in `manifest-and-drift.md`, after the "## Stray adoption" intro.

## Docs that contradict the code

- `reference/configuration.md:27,896` and catalog `owningCommand` (`config/index.ts:1134,1170`) claim `oat providers set` sets strategy. It only enables and disables.
- `reference/configuration.md:47` uses a non-existent provider name, `github`.
- `providers.md:218` calls `--scope all` explicit, but it is the default.
- Docs imply only `auto` falls back to copy, but explicit `symlink` does too.
- Docs omit that disabling a provider leaves its views in place.

## Could not verify

- Windows and CI git behavior with committed symlinks.
- Stated rationale for the `auto` and `all` defaults.
- Whether stray adoption's link is converted under `copy`.
- `oat providers` prints an adapter-level `defaultStrategy`, for example Claude `symlink`, that config always overrides.

## Evidence

- Schema and defaults: `packages/cli/src/config/sync-config.ts:11-21,30-35,203-220`; `packages/cli/src/shared/types.ts:6,9`
- Enablement: `packages/cli/src/providers/shared/adapter.utils.ts:43-77,86-92`; `packages/cli/src/commands/init/index.ts:989-1013`; `packages/cli/src/commands/sync/index.ts:197-201,216,443-447`; `packages/cli/src/engine/compute-plan.ts:990-992`; `.oat/repo/reference/decisions/DR-260216-use-explicit-provider-config.md:14,23,33-48`
- Detection: `packages/cli/src/providers/claude/adapter.ts:8-15`; `packages/cli/src/providers/codex/adapter.ts:8-15`; `packages/cli/src/providers/cursor/adapter.ts:10`; `packages/cli/src/providers/gemini/adapter.ts:10`; `packages/cli/src/providers/copilot/adapter.ts:10-14`
- Mappings and writes: `packages/cli/src/providers/claude/paths.ts:8-45`; `packages/cli/src/providers/cursor/paths.ts:8-47`; `packages/cli/src/providers/copilot/paths.ts:8-47`; `packages/cli/src/providers/codex/paths.ts:3-31`; `packages/cli/src/providers/gemini/paths.ts:3-31`; `packages/cli/src/providers/shared/registry.ts:270-301`; `packages/cli/src/providers/codex/codec/sync-extension.ts:123,619`; `apps/oat-docs/docs/provider-sync/scope-and-surface.md:66`
- Scope: `packages/cli/src/commands/shared/scope-option.ts:22-30`; `packages/cli/src/commands/shared/shared.utils.ts:9-13`; `packages/cli/src/fs/paths.ts:36-44`; `packages/cli/src/commands/sync/index.ts:84-88`; `packages/cli/src/config/user-sync-config.ts:29-31`; `packages/cli/src/commands/providers/set/index.ts:214-225`; `apps/oat-docs/docs/provider-sync/providers.md:182-187`; `apps/oat-docs/docs/getting-started/bootstrap.md:49`
- Strategy: `packages/cli/src/engine/compute-plan.ts:118-151,443-500,548,636-647,719-764`; `packages/cli/src/commands/sync/index.ts:483-493` (no alias-creation flag passed); `packages/cli/src/engine/execute-plan.ts:211-232,264-270,318-323`; `packages/cli/src/fs/io.ts:125-152`; `packages/cli/src/engine/markers.ts:4-5`; `packages/cli/src/drift/detector.ts:110-113,192-195`; `packages/cli/src/commands/config/index.ts:1128-1218`; `packages/cli/src/ui/output.ts:182`; CLI probe `pnpm -s run cli:source -- config get sync.defaultStrategy` printed "Unknown config key"; `apps/oat-docs/docs/provider-sync/config.md:122-124`; `git ls-files -s .claude .cursor` shows 93 symlink (mode 120000) entries
- Instructions: `packages/cli/src/config/oat-config.ts:47-66`; `packages/cli/src/commands/instructions/instructions.utils.ts:35,101-104,504-511,1210-1236`; `packages/cli/src/commands/instructions/sync/sync.ts:225-227,289-295`; `packages/cli/src/commands/config/index.ts:461-485`; `.oat/repo/reference/decisions/DR-260927-claude-md-shims-are-opt.md:26-49`; `.oat/repo/reference/decisions/DR-260928-persist-the-instruction-sync.md:17-21`; `apps/oat-docs/docs/provider-sync/instruction-sync.md:19`
- Strays: `packages/cli/src/drift/strays.ts:184` (gitignored files skipped); `packages/cli/src/drift/known-strays.ts:54-84`; `packages/cli/src/commands/shared/native-skill-disposition.ts:87-115`; `packages/cli/src/commands/status/index.ts:1333-1341,1432-1450`; `packages/cli/src/commands/shared/adopt-stray.ts:118-148`; `packages/cli/src/commands/config/index.ts:1140-1150`; `apps/oat-docs/docs/provider-sync/config.md:67-68`; `.oat/repo/reference/decisions/DR-260718-require-an-explicit-decision.md:17`
