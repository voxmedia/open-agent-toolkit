# F: Foundational setup choices

**Terms.** A _tool pack_ is a bundle of OAT skills, agents, templates and scripts that installs as one unit. _Scope_ means where something is installed or stored. _Project_ scope is inside this repository. _User_ scope is your home directory (`~/.agents/`, `~/.oat/`), so it applies to every repository on your machine.

---

## 1. Where a setting lives

**The choice:** which file `oat config set <key> <value>` writes. `--shared` writes `.oat/config.json`, `--local` writes `.oat/config.local.json`, and `--user` writes `~/.oat/config.json`.

| Option     | Choose it when                                              | You give up                                               | In practice                                                                                                                                                                |
| ---------- | ----------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--shared` | The team should behave the same way in this repo            | Personal flexibility                                      | The file is committed. It is the only place layout keys can go: `projects.root`, `worktrees.root`, `git.*`, `documentation.*`, `instructions.*`, `archive.*` and `tools.*` |
| `--local`  | You want to override something for yourself in one checkout | Nobody else sees the value                                | The file is gitignored by `oat init`. It is the only place `activeProject` and `lastPausedProject` can go                                                                  |
| `--user`   | The value is about how you work, in any repo                | Any repo that sets the key in shared config overrides you | Stored in your home directory. It is the only place `updateNotifications` can go                                                                                           |

Precedence: environment variable > local > shared > user > built-in default. Your user value therefore loses to the team's shared value. Use `--local` to override the team for yourself.

**Default:** with no flag, `workflow.*`, state keys and `explainers.defaults.*` go to local, `updateNotifications` goes to user, and everything else goes to shared.

**Why:** DR-260410 sets the rule: a preference that depends on other repo settings goes in shared config, and a purely personal one goes in user config. DR-260222 moved per-developer lifecycle state into local config so that it stays correct across worktrees. A code comment says `activeIdea` cannot be shared because "an idea pointer is not a team decision". _Likely rationale (inferred):_ layout keys are shared-only because every teammate must agree on them.

**Which should I pick**

- If you are trying OAT alone, use no flag.
- If you are rolling OAT out to a team, set policy keys with `--shared` and commit them.
- If you want a preference in every repo, use `--user`, but only for keys listed as personal in "Choosing the right surface".

**Evidence**

- packages/cli/src/config/resolve.ts:156-160, :199-228
- packages/cli/src/config/oat-config.ts:1449, :1453, :2446-2447
- packages/cli/src/commands/config/index.ts:1483-1494, :1501-1507, :1534-1539, :1543-1563, :1577-1592
- packages/cli/src/commands/init/gitignore.ts:17-18; packages/cli/src/commands/init/index.ts:1044-1046
- .oat/repo/reference/decisions/DR-260410-add-workflow-preference-keys.md (Decisions 3-4); DR-260222-adopt-config-local-lifecycle.md

---

## 2. Which tool packs

**The choice:** which packs to tick in `oat tools install`, or which to name in `oat tools install <pack>`. The packs are `core`, `ideas`, `docs`, `workflows`, `utility`, `project-management`, `research` and `brainstorm`. "Bundled packs at a glance" on the Tool Packs page lists what each contains.

| Pack                             | Choose it when                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `core`                           | Always. It provides `oat-doctor` and `oat-docs`                                                                                            |
| `workflows`                      | You will run OAT projects                                                                                                                  |
| `docs`                           | You maintain a docs site or `AGENTS.md` files                                                                                              |
| `research`                       | You want recon or analysis skills. It also installs the `utility` dispatch skills it needs                                                 |
| `utility`, `ideas`, `brainstorm` | You want review helpers, idea capture, or brainstorming                                                                                    |
| `project-management`             | The repo will track its backlog and decisions in OAT. Installing the pack does not adopt project management: run `oat pjm init` separately |

**Default:** the interactive picker pre-selects every pack except `project-management`. Non-interactive runs install all eight.

**Why:** no reason is recorded. _Likely rationale (inferred):_ `project-management` needs a separate repository decision (DR-260529).

**Which should I pick**

- If you are trying OAT alone, accept the pre-selected packs.
- If your team tracks work in the repo, also select `project-management` and run `oat pjm init` once.

**Evidence**

- packages/cli/src/commands/tools/shared/pack-manifest.ts:24-33, :169-353
- packages/cli/src/commands/init/tools/index.ts:511-555, :1186-1204
- .oat/repo/reference/decisions/DR-260529-split-project-management-pack.md

---

## 3. Pack install scope

**The choice:** `oat tools install [<pack>] --scope project|user`, or the interactive per-pack selector (project / user / both).

| Option  | Choose it when                                | You give up                                                                      | In practice                                                                                                                                                                                                            |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user    | You want the skills in every repo you work in | Teammates do not get them from the repo                                          | Files go to `~/.agents/` and `~/.oat/`, and the install is recorded in `~/.oat/config.json`. No repository writes. `oat tools update` refreshes templates                                                              |
| project | The team needs identical tooling              | Update churn lands in the repo, and the skills are missing from your other repos | Files go to the repo's `.agents/` and `.oat/`, and the install is recorded in `.oat/config.json`. Templates are written once and then belong to you: updates never overwrite them, and they take priority for everyone |
| both    | Rarely                                        | Duplicate copies. OAT does not decide which copy your agent tool loads           | `oat doctor` warns `duplicate-scope` and exits 1                                                                                                                                                                       |

**Default:** user scope on a fresh install. An existing install keeps its scope. `core` only allows user scope.

**Why:** DR-260827 says user scope suits personal reuse and avoids "routine managed-copy churn" in repositories, while project scope stays available for team reproducibility. DR-260502 gives the same cross-directory reason for `brainstorm`.

**Update and remove behavior that affects the choice:** installing never removes anything (DR-260620). `--scope project` on a pack that is already at user scope leaves it at both scopes, so use `oat tools migrate --pack <p> --from user --to project` instead. `oat tools remove` keeps your project templates.

**Which should I pick**

- If you are trying OAT alone in one repo, or want personal skills across all your repos, use user.
- If you are rolling OAT out to a team, use `--scope project` and commit. If you already have user copies, migrate them rather than installing a second time.

**Evidence**

- pack-manifest.ts:41-44, :170-172, :263-266
- packages/cli/src/commands/init/tools/shared/skill-manifest.ts:33-39; init/tools/index.ts:666-676, :729-744
- packages/cli/src/commands/tools/shared/scoped-pack-intent.ts:225-242
- packages/cli/src/commands/doctor/index.ts:998-1008, :1077-1086, :1564-1566
- .oat/repo/reference/decisions/DR-260827-user-default-with-project.md; DR-260502-generalize-pack-default-scope.md; DR-260620-make-oat-tools-install.md; DR-260927-templates-resolve-repository.md

---

## 4. Docs framework

> **The code here is changing.** This section describes branch HEAD `f337faa17`. A merge of `origin/main` into this worktree is in progress, and the nav-sync code and `commands.md` are in conflict. On `origin/main` (#336), `oat docs nav sync` has no `--framework` flag and detects the framework itself (`mkdocs.yml`, then `source.config.*`, then `documentation.tooling`). The Fumadocs hooks there no longer run nav sync, and `meta.json` is committed. Re-check the navigation details below after the merge.

**The choice:** `oat docs init --framework fumadocs|mkdocs`, or the same question in the `oat-docs-bootstrap` skill.

| Option   | Choose it when                                                 | You give up                                                                                                                                                      | In practice                                                                                                                                                                                 |
| -------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fumadocs | The repo uses Node/pnpm, or you want the guided bootstrap path | Stricter navigation: every page needs a frontmatter `title`, only `.md` files are allowed, and every page must be listed exactly once in a `## Contents` section | Generates a Next.js app that depends on the OAT CLI. `predev`/`prebuild` regenerate the gitignored `docs/**/meta.json` files, the `.oat-fumadocs-nav.json` sidecar, and an agent `index.md` |
| MkDocs   | The team uses Python or MkDocs Material                        | The bootstrap skill covers only a reduced feature set, and navigation is not regenerated automatically                                                           | Generates `mkdocs.yml`, `requirements.txt` and `setup-docs.sh` (pip). `oat docs nav sync` rewrites the whole `nav:` block of the committed `mkdocs.yml`, and you run it yourself            |

