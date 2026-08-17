import { canonicalStringify, validateContract } from './contracts.mjs';

const CATALOG_SCHEMA_VERSION = 'explainer-kit.initiative-catalog/v1';

export const PUBLIC_VERIFICATION_REQUIRED = 'required';
export const PUBLIC_VERIFICATION_SKIPPED_BY_POLICY = 'skipped-by-policy';

/**
 * Single source of truth for public-verification state.
 *
 * The catalog is built, serialized and hashed *before* the first upload and long
 * before any per-artifact public verification runs, so it can never carry a
 * verification *outcome*: writing one would either require re-uploading the
 * catalog or invalidate the hash the receipt records for it. It therefore
 * carries verification *policy* only, and the authoritative outcome stays in the
 * run's publish receipt, which the catalog's `runId` identifies.
 *
 * Both the catalog marker and the receipt's skipped status are derived from this
 * one result so the two cannot drift apart.
 */
export function resolvePublicVerificationPolicy(publicAccess) {
  return publicAccess === 'protected'
    ? {
        publicAccess: 'protected',
        catalogMarker: PUBLIC_VERIFICATION_SKIPPED_BY_POLICY,
        verifyPublicly: false,
        receiptSkipStatus: 'skipped-protected',
      }
    : {
        publicAccess: 'public',
        catalogMarker: PUBLIC_VERIFICATION_REQUIRED,
        verifyPublicly: true,
        receiptSkipStatus: 'skipped-protected',
      };
}

/**
 * The public-access policy must be stated explicitly, never defaulted.
 *
 * It selects the catalog's `publicVerification` marker, which is part of the
 * serialized bytes and therefore of the catalog hash the receipt records. An
 * options bag that silently defaulted to the permissive `public` branch is what
 * let four call sites omit it and still produce a plausible-looking catalog:
 * the connector published `skipped-by-policy` for a `protected` run while the
 * durability verifier rebuilt `required`, so the hashes diverged and no
 * `protected` publication could ever be recorded durable.
 *
 * Passing `{ publicAccess: undefined }` is allowed and means `public` — that is
 * the correct reading for `publish-request/v1` and `publish-receipt/v1`, which
 * have no such field. Omitting the key entirely is a programming error.
 */
function requiredPublicAccess(options, caller) {
  if (
    options === null ||
    typeof options !== 'object' ||
    !('publicAccess' in options)
  ) {
    throw new TypeError(
      `${caller} requires an explicit { publicAccess } policy: it selects the catalog's publicVerification marker and therefore its hash. Pass { publicAccess: undefined } for v1 records, which are public by definition.`,
    );
  }
  return options.publicAccess;
}

export function initiativeCatalogPath(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError('Initiative catalog requires a safe initiative slug.');
  }
  return `site/initiatives/${slug}/catalog.json`;
}

export function catalogFromManifest(manifest, publicBaseUrl, options) {
  const publicAccess = requiredPublicAccess(options, 'catalogFromManifest');
  const validation = validateContract('manifest', manifest);
  if (!validation.valid) {
    throw new TypeError(
      `Initiative catalog requires a valid finalized manifest: ${validation.errors[0].message}`,
    );
  }
  const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
  const artifacts = manifest.artifacts.map((artifact) => {
    if (
      artifact.status !== 'built' ||
      typeof artifact.renderedPath !== 'string' ||
      !artifact.renderedPath.startsWith('site/') ||
      typeof artifact.hash !== 'string'
    ) {
      throw new TypeError(
        `Initiative catalog cannot publish non-built artifact ${artifact.id}.`,
      );
    }
    return {
      id: artifact.id,
      type: artifact.type,
      status: artifact.status,
      renderedPath: artifact.renderedPath,
      ...(artifact.mediaType && { mediaType: artifact.mediaType }),
      hash: artifact.hash,
      url: absoluteArtifactUrl(baseUrl, artifact.renderedPath),
    };
  });

  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    runId: manifest.runId,
    slug: manifest.slug,
    recipe: structuredClone(manifest.recipe),
    createdAt: manifest.createdAt,
    // Policy, never outcome. See resolvePublicVerificationPolicy.
    publicVerification:
      resolvePublicVerificationPolicy(publicAccess).catalogMarker,
    artifacts,
    sourceBacklinks: structuredClone(manifest.source.backlinks ?? []),
  };
}

