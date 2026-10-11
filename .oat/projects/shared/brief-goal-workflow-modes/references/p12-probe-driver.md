# p12-t02 real-artifact goal probe: driver

Reproduction driver for the 22-row probe recorded in `implementation.md`
(Task p12-t02). Rows 1–21 are the commands as run on 2026-10-11 against the
branch-built CLI (reconstructed from the session where the journal only kept
the categorical result); rows 7, 9 and 22 also match the independent
reconstruction in the p12 review artifact's Verification Commands. Fixture
shapes for state snippets follow `packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts`
(`goalPlan`, `registryYaml`, `sharedMemberScenario`). Rows 7 and 22 are now
also pinned as tests (`evidence.test.ts` project-log cases, `check.test.ts`,
`refresh.test.ts` and `goal-boundary.test.ts` shared-member cases).

Expected categorical results are the table in the journal; each row below
names its own expectation.

## Setup

```bash
pnpm build                                   # both packages; dist is what the probe runs
FH=$(mktemp -d)                              # one fake HOME for the whole probe
SCR=$(mktemp -d)                             # scratch, deleted at the end
mkdir -p "$SCR/bin" "$SCR/repo" "$SCR/tools"
export HOME=$FH PATH="$SCR/bin:$PATH"
CLI="$PWD/packages/cli/dist/index.js"
R=$SCR/repo; P=.oat/projects/shared/goal-probe
oat() { node "$CLI" --cwd "$R" "$@"; }      # function, not $CLI word-splitting (zsh)
status_rec() { oat --json project status --project-path "$R/$P" | jq -c '.project.recommendation'; }
commit() { git -C "$R" add -A && git -C "$R" commit -q -m "$1" && git -C "$R" rev-parse HEAD; }

cd "$R" && git init -q --initial-branch=main && git config user.email p@e.t && git config user.name P \
  && git config commit.gpgsign false && git commit -q --allow-empty -m init
git init -q --bare "$SCR/origin.git" && git remote add origin "$SCR/origin.git"
oat init --scope project --no-project-guidance --no-hook            # exit 0
oat --json project new goal-probe --mode goal --scope shared         # exit 0, mode goal
```

### Stubbed `gh`

Logs every invocation to `$SCR/gh-calls.log`; `pr view` answers from
`$SCR/gh-view-<PR number>.json`, `pr list` from `$SCR/gh-list.json`.

```bash
cat > "$SCR/bin/gh" <<'EOF'
#!/bin/bash
D="$(cd "$(dirname "$0")/.." && pwd)"
echo "gh $*" >> "$D/gh-calls.log"
case "$1 $2" in
  "pr view")   n="${3##*/}"; [ -f "$D/gh-view-$n.json" ] && cat "$D/gh-view-$n.json" || { echo "no such PR" >&2; exit 1; } ;;
  "pr list")   cat "$D/gh-list.json" 2>/dev/null || echo '[]' ;;
  "pr create") echo "https://github.com/owner/name/pull/99" ;;
  "repo view") echo '{"nameWithOwner":"owner/name"}' ;;
  *) echo "unstubbed gh $*" >&2; exit 1 ;;
esac
EOF
chmod +x "$SCR/bin/gh"
gh_view() { echo "{\"state\":\"$2\",\"headRefOid\":\"$3\",\"baseRefOid\":\"$PRBASE\"}" > "$SCR/gh-view-$1.json"; }
```

### State writes

Each skill step's `state.md` write is applied with a frontmatter merge helper
(the `yaml` package from `packages/cli/node_modules`), then committed:

```bash
cat > "$SCR/tools/setstate.mjs" <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';
import YAML from '<repo>/packages/cli/node_modules/yaml/dist/index.js';
const [file, fragment] = process.argv.slice(2);
const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
const doc = YAML.parseDocument(m[1]);
for (const [k, v] of Object.entries(YAML.parse(fragment) ?? {})) doc.set(k, doc.createNode(v));
writeFileSync(file, `---\n${doc.toString({ lineWidth: 0 }).trimEnd()}\n---\n${m[2]}`);
EOF
setstate() { node "$SCR/tools/setstate.mjs" "$R/$P/state.md" "$1"; }
```

Snippets used below (`$BRIEF` = brief approval commit, `$R1` = reviewed
revision, `$PRBASE` = scaffold commit, `$AMEND` = m02 amendment commit):

