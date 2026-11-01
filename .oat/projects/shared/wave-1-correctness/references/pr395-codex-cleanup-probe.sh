#!/usr/bin/env bash
# Usage: bash pr395-codex-cleanup-probe.sh <path to packages/cli/dist/index.js>
set -u
CLI="$1"
OUT=$(mktemp -d "${TMPDIR:-/tmp}/wave1-botprobe.XXXXXX")
trap 'rm -rf "$OUT"' EXIT
export HOME="$OUT/home"
mkdir -p "$HOME"

agent() {
  printf -- '---\nname: %s\ndescription: %s agent\n---\n\nYou are %s.\n' "$1" "$1" "$1"
}
setup() {
  local root="$1"
  mkdir -p "$root/.oat/sync" "$root/.agents/agents" "$root/.codex"
  git -C "$root" init -q
  printf '{"version":1,"defaultStrategy":"auto","providers":{"codex":{"enabled":true}}}\n' > "$root/.oat/sync/config.json"
}

echo "== F2: re-pointed [agents.gone] table"
R="$OUT/f2"; setup "$R"
agent gone > "$R/.agents/agents/gone.md"
agent keep > "$R/.agents/agents/keep.md"
node "$CLI" --cwd "$R" sync --scope project > /dev/null 2>&1; echo "initial sync exit=$?"
printf 'developer_instructions = "mine"\n' > "$R/.codex/agents/replacement.toml"
node -e 'const fs=require("fs");const p=process.argv[1];fs.writeFileSync(p,fs.readFileSync(p,"utf8").replace("config_file = \"agents/gone.toml\"","config_file = \"agents/replacement.toml\""))' "$R/.codex/config.toml"
grep -q 'config_file = "agents/replacement.toml"' "$R/.codex/config.toml" || { echo "probe setup failed: table not re-pointed"; exit 2; }
rm "$R/.agents/agents/gone.md"
node "$CLI" --cwd "$R" sync --scope project > /dev/null 2>&1; echo "second sync exit=$?"
grep -q '^\[agents.gone\]' "$R/.codex/config.toml" && echo "F2 table [agents.gone]: KEPT" || echo "F2 table [agents.gone]: DELETED"
[ -f "$R/.codex/agents/replacement.toml" ] && echo "F2 replacement.toml: kept" || echo "F2 replacement.toml: deleted"
[ -f "$R/.codex/agents/gone.toml" ] && echo "F2 leftover gone.toml: kept" || echo "F2 leftover gone.toml: removed"
grep -q '^\[agents.keep\]' "$R/.codex/config.toml" && echo "F2 control [agents.keep]: kept" || echo "F2 control [agents.keep]: deleted"

echo "== F1: symlinked .codex/agents outside the repository"
R="$OUT/f1"; X="$OUT/outside"; setup "$R"; mkdir -p "$X"
printf '# oat-managed: true\n# oat-role: oat-reviewer-gpt-6-sol-high\n# oat-owner: supported-catalogue\ndeveloper_instructions = "x"\n' > "$X/oat-reviewer-gpt-6-sol-high.toml"
ln -s "$X" "$R/.codex/agents"
node "$CLI" --cwd "$R" sync --scope project > /dev/null 2>&1; echo "sync exit=$?"
[ -f "$X/oat-reviewer-gpt-6-sol-high.toml" ] && echo "F1 external sentinel: SURVIVED" || echo "F1 external sentinel: DELETED"

echo "== F1 control: in-scope stale owned role is still removed"
R="$OUT/f1c"; setup "$R"; mkdir -p "$R/.codex/agents"
printf '# oat-managed: true\n# oat-role: oat-reviewer-gpt-6-sol-high\n# oat-owner: supported-catalogue\ndeveloper_instructions = "x"\n' > "$R/.codex/agents/oat-reviewer-gpt-6-sol-high.toml"
node "$CLI" --cwd "$R" sync --scope project > /dev/null 2>&1; echo "sync exit=$?"
[ -f "$R/.codex/agents/oat-reviewer-gpt-6-sol-high.toml" ] && echo "F1 control in-scope stale role: kept" || echo "F1 control in-scope stale role: removed"