**Default:** `fumadocs` when non-interactive or with `--yes`. The interactive prompt lists it first.

**Why:** no decision record. _Likely rationale (inferred):_ the bootstrap skill calls Fumadocs the "primary" and "full" path, and MkDocs the "lean" path.

**Navigation gotcha (at HEAD):** `nav sync --framework` defaults to `mkdocs` and ignores `documentation.tooling`.

**Which should I pick**

- If you are adding docs to a new repo, choose Fumadocs.
- If the repo already has an MkDocs site, skip `oat docs init`, which replaces the docs config. Record the site through `oat init --setup`, which detects `mkdocs.yml`, then run `oat docs nav sync --check` before letting nav sync overwrite your `nav:`. To move to Fumadocs, preview `oat docs migrate` first.

**Evidence**

- packages/cli/src/commands/docs/init/resolve-options.ts:60-61, :182-190
- packages/cli/src/commands/docs/init/scaffold.ts:29-82, :258-262, :423-441; docs/init/index.ts:260-285
- .oat/templates/docs-app-fuma/package.json.template:8-10, :29; docs-app-fuma/.gitignore; .oat/templates/docs-app-mkdocs/package.json.template:8-10; setup-docs.sh:17
- packages/cli/src/commands/docs/nav/sync.ts:83-108, :171-174 (HEAD); nav/fumadocs.ts:49, :78, :152, :173, :182; nav/ownership.ts:64; nav/contents.ts:46, :174
- packages/cli/src/commands/init/detect-docs.ts:26-33
- .agents/skills/oat-docs-bootstrap/SKILL.md:26, :205
- `git show origin/main:packages/cli/src/commands/docs/nav/sync.ts` (options at :372-383); `origin/main:.oat/templates/docs-app-fuma/package.json.template:8-10`

