import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  remarkLinks,
  remarkMermaid,
  remarkTabs,
} from '@open-agent-toolkit/docs-transforms';
import { metaSchema } from 'fumadocs-core/source/schema';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { globSync } from 'tinyglobby';
import type { PluggableList } from 'unified';

import { collectionFiles } from './reader-paths.js';
import { createSearchConfig, type SearchConfig } from './search-config.js';

// Accept named-root inputs while keeping output compatible with fumadocs-mdx
// 14.3.2's generated server.docs conditional and core 16.10.2's MetaData.
const docsMetaSchema = metaSchema.extend({
  root: metaSchema.shape.root
    .unwrap()
    .or(
      metaSchema.shape.title
        .unwrap()
        .trim()
        .min(1)
        .transform(() => true),
    )
    .optional(),
});

export interface SourceConfigOptions {
  /** Explicit repository .oat/config.json location; no ancestor search. */
  oatConfigFile?: string | URL;
  /** The source.config.ts app directory; settings apply only to the matching app. */
  appRoot?: string | URL;
}

export interface SourceConfigResult {
  remarkPlugins: PluggableList;
  contentDir: string;
  search: SearchConfig;
  docs: { files: string[] };
  meta: { files: string[]; schema: typeof docsMetaSchema };
}

function nonReaderPaths(options: SourceConfigOptions): string[] {
  if (!options.oatConfigFile || !options.appRoot) return [];
  const configFile =
    options.oatConfigFile instanceof URL
      ? fileURLToPath(options.oatConfigFile)
      : resolve(options.oatConfigFile);
  const appRoot =
    options.appRoot instanceof URL
      ? fileURLToPath(options.appRoot)
      : options.appRoot;
  let config: { documentation?: { root?: unknown; nonReaderPaths?: unknown } };
  try {
    config = JSON.parse(readFileSync(configFile, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const doc = config.documentation;
  if (
    typeof doc?.root !== 'string' ||
    resolve(dirname(dirname(configFile)), doc.root.trim()) !== resolve(appRoot)
  )
    return [];
  if (doc.nonReaderPaths === undefined) return [];
  if (
    !Array.isArray(doc.nonReaderPaths) ||
    doc.nonReaderPaths.some(
      (value) => typeof value !== 'string' || !value.trim(),
    )
  ) {
    throw new Error(
      `Invalid documentation.nonReaderPaths in ${configFile}: expected an array of non-empty strings.`,
    );
  }
  return doc.nonReaderPaths as string[];
}

export function createSourceConfig(
  options: SourceConfigOptions = {},
): SourceConfigResult {
  const patterns = nonReaderPaths(options);
  const files = collectionFiles(patterns, ['md', 'mdx']);
  const appRoot =
    options.appRoot instanceof URL
      ? fileURLToPath(options.appRoot)
      : (options.appRoot ?? '.');
  const contentRoot = resolve(appRoot, 'docs');
  return {
    remarkPlugins: [
      remarkTabs,
      [
        remarkLinks,
        {
          contentRoot,
          getReaderFiles: () => globSync(files, { cwd: contentRoot }),
        },
      ],
      remarkAlert,
      remarkMermaid,
    ],
    contentDir: './docs',
    search: createSearchConfig(),
    docs: { files },
    meta: {
      files: collectionFiles(patterns, ['json', 'yaml']),
      schema: docsMetaSchema,
    },
  };
}
