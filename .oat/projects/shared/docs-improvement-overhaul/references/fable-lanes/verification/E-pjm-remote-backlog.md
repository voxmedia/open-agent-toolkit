# Choosing PJM and remote-planning configuration

**PJM** (project management) means OAT's planning records kept as files under `.oat/repo/`: the backlog, decision records, and roadmap. A **binding** links one local item to one GitHub, Linear, or Jira issue. **Reconcile** compares the local, remote, and last-agreed value of each field and proposes which side should change. A **preview** is a saved, digest-stamped copy of exactly what a write would send.

## 1. Adopt PJM in this repository?

**The choice:** run `oat pjm init`, which writes `pjm.initialized: true` to `.oat/config.json`.

| Option      | Choose it when                                                                  | You give up                                                                                          | In practice                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Not adopted | Planning lives outside the repo                                                 | `oat backlog`, `oat decision`, the `oat-pjm-*` skills and `oat pjm remote` all refuse to write       | Those commands exit 1 and tell you to run `oat pjm init`                                                                                                                                   |
| Adopted     | You want planning records reviewed alongside code, or you want tracker bindings | Planning text is committed (OAT's `.gitignore` leaves it in) and readable by anyone with repo access | Creates the `.oat/repo/pjm/` backlog, roadmap and current-state files plus `reference/decisions/`, skipping files that already exist. Also appends guidance blocks to the root `AGENTS.md` |

**Default:** not adopted. Installing the `project-management` pack does not adopt PJM. **Why:** DR-260827 says repository state "must never be created merely because that capability is installed globally".

**Which should I pick:** A small team with no tracker should adopt, because the backlog becomes its tracker. Adopt even if you only read from a tracker, because remote commands require adoption. If planning must stay out of third-party tools, adopt and never bind.

## 2. Keep an item local, or bind it?

**The choice:** this is per item. You bind with `oat pjm remote intake <ref> --to-backlog <id>` or `oat pjm remote publish --provider <p> --to-backlog <id>` (or `--to-project`).

| Option     | Choose it when                                   | You give up                                                                 | In practice                                                                     |
| ---------- | ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| No binding | The item matters only in the repo                | Tracker visibility                                                          | No provider is contacted                                                        |
| Intake     | The issue already exists and the tracker owns it | Local edits never flow back: publish stops with "permit no outbound fields" | Purpose `source`: fields flow inbound only. Works under read-only policy        |
| Publish    | The item starts locally                          | Needs write authority (§4)                                                  | Purpose `planning`: title, priority and the description (§3) can flow both ways |

**Default:** no binding, and no background sync. **Why:** DR-260907 keeps local artifacts authoritative so that "offline project work remains complete".

**Which should I pick:** For a GitHub open-source repo, intake reported issues and publish only work that maintainers start. For a Linear or Jira team, intake the tickets agents work on.

## 3. How much description is sent?

**The choice:** `pjm.remote.policy.description`.

| Option            | Choose it when                            | You give up                               | In practice                                                                                                    |
| ----------------- | ----------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `none`            | The body text is sensitive                | The issue gets no body                    | The description is never sent or compared                                                                      |
| `managed-section` | People also edit the issue in the tracker | OAT owns only its own block               | OAT writes between `OAT-MANAGED` marker comments and keeps the surrounding text. Broken markers stop the write |
| `replace`         | OAT is the only author                    | Edits made in the tracker get overwritten | Every create or update needs a fresh preview approval                                                          |

**Default:** `none`. **Likely rationale (inferred):** nothing leaves the repo unless you opt in.

## 4. Who may write, and with what approval?

**The choice:** `pjm.remote.policy.authority.default`, or `…authority.operations.<create|update-fields|transition|annotate|delete|relink|detach|recreate>`. Only shared `.oat/config.json` can hold these keys.

| Option            | Choose it when                                     | You give up              | In practice                                                                                                             |
| ----------------- | -------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `read-only`       | You only intake and refresh                        | All writes               | Intake, refresh and discussion still work; writes fail                                                                  |
| `user-approved`   | A person must see each payload                     | One round trip per write | The write runs only with approval of the exact preview digest within 5 minutes. Any change to the inputs makes it stale |
| `user-authorized` | An explicit instruction ("publish BL-x") is enough | Review of each payload   | Needs instruction evidence that names the same operation and target                                                     |
| `autonomous`      | An OAT workflow writes as one of its steps         | Most oversight           | Needs workflow evidence tied to the target's current revision. It is not background sync                                |

Delete, recreate, relink, detach, and `replace`-mode creates or updates are capped at `user-approved` whatever you configure. An unrecognized value becomes `read-only`.

**Default:** `read-only`. **Likely rationale (inferred):** the docs call it a "safe default" without saying why.

**Which should I pick:** A Linear or Jira team can set `operations.update-fields user-approved` and keep `create` read-only at first. If planning data must stay private, keep `read-only`.

## 5. Different rules per tracker?

**The choice:** `pjm.remote.policy.providers.<github|linear|jira>.*`.

| Option | Choose it when                                                               | You give up          | In practice                                                                   |
| ------ | ---------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| Unset  | One policy fits every tracker                                                | Nothing              | The repository policy applies                                                 |
| Set    | You trust trackers differently, for example private Linear and public GitHub | More policy to audit | It replaces the repository value and can widen it; the caps in §4 still apply |

**Default:** unset.

## 6. Where does remote operation state live?

**The choice:** `pjm.remote.storage.state`.

| Option   | Choose it when                                                                       | You give up                                                                                                           | In practice                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local`  | Almost always                                                                        | Other clones must refresh to see snapshots and journals                                                               | Kept under `.git/oat/pjm-remote/<fingerprint>/`, shared by linked worktrees and never committed                                                                                                                                 |
| `shared` | Teammates must see each other's journals, for example to recover an uncertain create | "Sanitized remote content and operation journals will enter Git history". Local-scope projects lose remote operations | Uses `.oat/repo/pjm/remote/state/` and `<project>/remote/state/`. You can set it only with `oat pjm remote storage shared`: preview, then approve within 5 minutes; `oat config set` is blocked. Existing records are not moved |

**Default:** `local`. **Why:** the docs warn that shared storage "may expose remote planning content to everyone with repository access."

Binding metadata is not configurable. It follows its owner: `.oat/repo/pjm/remote/bindings/` for backlog items, `<project>/remote/bindings/` for shared and synced projects, and the local store for local projects.

---

## Evidence

- §1: `packages/cli/src/commands/pjm/adoption.ts:43-74`; `packages/cli/src/commands/pjm/init.ts:47-55,90-107,148-247`; `packages/cli/src/commands/backlog/index.ts:102-119`; `packages/cli/src/commands/decision/index.ts:102-119,145`; `packages/cli/src/commands/pjm/remote/index.ts:66-76,557-560`; `packages/cli/src/commands/init/gitignore.ts:17-25` (`.oat/repo/pjm` is not ignored); `.oat/repo/reference/decisions/DR-260827-repository-owned-pjm-adoption.md:13-21`; `.oat/repo/reference/decisions/DR-260529-split-project-management-pack.md:28,52-53`.
- §2: `packages/cli/src/commands/pjm/remote/index.ts:89-114,466-496`; `packages/cli/src/commands/pjm/remote/service.ts:2851` (publish → `planning`), `:3620` (intake → `source`), `:5609-5713` (outbound fields gated by purpose; "permit no outbound fields"); `packages/cli/src/commands/pjm/remote/purpose-policy.ts:46-69`; `packages/cli/src/commands/pjm/remote/schema.ts:21,66-79`; `.oat/repo/reference/decisions/DR-260907-local-first-per-binding-remote.md:17-21`; `apps/oat-docs/docs/workflows/backlog-and-planning/remote-project-management.md:13-15`.
- §3: `packages/cli/src/config/oat-config.ts:1134-1140`; `packages/cli/src/commands/pjm/remote/service.ts:2723,5367-5384,5677-5703`; `packages/cli/src/commands/pjm/remote/managed-markdown.ts:35-41`; `packages/cli/src/commands/pjm/remote/authority.ts:363-369`; `oat config describe --json` (default `none`).
- §4: `packages/cli/src/commands/pjm/remote/authority.ts:196-291` (per-mode evidence), `:332-370` (hard floors), `:394-466` (precedence), `:509-519` (invalid → read-only); `packages/cli/src/commands/pjm/remote/preview.ts:146-176`; `packages/cli/src/commands/pjm/remote/service.ts:2841` (`approvalMaxAgeMs: 300_000`), `:2709-2713` (fallback policy); `packages/cli/src/config/oat-config.ts:1386-1400` (local/user rejected); `packages/cli/src/commands/pjm/remote/schema.ts:66-70` (read-only lifecycle ops); `apps/oat-docs/docs/workflows/backlog-and-planning/remote-project-management.md:73-74,108`.
- §5: `packages/cli/src/commands/pjm/remote/authority.ts:429-448,502`; `packages/cli/src/config/oat-config.ts:1151-1178`.
- §6: `packages/cli/src/commands/pjm/remote/storage-locator.ts:41-62`; `packages/cli/src/commands/pjm/remote/service.ts:2220-2260,6512`; `packages/cli/src/commands/pjm/remote/shared-storage.ts:63-67,102-158`; `packages/cli/src/commands/config/index.ts:2115-2127`; `packages/cli/src/commands/pjm/remote/index.ts:369-412`; `apps/oat-docs/docs/workflows/backlog-and-planning/remote-project-management.md:172-175`.

## (a) Proposed home

- §1: `getting-started/tool-packs.md`, after the "Install vs. initialize" heading. Link to it from `backlog-lifecycle.md` "Adoption comes first".
- §2: `workflows/backlog-and-planning/remote-project-management.md`, after "Prerequisite" and before "Lifecycle operations".
- §3–§5: the same page, as a "Choosing a policy" subsection right after "Repository-owned policy". `reference/configuration.md` keeps its key list and links here.
- §6: the same page, at the top of "Storage and worktrees".

## (b) Docs that contradict the code

1. `apps/oat-docs/docs/reference/config-and-local-state.md:101` calls `oat decision init` "the lightweight standalone setup path". In the code, the command refuses to run unless PJM is adopted (`packages/cli/src/commands/decision/index.ts:145`).
2. `remote-project-management.md:104-107` and `reference/configuration.md:124-125` describe "binding defaults and operation restrictions" and "purpose field grants" as policy layers. Every binding is created with `policyRestrictions: {}` (`service.ts:2852,3621`) and a fixed purpose. No command or key sets either one, so a reader cannot tune them.
3. `DR-260529-split-project-management-pack.md:45` names `--reference-root`, but the real flag is `--repo-root` (`packages/cli/src/commands/pjm/index.ts:158-160`).
4. A risk the docs do not mention, found by reading code only: rerunning `oat pjm init` rebuilds `pjm` as `{initialized, schemaVersion}` (`init.ts:226-232`), and `writeOatConfig` does not merge (`oat-config.ts:2257-2287,2320-2336`). That appears to erase any configured `pjm.remote` policy, which then silently falls back to the defaults. Meanwhile, init's own message tells users to "rerun `oat pjm init`" (`init.ts:76-78`).
5. `remote-project-management.md:174-175` says to preview the paths through `… storage shared --help`. The actual preview is the same command run without `--apply`, and the only path it accepts is `.oat/repo/pjm/remote/state` (`service.ts:2220,2240-2246`).

## (c) Could not verify

- How a person obtains `--repository-fingerprint` for `storage shared`, or produces caller authority evidence files. I also could not find which hosts emit the `workflow` evidence that `autonomous` needs.
- Whether committing `.oat/repo/pjm/remote/bindings/` is intended. I only verified that OAT's `.gitignore` block does not exclude it.
- The full approval flow for `annotate`, which only closeout's composite steps use.
- Whether a custom `oat pjm init --repo-root` works with `oat backlog` and `oat decision`, which hardcode `.oat/repo` (`backlog/index.ts:99,107`).
- Project scope (`projects.defaultScope`) and `archive.*`. These are not PJM settings, and I covered them only where they affect binding storage.
- I ran nothing that writes and contacted no provider. Item (b)4 comes from reading code only.
