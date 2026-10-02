# F: Foundational setup choices (FINAL)

> **Status.** One agent drafted this. A second agent verified it independently (verdict: ACCEPT WITH CHANGES), and all blocking and should-fix corrections have been applied.
> It was verified by reading two committed revisions: B = `a080dfbef` (this branch) and M = `origin/main` (`1fd10d9ce`). The CLI was not run against either revision.
> Section 4 describes origin/main behavior. Re-confirm it once the in-progress merge lands.

**Terms used below:**

- A **tool pack** is a bundle of OAT skills, agents, templates and scripts that installs as one unit.
- **Scope** is where something lives. _Project_ scope is inside this repository. _User_ scope is your home directory (`~/.agents/`, `~/.oat/`), so it applies to every repo on your machine.
- A **provider view** is the per-agent-tool copy (for Claude Code, Cursor, Codex) that OAT generates from `.agents/`.

---

## 1. Where a setting lives

**The choice:** which file `oat config set <key> <value>` writes. There are three config layers:

- **shared** (`--shared`): `.oat/config.json`, committed for the whole team.
- **local** (`--local`): `.oat/config.local.json`, for this checkout only.
- **user** (`--user`): `~/.oat/config.json`, for you across all repos.

| Option     | Choose it when                                              | You give up                                               | In practice                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ----------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--shared` | The team should behave the same in this repo                | Personal flexibility                                      | Committed. It is the only place `oat config set` writes **structural keys** (repo-wide path and policy settings): `projects.root`, `projects.defaultScope`, `worktrees.root`, `git.defaultBranch`, `documentation.{root,tooling,config,excludes,requireForProjectCompletion}`, `instructions.*`, `archive.*`, `tools.*`, plus `pjm.remote.*`. (`oat tools install --scope user` still records `tools.<pack>` in `~/.oat/config.json`.) |
| `--local`  | You want to override something for yourself in one checkout | Nobody else sees it                                       | Gitignored by `oat init`. It is the only place for `activeProject` and `lastPausedProject` (which OAT project you have open in this checkout)                                                                                                                                                                                                                                                                                          |
| `--user`   | The value is about how you work, in any repo                | Any repo that sets the key in shared config wins over you | Lives in your home directory only. It is the only place for `updateNotifications`                                                                                                                                                                                                                                                                                                                                                      |

Precedence is environment variable > local > shared > user > built-in default. Your user value loses to the team's shared value, so use `--local` to override the team for yourself. Only three keys have environment overrides: `projects.root` (`OAT_PROJECTS_ROOT`), `projects.defaultScope` (`OAT_PROJECTS_DEFAULT_SCOPE`) and `worktrees.root` (`OAT_WORKTREES_ROOT`).

**Default:** with no flag:

- `workflow.*`, `activeIdea`, `activeProject`, `lastPausedProject` and `explainers.defaults.*` go to local.
- `updateNotifications` goes to user.
- Everything else goes to shared.

**Why:**

- DR-260410: a preference whose correctness depends on other repo settings belongs in shared config, and a purely personal one belongs in user config.
- DR-260222: per-developer lifecycle state moved to local config so it stays correct across worktrees.
- A code comment: `activeIdea` is never shared because "an idea pointer is not a team decision".
- _Likely rationale (inferred):_ structural keys are shared-only because every teammate must agree on them.

**Which should I pick**

- If you are trying OAT alone, use no flag.
- If you are rolling OAT out to a team, set policy keys with `--shared` and commit them.
- If you want a preference to follow you across all your repos, use `--user`. Only do this for keys listed as personal in "Choosing the right surface".

**Evidence**

- B:packages/cli/src/config/resolve.ts:156-160, :199-228
- B:packages/cli/src/config/oat-config.ts:1449, :1453, :2446-2447
- B:packages/cli/src/commands/config/index.ts:1483-1494, :1501-1517, :1534-1539, :1543-1572, :1577-1592
- B:packages/cli/src/commands/tools/shared/scoped-pack-intent.ts:223-243
- B:packages/cli/src/commands/init/gitignore.ts:17-18
- B:packages/cli/src/commands/init/index.ts:1044-1046
- B:.oat/repo/reference/decisions/DR-260410-add-workflow-preference-keys.md (Decisions 3-4)
- B:.oat/repo/reference/decisions/DR-260222-adopt-config-local-lifecycle.md

---

## 2. Which tool packs

**The choice:** which packs to tick in `oat tools install`, or name in `oat tools install <pack>`. "Bundled packs at a glance" (Tool Packs page) lists their contents.

| Pack                  | Choose it when                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`                | Always. It gives you `oat-doctor` and `oat-docs`                                                                                            |
| `workflows`           | You will run OAT projects (discovery → plan → implement → review)                                                                           |
| `docs`                | You maintain a docs site or `AGENTS.md` files                                                                                               |
| `utility`             | You want review, dispatch/orchestration, explainer and repo-improve helpers                                                                 |
| `research`            | You want recon/analysis skills. It also installs the two dispatch skills it needs from `utility`                                            |
| `ideas`, `brainstorm` | You want idea capture or brainstorming                                                                                                      |
| `project-management`  | The repo will keep its backlog, roadmap and decision records in `.oat/repo/`. Installing does not adopt this: run `oat pjm init` separately |

