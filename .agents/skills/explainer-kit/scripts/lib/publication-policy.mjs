const SUCCESSFUL_STAGE_STATUSES = new Set(['passed', 'warned', 'skipped']);

export function assertManifestPublishable(manifest, { buildRecord } = {}) {
  const outcome = manifest?.outcome;
  const reviewFlagged = (manifest?.warnings ?? []).some((warning) =>
    String(warning).startsWith('visual-review-required:'),
  );
  const durableClean = outcome === 'built-durable' && !reviewFlagged;
  const inFlightClean =
    outcome === 'incomplete' &&
    !reviewFlagged &&
    isCleanPublicationTransition(buildRecord);

  if (!durableClean && !inFlightClean) {
    throw publicationOutcomeError(
      `Manifest outcome ${String(outcome ?? 'missing')} is not eligible for publication.`,
    );
  }
  return manifest;
}

function isCleanPublicationTransition(buildRecord) {
  if (
    !buildRecord ||
    buildRecord.outcome !== 'incomplete' ||
    !Array.isArray(buildRecord.stages)
  ) {
    return false;
  }
  const publishIndex = buildRecord.stages.findIndex(
    ({ id }) => id === 'publish',
  );
  if (
    publishIndex < 0 ||
    buildRecord.stages[publishIndex]?.status !== 'running'
  ) {
    return false;
  }
  return buildRecord.stages
    .slice(0, publishIndex)
    .every(
      ({ status, warnings = [] }) =>
        SUCCESSFUL_STAGE_STATUSES.has(status) &&
        !warnings.some((warning) =>
          String(warning).startsWith('visual-review-required:'),
        ),
    );
}

function publicationOutcomeError(message) {
  const error = new Error(message);
  error.code = 'E_PUBLISH_OUTCOME';
  return error;
}