```yaml
# plan carrier (m01; m02 the same with scope [p03], ref $AMEND)
plan: { status: allowed, resolution: no_gate, disposition: no_gate, config_fingerprint: null,
        reviewed_head: null, subject: { kind: plan, scope: [p01, p02], ref: $BRIEF },
        decided_at: '2026-10-11T10:00:00Z' }
# exit carrier
exit: { status: allowed, resolution: no_gate, disposition: no_gate, config_fingerprint: null,
        reviewed_head: null, subject: { kind: code, scope: [p01, p02] },
        decided_at: '2026-10-11T10:30:00Z', freshness: fresh, freshness_reason: null }
# delivery entry at registration (registryYaml shape; status registering, members [])
- { delivery_id: d01, milestone: m01, scope: [p01, p02], endpoint: merged, kind: pr,
    status: registering, superseded_by: null, corrects_delivery_id: null, covers_scope_of: null,
    lookup: { repository: owner/name, head_branch: feat/goal-probe, head_sha_at_registration: <HEAD> },
    members: [],
    integrated_review: { artifact: reviews/archived/m01-review.md, scope: [p01, p02],
      bound_revisions: [{ member: 0, base: $PRBASE, head: $R1 }], disposition: passed },
    exit_gate: { <exit carrier core without freshness> } }
# member written at record time
members: [{ url: https://github.com/owner/name/pull/99, base: $PRBASE, reviewed_head: $R1,
            observed_head: null, observed_base: null, status: open }]
```

Brief: `## Milestones` `| m01 | p01, p02 |`, `| m02 | p03 |` (p03
`**Provisional:** yes` until re-alignment), two numbered Outcomes, endpoint
`merged`, plan row `plan artifact passed`, `oat_status: complete`. The journal
is written **before** the reviewed commit (phase Base/Status), and after it
only progress fields change and execution records are appended (a rewrite of
any recorded line after R is substantive).

## Rows

