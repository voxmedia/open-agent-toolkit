import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import YAML from 'yaml';

import { detectBoundaryTier } from '../recommender/boundary';
import type { ArtifactStatus, ArtifactType } from '../types';

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;
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
      } satisfies ArtifactStatus;
    }),
  );
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

function parseFrontmatterRecord(content: string): Record<string, unknown> {
  const frontmatter = extractFrontmatter(content);
  if (frontmatter == null) {
    return {};
  }

  try {
    const parsed = YAML.parse(frontmatter);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function extractFrontmatter(content: string): string | null {
  const match = content.match(FRONTMATTER_PATTERN);
  return match?.[1] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }

  const normalized = value.trim();
  return normalized && normalized !== 'null' ? normalized : null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }

  return false;
}
