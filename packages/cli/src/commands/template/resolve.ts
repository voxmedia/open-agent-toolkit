import { stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  resolveTemplate,
  TemplateNotFoundError,
  type TemplateTier,
} from '@commands/shared/template-source';
import { CliError } from '@errors/index';

const TEMPLATE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Normalize a template name to its file name. `plan` and `plan.md` both map to
 * `plan.md`; anything that could address a path outside the template
 * directories (separators, `..`) is rejected.
 */
export function normalizeTemplateName(raw: string): string {
  if (!TEMPLATE_NAME_PATTERN.test(raw) || raw.includes('..')) {
    throw new CliError(
      `Invalid template name: ${raw}. Use a bare template name such as plan or plan.md.`,
      1,
    );
  }
  return raw.endsWith('.md') ? raw : `${raw}.md`;
}

export interface TemplateResolveResult {
  name: string;
  found: boolean;
  tier: TemplateTier | null;
  /** Set only for the repository and user tiers. */
  path: string | null;
  /** Absolute path written by `--output`, or `null` when nothing was written. */
  output: string | null;
}

export interface RunTemplateResolveOptions {
  name: string;
  cwd: string;
  home: string;
  output?: string;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
}

async function resolveTemplatesRoot(
  cwd: string,
  resolveProjectRoot: (cwd: string) => Promise<string>,
): Promise<string | undefined> {
  try {
    return resolve(await resolveProjectRoot(cwd), '.oat', 'templates');
  } catch (error) {
    // Outside a repository there is no repository tier; user and bundle
    // tiers still apply.
    if (error instanceof CliError) {
      return undefined;
    }
    throw error;
  }
}

async function writeOutput(dest: string, content: string): Promise<void> {
  const parent = dirname(dest);
  const parentStat = await stat(parent).catch(() => null);
  if (!parentStat?.isDirectory()) {
    throw new CliError(`Output directory does not exist: ${parent}`, 1);
  }
  try {
    await writeFile(dest, content, 'utf8');
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'EISDIR'
    ) {
      throw new CliError(`Output path is a directory: ${dest}`, 1);
    }
    throw error;
  }
}

/**
 * Resolve a template in repository, user, then bundle order and optionally
 * copy its content to `output`. A missing template returns `found: false`;
 * invalid names and write failures throw.
 */
export async function runTemplateResolve(
  options: RunTemplateResolveOptions,
): Promise<TemplateResolveResult> {
  const name = normalizeTemplateName(options.name);
  const templatesRoot = await resolveTemplatesRoot(
    options.cwd,
    options.resolveProjectRoot,
  );

  let resolved;
  try {
    resolved = await resolveTemplate({
      name,
      templatesRoot,
      home: options.home,
      assetsRoot: options.resolveAssetsRoot,
    });
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return { name, found: false, tier: null, path: null, output: null };
    }
    throw error;
  }

  let output: string | null = null;
  if (options.output !== undefined) {
    output = resolve(options.cwd, options.output);
    await writeOutput(output, resolved.content);
  }

  return {
    name,
    found: true,
    tier: resolved.tier,
    // The bundle lives inside the installed package; skills copy it through
    // `--output` instead of reading a package-manager path.
    path: resolved.tier === 'bundle' ? null : resolved.path,
    output,
  };
}
