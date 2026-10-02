> **Status:** One agent drafted this; another verified it independently (ACCEPT WITH CHANGES); corrections applied.
> **Checking:** Most behavior was observed by running the CLI in throwaway repos with an isolated `HOME`. The symlink fallback, Keep's limits, adopt's link-back and folder-link eligibility were checked by reading code.
> **Not exercised:** Interactive prompts were not run.

# Provider sync: which configuration, and why

Terms:

- **Canonical assets:** the files you edit, under `.agents/` (or `~/.agents/` for personal ones).
- **Provider views:** per-tool files OAT generates from them, such as `.claude/skills/foo`.
- **Drift:** a view no longer matches what OAT last wrote.
- **Stray:** a file in a provider folder that OAT doesn't manage.
- **Scope:** which tree a command works on. `project` is the repository; `user` is your home directory.

> **Before you run sync:** a bare `oat sync` uses scope `all`, so it also writes under your home directory. Every run also overwrites edits made in provider folders, replaces an untracked file sitting at a view path, and removes a view whose canonical source was deleted. Edit `.agents/`, not the provider folders.

## 1. Which providers to enable

**The choice:** whether OAT maintains a tool's files. Set `providers.<name>.enabled` in `.oat/sync/config.json` with `oat providers set --enabled <list> --disabled <list>`.

Enabling writes, at project scope:

- Claude: `.claude/{skills,agents,rules}`
- Cursor: `.cursor/{agents,rules}`
- Copilot: `.github/{agents,instructions}`
- Codex: `.codex/agents/*.toml` and `.codex/config.toml`
- Gemini: nothing

The non-Claude tools read `.agents/skills` directly.

