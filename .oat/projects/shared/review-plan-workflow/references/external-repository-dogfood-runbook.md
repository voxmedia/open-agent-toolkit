# External Repository Dogfood Runbook

Use this runbook from a separate, real consumer repository. Do not run the
ReviewPlan dogfood against the toolkit repository, a detached copy of it, or a
fixture derived from it. The linked CLI is built from the
`review-plan-workflow` worktree, while all review configuration, project state,
review artifacts, commits, and PR activity belong to the consumer repository.

## 1. Prerequisites and evidence directory

Choose a consumer repository with a real OAT project, a dedicated dogfood
branch or worktree, a clean committed baseline, and three useful implemented
scopes: a small task (`pNN-tNN`), a medium phase or implemented phase prefix
(`pNN` or `pNN through=pNN-tNN`), and a broad range (`pNN-pMM` or `final`).
Remote dogfood additionally requires an open PR for that consumer repository
and authenticated `gh` access. Review providers and at least one non-host gate
target must already be configured.

Run every shell block in the same Bash session. Strict mode is intentional: a
failed prerequisite, source assertion, or evidence write stops the run.

```bash
set -euo pipefail
export OAT_SOURCE_WORKTREE="/absolute/path/to/slow-review-triage"
export CONSUMER_REPO="/absolute/path/to/the-real-consumer-repository"
export PROJECT_SLUG="real-consumer-project"
export PROJECT_RELATIVE_PATH=".oat/projects/<shared|local|synced>/$PROJECT_SLUG"
export PROJECT_PATH="$CONSUMER_REPO/$PROJECT_RELATIVE_PATH"
export DOGFOOD_PROVIDER="<claude|codex|cursor>"
export DOGFOOD_EVIDENCE="/absolute/path/outside-the-consumer/review-plan-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DOGFOOD_EVIDENCE"
case "$DOGFOOD_EVIDENCE" in
  "$CONSUMER_REPO"/*) exit 1 ;;
esac
export OAT_LOCAL_CONFIG="$CONSUMER_REPO/.oat/config.local.json"
if [ -f "$OAT_LOCAL_CONFIG" ]; then
  export OAT_LOCAL_CONFIG_EXISTED=1
  cp "$OAT_LOCAL_CONFIG" "$DOGFOOD_EVIDENCE/config.local.before.json"
else
  export OAT_LOCAL_CONFIG_EXISTED=0
fi

test -z "$(git -C "$CONSUMER_REPO" status --porcelain)"
export CONSUMER_BASE_HEAD="$(git -C "$CONSUMER_REPO" rev-parse HEAD)"
printf '%s\n' "$CONSUMER_BASE_HEAD" \
  | tee "$DOGFOOD_EVIDENCE/consumer-head.txt"
gh auth status 2>&1 | tee "$DOGFOOD_EVIDENCE/gh-auth.txt"
```

## 2. Build and link this worktree's CLI

Record the pre-existing pnpm-global CLI so it can be restored. The
repository-owned `cli:link` script builds `@open-agent-toolkit/cli` and
registers its `oat` binary through `pnpm link --global`. Stop before mutation
if the active CLI is managed elsewhere; this runbook does not guess another
manager's rollback command.

```bash
if command -v oat >/dev/null 2>&1; then
  export PREVIOUS_OAT_PRESENT=1
  export PREVIOUS_OAT_BIN="$(command -v oat)"
  test "$PREVIOUS_OAT_BIN" = "$(pnpm bin -g)/oat"
  export PREVIOUS_OAT_VERSION="$(oat --version)"
  export PREVIOUS_OAT_GLOBAL_LINK="$(pnpm root -g)/@open-agent-toolkit/cli"
  test -e "$PREVIOUS_OAT_GLOBAL_LINK"
  export PREVIOUS_OAT_PACKAGE_DIR="$(realpath "$PREVIOUS_OAT_GLOBAL_LINK")"
  export PREVIOUS_OAT_ENTRY="$PREVIOUS_OAT_PACKAGE_DIR/dist/index.js"
  test -f "$PREVIOUS_OAT_PACKAGE_DIR/package.json"
  test -f "$PREVIOUS_OAT_ENTRY"
  test "$(node -p \
    "require(process.argv[1]).name" \
    "$PREVIOUS_OAT_PACKAGE_DIR/package.json")" = \
    "@open-agent-toolkit/cli"
  case "$PREVIOUS_OAT_PACKAGE_DIR" in
    */.pnpm/@open-agent-toolkit+cli@*/node_modules/@open-agent-toolkit/cli)
      export PREVIOUS_OAT_INSTALL_MODE="published"
      ;;
    *) export PREVIOUS_OAT_INSTALL_MODE="linked" ;;
  esac
else
  export PREVIOUS_OAT_PRESENT=0
  export PREVIOUS_OAT_BIN=""
  export PREVIOUS_OAT_ENTRY=""
  export PREVIOUS_OAT_VERSION=""
  export PREVIOUS_OAT_PACKAGE_DIR=""
  export PREVIOUS_OAT_GLOBAL_LINK=""
  export PREVIOUS_OAT_INSTALL_MODE="absent"
fi

git -C "$OAT_SOURCE_WORKTREE" rev-parse HEAD \
  | tee "$DOGFOOD_EVIDENCE/toolkit-head.txt"
pnpm --dir "$OAT_SOURCE_WORKTREE" install --frozen-lockfile
pnpm --dir "$OAT_SOURCE_WORKTREE" run cli:link
hash -r
```

