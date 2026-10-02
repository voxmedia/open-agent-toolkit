> **Status:** One agent drafted this. A second agent verified it independently and returned **ACCEPT WITH CHANGES**, with 3 blocking findings. All corrections are applied.
> **How claims were checked:** Some claims were reproduced with a scratch copy of CLI 0.3.14 in a throwaway repo: the unadopted exit codes, the `pjm init` config wipe, `config set` accepting and rejecting values, a hand-edited `shared` being accepted, and the `--help` output. Everything else comes from reading code.
> **No live tracker was contacted.** The replace-mode update gap and the binding-location behaviour come from reading code only.

# Choosing PJM and remote-planning configuration

**Terms.**

- **PJM** (project management) is OAT's planning records kept as files under `.oat/repo/`: backlog, decisions, roadmap and current state.
- A **binding** links one local item to one GitHub, Linear or Jira issue.
  - **Intake** creates a binding by importing an existing issue as a backlog item.
  - **Publish** creates an issue from a local item, or updates an issue it is already bound to.
- **Reconcile** compares each field's local, remote and last-agreed value, then proposes which side should change.
- **Closeout** is the end-of-project step. It can propose a comment or a status change on bound issues.
- A **host agent** is the coding agent that actually talks to the tracker.
  - **Capability evidence** is its short statement of which tracker connection it can use now.
  - **Authority evidence** is its record of what the user or the running workflow authorized for this exact write.
- A **preview** is a saved copy of exactly what a write would send, identified by a content hash (**digest**).
- **Snapshots and journals** are OAT's copy of the last-read issue and its log of remote operations.

## 1. Adopt PJM in this repository?

**The choice:** `oat pjm init`, which writes `pjm.initialized: true` to `.oat/config.json`.