| Option  | Choose it when  | You give up                                        | In practice                                                                                                                                                                               |
| ------- | --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`  | Someone uses it | Generated files in diffs                           | Active even without the tool's folder                                                                                                                                                     |
| `false` | Nobody uses it  | OAT stops creating, updating or removing its files | Existing views stay on disk                                                                                                                                                               |
| unset   | Never chosen    | Predictability                                     | Active only if its folder exists: `.claude`, `.cursor`, `.codex`, `.gemini`, or a Copilot marker (`.copilot/`, `.github/copilot-instructions.md`, `.github/{agents,skills,instructions}`) |

While a disabled provider's folder exists, non-interactive `oat sync` warns on every run, and interactive `oat sync --scope project` offers to re-enable it **pre-selected**. Untick it or delete the folder.

**Default:** unset, meaning folder detection; interactive `oat init` writes explicit values. **Why set it explicitly:** detection alone was inconsistent in fresh worktrees without provider folders (DR-260216, explicit provider config).

**Which should I pick**

- **Claude-only team:** enable `claude` and disable the rest.
- **Mixed Claude Code/Cursor/Codex team:** enable those three; disable `copilot` and `gemini`.
- **Dropped a tool:** disable it, then delete its old views yourself.

## 2. Scope

**The choice:** which trees a run touches. Set it with `--scope project|user|all` on `oat sync` and `oat status`.

| Option    | Choose it when             | You give up                   | In practice                                                                                                                              |
| --------- | -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `project` | CI, scripts                | Personal skills not refreshed | Repo `.agents/*` (with rules) syncs to repo provider folders. Config: `.oat/sync/config.json`                                            |
| `user`    | Personal skills everywhere | Rules (project-only)          | `~/.agents/{skills,agents}` syncs to `~/.claude`, `~/.cursor/agents`, `~/.copilot/agents`, `~/.codex`. Config: `~/.oat/sync/config.json` |
| `all`     | Your own machine           | Home writes on every run      | Runs project, then user                                                                                                                  |

**Default:** `all` (`project` for `oat providers set`). **Likely rationale (inferred):** packs (installable bundles of skills and agents) default to user scope. User scope never prompts, so an existing `~/.cursor` or `~/.claude` syncs unless disabled in `~/.oat/sync/config.json`.

**Which should I pick**

- **CI:** always pass `--scope project`.
- **Personal skills everywhere:** put them in `~/.agents/skills` and run `oat sync --scope user`.

## 3. Sync strategy

**The choice:** links or copies, via `defaultStrategy` and per-tool `providers.<name>.strategy`. No command sets them, so edit `.oat/sync/config.json` by hand (create it first with `oat providers set --enabled <providers>`). Keep `"version": 1` and `"defaultStrategy"`, or validation fails and sync and status stop.

**Per-entry** means one link or copy per skill or agent. A **whole-folder link** (folder alias) is one link such as `.claude/skills → ../.agents/skills`; only skill folders qualify, so in practice only Claude.

| Option    | Choose it when                                        | You give up                                                                                                                                  | In practice                                                                                                     |
| --------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `auto`    | Most teams                                            | Once `auto` adopts a folder link, switching to `symlink` or `copy` fails until you disable the provider, run `oat sync`, and remove the link | Per-entry links. Adopts an existing exact whole-folder link but never creates one                               |
| `symlink` | You want per-entry links only and have no folder link | Remove any folder link first: `symlink` and `copy` refuse to sync through one                                                                | Per-entry relative links. Editing a view edits the canonical file                                               |
| `copy`    | Links truly cannot work                               | Canonical edits reach tools only after `oat sync`, and `oat status` still says `in_sync` for stale copies                                    | Plain copies; skill folders and rules carry an OAT-managed banner. Hand edits show as drift and are overwritten |

Rules are always copies. If the OS refuses a symlink, `auto` and `symlink` silently copy that entry. `copy` stamps each copied skill with the absolute path of the checkout that ran sync. Committed copies therefore show as drifted in every other checkout (teammates, worktrees, CI) and get rewritten by its next `oat sync`: permanent churn.

**Default:** `auto`. **Likely rationale (inferred, no record):** one source that never goes stale.

**Which should I pick**

- **Normally:** keep `auto`.
- **Windows or CI concerns:** still prefer `auto` unless links truly cannot work. Committed links are git symlinks (mode 120000), which Windows checkouts without symlink support turn into text files (not verified). With `copy`, expect the churn above; not committing views and running `oat sync --scope project` per checkout is untested.

## 4. CLAUDE.md shims

**The choice:** whether `oat instructions sync` keeps a **shim** (a `CLAUDE.md` derived from the `AGENTS.md` beside it). Set it with `oat config set instructions.claude.shims <none|pointer|symlink|copy>`; `--strategy` overrides one run. `oat sync` never touches `CLAUDE.md`.

| Option    | Choose it when                                                                | You give up                                                                          | In practice                                                                                                                                                                         |
| --------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`    | Contributors' Claude Code has built-in AGENTS.md support, at default settings | Older releases, or a user setting `instructionFiles: claude-md`, see no instructions | Removes OAT-made shims. If any `CLAUDE.md` has its own content, removes nothing and exits 1. A lone `CLAUDE.md` (no `AGENTS.md` beside it) becomes a new `AGENTS.md` and is deleted |
| `pointer` | Some contributors need `CLAUDE.md`                                            | One small file per directory                                                         | A one-line `CLAUDE.md` containing `@AGENTS.md`; never stale                                                                                                                         |
| `symlink` | Same, and links work everywhere                                               | Link portability                                                                     | `CLAUDE.md` links to `AGENTS.md`                                                                                                                                                    |
| `copy`    | A consumer needs the full text (inferred)                                     | After each `AGENTS.md` edit, sync skips it until `--force`                           | Byte copy                                                                                                                                                                           |

**Default:** `none`. **Why:** Claude Code's built-in AGENTS.md support turns itself off when a `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` sits in the session's directory or any directory above it, up to the project root. Shims in some directories but not others therefore hide the unshimmed `AGENTS.md` files (DR-260927, shims made opt-in).

**Which should I pick:** if you can't confirm every contributor's setup, or symlinks are a concern, use `pointer`, not `copy`.

## 5. Strays: adopt or keep

**The choice:** what happens to each stray. Interactive `oat init` and `oat status` ask. A kept path is recorded in `knownStrays`.

| Option         | Choose it when           | You give up              | In practice                                                                                                                 |
| -------------- | ------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Adopt          | Every tool should get it | Tool-only placement      | Moves into `.agents/` and leaves a symlink at the original path; the next sync reaches the other tools                      |
| Keep tool-only | It fits one tool         | Other tools never see it | Path saved to `knownStrays`, no longer reported. Only for Cursor and Copilot skills; blocked by a same-name canonical skill |
| Decide later   | Undecided                | It is reported every run | Nothing changes                                                                                                             |

**Default:** undecided, with `knownStrays: []`. **Why:** each Cursor skill gets an explicit choice, so nothing is classified implicitly (DR-260718-require-an-explicit-decision).

**Which should I pick:** adopt anything every tool should get. For a Cursor- or Copilot-only skill, choose Keep (user scope if personal, project scope if the team needs it). Other strays get only Adopt; to keep one, hand-add its exact path to `knownStrays` or gitignore it.

## Proposed home

Re-check every page path against the merged tree.

- **Sections 1 and 3:** `provider-sync/config.md`, as a new "## Choosing providers and strategy" after "## Purpose".
- **Section 2 and the callout:** `provider-sync/scope-and-surface.md`, after "## Scope". Repeat the callout in `commands.md` under `oat sync`.
- **Section 4:** `provider-sync/instruction-sync.md` "### Choosing a strategy", merged with "## Supported Strategies".
- **Section 5:** `provider-sync/manifest-and-drift.md`, after the "## Stray adoption" intro.

## Docs that contradict the code

1. The `oat config describe` catalog names `oat providers set` as owner of the strategy keys, which it can't set (`reference/configuration.md:27,896` only implies this).
2. `reference/configuration.md:47` uses the provider name `github`, which `oat providers set` rejects.
3. Omission: the docs never mention that `auto` and `symlink` silently copy an entry when the OS refuses a symlink.
4. The docs say disabling a provider preserves a folder link, but not that per-entry views also stay on disk.
5. `oat providers inspect`/`list` print an adapter "Default strategy" (`symlink` for Claude, Cursor, Copilot) that sync never uses; config `defaultStrategy` always wins.

## Could not verify

- Behavior when the OS refuses a symlink (verified by reading code only).
- How git on Windows or CI handles committed symlinks.
- Whether gitignoring provider views is a supported setup.
- The interactive prompts (verified by reading code only).
- Any recorded rationale for the `auto` and `all` defaults.

## Evidence

Paths are under `packages/cli/src/` unless shown otherwise. "Observed" means the verifier saw it in a throwaway repo with an isolated `HOME`.

- **Callout:**
  - `commands/shared/scope-option.ts:22-30`
  - `commands/shared/shared.utils.ts:9-13`
  - `fs/paths.ts:36-44`
  - `engine/compute-plan.ts:211-229` (removal of a view whose canonical source is gone) and `:412-417` (a non-link at a view path becomes `update_symlink`)
  - `engine/compute-plan.ts:443-500` (copy overwrite)
  - Observed: a bare sync wrote `$HOME/.claude/skills/*` and `$HOME/.oat/sync/manifest.json`. The overwrite, replace and remove behaviors were reproduced by a second verifier.
- **Enablement:**
  - `config/sync-config.ts:11-35`
  - `providers/shared/adapter.utils.ts:43-77,86-92`
  - `commands/init/index.ts:989-1013`
  - `commands/sync/index.ts:158-179` (pre-checked prompt), `:196-250`, `:443-447`
  - `engine/compute-plan.ts:990-992`
  - Adapter detection: `providers/{claude,codex}/adapter.ts:8-15`, `cursor/adapter.ts:10`, `gemini/adapter.ts:10`, `copilot/adapter.ts:10-14`
  - Path mappings: `providers/*/paths.ts`, `providers/shared/registry.ts:270-301`
  - `providers/codex/codec/sync-extension.ts:123,619`
  - `.oat/repo/reference/decisions/DR-260216-use-explicit-provider-config.md:14,23,33-41`
  - Observed: views written with no provider folders present; views left after `--disabled`; the mismatch warning.
- **Scope:**
  - `commands/sync/index.ts:84-88`
  - `config/user-sync-config.ts:29-31`
  - `commands/providers/set/index.ts:214-225`
  - `apps/oat-docs/docs/provider-sync/providers.md:182-187`
  - `apps/oat-docs/docs/getting-started/bootstrap.md:49`
- **Strategy:**
  - `engine/compute-plan.ts:118-151,548,636-700,719-764`
  - `commands/sync/index.ts:483-493`
  - `engine/execute-plan.ts:211-221` (absolute path in the banner), `:264-270`
  - `fs/io.ts:112-140` in the working tree (`:125-152` at `a080dfbef`)
  - `engine/markers.ts:4-5`
  - `drift/detector.ts:110-113,122-128`
  - `config/sync-config.ts:16-21,104,123-128`
  - `providers/shared/registry.ts:250-253`
  - `commands/config/index.ts:1128-1218`
  - `ui/output.ts:182`
  - Observed: copy churn across clones; stale copies reported `in_sync`; folder-link refusal (exit 2) and `reject-collection` after `auto` (exit 1); validation failure without `defaultStrategy`; `config get sync.defaultStrategy` printed "Unknown config key"; this repo has 93 mode-120000 view entries.
- **Instructions:**
  - `config/oat-config.ts:47-66`
  - `commands/config/index.ts:461-472`
  - `commands/instructions/instructions.utils.ts:35,101-104,504-511,1210-1236,1545-1569`
  - `commands/instructions/sync/sync.ts:178-194,225-227,289-295`
  - `.oat/repo/reference/decisions/DR-260927-claude-md-shims-are-opt.md:17-22,26-49`
  - Observed: `copy` needs `--force`; a lone `CLAUDE.md` is adopted and then removed; removal is blocked when a `CLAUDE.md` has its own content.
- **Strays:**
  - `drift/strays.ts:176-196`
  - `drift/known-strays.ts:54-84`
  - `commands/shared/native-skill-disposition.ts:31-58,87-115`
  - `commands/status/index.ts:1333-1341,1432-1450`
  - `commands/shared/adopt-stray.ts:139-148`
  - `config/sync-config.ts:203-220`
  - `.oat/repo/reference/decisions/DR-260718-require-an-explicit-decision.md:17`
  - Observed: a hand-added `knownStrays` entry silenced the stray.
- **Contradictions:**
  - `commands/config/index.ts:1134,1170`
  - `apps/oat-docs/docs/reference/configuration.md:27,47,896`
  - `apps/oat-docs/docs/provider-sync/manifest-and-drift.md:48,52-53`
  - `apps/oat-docs/docs/provider-sync/config.md:113-116`
  - Observed: `providers set --enabled github` gave "Unknown providers"; `providers inspect claude` printed `Default strategy: symlink`.
