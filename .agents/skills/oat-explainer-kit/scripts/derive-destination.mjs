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
    s3Uri: normalizeRoot(s3Uri, 's3Uri', 's3:'),
    publicBaseUrl: normalizeRoot(publicBaseUrl, 'publicBaseUrl', 'https:'),
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

function normalizeRoot(value, label, protocol) {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a valid destination root.`);
  }
  const root = value.trim();
  const authorityStart = `${protocol}//`;
  if (!root.startsWith(authorityStart) || /\s|\\/.test(root)) {
    throw new Error(`${label} must be a valid destination root.`);
  }

  let parsed;
  try {
    parsed = new URL(root);
  } catch {
    throw new Error(`${label} must be a valid destination root.`);
  }
  const authority = root.slice(authorityStart.length).split(/[/?#]/, 1)[0];
  const invalidS3Bucket =
    protocol === 's3:' &&
    (parsed.port !== '' ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(parsed.hostname));
  if (
    parsed.protocol !== protocol ||
    !authority ||
    authority.includes('@') ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    invalidS3Bucket
  ) {
    throw new Error(`${label} must be a valid destination root.`);
  }
  return root.replace(/\/+$/, '');
}