| Option      | Choose it when                                                | You give up                                                                                                        | In practice                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Not adopted | Planning lives outside the repo                               | Backlog, decision and remote features                                                                              | `oat backlog` and `oat decision` writes exit 1. Every `oat pjm remote` command, reads included, exits 2. Each one points you to `oat pjm init`                                                         |
| Adopted     | You want planning reviewed with the code, or tracker bindings | Planning is meant to be committed (OAT's `.gitignore` does not exclude it), so anyone with repo access can read it | Creates the `.oat/repo/` scaffold (backlog, roadmap, current state, decisions, and AGENTS/README guides), skipping existing files. Adds guidance blocks to the root `AGENTS.md`, creating it if needed |

**Default:** not adopted, and installing the `project-management` pack does not adopt PJM. Exception: a repo that already has the full `.oat/repo` scaffold counts as adopted (`inferred-legacy`). A repo with only part of the scaffold is refused until you run `oat pjm init`.
**Why:** repository state "must never be created merely because that capability is installed globally" (DR-260827).

> **Warning:** rerunning `oat pjm init` or `oat pjm migrate --apply` deletes `pjm.remote` from `.oat/config.json`. Every remote setting silently returns to its default. Afterwards, check `git diff .oat/config.json` and restore the settings with `oat config set`.

**Which should I pick:**

- With no tracker, or when planning must stay out of third-party tools, adopt and use the backlog.
- Adopt even if you only read tracker issues, because remote commands require it.

## 2. Keep an item local, or bind it?

**The choice:** this is decided per item, with `oat pjm remote intake <ref> --to-backlog <id>` or `oat pjm remote publish --provider <p> --to-backlog <id>` (or `--to-project`). Both need capability evidence on stdin. In practice you ask an agent to run them through the `oat-pjm-remote` skill; they do not work as plain shell commands.

| Option     | Choose it when                    | You give up                                                    | In practice                                                                                                                                    |
| ---------- | --------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| No binding | The item matters only in the repo | Tracker visibility                                             | No provider is contacted                                                                                                                       |
| Intake     | The tracker owns the issue        | Local edits to title, description and priority never flow back | Those fields flow inbound only. At closeout, OAT can still propose a comment or a status change if `annotate` or `transition` authority allows |
| Publish    | The item starts locally           | Needs write authority (§4)                                     | Title, priority and description (§3) flow both ways. Reconcile picks a direction per field                                                     |

**Default:** no binding. OAT writes to a tracker only when an agent runs a command, either on request or as a workflow step.
**Why:** local artifacts stay authoritative so that "offline project work remains complete" (DR-260907).

**Which should I pick:** For open source on GitHub, intake reported issues and publish only work that maintainers start. A Linear or Jira team should intake the tickets agents work on.

## 3. How much description is sent?

**The choice:** `pjm.remote.policy.description`.

| Option            | Choose it when                            | You give up                   | In practice                                                                                                                                                                 |
| ----------------- | ----------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`            | The body is sensitive                     | No body from OAT              | The body is never sent or compared. `intake` still copies the issue body into the new backlog item                                                                          |
| `managed-section` | People also edit the issue in the tracker | OAT owns only its block       | OAT writes between `OAT-MANAGED` HTML-comment markers and keeps the text outside them. Broken markers stop the write                                                        |
| `replace`         | OAT is the only author                    | Tracker edits are overwritten | Creating an issue always needs a fresh preview approval. Later updates follow `update-fields` authority, so set that to `user-approved` if a person must see each overwrite |

**Default:** `none`.
**Likely rationale (inferred):** nothing leaves the repo unless you opt in.

## 4. Who may write, and with what approval?

**The choice:** `pjm.remote.policy.authority.default`, or `…authority.operations.<create|update-fields|transition|annotate|delete|relink|detach|recreate>`. These keys are allowed only in shared `.oat/config.json`.

| Option            | Choose it when                                           | You give up            | In practice                                                                                                      |
| ----------------- | -------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `read-only`       | You only intake and refresh                              | All writes             | `intake`, `refresh`, `discussion` and `doctor` work; every write fails                                           |
| `user-approved`   | A person must see each payload                           | A round trip per write | Needs an approval of the exact preview digest, given within 5 minutes. Any input change makes the approval stale |
| `user-authorized` | An explicit request ("publish BL-x to Linear") is enough | Per-payload review     | Authority evidence must name the same operation and target                                                       |
| `autonomous`      | An OAT workflow writes as one of its steps               | Most oversight         | Authority evidence must come from the workflow and match the item's current content                              |

Delete, recreate, relink and detach, plus creating an issue in `replace` mode, are capped at `user-approved` whatever you configure. **Updates in `replace` mode are not capped.**

`oat config set` rejects unknown values. A hand-edited unknown value is read as `read-only` (or as `none` for a description).

**Default:** `read-only`.
**Likely rationale (inferred):** the docs call it a "safe default"; no decision record says why.

**Which should I pick:**

- Start at `read-only` and intake.
- When OAT should create and maintain issues, set `operations.create` and `operations.update-fields` to `user-approved` together. `update-fields` affects only issues that `publish` created.

## 5. Different rules per tracker?

**The choice:** `pjm.remote.policy.providers.<github|linear|jira>.*`.

| Option | Choose it when                                  | You give up          | In practice                                                                                                                                                                                               |
| ------ | ----------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unset  | One policy fits all                             | Nothing              | Inherits the repository policy                                                                                                                                                                            |
| Set    | Trust differs (private Linear vs public GitHub) | More policy to audit | Replaces the repository value and can widen it; the §4 caps still apply. A provider `authority.default` also replaces repository per-operation settings, so restate any you still need under the provider |

**Default:** unset, which inherits the repository policy.

## 6. Where does remote operation state live?

**The choice:** `pjm.remote.storage.state`.

| Option   | Choose it when                                                                                        | You give up                                                              | In practice                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `local`  | Almost always                                                                                         | Other clones cannot see these snapshots or journals                      | Stored in `.git/oat/pjm-remote/<repository hash>/`, which every worktree of one clone shares and which is never committed                                                                              |
| `shared` | Teammates need each other's operation logs, for example to recover a create whose outcome was unclear | "Sanitized remote content and operation journals will enter Git history" | Every binding uses `.oat/repo/pjm/remote/state/`. Existing records are not moved. The design rejects this for local projects, but **the current CLI does not enforce that**, so do not combine the two |

To switch to `shared`, run `oat pjm remote storage shared` without `--apply` to get a preview digest. Then rerun it with `--apply --approval-digest <digest>`. The apply is refused if the repository, config target or current mode has changed. `oat config set` refuses `shared`, but a hand edit of `.oat/config.json` is not blocked, so review that file in pull requests.

**Default:** `local`.
**Why:** the docs say shared storage "may expose remote planning content to everyone with repository access."

Binding metadata (the link record) is not configurable. Today the CLI writes every binding, including bindings for local projects, to `.oat/repo/pjm/remote/bindings/`. That directory is not gitignored, so a local project's binding is committed.

---

## Evidence

Line numbers refer to commit `a080dfbef` and match the working tree as verified.

- §1: `packages/cli/src/commands/pjm/adoption.ts:43-74`; `packages/cli/src/commands/pjm/init.ts:46-54,148-247` (scaffold), `:224-231` (`pjm` rewritten); `packages/cli/src/commands/pjm/migrate.ts:548`; `packages/cli/src/config/oat-config.ts:2257-2287,2320-2340` (no merge); `packages/cli/src/commands/backlog/index.ts:102-119`; `packages/cli/src/commands/decision/index.ts:102-119,145`; `packages/cli/src/commands/pjm/remote/index.ts:66-76,557-574` (exit 2); `packages/cli/src/commands/init/gitignore.ts:17-25`; `packages/cli/src/commands/init/tools/project-management/index.ts:101,115` (the pack does not adopt); `.oat/repo/reference/decisions/DR-260827-repository-owned-pjm-adoption.md:13`. Reproduced: `backlog new` exit 1, `pjm remote intake` exit 2, and `pjm.remote` deleted by a second `pjm init`.
- §2: `packages/cli/src/commands/pjm/remote/index.ts:89-114,466-496`; `packages/cli/src/commands/pjm/remote/service.ts:2109-2111,3098-3101` (capability evidence required), `:2851` (publish → `planning`), `:3620` (intake → `source`), `:5609-5713` (outbound gated by purpose); `packages/cli/src/commands/pjm/remote/purpose-policy.ts:46-69`; `.oat/repo/reference/decisions/DR-260907-local-first-per-binding-remote.md:21`.
- §3: `packages/cli/src/config/oat-config.ts:1134-1140`; `packages/cli/src/commands/pjm/remote/service.ts:2719-2724` (replace cap applied only at create), `:3088-3093` (update path omits it), `:5367-5384,5677-5703`, `:3689` and `planIntakeBacklogTarget` (intake copies the body); `packages/cli/src/commands/pjm/remote/managed-markdown.ts:35-41`; `packages/cli/src/commands/pjm/remote/authority.ts:363-370`.
- §4: `packages/cli/src/commands/pjm/remote/authority.ts:196-291,332-370,394-466,509-530`; `packages/cli/src/commands/pjm/remote/preview.ts:146-177`; `packages/cli/src/commands/pjm/remote/service.ts:2709-2713,2841`; `packages/cli/src/commands/pjm/remote/schema.ts:66-70`; `packages/cli/src/config/oat-config.ts:1092-1117,1386-1400`; `packages/cli/src/commands/config/index.ts:2141-2163`. Reproduced: `config set … bogus` exit 1.
- §5: `packages/cli/src/commands/pjm/remote/authority.ts:429-448,488-502`; `packages/cli/src/config/oat-config.ts:1151-1178`.
- §6: `packages/cli/src/commands/pjm/remote/service.ts:2214-2290` (storage command; `approvedAt: now`), `:6508-6531` (store fixed to the backlog/shared target); `packages/cli/src/commands/pjm/doctor.ts:601-606`; `packages/cli/src/commands/pjm/remote/store.ts:166,187,205,217`; `packages/cli/src/commands/pjm/remote/storage-locator.ts:41-62`; `packages/cli/src/commands/pjm/remote/shared-storage.ts:116-158`; `packages/cli/src/commands/config/index.ts:2115-2127`; `apps/oat-docs/docs/workflows/backlog-and-planning/remote-project-management.md:172-173`. Reproduced: `config set … shared` exit 1, and a hand-edited `shared` read back as `shared`.

## Proposed home

Re-check every page path and heading below against the tree after the `origin/main` merge, which was in progress during this work.

- §1: `getting-started/tool-packs.md`, after "Install vs. initialize". Put the warning there too, and link to it from "Adoption comes first" in `backlog-lifecycle.md`.
- §2: `workflows/backlog-and-planning/remote-project-management.md`, after "Prerequisite".
- §3–§5: the same page, in a "Choosing a policy" subsection after "Repository-owned policy". `reference/configuration.md` keeps its key list and links here.
- §6: the same page, at the top of "Storage and worktrees", replacing the owner-based routing text.
- Terms: the top of `remote-project-management.md`.

## Docs that contradict the code

1. `reference/config-and-local-state.md:101` calls `oat decision init` "the lightweight standalone setup path", yet it runs only after PJM adoption (`decision/index.ts:145`). The same paragraph admits that `oat decision` mutations fail closed, so the page is internally inconsistent.
2. `remote-project-management.md:104-107` and `reference/configuration.md:124-125` describe binding restrictions and purpose field grants that no command can set. The layers exist in code, but every binding is created with `policyRestrictions: {}` and one fixed purpose (`service.ts:2851-2852,3620-3621`).
3. `remote-project-management.md:174-175` says to preview the shared-storage paths through `--help`. The help output shows only flags. The preview is the same command without `--apply`, and it accepts only `.oat/repo/pjm/remote/state`.
4. `remote-project-management.md:147` says "Fresh approval is always required for complete description replacement". The code enforces this only on create.
5. `remote-project-management.md:161-164` (binding metadata follows its owner) and `:173-174` ("rejected for local projects") describe the storage locator's design, not the production store, which always uses the backlog/shared target (`service.ts:6523-6531`).
6. `oat config describe --json` names `oat config set pjm.remote.storage.state <value> --shared` as the setter, but that setter refuses `shared`. It also lists the provider `description` default as `none`, while an unset value actually inherits the repository value.

## Product defects found (not docs)

1. **Config wipe (reproduced):** `oat pjm init` and `oat pjm migrate --apply` delete `pjm.remote` from `.oat/config.json` without warning (`init.ts:224-231`, `migrate.ts:548`). If storage was `shared`, it falls back to `local`, which hides journals already written to `.oat/repo/pjm/remote/state`.
2. **Replace-mode updates are not capped (code reading):** complete description replacement on `update-fields` follows the configured authority, so `user-authorized` or `autonomous` can overwrite a body with no preview approval (`service.ts:3088-3093,5678-5679`).
3. **Storage and binding routing gaps (code reading):** shared storage is not rejected for local-project bindings. Every binding, including bindings for local projects, is written to `.oat/repo/pjm/remote/bindings/`, which is not gitignored. Per-owner routing exists in `storage-locator.ts:48-62`, but production never reaches it (`service.ts:6530`).
4. **Wrong setter in `oat config describe`:** it names `oat config set` as the owner of `pjm.remote.storage.state`, but that command refuses `shared`.

## Could not verify

- How a caller obtains `--repository-fingerprint`, or produces authority evidence files. I also could not tell which host agents emit the workflow evidence that `autonomous` requires.
- Whether the 5-minute approval window for mutations is practical, and whether a `replace`-mode publish overwrites a remote-only edit or first proposes it inbound.
- The full approval flow for `annotate`, which is used only in closeout.
- Whether a custom `oat pjm init --repo-root` works with `oat backlog` and `oat decision`, which hardcode `.oat/repo`.
- Project scope (`projects.defaultScope`) and `archive.*` are out of scope here.
- No live provider operation was run.