```bash
# 1  aligning m01, approved, plan carrier         → oat-project-goal "align m01" ready
setstate "{oat_phase: implement, oat_milestone: m01, oat_milestone_status: aligning, oat_goal_status: active,
  oat_goal_outcome_audit: null, oat_goal_recovery: null, oat_deliveries: [], oat_milestone_gates: {m01: {<plan>}}}"; status_rec
setstate "{oat_milestone_status: implementing}"
oat project log append --project "$R/$P" --structural --producer oat-project-goal --ref m01 \
  --idempotency-key goal-probe-activate-m01 --body "Activated m01 (p01, p02); goal-probe-activate-m01"
commit "chore(oat): activate m01"; status_rec                        # implement "scope m01: p01, p02"

# 2  journal start → p01, p02 code commits (R1 = p02 head) → head recording; exit carrier → reviewing;
#    review row received → passed + git mv to reviews/archived/ + delivering
status_rec   # closeout m01 → review-provide "code m01: p01, p02" → review-receive → pr-progress "deliver m01"

# 3  before the review row exists
oat --json project delivery check --project "$R/$P" --subject m01   # exit 1, review-missing, exit.source milestone-carrier

# 4  after the 4 bookkeeping commits (head recording, carrier, review recorded, receive/archive)
oat --json project delivery check --project "$R/$P" --subject m01   # exit 0, ok

# 5  on a throwaway branch each: code commit; code commit + git revert; plan.md Outcome reworded
oat --json project delivery check --project "$R/$P" --subject m01   # exit 1 ×3: disallowed-path ×2, substantive-change "## Outcomes"

# 6  registration: git checkout -b feat/goal-probe; write d01 registering; commit; git push origin feat/goal-probe
echo '[]' > "$SCR/gh-list.json"
gh pr list --repo owner/name --head feat/goal-probe --state all --json url,headRefOid   # 0 matches
gh pr create --base main --head feat/goal-probe --title "goal-probe m01" --body x       # exactly one create
#    record member + status open; setstate "{oat_milestone_status: delivered, oat_pr_status: open,
#    oat_pr_url: …/pull/99, oat_phase_status: pr_open}"; commit; then
oat project log append --project "$R/$P" --structural --producer oat-project-pr-progress --ref d01 \
  --idempotency-key goal-probe-register-d01 --body "Registered d01 for m01 (p01, p02) at …/pull/99; goal-probe-register-d01"
H=$(commit "chore(oat): log d01 registration"); git push -q origin feat/goal-probe

# 7  refresh + check d01 with the member head on the registration log commit
gh_view 99 OPEN "$H"
oat --json project delivery refresh --project "$R/$P"               # review fresh (before 96e6d24df: "project log was rewritten")
oat --json project delivery check --project "$R/$P" --subject d01   # exit 0, ok

# 8  re-alignment entry: structural --ref m01 (key goal-probe-realign-m01), worked-well learnings entry,
#    amend plan.md p03 (Intent, Exit evidence, Provisional: no) → AMEND (local only)
oat --json project validate-plan --project-path "$R/$P"             # valid
oat --json project delivery check --project "$R/$P" --subject d01   # ok (gh head still $H)

# 9  amendment pushed onto the open delivery head
gh_view 99 OPEN "$AMEND"; oat --json project delivery refresh --project "$R/$P"
oat --json project delivery check --project "$R/$P" --subject d01   # exit 1, substantive-change "## Phase p03: Farewell"
#    restore state.md and gh_view 99 OPEN "$H"

# 10 m02 plan carrier (ref $AMEND) + plan artifact row; commit
status_rec                                   # realign m01 "activation waits for d01 … (merged)"
setstate "{oat_milestone: m02, oat_milestone_status: aligning}"; status_rec   # align m02 "cannot activate yet" (then restore)

# 11 merge
gh_view 99 MERGED "$H"; oat --json project delivery refresh --project "$R/$P"   # d01 at_endpoint, endpoint_attainment
status_rec                                   # "d01 reached its agreed endpoint"
setstate "{oat_milestone: m02, oat_milestone_status: aligning}"; commit …; status_rec   # align m02 ready
#    activation: setstate "{oat_milestone_status: implementing, oat_phase_status: in_progress, oat_pr_status: merged}"
#    + structural --ref m02; commit                                    # implement "scope m02: p03"

# 12 copy of the repo (cp -R): revise appends p-rev1 to the m01 row + phase block + journal pending,
setstate "{oat_goal_recovery: {milestone: m01, delivery_id: d01, phase_ids: [p-rev1], stage: implementing, review_artifact: null}}"
status_rec                                   # implement "scope m01/d01: p-rev1"; m02 fields unchanged (diff empty)
oat --json project delivery refresh --project "$R/$P"   # writes neither oat_milestone_status nor oat_goal_recovery
#    neutralized (row not extended, recovery null): router oat-project-goal phase-without-milestone;
oat --json project validate-plan --project-path "$R/$P" # goal-phase-without-milestone

# 13 copy at the d01-merged commit
oat --json project promote "$P" --to quick   # d01 open → refused goal-delivery-unsettled (no writes)
                                             # d01 registering → refused goal-delivery-unsettled
                                             # settled → promoted (discovery.md, references/brief-archive.md, oat_promoted_from: goal)

# 14 p03 executed (R2), m02 closeout/review/receive; d02 registering committed; resume:
echo '[{"url":"https://github.com/owner/name/pull/100","headRefOid":"<HEAD>"}]' > "$SCR/gh-list.json"
gh pr list --repo owner/name --head feat/goal-probe --state all --json url,headRefOid   # 1 match → attach, no create
#    record member …/pull/100, delivered, log --ref d02; gh_view 100 MERGED <HEAD>; refresh → at_endpoint

# 15 before declaration
oat --json project closeout-check "$P"       # exit 1, goal_not_declared, route oat-project-goal
oat --json project complete-state "$P"       # exit 1, no write (state.md byte-identical)

# 16 audit omitting outcome 2
setstate "{oat_goal_status: declared_met, oat_goal_outcome_audit: {disposition: met, …, outcomes: {'1': …}}}"
oat --json project closeout-check "$P"       # exit 1, goal_audit_invalid (audit-outcome-omitted)

# 17 exhaustive audit; oat config set workflow.createPrOnComplete true;
#    oat config set workflow.postImplementSequence '{"preApproval":["summary","pr"],"postApproval":[]}'
setstate "{oat_post_implement_sequence: {status: pre_approval, source: configured, pre_approval: [summary, pr],
  pre_approval_completed: [summary], approval: not_required, post_approval: [], post_approval_completed: [],
  satisfied_by: {pr: delivery-coverage}}}"
oat --json project closeout-check "$P"       # exit 1, snapshot_malformed (satisfied_by before pr position)

# 18 status: complete, pre_approval_completed: [summary, pr]; : > "$SCR/gh-calls.log"
oat --json project closeout-check "$P"       # exit 0, complete
oat --json project complete-state "$P"       # exit 0, ok
grep -c 'pr create' "$SCR/gh-calls.log"      # 0 (also with oat_pr_status projected merged)

# 19 document inputs: state/plan/implementation present; discovery/spec/design/summary absent;
#    plan Goal/Outcomes/Approach/Constraints/Decisions/phases; journal records; audit + registry readable
oat project scope "$P" --format value        # shared

# 20 retro inventory (evidence-and-lanes.md order) on goal-probe
oat --json project log check --project "$R/$P"   # 5 structural + 1 worked-well; learnings file unavailable

# 21 brief-probe: oat --json project new brief-probe --mode brief --scope shared; one execution record;
oat config set workflow.projectLog false
oat --json project log append --project <brief> --type worked-well --scope project --area probe --body "…"   # skipped
#    → write oat-execution-learnings.md (used); then projectLog true + one structural append (log used)

# 22 copy at the d02-merged commit: p-rev1 (m01) and p04 (m02) completed at one code commit R3;
#    d03 (m01 [p-rev1], corrects d01) and d04 (m02 [p04], corrects d02) on shared …/pull/101,
#    review rows d03/d04 passed at R3 with their artifacts; declaration line in implementation.md Final Summary;
#    exhaustive audit over p01, p02, p03, p-rev1, p04; completed snapshot
gh_view 101 MERGED <HEAD>
oat --json project closeout-check "$P"       # exit 0, complete (before 3ba63e2e5: review-not-fresh, sibling artifact
                                             # disallowed; with the declaration under the brief's Delivery endpoint and
                                             # authority: review-not-fresh substantive-change, fixed in b0f7cfacd)
#    negative: drop d04 → exit 1, goal_coverage_incomplete, phase-uncovered p04
```

## Teardown

```bash
rm -rf -- "$SCR" "$FH"
```