export function validateInitiativeCatalog(
  catalog,
  manifest,
  publicBaseUrl,
  options,
) {
  const publicAccess = requiredPublicAccess(
    options,
    'validateInitiativeCatalog',
  );
  const errors = [];
  let normalizedPublicBaseUrl;
  try {
    normalizedPublicBaseUrl = normalizePublicBaseUrl(publicBaseUrl);
  } catch (error) {
    add(
      errors,
      '$.artifacts',
      'catalog-public-root',
      error instanceof Error
        ? error.message
        : 'Initiative catalog requires an HTTPS public base URL.',
    );
  }
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    return {
      valid: false,
      errors: [
        {
          path: '$',
          code: 'catalog-shape',
          message: 'Initiative catalog must be an object.',
        },
      ],
    };
  }
  const expectedRootKeys = new Set([
    'schemaVersion',
    'runId',
    'slug',
    'recipe',
    'createdAt',
    'publicVerification',
    'artifacts',
    'sourceBacklinks',
  ]);
  if (Object.keys(catalog).some((key) => !expectedRootKeys.has(key))) {
    add(
      errors,
      '$',
      'catalog-shape',
      'Initiative catalog contains an unknown property.',
    );
  }

  for (const [field, expected] of [
    ['schemaVersion', CATALOG_SCHEMA_VERSION],
    ['runId', manifest?.runId],
    ['slug', manifest?.slug],
    ['createdAt', manifest?.createdAt],
  ]) {
    if (catalog[field] !== expected) {
      add(
        errors,
        `$.${field}`,
        'catalog-manifest-mismatch',
        `Catalog ${field} does not match the finalized manifest.`,
      );
    }
  }
  // Derived from the same resolver the receipt status comes from, so a catalog
  // that disagrees with the run's resolved verification policy is rejected.
  const expectedPublicVerification =
    resolvePublicVerificationPolicy(publicAccess).catalogMarker;
  if (catalog.publicVerification !== expectedPublicVerification) {
    add(
      errors,
      '$.publicVerification',
      'catalog-verification-policy',
      `Catalog publicVerification must be ${expectedPublicVerification} for this run's public access policy.`,
    );
  }

  if (
    canonicalStringify(catalog.recipe) !== canonicalStringify(manifest?.recipe)
  ) {
    add(
      errors,
      '$.recipe',
      'catalog-manifest-mismatch',
      'Catalog recipe does not match the finalized manifest.',
    );
  }

  const catalogArtifacts = Array.isArray(catalog.artifacts)
    ? catalog.artifacts
    : [];
  const manifestArtifacts = Array.isArray(manifest?.artifacts)
    ? manifest.artifacts
    : [];
  if (
    !Array.isArray(catalog.artifacts) ||
    catalogArtifacts.length !== manifestArtifacts.length
  ) {
    add(
      errors,
      '$.artifacts',
      'catalog-artifact-parity',
      'Catalog artifacts must exactly cover the finalized manifest artifacts.',
    );
  }
  for (const [index, artifact] of manifestArtifacts.entries()) {
    const entry = catalogArtifacts[index];
    const expected = {
      id: artifact.id,
      type: artifact.type,
      status: artifact.status,
      renderedPath: artifact.renderedPath,
      ...(artifact.mediaType && { mediaType: artifact.mediaType }),
      hash: artifact.hash,
      url:
        normalizedPublicBaseUrl === undefined
          ? undefined
          : absoluteArtifactUrl(normalizedPublicBaseUrl, artifact.renderedPath),
    };
    const actual = entry && typeof entry === 'object' ? entry : undefined;
    if (canonicalStringify(actual) !== canonicalStringify(expected)) {
      add(
        errors,
        `$.artifacts[${index}]`,
        'catalog-artifact-mismatch',
        `Catalog artifact ${artifact.id} is stale or does not match the finalized manifest.`,
      );
    }
  }

  if (
    canonicalStringify(catalog.sourceBacklinks) !==
    canonicalStringify(manifest?.source?.backlinks ?? [])
  ) {
    add(
      errors,
      '$.sourceBacklinks',
      'catalog-source-mismatch',
      'Catalog source backlinks do not match the finalized manifest.',
    );
  }
  for (const [index, backlink] of (Array.isArray(catalog.sourceBacklinks)
    ? catalog.sourceBacklinks
    : []
  ).entries()) {
    if (
      typeof backlink?.sourceId !== 'string' ||
      !isImmutableGithubUrl(backlink?.url)
    ) {
      add(
        errors,
        `$.sourceBacklinks[${index}]`,
        'catalog-source-url',
        'Catalog source backlinks must be immutable absolute GitHub URLs.',
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function serializeInitiativeCatalog(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function normalizePublicBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(
      'Initiative catalog requires an HTTPS public base URL.',
    );
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new TypeError(
      'Initiative catalog requires credential-free HTTPS without query or fragment.',
    );
  }
  return url.href.replace(/\/+$/, '');
}

function absoluteArtifactUrl(baseUrl, renderedPath) {
  return `${baseUrl}/${renderedPath
    .slice('site/'.length)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`;
}

function isImmutableGithubUrl(value) {
  return (
    typeof value === 'string' &&
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[a-f0-9]{40}\/.+#L[1-9][0-9]*(?:-L[1-9][0-9]*)?$/.test(
      value,
    )
  );
}

function add(errors, path, code, message) {
  errors.push({ path, code, message });
}