Verify path, version, and resolved source before changing the consumer project:

```bash
export EXPECTED_OAT_VERSION="$({
  cd "$OAT_SOURCE_WORKTREE"
  node -p "require('./packages/cli/package.json').version"
})"
export LINKED_OAT_BIN="$(command -v oat)"
export LINKED_OAT_PACKAGE="$(realpath "$(pnpm root -g)/@open-agent-toolkit/cli")"
export LINKED_OAT_ENTRY="$(realpath "$LINKED_OAT_PACKAGE/dist/index.js")"

printf 'bin=%s\nentry=%s\nversion=%s\n' \
  "$LINKED_OAT_BIN" "$LINKED_OAT_ENTRY" "$(oat --version)" \
  | tee "$DOGFOOD_EVIDENCE/linked-cli.txt"
test "$LINKED_OAT_BIN" = "$(pnpm bin -g)/oat"
test "$(oat --version)" = "$EXPECTED_OAT_VERSION"
test "$LINKED_OAT_PACKAGE" = \
  "$(realpath "$OAT_SOURCE_WORKTREE/packages/cli")"
test "$LINKED_OAT_ENTRY" = \
  "$(realpath "$OAT_SOURCE_WORKTREE/packages/cli/dist/index.js")"
```

Resolve the declared project scope before checking artifacts. If it is synced,
pull its project ref first so an absent or stale checkout is materialized. Any
reported rebase must be resolved before continuing:

```bash
export PROJECT_SCOPE="$(
  oat --cwd "$CONSUMER_REPO" project scope "$PROJECT_PATH" --format value
)"
case "$PROJECT_SCOPE" in
  shared|local) ;;
  synced)
    oat --cwd "$CONSUMER_REPO" --json project pull "$PROJECT_PATH" \
      | tee "$DOGFOOD_EVIDENCE/project-pull.json"
    ;;
  *) exit 1 ;;
esac
test -f "$PROJECT_PATH/plan.md"
test -f "$PROJECT_PATH/state.md"
oat --cwd "$CONSUMER_REPO" project open "$PROJECT_PATH" \
  --reason "ReviewPlan external repository dogfood"
```

## 3. Install and prove this branch's workflow assets

Linking the binary is not enough: agent UIs discover installed skills and
reviewer roles. Snapshot the current project-scope inventory, install the
linked CLI's workflow and utility packs at project scope, and capture the
result as an isolated setup commit on the dogfood branch. The clean baseline
above makes that commit exactly reversible.