**Default:** the interactive picker ticks every pack except `project-management`. Non-interactive runs install all eight.

**Why:** no recorded reason. _Likely rationale (inferred):_ adopting project management is a separate repository decision (DR-260529, DR-260827-repository-owned-pjm-adoption). Non-interactive runs installing the pack anyway weakens this inference.

**Which should I pick**

- If you are trying OAT alone, accept the ticked set.
- If your team tracks work in the repo, also tick `project-management` and run `oat pjm init` once.

**Evidence**

- M:packages/cli/src/commands/tools/shared/pack-manifest.ts:24-33, :163-300
- B:packages/cli/src/commands/init/tools/index.ts:511-555, :1186-1204, :2028-2030
- B:packages/cli/src/commands/tools/shared/pack-dependencies.ts:43-56
- B:.oat/repo/reference/decisions/DR-260529-split-project-management-pack.md
- B:.oat/repo/reference/decisions/DR-260827-repository-owned-pjm-adoption.md

---

## 3. Pack install scope

**The choice:** set it with `oat tools install [<pack>] --scope project|user`, or with the interactive per-pack selector (project / user / both).

| Option  | Choose it when                            | You give up                                                                       | In practice                                                                                                                                                                                                                                                                                                                                                                                       |
| ------- | ----------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user    | You want the skills in every repo you use | Teammates don't get them from the repo                                            | Files go to `~/.agents/` and `~/.oat/`. The install is recorded in `~/.oat/config.json`. Nothing is written to the repository unless you accept the AGENTS.md guidance prompt. Provider views in your home directory are refreshed automatically. `oat tools update` refreshes templates                                                                                                          |
| project | The team needs identical tooling          | Update churn lands in the repo, and the skills are absent from your other repos   | Files go to the repo's `.agents/` and `.oat/`, and the install is recorded in `.oat/config.json`. Templates are written once, then belong to you: updates and `oat tools remove` never touch them. From 0.3.11 (DR-260927-templates-resolve-repository) they also take priority over user and bundled templates for everyone. Before that release, `oat project new` checked user templates first |
| both    | Rarely                                    | You have duplicate copies, and OAT doesn't decide which one your agent tool loads | `oat doctor` reports a `duplicate-scope` warning and exits 1. Doctor suggests migrating to user scope. For a team repo, migrate the other way (`--from user --to project`)                                                                                                                                                                                                                        |

**Default:** a fresh install goes to user scope, and an existing install keeps its scope. `core` only allows user scope, so `--scope project` still installs `core` in your home directory.

**Why:**

- DR-260827-user-default-with-project: user scope suits personal reuse and avoids "routine managed-copy churn" in repositories, while project scope remains for team reproducibility.
- DR-260502: `brainstorm` defaults to user scope for the same cross-directory reason.

**Update and remove behavior:**

- Installing never removes anything (DR-260620).
- `--scope project` on a pack already at user scope leaves it at both scopes. Use `oat tools migrate --pack <p> --from user --to project` instead.

**Which should I pick**

- If you are trying OAT alone, or want personal skills across all your repos, use user scope.
- If you are rolling OAT out to a team, use `--scope project` and commit. Migrate any existing user copies rather than installing them a second time.

