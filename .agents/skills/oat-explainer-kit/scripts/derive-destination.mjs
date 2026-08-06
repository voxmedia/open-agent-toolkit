const INVOCATIONS = new Set(['project', 'repo', 'direct']);

export function deriveExplainerDestination({
  invocation,
  projectSlug,
  s3Uri,
  publicBaseUrl,
}) {
  if (!INVOCATIONS.has(invocation)) {
    throw new Error(`Unsupported explainer invocation: ${invocation}`);
  }
  const roots = {
    s3Uri: normalizeRoot(s3Uri, 's3Uri', /^s3:\/\/[^/\s]+(?:\/.*)?$/),
    publicBaseUrl: normalizeRoot(
      publicBaseUrl,
      'publicBaseUrl',
      /^https:\/\/[^\s]+$/,
    ),
  };
  if (invocation !== 'project') {
    return roots;
  }

  const encodedSlug = encodeProjectSlug(projectSlug);
  return {
    s3Uri: `${roots.s3Uri}/projects/${encodedSlug}`,
    publicBaseUrl: `${roots.publicBaseUrl}/projects/${encodedSlug}`,
  };
}

function encodeProjectSlug(projectSlug) {
  if (
    typeof projectSlug !== 'string' ||
    !projectSlug.trim() ||
    projectSlug === '.' ||
    projectSlug === '..' ||
    projectSlug.includes('/') ||
    projectSlug.includes('\\') ||
    projectSlug.includes('\0')
  ) {
    throw new Error(
      'Project slug must be a non-empty, safe path segment without traversal or separators.',
    );
  }
  return encodeURIComponent(projectSlug);
}

function normalizeRoot(value, label, pattern) {
  if (typeof value !== 'string' || !pattern.test(value.trim())) {
    throw new Error(`${label} must be a valid destination root.`);
  }
  return value.trim().replace(/\/+$/, '');
}
