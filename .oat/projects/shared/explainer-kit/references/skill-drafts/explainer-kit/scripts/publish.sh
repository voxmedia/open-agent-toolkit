#!/usr/bin/env bash
# Publish a visual explainer SET to an S3-backed static site (destination-blind).
# Files are served with text/html so they RENDER in-browser once fronted at
# ${EXPLAINER_PUBLIC_BASE_URL} (CDN / ALB — internal or public, whatever the destination is).
#
# Reads its whole configuration from the explainer-kit env contract — NO hardcoded destination:
#   EXPLAINER_S3_BUCKET       (required) destination bucket
#   EXPLAINER_S3_PREFIX       (optional) key prefix inside the bucket (default: bucket root)
#   EXPLAINER_PUBLIC_BASE_URL (required) public URL the artifacts render at (self-verify + link base)
#   EXPLAINER_AUTH            (optional) sso | profile[:name]  (default: sso)
#   EXPLAINER_SLUG           (required) kebab-case initiative slug
#   EXPLAINER_ARTIFACTS_ROOT (required) local artifacts dir laid out AS the publish tree
#   REGION                   (optional) AWS region (default: us-east-1)
#   MODE                     (optional) mirror | explicit (default: mirror)
#
# Two modes:
#   MIRROR (default, recommended) — ARTIFACTS_ROOT is laid out AS the publish tree
#     (initiatives/<slug>/index.html, diagrams/<slug>/<x>/index.html, explainers/<slug>/index.html, ...).
#     Uploads EVERY file under ROOT to the identical key (prefixed) — so adding a diagram can't be
#     silently forgotten (no hand-maintained file list to drift out of sync).
#   EXPLICIT — set MODE=explicit and edit the FILES list (local|key) for ad-hoc one-offs.
#
# Auth:
#   EXPLAINER_AUTH=sso           -> requires a valid `aws sso login` session. On an expired-SSO error,
#                                   do NOT auto-retry — ask the user to re-auth, then re-run.
#   EXPLAINER_AUTH=profile[:name]-> plain aws CLI; `:name` adds `--profile <name>` (bare `profile`
#                                   relies on ambient AWS_PROFILE / default credentials).
#
# Read the destination's own README.md/AGENTS.md first (see references/destination-contract.md).
set -euo pipefail

BUCKET="${EXPLAINER_S3_BUCKET:?set EXPLAINER_S3_BUCKET (unset = build-only; publish needs a destination)}"
PREFIX="${EXPLAINER_S3_PREFIX:-}"; PREFIX="${PREFIX%/}"          # optional key prefix, trailing slash stripped
SITE="${EXPLAINER_PUBLIC_BASE_URL:?set EXPLAINER_PUBLIC_BASE_URL (public URL the set renders at)}"; SITE="${SITE%/}"
SLUG="${EXPLAINER_SLUG:?set EXPLAINER_SLUG to the kebab-case initiative slug, e.g. voxstar-transition}"
ROOT="${EXPLAINER_ARTIFACTS_ROOT:-${ROOT:-}}"
AUTH="${EXPLAINER_AUTH:-sso}"
REGION="${REGION:-us-east-1}"
MODE="${MODE:-mirror}"
HTML="text/html; charset=utf-8"
CC="public, max-age=300"

# aws wrapper — add --profile only for profile:name auth
AWS_PROFILE_ARGS=()
case "$AUTH" in
  profile:*) AWS_PROFILE_ARGS=(--profile "${AUTH#profile:}");;
  profile)   :;;   # ambient AWS_PROFILE / default creds
  sso)       :;;   # valid SSO session assumed; NO auto-retry on expired-SSO
  *) echo "unknown EXPLAINER_AUTH='$AUTH' (want sso | profile[:name])" >&2; exit 1;;
esac
awsx(){ aws "${AWS_PROFILE_ARGS[@]}" "$@"; }

keypref(){ [ -n "$PREFIX" ] && printf '%s/' "$PREFIX"; return 0; }   # emits "<prefix>/" or nothing
ct_for(){ case "$1" in *.json) echo "application/json";; *) echo "$HTML";; esac; }

put(){ # <local-file> <key-relative-to-prefix>
  local f="$1" key="$(keypref)$2"
  [ -f "$f" ] || { echo "missing local file: $f" >&2; exit 1; }
  awsx s3 cp "$f" "s3://${BUCKET}/${key}" --region "$REGION" \
    --content-type "$(ct_for "$f")" --cache-control "$CC"
}

if [ "$MODE" = "mirror" ]; then
  ROOT="${ROOT:?mirror mode: set EXPLAINER_ARTIFACTS_ROOT to your local artifacts dir, laid out as the publish tree}"
  ROOT="${ROOT%/}"
  while IFS= read -r f; do
    put "$f" "${f#"$ROOT"/}"               # key = prefix + path relative to ROOT (so the local tree IS the layout)
  done < <(find "$ROOT" -type f \( -name '*.html' -o -name '*.json' \) | sort)
else
  # --- EXPLICIT mode: edit this list (local-path | key-relative-to-prefix) -----------------
  FILES=(
    "hub.html|initiatives/${SLUG}/index.html"
    "catalog.json|initiatives/${SLUG}/catalog.json"
    "architecture.html|diagrams/${SLUG}/architecture/index.html"
    "explainer.html|explainers/${SLUG}/index.html"
    "deck.html|decks/${SLUG}/index.html"
  )
  # ----------------------------------------------------------------------------------------
  for entry in "${FILES[@]}"; do
    local_file="${entry%%|*}"; local_file="${local_file%"${local_file##*[![:space:]]}"}"
    key="${entry##*|}"; key="${key#"${key%%[![:space:]]*}"}"
    put "$local_file" "$key"
  done
fi

# self-verify — catch a silent expired-SSO or wrong content-type in the SAME command
hub="${SITE}/$(keypref)initiatives/${SLUG}/"
echo ""; echo "Published to s3://${BUCKET}$([ -n "$PREFIX" ] && echo "/$PREFIX"). Verifying ${hub} ..."
code_ct="$(curl -sSL --max-time 15 -o /dev/null -w '%{http_code} %{content_type}' "$hub" 2>/dev/null || echo 'curl-failed')"
echo "  -> ${code_ct}"
case "$code_ct" in
  200\ text/html*) echo "OK — renders. (5-min CDN cache: re-runs replace objects, cached copies persist until TTL.)";;
  *) echo "WARN: expected '200 text/html'. Check 'aws sts get-caller-identity' (silent expired-SSO?) and the content-type." >&2;;
esac