**Evidence**

- M:packages/cli/src/commands/tools/shared/pack-manifest.ts:41-44, :163-300
- B:packages/cli/src/commands/init/tools/index.ts:629-632, :666-676, :713-744, :1903, :2048-2052
- B:packages/cli/src/commands/tools/install/index.ts:28-41
- B:packages/cli/src/commands/tools/shared/pack-reconcile.ts:170-178
- B:packages/cli/src/commands/tools/remove/remove-tools.ts:465-476
- B:packages/cli/src/commands/tools/migrate/index.ts:327-344
- B:packages/cli/src/commands/doctor/index.ts:998-1008, :1077-1086, :1564-1566
- B:packages/cli/src/commands/project/new/scaffold.ts:452-460
- M:packages/cli/src/commands/shared/template-source.ts:53-104
- DR-260827-user-default-with-project, DR-260502-generalize-pack-default-scope, DR-260620-make-oat-tools-install, DR-260927-templates-resolve-repository

---

## 4. Docs framework (origin/main behavior)

**The choice:** `oat docs init --framework markdown|fumadocs|mkdocs`, or the same question asked by the `oat-docs-bootstrap` skill.

| Option                      | Choose it when                                                                | You give up                                                                                                                      | In practice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain Markdown (`markdown`) | Agents and humans read the docs in the repo, and you don't need a hosted site | A rendered site and search                                                                                                       | Creates only `index.md` and `contributing.md` in a dedicated directory (default `docs/`, never the repo root). Records `documentation.tooling: "markdown"`, `root`, and `index: <root>/index.md`. No app, dependencies, root `package.json` patch or build. A directory that already has files needs `--adopt` (even with `--yes`), which adds only missing baseline files. `--dry-run` previews. Navigation is the `## Contents` list in each `index.md`, which you maintain by hand, and `oat docs nav sync` does not apply |
| Fumadocs (`fumadocs`)       | A Node/pnpm repo wants a hosted docs site                                     | Strict navigation: a page not listed in its folder's `index.md` `## Contents` is hidden from the sidebar                         | Scaffolds a Next.js app (empty target directory required) that depends on the OAT CLI and `@open-agent-toolkit/docs-*` packages. `predev`/`prebuild` run `fumadocs-mdx` and `oat docs generate-index` (the app-root `index.md` agent manifest). The sidebar `meta.json` files are **committed** and written only when you run `oat docs nav sync` after adding, moving or renaming pages. Add `oat docs nav sync --check` to your build or CI yourself, because the scaffold doesn't. Pages may be `.md` or `.mdx`            |
| MkDocs (`mkdocs`)           | The team uses Python / MkDocs Material                                        | Python setup (`setup-docs.sh` runs `pip install -r requirements.txt`). The bootstrap skill covers a reduced ("lean") feature set | Scaffolds `mkdocs.yml`, `requirements.txt`, `setup-docs.sh` and a `package.json` with `docs:*` scripts. Records `documentation.config` and `documentation.index` as `mkdocs.yml`. `oat docs nav sync` rewrites the whole `nav:` block of the committed `mkdocs.yml` from the `## Contents` lists. You run it yourself, and `--check` reports drift without writing                                                                                                                                                            |

`oat docs nav sync` works out the framework itself: it looks for `mkdocs.yml`, then `source.config.*`, then `documentation.tooling`.

Whichever you choose, `oat docs init` creates or updates a `## Documentation` section in root `AGENTS.md` without asking. That section is a managed block, meaning OAT owns the text between marker comments. In a monorepo, Fumadocs and MkDocs also patch the root `package.json` `build` script and add `build:docs`. Opt out with `--no-root-patch`. If docs config already exists, Fumadocs and MkDocs warn and ask before replacing it (non-interactive runs need `--yes`). Markdown refuses an incompatible existing config instead.

**Default:** `fumadocs` when non-interactive or with `--yes`. The interactive prompt lists Fumadocs, MkDocs, then Plain Markdown.

**Why:** no decision record explains the Fumadocs default. _Likely rationale (inferred):_ the bootstrap skill calls Fumadocs the "full" path and MkDocs the "lean" (reduced) path. DR-261001-explicit-markdown-roots records why Markdown exists: a docs option "without a site application".