```bash
oat --cwd "$CONSUMER_REPO" --json tools list --scope project \
  >"$DOGFOOD_EVIDENCE/tools-before.json"
oat --cwd "$CONSUMER_REPO" tools install workflows --scope project
oat --cwd "$CONSUMER_REPO" tools install utility --scope project
oat --cwd "$CONSUMER_REPO" sync --scope project
oat --cwd "$CONSUMER_REPO" --json tools has workflows --scope project \
  | tee "$DOGFOOD_EVIDENCE/workflows-pack.json"
oat --cwd "$CONSUMER_REPO" --json tools has utility --scope project \
  | tee "$DOGFOOD_EVIDENCE/utility-pack.json"
jq -e '.available == true and .completeness.project == "complete"' \
  "$DOGFOOD_EVIDENCE/workflows-pack.json"
jq -e '.available == true and .completeness.project == "complete"' \
  "$DOGFOOD_EVIDENCE/utility-pack.json"

for tool_name in \
  oat-project-implement \
  oat-project-review-provide \
  oat-project-review-provide-remote \
  oat-reviewer; do
  oat --cwd "$CONSUMER_REPO" --json tools info "$tool_name" \
    | tee "$DOGFOOD_EVIDENCE/tool-$tool_name.json"
  jq -e '.tool.scope == "project" and .tool.status == "current" and
    .tool.version == .tool.bundledVersion' \
    "$DOGFOOD_EVIDENCE/tool-$tool_name.json"
done
oat --cwd "$CONSUMER_REPO" --json providers inspect "$DOGFOOD_PROVIDER" \
  --scope project \
  | tee "$DOGFOOD_EVIDENCE/provider.json"
jq -e '
  . as $root |
  .detected == true and
  ([.projectMappings[] | select(.contentType == "skill")] | length > 0) and
  ([.projectMappings[] | select(.contentType == "agent")] | length > 0) and
  all(
    .projectMappings[] |
      select(
        (.contentType == "skill" or .contentType == "agent") and
        (.nativeRead != true)
      );
    . as $expected |
    any(
      $root.mappings[];
      .scope == "project" and
      .contentType == $expected.contentType and
      .managed > 0 and
      .missing == 0 and
      .drifted == 0 and
      .managed == .inSync
    )
  )
' "$DOGFOOD_EVIDENCE/provider.json"
oat --cwd "$CONSUMER_REPO" --json status \
  | tee "$DOGFOOD_EVIDENCE/oat-status.json"

if test -n "$(git -C "$CONSUMER_REPO" status --porcelain)"; then
  git -C "$CONSUMER_REPO" add -A
  git -C "$CONSUMER_REPO" commit \
    -m "chore: stage ReviewPlan dogfood tool packs"
  export PACK_SETUP_COMMIT="$(git -C "$CONSUMER_REPO" rev-parse HEAD)"
else
  export PACK_SETUP_COMMIT=""
fi
printf '%s\n' "$PACK_SETUP_COMMIT" \
  | tee "$DOGFOOD_EVIDENCE/pack-setup-commit.txt"
```

Close and reopen the consumer repository's agent session after this step. In
the fresh session, confirm the visible `oat-project-review-provide` skill comes
from `$CONSUMER_REPO/.agents/skills/` and the reviewer role is the project copy
reported above. Stop if the UI resolves a user/global or stale copy.

## 4. Enable enforce only in the consumer repository

Capture the prior effective value, write only the consumer's local ignored
configuration, and prove that local scope wins. Do not write shared or user
configuration.

```bash
cd "$CONSUMER_REPO"
oat --json config get workflow.reviewPlanMode \
  | tee "$DOGFOOD_EVIDENCE/review-plan-mode-before.json"
oat config set workflow.reviewPlanMode enforce --local
oat --json config get workflow.reviewPlanMode \
  | tee "$DOGFOOD_EVIDENCE/review-plan-mode-enforce.json"
jq -e '.value == "enforce" and .source == "local"' \
  "$DOGFOOD_EVIDENCE/review-plan-mode-enforce.json"
git status --short | tee "$DOGFOOD_EVIDENCE/status-after-local-config.txt"
```

## 5. Execute real review workflows

Replace the tokens below with real implemented scopes from the consumer plan.
For every invocation, retain the console transcript, exact full reviewed base
and head SHAs, run ID, selected target, preparation/plan receipt, terminal
subtype, finding counts, artifact or PR-review URL, and gate envelope. Never
label `review_complete_accounting_invalid`, reviewer `blocked-incomplete`,
`targeting_correlation_failed`, or another non-actionable terminal as a pass.

### Local lifecycle rail

In the agent UI for the consumer repository, invoke these exact skills. The
small row proves task scope, the medium row proves an inclusive implemented
prefix, and the broad row proves a multi-phase or final alias:

```text
$oat-project-review-provide code pNN-tNN
$oat-project-review-provide code pNN through=pNN-tNN
$oat-project-review-provide code pNN-pMM
$oat-project-review-provide code final
```

Accept a row only when the terminal is complete, its validated local artifact
exists under `$PROJECT_PATH/reviews/`, and the artifact metadata matches the
requested scope and reviewed full SHA range. Receive actionable lifecycle
reviews with `$oat-project-review-receive`; do not receive non-actionable
terminals.

### Direct phase, checkpoint, and final aliases

