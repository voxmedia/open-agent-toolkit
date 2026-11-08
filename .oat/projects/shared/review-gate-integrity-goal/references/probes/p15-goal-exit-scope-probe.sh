#!/usr/bin/env bash
# p15 corroborating probe (Outcome 7, BL-261104-goal-mode-exit-gate-resolve).
#
# Run from the repository root, after `pnpm build`, inside one isolated HOME:
#   bash scripts/with-isolated-home.sh \
#     bash .oat/projects/shared/review-gate-integrity-goal/references/probes/p15-goal-exit-scope-probe.sh
#
# Installs the branch build's skills and the released CLI's skills (`oat` on
# PATH, or $RELEASED_OAT) into two HOMEs under the isolated HOME, builds a goal
# fixture whose m01 (p01, p02) was squash-merged before m02 (p03, p04), and runs
# each installed oat-project-review-provide Step 3.0 anchor resolver without
# dispatching a model. The token for the state-selected `final` hint follows
# that install's Step 1: the milestone exit hint when the installed skill has
# it, otherwise the ordinary `final` (no recovery record is pending).
#
# Expected:
#   branch   state-selected final -> scope=p03-p04 phase_ids=p03,p04 verdict=accepted
#   branch   explicit code final  -> phase_ids=p01,p02,p03,p04 (whole project)
#   released state-selected final -> verdict=reconcile (sequential continuity)
set -euo pipefail

REPO=$(git rev-parse --show-toplevel)
BRANCH_CLI=("node" "$REPO/packages/cli/dist/index.js")
RELEASED_OAT=${RELEASED_OAT:-$(command -v oat)}
W=$(mktemp -d "$HOME/p15-probe.XXXXXX")
mkdir -p "$W/branch-home" "$W/released-home" "$W/cwd"

echo "branch CLI: $("${BRANCH_CLI[@]}" --version); released CLI: $("$RELEASED_OAT" --version)"
(cd "$W/cwd" && HOME="$W/branch-home" "${BRANCH_CLI[@]}" tools install workflows --scope user --no-project-guidance >/dev/null)
(cd "$W/cwd" && HOME="$W/released-home" "$RELEASED_OAT" tools install workflows --scope user --no-project-guidance >/dev/null)

# --- Fixture: m01 squash-merged into main, m02 built on the squash commit. ---
FX="$W/repo"
PROJECT_REL=.oat/projects/shared/fx
mkdir -p "$FX" && cd "$FX"
git init -q -b main
git config user.email probe@example.invalid
git config user.name probe
commit() { echo "$1" >>work.txt && git add work.txt && git commit -qm "$1" && git rev-parse HEAD; }
C0=$(commit "chore: init")
git checkout -qb goal-m01
P01=$(commit "feat(p01-t01): one")
P02=$(commit "feat(p02-t01): two")
git checkout -q main
git merge -q --squash goal-m01 >/dev/null && git commit -qm "m01 squash (#1)"
SQUASH=$(git rev-parse HEAD)
git checkout -qb goal-m02
P03=$(commit "feat(p03-t01): three")
P04=$(commit "feat(p04-t01): four")

mkdir -p "$PROJECT_REL"
cat >.oat/config.json <<'EOF'
{ "version": 1, "projects": { "root": ".oat/projects/shared", "defaultScope": "shared" } }
EOF
cat >"$PROJECT_REL/state.md" <<'EOF'
---
oat_phase: implement
oat_phase_status: in_progress
oat_workflow_mode: goal
oat_milestone: m02
oat_milestone_status: implementing
oat_goal_status: active
oat_goal_outcome_audit: null
oat_goal_recovery: null
oat_deliveries: []
---
EOF
cat >"$PROJECT_REL/plan.md" <<'EOF'
---
oat_plan_parallel_groups: []
oat_plan_source: goal
---

# Project Brief: fx

## Milestones

| Milestone | Phases   |
| --------- | -------- |
| m01       | p01, p02 |
| m02       | p03, p04 |

## Phase p01: One

