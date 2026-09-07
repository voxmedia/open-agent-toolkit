import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { detectBoundaryTier } from '../recommender/boundary';
import { isMissingFileError } from '../shared/utils/errors';
import { parseFrontmatterRecord } from '../shared/utils/frontmatter';
import {
  normalizeNullableString,
  parseBoolean,
} from '../shared/utils/normalize';
import type { ArtifactStatus, ArtifactType } from '../types';
import { evaluateQuickPlanReadiness } from './quick-plan-readiness';

const ARTIFACT_TYPES: ArtifactType[] = [
  'discovery',
  'spec',
  'design',
  'plan',
  'implementation',
  'summary',
];

export async function scanArtifacts(
  projectPath: string,
): Promise<ArtifactStatus[]> {
  return Promise.all(
    ARTIFACT_TYPES.map(async (type) => {
      const path = join(projectPath, `${type}.md`);
      const content = await tryReadFile(path);

      if (content == null) {
        return {
          type,
          exists: false,
          path,
          status: null,
          readyFor: null,
          isTemplate: false,
          boundaryTier: 3,
          ...quickPlanReadinessFor(type, content),
        } satisfies ArtifactStatus;
      }

      const frontmatter = parseFrontmatterRecord(content);
      return {
        type,
        exists: true,
        path,
        status: normalizeNullableString(frontmatter.oat_status),
        readyFor: normalizeNullableString(frontmatter.oat_ready_for),
        isTemplate: parseBoolean(frontmatter.oat_template),
        boundaryTier: detectBoundaryTier(frontmatter, content),
        ...quickPlanReadinessFor(type, content),
      } satisfies ArtifactStatus;
    }),
  );
}

/**
 * Quick plan readiness belongs to `plan.md` alone, so every other artifact type
 * omits the key rather than reporting a vacuous verdict about a file the
 * predicate does not describe.
 */
function quickPlanReadinessFor(
  type: ArtifactType,
  content: string | null,
): Pick<ArtifactStatus, 'quickPlanReadiness'> {
  if (type !== 'plan') {
    return {};
  }

  return { quickPlanReadiness: evaluateQuickPlanReadiness(content) };
}

async function tryReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}