**Which should I pick**

- If you don't need a hosted site, choose plain Markdown.
- If you want a site in a Node/pnpm repo, choose Fumadocs, and commit the `meta.json` files that `oat docs nav sync` writes.
- If you want a site and your team uses Python/MkDocs Material, choose MkDocs.
- If the repo already has plain Markdown docs, run `oat docs init --framework markdown --target-dir <dir> --adopt --dry-run`, then run it again without `--dry-run`.
- If the repo already has an MkDocs site, don't run `oat docs init`: it needs an empty target and replaces the docs config. Record the site with `oat init --setup`, which detects `mkdocs.yml`. Then run `oat docs nav sync --check` before letting nav sync overwrite your `nav:`. The check fails until every folder has an `index.md` with a `## Contents` list. To move to Fumadocs, run `oat docs migrate`, which only previews unless you pass `--apply`.

**Evidence**

- M:packages/cli/src/commands/docs/init/resolve-options.ts:61-65, :151-154, :186-237
- M:packages/cli/src/commands/docs/init/index.ts:172-247, :249-269, :385-428, :467-480, :620-672
- M:packages/cli/src/commands/docs/init/markdown.ts:24-68, :126-145, :303-380
- M:packages/cli/src/commands/docs/init/scaffold.ts:418-453
- M:packages/cli/src/commands/docs/nav/sync.ts:98-117, :170-213, :366-385
- M:packages/cli/src/commands/docs/nav/fumadocs.ts:47
- M:.oat/templates/docs-app-fuma/package.json.template:8-10
- M:.oat/templates/docs-app-fuma/.gitignore
- M:.oat/templates/docs-app-mkdocs/package.json.template:7-14
- M:.oat/templates/docs-app-mkdocs/setup-docs.sh:17
- M:packages/cli/src/commands/docs/migrate/index.ts:213
- B:packages/cli/src/commands/init/detect-docs.ts:26-33
- M:.agents/skills/oat-docs-bootstrap/SKILL.md:26
- M:.oat/repo/reference/decisions/DR-261001-fumadocs-navigation-is-strict.md, DR-261001-explicit-markdown-roots.md, DR-261001-additive-markdown-adoption.md

---

## 5. `oat init` options

**Guided setup** is an optional step-by-step pass after `oat init` that covers packs, local paths, docs config and provider sync.

