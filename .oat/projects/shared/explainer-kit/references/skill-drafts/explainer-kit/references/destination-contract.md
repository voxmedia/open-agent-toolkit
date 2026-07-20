# Destination contract — publishing a rendered explainer set

How to publish a rendered visual explainer **set** to an S3-backed static site so the team can open it in a browser. This is **destination-blind**: the bucket, prefix, public URL, and auth all come from the explainer-kit env contract — nothing here is hardcoded to a specific site.

- **Bucket:** `s3://${EXPLAINER_S3_BUCKET}` (region defaults to `us-east-1`, override with `REGION`).
- **Key prefix:** `${EXPLAINER_S3_PREFIX}` if set, else the bucket root.
- **Served:** at `${EXPLAINER_PUBLIC_BASE_URL}/...` (CDN / ALB — public or internal/VPN, whatever the destination is).
- **Auth:** `EXPLAINER_AUTH=sso` → `aws sso login` first if creds are stale; do **not** auto-retry on an expired-SSO error — ask the user to re-auth, then re-run. `EXPLAINER_AUTH=profile[:name]` → plain aws CLI (`:name` adds `--profile <name>`).

## Always read the destination's own contract first

Before laying anything out, read the destination's live README/AGENTS if it publishes one — they are the source of truth and can change:

```bash
aws s3 cp s3://${EXPLAINER_S3_BUCKET}/${EXPLAINER_S3_PREFIX:+$EXPLAINER_S3_PREFIX/}README.md -
aws s3 cp s3://${EXPLAINER_S3_BUCKET}/${EXPLAINER_S3_PREFIX:+$EXPLAINER_S3_PREFIX/}AGENTS.md -
```

They may define typed top-level folders and destination-specific placement rules that override the generic layout below.

## Layout — an explainer SET is a cross-repo _initiative_

A whole set for a project is cross-repo material → use typed root folders with a kebab-case `<slug>` (`${EXPLAINER_SLUG}`), and an `initiatives/` landing page. Keys are relative to `${EXPLAINER_S3_PREFIX}` (or the bucket root when unset):

```
initiatives/<slug>/index.html      <- the hub (landing page that links everything)
initiatives/<slug>/catalog.json    <- machine index (see templates/catalog.json)
diagrams/<slug>/<artifact>/index.html   <- each diagram (schema-atlas, architecture, systems-map, ...)
explainers/<slug>/index.html       <- the engineering explainer
decks/<slug>/index.html            <- the bird's-eye deck
decks/<slug>/<name>/index.html     <- additional decks (e.g. options)
```

- Every browsable directory has an **`index.html`**.
- Reserve any lifecycle-archive folder the destination defines (e.g. `repositories/<repo-slug>/projects/`) for state/plan archives — **not** human-facing artifacts. Don't put presentations there.
- **Do not** delete/move/rename existing prefixes. **Never** upload secrets, credentials, `.env`, keys, or Terraform state.

## Upload settings (so pages render, not download)

- HTML → `--content-type "text/html; charset=utf-8"`. **This is the difference between rendering and force-downloading.**
- JSON → `--content-type "application/json"`.
- `--cache-control "public, max-age=300"` — 5-minute CDN cache. Re-syncs replace the object, but cached copies persist until the TTL expires.
- Objects are private to the bucket; the CDN/ALB serves them — do **not** add public-read ACLs.

Use **`scripts/publish.sh`** rather than ad-hoc `cp`s. Default **mirror mode** points `EXPLAINER_ARTIFACTS_ROOT` at your local artifacts dir laid out _as_ the publish tree and uploads every file to the matching (prefixed) key — so adding a diagram can't be silently forgotten (no hand-maintained file list to drift). It self-verifies the hub URL at the end.

## The two link gotchas (both bit us; bake them in)

1. **Cross-artifact links must be FULL absolute URLs** — `${EXPLAINER_PUBLIC_BASE_URL}/diagrams/<slug>/architecture/` — **never root-relative** (`/diagrams/...`). A root-relative href resolves to `file:///diagrams/...` and 404s whenever someone opens the HTML as a local file (and is fragile if the path prefix ever changes).
2. **Links to repo files must be GitHub blob links** — `https://github.com/<org>/<repo>/blob/<branch>/<path>` — **not bare repo paths** (a published page can't open `.oat/.../design.md`). Point at the **open PR branch** while it's in review; note that blob links to a PR branch 404 once it merges and the branch is deleted — repoint to `main` then. **PR/issue references are links too** — `https://github.com/<org>/<repo>/pull/589`, never bare `#589`. Unlike blob-to-branch links, PR/issue URLs survive merge, so PRs are always safely linkable.

## `catalog.json`

Encouraged under the initiative (`initiatives/<slug>/catalog.json`). Shape in `templates/catalog.json`:
`{ title, type:"initiative", initiative:<slug>, repo, base_url, url, updated, description, artifacts:[{title,type,url}] }`.
Use **absolute** `url`s (same gotcha #1). The template's `base_url` / `url` carry `${EXPLAINER_PUBLIC_BASE_URL}` as a token — **substitute the real public base URL at build time**. Include the companion **Google Doc(s)** as artifacts (`type:"gdoc"`), since they're part of the published set.

## Verify after publishing

`scripts/publish.sh` runs this check automatically at the end. To verify by hand (you may see a `301 → 200` — that's just trailing-slash normalization, not an error):

```bash
curl -sSL --max-time 15 -o /dev/null -w "%{http_code} %{content_type}\n" \
  "${EXPLAINER_PUBLIC_BASE_URL}/${EXPLAINER_S3_PREFIX:+$EXPLAINER_S3_PREFIX/}initiatives/<slug>/"
# expect: 200 text/html; charset=utf-8
```

If a publish _looks_ like it did nothing (no `upload:` lines), check `aws sts get-caller-identity` — a silent expired-SSO is the usual cause.
