#!/usr/bin/env bash
# Render-QA helper for the explainer set (SKILL.md Step 6).
# Does the tedious, easy-to-botch scaffolding AROUND render QA:
#   1) static structural checks on every HTML file (self-containment, CDN/Mermaid, root-relative links,
#      rough tag balance, CSS animations)
#   2) serves the artifacts dir over local HTTP (file:// is blocked in headless / Playwright)
#   3) prints the per-page localhost URLs + the JS layout-probe + animation-disable snippets
# The actual browser LOAD stays a main-loop / MCP step — this just tees it up.
#
# Reads its config from the explainer-kit env contract:
#   EXPLAINER_ARTIFACTS_ROOT  (required) local artifacts dir (the publish-layout mirror)
#   EXPLAINER_PUBLIC_BASE_URL (optional) public base URL — used only in the root-relative-link hint
#   PORT                      (optional) local HTTP port (default: 8137)
#   CHECK_ONLY                (optional) 1 = static checks only, no server
#
# Usage:
#   EXPLAINER_ARTIFACTS_ROOT=/path/to/artifacts ./render-qa.sh          # static checks + serve (foreground)
#   EXPLAINER_ARTIFACTS_ROOT=... CHECK_ONLY=1 ./render-qa.sh            # static checks only, no server
#   EXPLAINER_ARTIFACTS_ROOT=... PORT=8137 ./render-qa.sh
# NOTE: intentionally NOT `set -e` — every check should run and report, not abort on the first finding.
set -uo pipefail

ROOT="${EXPLAINER_ARTIFACTS_ROOT:-${ROOT:?set EXPLAINER_ARTIFACTS_ROOT to your local artifacts dir (the publish-layout mirror)}}"
ROOT="${ROOT%/}"
BASE_URL="${EXPLAINER_PUBLIC_BASE_URL:-<your public base URL>}"; BASE_URL="${BASE_URL%/}"
PORT="${PORT:-8137}"
[ -d "$ROOT" ] || { echo "no such dir: $ROOT" >&2; exit 1; }

# portable (bash 3.2 — macOS) collect of *.html
HTML=()
while IFS= read -r f; do HTML+=("$f"); done < <(find "$ROOT" -type f -name '*.html' | sort)
[ "${#HTML[@]}" -gt 0 ] || { echo "no .html under $ROOT" >&2; exit 1; }

issues=0
flag(){ issues=$((issues+1)); printf '    \xE2\x9C\x97 %s\n' "$1"; }

echo "== static checks (${#HTML[@]} files under $ROOT) =="
for f in "${HTML[@]}"; do
  rel="${f#"$ROOT"/}"
  echo "  • $rel"
  # self-containment: external / CDN dependency
  grep -qEi '<(script|link)[^>]+(src|href)="https?://|@import[[:space:]]+url\(["'\'']?https?://|(src|href)="//|cdn\.|unpkg\.com|jsdelivr|googleapis\.com|cdnjs' "$f" \
    && flag "$rel: external/CDN dependency — must be self-contained (inline it)"
  # Mermaid (use HTML/CSS/SVG instead)
  grep -qiE 'mermaid' "$f" && flag "$rel: 'mermaid' reference — use HTML/CSS/SVG, not Mermaid-via-CDN"
  # root-relative cross-links resolve to file:/// and 404 locally
  grep -qE '(href|src)="/[A-Za-z]' "$f" && flag "$rel: root-relative link — use ABSOLUTE ${BASE_URL}/..."
  # rough tag balance (a literal tag inside a comment can false-positive — verify by eye)
  for tag in section main; do
    o=$(grep -oE "<${tag}[[:space:]>]" "$f" | wc -l | tr -d ' ')
    c=$(grep -oE "</${tag}>" "$f" | wc -l | tr -d ' ')
    [ "$o" = "$c" ] || flag "$rel: <$tag> open=$o close=$c — tag imbalance (or a literal in a comment)"
  done
  # CSS animations must be disabled for a stable screenshot
  grep -qiE '@keyframes|animation:' "$f" \
    && printf '    \xC2\xB7 note: %s has CSS animation — inject *{animation:none} before screenshotting\n' "$rel"
done
echo ""
if [ "$issues" -gt 0 ]; then echo "static checks: $issues issue(s) above — fix before publish."; else echo "static checks: clean."; fi
echo ""

[ "${CHECK_ONLY:-0}" = "1" ] && exit 0

cat <<'PROBE'
== browser render-QA — run per page in the LOADED browser (evaluate_script) ==
Disables animations, then probes for hidden overflow + heading readability:

  const s=document.createElement('style');
  s.textContent='*{animation:none!important;transition:none!important}';
  document.head.appendChild(s);
  JSON.stringify({
    pageOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    // INNER-container overflow — a diagram inside overflow-x:auto can hide its last step while the page looks fine:
    clipped: [...document.querySelectorAll('*')]
      .filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible')
      .map(el => el.className || el.tagName).slice(0, 20),
    heading: document.querySelector('h1,h2')?.innerText
  }, null, 2);
PROBE

echo ""
echo "== serving $ROOT at http://localhost:${PORT}/  (Ctrl-C to stop) =="
for f in "${HTML[@]}"; do echo "  http://localhost:${PORT}/${f#"$ROOT"/}"; done
echo ""
exec python3 -m http.server "$PORT" --directory "$ROOT"