Resume the consumer's real implementation with `$oat-project-implement`. Let
the root-owned direct phase review run at the next completed phase. When the
consumer plan reaches a configured HiLL checkpoint, observe the generated
contiguous checkpoint scope; at implementation completion, observe `code final`.
These aliases must reuse the enforce-mode coordinator rather than create a
second review context.

### Remote structured rail

Use the consumer PR number and consumer project path. Each posting is an
external mutation and needs its own explicit posting approval in the remote
skill; one approval does not carry to another row.

```text
$oat-project-review-provide-remote code pNN-tNN --pr <consumer-pr-number> --project "<project-relative-path>"
$oat-project-review-provide-remote code final --pr <consumer-pr-number> --project "<project-relative-path>"
```

Accept only a complete validated structured terminal whose single GitHub
review marker identifies the consumer project, exact scope, invocation lineage,
and full reviewed head. Confirm that the remote skill removes its ephemeral
worktree and makes no local lifecycle-artifact commit.

### Gate rail

Run the CLI from the consumer repository and treat its JSON envelope plus exit
code as the completion signal:

```bash
set +e
oat --json gate review \
  --project "$PROJECT_PATH" \
  --review-type code \
  --review-scope final \
  --exit-nonzero-on important \
  'Use oat-project-review-provide code final for the declared project' \
  >"$DOGFOOD_EVIDENCE/gate-final.json" \
  2>"$DOGFOOD_EVIDENCE/gate-final.stderr"
export GATE_EXIT=$?
set -e
printf '%s\n' "$GATE_EXIT" | tee "$DOGFOOD_EVIDENCE/gate-final.exit"
jq '{status,runId,artifactPath,receiveEligible,handoff,lateCompletion,failure}' \
  "$DOGFOOD_EVIDENCE/gate-final.json"
```

`ok` requires exit 0, `receiveEligible: true`, a correlated artifact, and a
non-null handoff. An actionable-findings `blocked` envelope may exit nonzero
and remain receive-eligible. `review_failed`, `artifact_validation_failed`, and
`targeting_correlation_failed` are failures and must not be received.

### Re-review and issue #206 observation

