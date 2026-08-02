import { canonicalStringify, validateContract } from './contracts.mjs';

const CATALOG_SCHEMA_VERSION = 'explainer-kit.initiative-catalog/v1';

export function initiativeCatalogPath(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError('Initiative catalog requires a safe initiative slug.');
  }
  return `site/initiatives/${slug}/catalog.json`;
}

export function catalogFromManifest(manifest, publicBaseUrl) {
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
    artifacts,
    sourceBacklinks: structuredClone(manifest.source.backlinks ?? []),
  };
}

export function validateInitiativeCatalog(catalog, manifest, publicBaseUrl) {
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
