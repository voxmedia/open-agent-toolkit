# External Repository Dogfood Runbook

Use this runbook from a separate, real consumer repository. Do not run the
ReviewPlan dogfood against the toolkit repository, a detached copy of it, or a
fixture derived from it. The linked CLI is built from the
`review-plan-workflow` worktree, while all review configuration, project state,
review artifacts, commits, and PR activity belong to the consumer repository.

## 1. Prerequisites and evidence directory

Choose a consumer repository with a real OAT project, a clean committed
baseline, and three useful implemented scopes: a small task (`pNN-tNN`), a
medium phase or implemented phase prefix (`pNN` or `pNN through=pNN-tNN`), and
a broad range (`pNN-pMM` or `final`). Remote dogfood additionally requires an
open PR for that consumer repository and authenticated `gh` access. Review
providers and at least one non-host gate target must already be configured.

```bash
export OAT_SOURCE_WORKTREE="/absolute/path/to/slow-review-triage"
export CONSUMER_REPO="/absolute/path/to/the-real-consumer-repository"
export PROJECT_SLUG="real-consumer-project"
export PROJECT_PATH="$CONSUMER_REPO/.oat/projects/shared/$PROJECT_SLUG"
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

test -f "$PROJECT_PATH/plan.md"
test -f "$PROJECT_PATH/state.md"
test -z "$(git -C "$CONSUMER_REPO" status --porcelain)"
git -C "$CONSUMER_REPO" rev-parse HEAD | tee "$DOGFOOD_EVIDENCE/consumer-head.txt"
gh auth status 2>&1 | tee "$DOGFOOD_EVIDENCE/gh-auth.txt"
```

## 2. Build and link this worktree's CLI

Record the pre-existing CLI so it can be restored. The repository-owned
`cli:link` script builds `@open-agent-toolkit/cli` and registers its `oat`
binary through `pnpm link --global`.

```bash
if command -v oat >/dev/null 2>&1; then
  export PREVIOUS_OAT_PRESENT=1
  export PREVIOUS_OAT_BIN="$(command -v oat)"
  export PREVIOUS_OAT_VERSION="$(oat --version)"
  export PREVIOUS_OAT_PACKAGE_DIR="$(realpath "$(pnpm root -g)/@open-agent-toolkit/cli")"
else
  export PREVIOUS_OAT_PRESENT=0
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
test "$(oat --version)" = "$EXPECTED_OAT_VERSION"
test "$LINKED_OAT_ENTRY" = \
  "$(realpath "$OAT_SOURCE_WORKTREE/packages/cli/dist/index.js")"
```

If this is a synced project, pull its project ref now and resolve any reported
rebase instead of continuing on stale artifacts:

```bash
oat --cwd "$CONSUMER_REPO" --json project pull "$PROJECT_PATH" \
  | tee "$DOGFOOD_EVIDENCE/project-pull.json"
oat --cwd "$CONSUMER_REPO" project open "$PROJECT_SLUG" \
  --reason "ReviewPlan external repository dogfood"
```

## 3. Enable enforce only in the consumer repository

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

## 4. Execute real review workflows

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
$oat-project-review-provide-remote code pNN-tNN --pr <consumer-pr-number> --project ".oat/projects/shared/<project-slug>"
$oat-project-review-provide-remote code final --pr <consumer-pr-number> --project ".oat/projects/shared/<project-slug>"
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

## 5. Pass/fail record

A scope passes only when all applicable conditions hold:

- the linked binary resolves to this worktree at the recorded SHA/version;
- enforce resolves from consumer-local configuration only;
- the exact scope and immutable full SHA range survive preparation, terminal,
  artifact/posting, receive/fix, and re-review;
- local, remote, direct/alias, and gate sinks match their declared terminal;
- validation, evidence, output accounting, and cleanup all complete without a
  silent legacy downgrade or replacement launch; and
- the consumer repository's own focused checks pass after review-driven fixes.

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

## 6. Cleanup and rollback

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

Then restore the prior global CLI source. A previously linked package can be
relinked from its recorded package directory; a published version can be
reinstalled by exact version; if no CLI existed, remove the dogfood link.

```bash
if [ "$PREVIOUS_OAT_PRESENT" = 0 ]; then
  pnpm remove --global @open-agent-toolkit/cli
elif [ -f "$PREVIOUS_OAT_PACKAGE_DIR/package.json" ] && \
  [ "$(node -e 'console.log(require(process.argv[1]).name)' \
    "$PREVIOUS_OAT_PACKAGE_DIR/package.json")" = \
    "@open-agent-toolkit/cli" ]; then
  pnpm --dir "$PREVIOUS_OAT_PACKAGE_DIR" link --global
else
  pnpm add --global "@open-agent-toolkit/cli@$PREVIOUS_OAT_VERSION"
fi
hash -r
git -C "$CONSUMER_REPO" status --short \
  | tee "$DOGFOOD_EVIDENCE/final-status.txt"
```

Do not delete review artifacts, PR reviews, project-ref commits, or failed-run
diagnostics that form dogfood evidence. Remove only disposable transcripts
after their contents have been summarized.

## 7. Evidence returned to PR #190

Return a concise comment-ready summary; do not post it until separately
authorized. Include the consumer repository and project identifier, consumer
base/head SHAs, toolkit SHA/version/binary path, local config proof, one row per
small/medium/broad and local/remote/direct/gate workflow, run IDs and terminal
subtypes, artifact digests or PR-review URLs, reviewed full ranges, gate status
and exit code, re-review narrowing evidence, the #206 and #207 observations,
consumer verification commands, synced-project pull/push receipts when
applicable, and final cleanup status. Redact credentials, provider payloads,
private repository content, and unrelated consumer data.