After applying one real bounded fix, rerun the exact same local or remote scope.
Capture the printed narrowing resolution and verify that the prior reviewed
head, new full head, ancestry, and continuation event remain stable across
review, receive/fix, and re-review. Record any nonexistent/abbreviated revision,
non-ancestor range, or missing-continuation failure against
[issue #206](https://github.com/voxmedia/open-agent-toolkit/issues/206); do not
manually reconstruct or substitute a range after dispatch.

On the local rail only, also try explicit `<sha1>..<sha2>` overrides containing
an abbreviated SHA, a nonexistent SHA, and a base that is not an ancestor of
the head. Each negative control must reject before reviewer launch and must not
publish an artifact. If it reaches a reviewer, changes the normalized range,
or loses the accepted continuation identity, preserve the transcript as the
#206 observation and stop the re-review rail.

### Three-cycle cap and issue #207 observation

For one naturally actionable scope, run the normal
`provide -> receive -> bounded fix -> re-review` loop without exceeding three
lifecycle review cycles. Gate-originated artifacts do not count. At cycle 3,
stop automated reruns and capture the exact cap output. Record whether the
remaining findings are presented as accepted-requirement coverage, regression,
or new hardening and whether one consolidated boundary decision is offered.
Missing consolidation is the observation point for
[issue #207](https://github.com/voxmedia/open-agent-toolkit/issues/207); do not
override the cap merely to complete this dogfood.

## 6. Pass/fail record

A scope passes only when all applicable conditions hold:

- the linked binary resolves to this worktree at the recorded SHA/version;
- enforce resolves from consumer-local configuration only;
- the exact scope and immutable full SHA range survive preparation, terminal,
  artifact/posting, receive/fix, and re-review;
- local, remote, direct/alias, and gate sinks match their declared terminal;
- validation, evidence, output accounting, and cleanup all complete without a
  silent legacy downgrade or replacement launch; and
- the consumer repository's own focused checks pass after review-driven fixes.

Issues #206 and #207 are observation cells, not reasons to relabel a known gap
as a passing feature. Reproducing the issue exactly is recorded as
`known-issue-observed`; any broader range drift, unsafe publication, cap bypass,
or mutation before rejection is a new dogfood failure.

Any missing sink, unexpected sink, invalid accounting, range/continuation
drift, uncorrelated gate envelope, unexplained provider substitution, cap
override, or cleanup failure fails the row. Preserve the terminal evidence and
stop that rail instead of retrying at the same HEAD.

For a synced project, publish its resulting lifecycle artifact commit only
after the row passes:

```bash
oat --cwd "$CONSUMER_REPO" --json project push "$PROJECT_PATH" \
  --message "test: record ReviewPlan external dogfood" \
  | tee "$DOGFOOD_EVIDENCE/project-push.json"
```

## 7. Cleanup and rollback

Restore the complete pre-dogfood local config, including the prior active
project and exact review-mode presence/value:

```bash
cd "$CONSUMER_REPO"
if [ "$OAT_LOCAL_CONFIG_EXISTED" = 1 ]; then
  cp "$DOGFOOD_EVIDENCE/config.local.before.json" "$OAT_LOCAL_CONFIG"
else
  rm -f "$OAT_LOCAL_CONFIG"
fi
oat --json config get workflow.reviewPlanMode \
  | tee "$DOGFOOD_EVIDENCE/review-plan-mode-cleanup.json"
```

Revert the isolated project-scope pack setup after all review artifacts and
evidence are durable. A conflict is a cleanup failure: preserve it and stop
instead of forcing the revert. If the consumer intentionally keeps this exact
pack upgrade, record that explicit decision instead of claiming rollback.

```bash
if [ -n "$PACK_SETUP_COMMIT" ]; then
  git -C "$CONSUMER_REPO" revert --no-edit "$PACK_SETUP_COMMIT"
  git -C "$CONSUMER_REPO" show --stat --oneline HEAD \
    | tee "$DOGFOOD_EVIDENCE/pack-setup-revert.txt"
fi
```

Then remove the dogfood pnpm link. Restore an exact published version with
pnpm, or relink the exact recorded source directory when the prior CLI was
itself linked. Verify launcher path, package root or published version, entry,
and reported version independently; never compare the pnpm shell launcher to
`dist/index.js`.

```bash
pnpm remove --global @open-agent-toolkit/cli
hash -r
if [ "$PREVIOUS_OAT_PRESENT" = 0 ]; then
  ! command -v oat >/dev/null 2>&1
else
  case "$PREVIOUS_OAT_INSTALL_MODE" in
    published)
      pnpm add --global "@open-agent-toolkit/cli@$PREVIOUS_OAT_VERSION"
      ;;
    linked)
      pnpm --dir "$PREVIOUS_OAT_PACKAGE_DIR" link --global
      ;;
    *) exit 1 ;;
  esac
  hash -r
  export RESTORED_OAT_PACKAGE_DIR="$(
    realpath "$(pnpm root -g)/@open-agent-toolkit/cli"
  )"
  export RESTORED_OAT_ENTRY="$RESTORED_OAT_PACKAGE_DIR/dist/index.js"
  test "$(command -v oat)" = "$PREVIOUS_OAT_BIN"
  test -f "$RESTORED_OAT_ENTRY"
  test "$(oat --version)" = "$PREVIOUS_OAT_VERSION"
  if [ "$PREVIOUS_OAT_INSTALL_MODE" = linked ]; then
    test "$RESTORED_OAT_PACKAGE_DIR" = "$PREVIOUS_OAT_PACKAGE_DIR"
    test "$RESTORED_OAT_ENTRY" = "$PREVIOUS_OAT_ENTRY"
  else
    test "$(node -p \
      "require(process.argv[1]).version" \
      "$RESTORED_OAT_PACKAGE_DIR/package.json")" = \
      "$PREVIOUS_OAT_VERSION"
  fi
fi
git -C "$CONSUMER_REPO" status --short \
  | tee "$DOGFOOD_EVIDENCE/final-status.txt"
```

Do not delete review artifacts, PR reviews, project-ref commits, or failed-run
diagnostics that form dogfood evidence. Remove only disposable transcripts
after their contents have been summarized.

## 8. Evidence returned to PR #190

Return a concise comment-ready summary; do not post it until separately
authorized. Include the consumer repository and project identifier, consumer
base/head SHAs, toolkit SHA/version/binary path, local config proof, one row per
small/medium/broad and local/remote/direct/gate workflow, run IDs and terminal
subtypes, artifact digests or PR-review URLs, reviewed full ranges, gate status
and exit code, re-review narrowing evidence, the #206 and #207 observations,
consumer verification commands, provider/tool inventory, pack setup/revert
evidence, synced-project pull/push receipts when applicable, and final cleanup
status. Redact credentials, provider payloads, private repository content, and
unrelated consumer data.