| Option                             | Choose it when                                                                       | In practice                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scope project` / `user` / `all` | `project` sets up only this repo. `user` sets up only your home directory            | `project` creates `.agents/{skills,agents,rules}` and adds managed blocks to `.gitignore` and `.gitattributes`. `user` creates `~/.agents/skills`. This does **not** set where guided setup installs packs                                                                                |
| `--setup`                          | You want guided setup                                                                | Installs packs, at user scope unless you customize each one. Adds the gitignored local paths you pick (stored in `.oat/config.json`). Writes `git.defaultBranch` if it is unset. Can record an existing docs site in `documentation.*` (it does not scaffold one). Offers a provider sync |
| `--hook` / `--no-hook`             | You want a commit-time warning when provider views drift out of date with `.agents/` | The hook only warns and never blocks a commit. It goes in Git's active hooks folder (`.git/hooks`, per clone, unless the Git setting `core.hooksPath` points elsewhere). `--no-hook` removes it                                                                                           |
| `--project-guidance`               | Agents should be told which packs are installed                                      | Creates `AGENTS.md`, appends a managed section to it, or prints a patch                                                                                                                                                                                                                   |

**Defaults:**

- `--scope all`.
- Guided setup is offered only when interactive `oat init` runs in a repo with no `.oat/` directory yet. The prompt defaults to No, so answer yes or pass `--setup`.
- The hook is asked about only when interactive, and the answer defaults to No.
- Project guidance is never written without opt-in.

_Likely rationale (inferred):_ every write outside OAT's own files is opt-in.

**Which should I pick**

- If you are trying OAT alone, run `oat init` interactively and answer yes to guided setup.
- If you are rolling OAT out to a team, run `oat init --scope project --project-guidance`, then `oat tools install --scope project`, and commit `.agents/`, `.oat/` and `AGENTS.md`. If you use `--setup` instead, answer **Yes, customize each pack** at the per-pack scope prompt and choose project for each pack, because otherwise guided setup installs at user scope. Each developer adds `--hook` on their own clone.

**Evidence**

- B:packages/cli/src/commands/shared/scope-option.ts:22-30
- B:packages/cli/src/commands/shared/shared.utils.ts:9-14
- B:packages/cli/src/commands/shared/shared.prompts.ts:33-38
- B:packages/cli/src/commands/init/index.ts:142, :318-326, :545-608, :761-775, :802-833, :891-914, :1044-1046, :1302-1347, :1390-1393
- B:packages/cli/src/commands/init/tools/index.ts:580-611, :651-664
- B:packages/cli/src/commands/local/manage.ts:45
- B:packages/cli/src/engine/hook.ts:43-52, :108-130
- B:packages/cli/src/commands/init/tools/project-guidance.ts:240-261

---

## (a) Proposed home

These are paths in this branch's tree. Re-check every one after the merge, because origin/main moves the config and tool-pack pages under `cli-utilities/` and renames add-docs §3.

- **§1:** reference/configuration.md, a new section after "The five config surfaces" that links to "Choosing the right surface". Add a one-line pointer in reference/config-and-local-state.md under "`oat config ...`".
- **§2 and §3:** getting-started/tool-packs.md, after "Bundled packs at a glance".
- **§4:** docs-tooling/add-docs-to-a-repo.md, at the start of §3 (on M: "3. Set up the documentation surface", next to "Plain Markdown: fresh setup or additive adoption"). Put the nav-maintenance summary in docs-tooling/commands.md under "Which Generation Command To Run".
- **§5:** getting-started/bootstrap.md, after the `oat init` key-behavior list and before "Guided setup".

## (b) Docs that contradict the code

1. M:apps/oat-docs/docs/docs-tooling/commands.md:52 lists only `tooling`, `root` and `index` for `oat docs init`. MkDocs also sets `documentation.config` (M:packages/cli/src/commands/docs/init/scaffold.ts:445-450).
2. M:.agents/skills/oat-docs-bootstrap/SKILL.md:1008 says `setup-docs.sh` "creates a venv". It only runs `pip install` (M:.oat/templates/docs-app-mkdocs/setup-docs.sh:17).
3. M:SKILL.md:841 says the MkDocs `documentation.index` is `docs/index.md`. The scaffold sets `mkdocs.yml` (M:scaffold.ts:449), and the skill contradicts itself at M:SKILL.md:928.
4. M:SKILL.md:843-844 and :924 treat `documentation.tooling` as an object with framework, lint and format fields. It is a string (M:packages/cli/src/config/oat-config.ts:79).
5. The config catalog (B and M: packages/cli/src/commands/config/index.ts:653-662, unchanged) lists `tools.<pack>` as `.oat/config.json` only. User-scope installs record it in `~/.oat/config.json` (B:packages/cli/src/commands/tools/shared/scoped-pack-intent.ts:223-243). `tools.core` is the worst case: it is listed as shared, but `core` is user-only.
6. M:apps/oat-docs/docs/cli-utilities/configuration.md:54 and M:cli-utilities/config-and-local-state.md:126 (branch: reference/configuration.md:54, reference/config-and-local-state.md:126) say `oat config set` writes "shared or repo-local" keys. `--user` exists and is the default for `updateNotifications` (B:packages/cli/src/commands/config/index.ts:1501-1507, :1615-1628).

Merge note: the branch's docs-tooling/commands.md:33 says nav sync runs before `fumadocs-mdx` in `predev`. That conflicts with M, where the hooks never write `meta.json`. Let M's wording win.

## (c) Could not verify

- Section 4 against the merged tree. It is described from origin/main, and the working tree was mid-merge.
- How Fumadocs renders the sidebar before any `meta.json` exists.
- Which copy an agent tool loads when a pack is at both scopes. OAT deliberately does not decide this.
- Any recorded reason for the Fumadocs default, or for `project-management` being unticked in the interactive picker.
- Whether OAT recommends committing project-scope provider views. The init `.gitignore` block does not ignore them (B:packages/cli/src/commands/init/gitignore.ts:17-25), but I found no guidance.