---

## 5. `oat init` options

| Option                             | Choose it when                                                                     | In practice                                                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--scope project` / `user` / `all` | You want to set up only the repo (`project`) or only your home directory (`user`)  | `project` creates `.agents/{skills,agents,rules}` and adds managed blocks to `.gitignore` and `.gitattributes`. `user` creates `~/.agents/skills`      |
| `--setup`                          | You want one guided pass through packs, local paths, docs config and provider sync | May write `git.defaultBranch` and `documentation.*` to `.oat/config.json`                                                                              |
| `--hook` / `--no-hook`             | You want a warning when agent-tool files drift out of date                         | The hook only warns and never blocks a commit. It goes in Git's active hooks folder (per clone unless `core.hooksPath` is set). `--no-hook` removes it |
| `--project-guidance`               | Agents should be told which packs are installed                                    | Creates `AGENTS.md`, adds a section to it, or prints a patch                                                                                           |

**Defaults:** `--scope all`. Guided setup is offered only on a fresh interactive init. The hook is a prompt when interactive and skipped when not. Project guidance is never written without opt-in, and the prompt defaults to no. _Likely rationale (inferred):_ every write outside OAT's own files is opt-in.

**Which should I pick**

- If you are trying OAT alone, run `oat init` interactively and accept guided setup.
- If you are rolling OAT out to a team, run `oat init --scope project --setup --project-guidance` and commit. Each developer adds `--hook` on their own clone.

**Evidence**

- packages/cli/src/commands/shared/scope-option.ts:22-30; shared/shared.utils.ts:9-14
- init/index.ts:142, :318-326, :545-608, :774-830, :1044-1046, :1302-1347, :1390-1393
- packages/cli/src/engine/hook.ts:43-52, :108-130; init/tools/project-guidance.ts:240-261

---

## (a) Proposed home

- §1: reference/configuration.md, a new section after "The five config surfaces" that links to "Choosing the right surface".
- §2 and §3: getting-started/tool-packs.md, after "Bundled packs at a glance".
- §4: docs-tooling/add-docs-to-a-repo.md, at the start of "3. Scaffold the docs app". Write it after the nav-sync merge settles.
- §5: getting-started/bootstrap.md, after the `oat init` key-behavior list and before "Guided setup".

## (b) Docs that contradict the code

1. docs-tooling/commands.md:195 (HEAD): the example `oat docs nav sync --target-dir apps/oat-docs` omits `--framework fumadocs`. I ran it with `--check` and it failed with `ENOENT .../apps/oat-docs/mkdocs.yml`, exit 1. The merge may resolve this.
2. commands.md:50: lists only the `tooling`, `root` and `index` keys. MkDocs also sets `documentation.config` (scaffold.ts:436-440).
3. oat-docs-bootstrap SKILL.md:996: says `setup-docs.sh` "creates a venv". The script only runs `pip install` (setup-docs.sh:17).
4. SKILL.md:825: says the MkDocs `documentation.index` is `docs/index.md`. The scaffold sets it to `mkdocs.yml` (scaffold.ts:439), and SKILL.md:912 agrees with the scaffold.
5. SKILL.md:827 and :908: treat `documentation.tooling` as an object with framework, lint and format fields. In the code it is a string (oat-config.ts:79; scaffold.ts:430, :437).
6. The config catalog (config/index.ts:653-662) lists `tools.<pack>` as `.oat/config.json` only. User installs write `~/.oat/config.json` (scoped-pack-intent.ts:236-242).
7. reference/configuration.md:54 and config-and-local-state.md:126: say `oat config set` writes "shared or repo-local" keys. It also writes with `--user` (config/index.ts:1501-1507, :1543-1552).

## (c) Could not verify

- How docs navigation behaves after the merge (the `--framework` flag, generated versus committed sidebar files, the template scripts). The merge was unresolved when I checked.
- Why `project-management` is unselected in the interactive picker but installed non-interactively.
- A recorded reason for Fumadocs being the default.
- Whether OAT recommends committing project-scope `.agents/` and provider views. The init `.gitignore` block does not ignore them (gitignore.ts:17-25), but I found no guidance.
- Which copy an agent tool loads when a pack is installed at both scopes. OAT deliberately does not decide this (tool-packs.md:410-416).