**Intent:** one
**Exit evidence:** one
**Provisional:** no

## Phase p02: Two

**Intent:** two
**Exit evidence:** two
**Provisional:** no

## Phase p03: Three

**Intent:** three
**Exit evidence:** three
**Provisional:** no

## Phase p04: Four

**Intent:** four
**Exit evidence:** four
**Provisional:** no
EOF
{
  printf '# Implementation: fx\n'
  for row in "p01 $C0 $P01" "p02 $P01 $P02" "p03 $SQUASH $P03" "p04 $P03 $P04"; do
    set -- $row
    printf '\n## Phase %s: x\n\n**Status:** completed\n**Base:** %s\n**Head:** %s\n' "$1" "$2" "$3"
  done
} >"$PROJECT_REL/implementation.md"
git add -A && git commit -qm "chore(oat): fixture project"
PROJECT_PATH="$FX/$PROJECT_REL"

STATUS=$("${BRANCH_CLI[@]}" --json --cwd "$FX" project status --project-path "$PROJECT_REL")
read -r GOAL_STATUS RECOVERY MILESTONE MEMBERS < <(node -e '
  const p = JSON.parse(process.argv[1]).project;
  const m = p.milestoneMembership.milestones.find((x) => x.milestoneId === p.milestone);
  console.log(p.goalStatus, p.goalRecovery === null ? "none" : "pending", p.milestone, m.phaseIds.join(","));
' "$STATUS")
echo "fixture: goal=$GOAL_STATUS recovery=$RECOVERY milestone=$MILESTONE members=$MEMBERS m01 squashed at ${SQUASH:0:12}"

set +u # the installed resolver is written for an unset-tolerant shell
load_resolver() { # $1 installed SKILL.md: the Step 3.0 resolver block, verbatim
  awk '/^Run the resolver in bash/ { want = 1 } want && /^````bash$/ { on = 1; next }
       on && /^````$/ { exit } on { print }' "$1" | sed '$d' >"$W/resolver.sh"
  # shellcheck disable=SC1091
  source "$W/resolver.sh"
}

resolve() { # $1 label, $2 SCOPE_TOKEN
  SCOPE_TOKEN=$2
  brief_resolve_anchors
  local ids
  ids=$(IFS=,; echo "${PHASE_IDS[*]}")
  echo "$1: scope=$SCOPE_TOKEN phase_ids=$ids verdict=$ANCHOR_VERDICT${ANCHOR_REASON:+ reason=\"$ANCHOR_REASON\"}${SCOPE_RANGE:+ range=${SCOPE_RANGE:0:12}..${SCOPE_RANGE: -12}}"
}

state_selected_token() { # $1 installed SKILL.md: the token Step 1 selects
  if ! grep -q '^\*\*State-selected goal milestone exit hint' "$1"; then
    echo final # no milestone hint; no recovery pending -> ordinary final
    return
  fi
  [ "$GOAL_STATUS" = active ] && [ "$RECOVERY" = none ] || { echo final; return; }
  local ids first last
  IFS=, read -r -a ids <<<"$MEMBERS"
  for id in "${ids[@]}"; do
    [ "$(brief_marker "$id" Status)" = completed ] || { echo REFUSE; return; }
  done
  first=${ids[0]}; last=${ids[${#ids[@]}-1]}
  [ "$first" = "$last" ] && echo "$first" || echo "$first-$last"
}

for install in branch released; do
  SKILL="$W/$install-home/.agents/skills/oat-project-review-provide/SKILL.md"
  load_resolver "$SKILL"
  TOKEN=$(state_selected_token "$SKILL")
  echo "$install install: state-selected hint=final -> token=$TOKEN"
  resolve "$install state-selected" "$TOKEN"
  if [ "$install" = branch ]; then
    [ "$(IFS=,; echo "${PHASE_IDS[*]}")" = "$MEMBERS" ] && echo "branch state-selected: resolved set equals milestone $MILESTONE set ($MEMBERS)"
    resolve "branch explicit code final" final
  fi
done
