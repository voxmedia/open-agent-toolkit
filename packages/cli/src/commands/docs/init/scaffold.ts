import { readdir, readFile, writeFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';

import type { OatDocumentationConfig } from '@config/oat-config';
import { dirExists, ensureDir, fileExists } from '@fs/io';
import { OAT_VERSION } from '@shared/oat-version';

import { buildDocsCommands, shellQuote } from './docs-commands';
import { applyMarkdownDocsPlan, planMarkdownDocs } from './markdown';
import type {
  DocsFormatMode,
  DocsFramework,
  DocsInitResolvedOptions,
  DocsLintMode,
} from './resolve-options';
import { getTemplateDir } from './resolve-options';

interface TemplateFile {
  source: string;
  destination: string;
}

const MKDOCS_TEMPLATE_FILES: TemplateFile[] = [
  { source: 'AGENTS.md', destination: 'AGENTS.md' },
  ...['index.md', 'docs-toolchain.md'].map((name) => ({
    source: join('docs', 'contributing', name),
    destination: join('docs', 'contributing', name),
  })),
  { source: '.gitignore', destination: '.gitignore' },
  { source: 'mkdocs.yml', destination: 'mkdocs.yml' },
  { source: 'package.json.template', destination: 'package.json' },
  { source: 'requirements.txt', destination: 'requirements.txt' },
  { source: 'setup-docs.sh', destination: 'setup-docs.sh' },
  { source: join('docs', 'index.md'), destination: join('docs', 'index.md') },
  {
    source: join('docs', 'getting-started.md'),
    destination: join('docs', 'getting-started.md'),
  },
  {
    source: join('docs', 'contributing.md'),
    destination: join('docs', 'contributing.md'),
  },
];

const FUMA_TEMPLATE_FILES: TemplateFile[] = [
  { source: 'AGENTS.md', destination: 'AGENTS.md' },
  ...['index.md', 'docs-toolchain.md'].map((name) => ({
    source: join('docs', 'contributing', name),
    destination: join('docs', 'contributing', name),
  })),
  ...['llms.txt', 'llms-full.txt', 'llms/[...slug]'].map((route) => ({
    source: join('app', route, 'route.ts'),
    destination: join('app', route, 'route.ts'),
  })),
  { source: '.gitignore', destination: '.gitignore' },
  { source: 'next.config.js', destination: 'next.config.js' },
  { source: 'postcss.config.mjs', destination: 'postcss.config.mjs' },
  { source: 'source.config.ts', destination: 'source.config.ts' },
  { source: 'tsconfig.json', destination: 'tsconfig.json' },
  { source: 'package.json.template', destination: 'package.json' },
  {
    source: join('lib', 'source.ts'),
    destination: join('lib', 'source.ts'),
  },
  {
    source: join('app', 'globals.css'),
    destination: join('app', 'globals.css'),
  },
  {
    source: join('app', 'layout.tsx'),
    destination: join('app', 'layout.tsx'),
  },
  {
    source: join('components', 'search.tsx'),
    destination: join('components', 'search.tsx'),
  },
  {
    source: join('app', '[[...slug]]', 'page.tsx'),
    destination: join('app', '[[...slug]]', 'page.tsx'),
  },
  {
    source: join('app', 'api', 'search', 'route.ts'),
    destination: join('app', 'api', 'search', 'route.ts'),
  },
  { source: join('docs', 'index.md'), destination: join('docs', 'index.md') },
  {
    source: join('docs', 'getting-started.md'),
    destination: join('docs', 'getting-started.md'),
  },
  {
    source: join('docs', 'contributing.md'),
    destination: join('docs', 'contributing.md'),
  },
];

interface FrameworkConfig {
  templateFiles: TemplateFile[];
  sentinelFile: string;
}

const FRAMEWORK_CONFIGS: Record<
  Exclude<DocsFramework, 'markdown'>,
  FrameworkConfig
> = {
  mkdocs: {
    templateFiles: MKDOCS_TEMPLATE_FILES,
    sentinelFile: 'mkdocs.yml',
  },
  fumadocs: {
    templateFiles: FUMA_TEMPLATE_FILES,
    sentinelFile: 'next.config.js',
  },
};

export interface ScaffoldDocsAppOptions extends DocsInitResolvedOptions {
  assetsRoot: string;
}

export interface ScaffoldDocsAppResult {
  appRoot: string;
  createdFiles: string[];
  documentationConfig: OatDocumentationConfig;
}

export interface OatDepContext {
  isOatRepo: boolean;
  localPackages: Set<string>;
  oatPackageVersions: Record<string, string>;
}

type MaybePromise<T> = T | Promise<T>;

export interface ScaffoldDocsAppDependencies {
  detectPnpmVersion: () => MaybePromise<string | null | undefined>;
  hasInheritedPackageManager: (
    repoRoot: string,
    appRoot: string,
  ) => MaybePromise<boolean>;
}

const OAT_DEP_PACKAGES = [
  'cli',
  'docs-config',
  'docs-theme',
  'docs-transforms',
] as const;
const DEFAULT_OAT_PUBLISHED_VERSION = OAT_VERSION;
const PUBLIC_PACKAGE_VERSIONS_FILE = 'public-package-versions.json';
export const PNPM_FALLBACK = '10.13.1';

export async function detectIsOatRepo(repoRoot: string): Promise<boolean> {
  for (const pkg of OAT_DEP_PACKAGES) {
    if (!(await fileExists(join(repoRoot, 'packages', pkg, 'package.json')))) {
      return false;
    }
  }
  return true;
}

async function readBundledOatPackageVersions(
  assetsRoot: string,
): Promise<Record<string, string>> {
  try {
    const content = await readFile(
      join(assetsRoot, PUBLIC_PACKAGE_VERSIONS_FILE),
      'utf8',
    );
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return Object.fromEntries(
      OAT_DEP_PACKAGES.flatMap((name) =>
        typeof parsed[name] === 'string' ? [[name, parsed[name]]] : [],
      ),
    );
  } catch {
    return {};
  }
}

async function readCliVersion(assetsRoot: string): Promise<string> {
  const cliRoot = dirname(assetsRoot);
  try {
    const content = await readFile(join(cliRoot, 'package.json'), 'utf8');
    const pkg = JSON.parse(content) as { version?: string };
    return pkg.version ?? DEFAULT_OAT_PUBLISHED_VERSION;
  } catch {
    return DEFAULT_OAT_PUBLISHED_VERSION;
  }
}

function buildFallbackOatPackageVersions(
  version: string,
): Record<string, string> {
  return Object.fromEntries(OAT_DEP_PACKAGES.map((name) => [name, version]));
}

async function detectLocalOatPackages(repoRoot: string): Promise<Set<string>> {
  const found = new Set<string>();
  for (const pkg of OAT_DEP_PACKAGES) {
    if (await fileExists(join(repoRoot, 'packages', pkg, 'package.json'))) {
      found.add(pkg);
    }
  }
  return found;
}

export async function resolveOatDepContext(
  repoRoot: string,
  assetsRoot: string,
): Promise<OatDepContext> {
  const localPackages = await detectLocalOatPackages(repoRoot);
  const isOatRepo = localPackages.size === OAT_DEP_PACKAGES.length;
  if (isOatRepo) {
    return { isOatRepo, localPackages, oatPackageVersions: {} };
  }

  const cliVersion = await readCliVersion(assetsRoot);
  const oatPackageVersions = {
    ...buildFallbackOatPackageVersions(cliVersion),
    ...(await readBundledOatPackageVersions(assetsRoot)),
  };
  return { isOatRepo, localPackages, oatPackageVersions };
}

function buildFumaDevDependencies(
  lint: DocsLintMode,
  format: DocsFormatMode,
): string {
  const entries: string[] = [];

  if (lint === 'markdownlint-cli2') {
    entries.push('    "markdownlint-cli2": "^0.13.0"');
  }

  if (format === 'oxfmt') {
    entries.push('    "oxfmt": "^0.36.0"');
  }

  if (entries.length === 0) {
    return '';
  }

  return `,\n${entries.join(',\n')}`;
}

function jsonStringContent(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function buildNavSyncCheckCmd(isOatRepo: boolean, targetDir: string): string {
  return isOatRepo
    ? `pnpm -w run cli:source -- docs nav sync --target-dir ${shellQuote(targetDir)} --check`
    : 'oat docs nav sync --target-dir . --check';
}

function buildGenerateIndexCmd(isOatRepo: boolean, targetDir: string): string {
  if (isOatRepo) {
    return `pnpm -w run cli:source -- docs generate-index --docs-dir ${shellQuote(`${targetDir}/docs`)} --output ${shellQuote(`${targetDir}/index.md`)}`;
  }
  return 'oat docs generate-index --docs-dir docs --output index.md';
}

function oatDepVersion(depContext: OatDepContext, packageName: string): string {
  if (depContext.localPackages.has(packageName)) {
    return 'workspace:*';
  }
  return `^${depContext.oatPackageVersions[packageName] ?? DEFAULT_OAT_PUBLISHED_VERSION}`;
}

function detectPnpmVersionFromUserAgent(): string | null {
  const userAgent = process.env.npm_config_user_agent ?? '';
  return userAgent.match(/\bpnpm\/([^\s]+)/)?.[1] ?? null;
}

function isDescendantOrSame(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}

async function packageJsonHasPackageManager(
  packageJsonPath: string,
): Promise<boolean> {
  if (!(await fileExists(packageJsonPath))) {
    return false;
  }

  try {
    const parsed = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
      packageManager?: unknown;
    };
    return (
      typeof parsed.packageManager === 'string' &&
      parsed.packageManager.trim().length > 0
    );
  } catch {
    return false;
  }
}

async function hasInheritedPackageManager(
  repoRoot: string,
  appRoot: string,
): Promise<boolean> {
  const root = resolve(repoRoot);
  let current = resolve(dirname(appRoot));

  while (isDescendantOrSame(root, current)) {
    if (await packageJsonHasPackageManager(join(current, 'package.json'))) {
      return true;
    }

    if (current === root) {
      break;
    }
    current = dirname(current);
  }

  return false;
}

const DEFAULT_SCAFFOLD_DEPENDENCIES: ScaffoldDocsAppDependencies = {
  detectPnpmVersion: detectPnpmVersionFromUserAgent,
  hasInheritedPackageManager,
};

function normalizePnpmVersion(version: string | null | undefined): string {
  const trimmed = version?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : PNPM_FALLBACK;
}

async function buildPackageManagerField(
  options: DocsInitResolvedOptions,
  appRoot: string,
  dependencies: ScaffoldDocsAppDependencies,
): Promise<string> {
  if (
    await dependencies.hasInheritedPackageManager(options.repoRoot, appRoot)
  ) {
    return '';
  }

  const version = normalizePnpmVersion(await dependencies.detectPnpmVersion());
  return `,\n  "packageManager": ${JSON.stringify(`pnpm@${version}`)}`;
}

function renderTemplate(
  template: string,
  options: DocsInitResolvedOptions,
  depContext: OatDepContext,
  packageManagerField: string,
  nodeRequirement: string,
  packageJson: boolean,
): string {
  const repoName = basename(options.repoRoot);
  const commands = buildDocsCommands(
    options.repoShape,
    options.targetDir,
    options.appName,
  );
  const command = packageJson ? jsonStringContent : (value: string) => value;
  const replacements: Record<string, string> = {
    '// {{TURBOPACK_ROOT_IMPORTS}}\n':
      options.repoShape === 'nested-standalone'
        ? "import { dirname } from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\n"
        : '',
    '  // {{TURBOPACK_ROOT_OPTION}}\n':
      options.repoShape === 'nested-standalone'
        ? '  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },\n'
        : '',
    '{{OAT_CONFIG_RELATIVE_PATH}}': `./${relative(
      resolve(options.repoRoot, options.targetDir),
      join(options.repoRoot, '.oat/config.json'),
    ).replaceAll('\\', '/')}`,
    '{{APP_NAME}}': options.appName,
    '{{NODE_REQUIREMENT}}': nodeRequirement,
    '{{PACKAGE_NAME}}': options.appName,
    '{{SITE_NAME}}': options.siteName,
    '{{SITE_DESCRIPTION}}': options.siteDescription,
    '{{INSTALL_CMD}}': commands.install,
    '{{DEV_CMD}}': commands.dev,
    '{{BUILD_CMD}}': commands.build,
    '{{PACKAGE_MANAGER_FIELD}}': packageManagerField,
    '{{DOCS_LINT_SCRIPT}}':
      options.lint === 'markdownlint-cli2'
        ? "markdownlint-cli2 'docs/**/*.md'"
        : "echo 'docs lint disabled'",
    '{{LINT_PHRASE}}':
      options.lint === 'markdownlint-cli2'
        ? 'formatting and linting'
        : 'formatting',
    '{{DOCS_FORMAT_SCRIPT}}':
      options.format === 'oxfmt'
        ? "oxfmt 'docs/**/*.md'"
        : "echo 'docs formatting disabled'",
    '{{DOCS_FORMAT_CHECK_SCRIPT}}':
      options.format === 'oxfmt'
        ? "oxfmt --check 'docs/**/*.md'"
        : "echo 'docs format check disabled'",
    '{{DEV_DEPENDENCIES}}': buildFumaDevDependencies(
      options.lint,
      options.format,
    ),
    '{{FUMA_DEV_DEPENDENCIES}}': buildFumaDevDependencies(
      options.lint,
      options.format,
    ),
    '{{REPO_NAME}}': repoName,
    '{{APP_DIR}}': options.targetDir,
    '{{APP_CWD}}': shellQuote(options.targetDir),
    '{{LINT_STATUS}}':
      options.lint === 'none' ? 'disabled' : 'enabled (markdownlint-cli2)',
    '{{FORMAT_STATUS}}':
      options.format === 'none' ? 'disabled' : 'enabled (oxfmt)',
    '{{NAV_SYNC_CMD}}': command(
      buildNavSyncCheckCmd(depContext.isOatRepo, options.targetDir).replace(
        / --check$/,
        '',
      ),
    ),
    '{{GENERATE_INDEX_CMD}}': command(
      buildGenerateIndexCmd(depContext.isOatRepo, options.targetDir),
    ),
    '{{NAV_SYNC_CHECK_CMD}}': command(
      buildNavSyncCheckCmd(depContext.isOatRepo, options.targetDir),
    ),
    '{{OAT_DOCS_CONFIG_DEP}}': oatDepVersion(depContext, 'docs-config'),
    '{{OAT_DOCS_THEME_DEP}}': oatDepVersion(depContext, 'docs-theme'),
    '{{OAT_DOCS_TRANSFORMS_DEP}}': oatDepVersion(depContext, 'docs-transforms'),
    '{{OAT_CLI_DEP}}': oatDepVersion(depContext, 'cli'),
  };

  return Object.entries(replacements).reduce(
    (content, [token, value]) => content.replaceAll(token, value),
    template,
  );
}

/**
 * Seed `documentation.*` for a freshly scaffolded app.
 *
 * For Fumadocs, `index` names the generated app-root manifest that
 * `oat docs generate-index` writes (`<root>/index.md`), not the authored source
 * page at `<root>/docs/index.md`: the scaffold must be correct before the first
 * build rather than depending on a later config mutation. The MkDocs seed keeps
 * pointing at the nav/config YAML, which is that framework's entry point.
 */
export function buildDocumentationConfig(
  framework: DocsFramework,
  targetDir: string,
): OatDocumentationConfig {
  if (framework === 'markdown') {
    return {
      root: targetDir,
      tooling: 'markdown',
      index: join(targetDir, 'index.md'),
    };
  }
  if (framework === 'fumadocs') {
    return {
      root: targetDir,
      tooling: 'fumadocs',
      navOwner: 'nav-sync',
      index: join(targetDir, 'index.md'),
    };
  }

  return {
    root: targetDir,
    tooling: 'mkdocs',
    navOwner: 'nav-sync',
    config: join(targetDir, 'mkdocs.yml'),
    index: join(targetDir, 'mkdocs.yml'),
  };
}

async function detectNodeRequirement(repoRoot: string): Promise<string> {
  try {
    const nvmrc = (await readFile(join(repoRoot, '.nvmrc'), 'utf8')).trim();
    if (
      /^v?\d+(?:\.\d+){0,2}$/.test(nvmrc) ||
      /^(?:lts\/[a-z*]+|node|stable)$/.test(nvmrc)
    ) {
      return nvmrc;
    }
  } catch {
    // Repositories need not pin Node with .nvmrc.
  }
  try {
    const pkg = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as {
      engines?: { node?: unknown };
    };
    const requirement = pkg.engines?.node;
    if (
      typeof requirement === 'string' &&
      requirement.trim() &&
      !/[\r\n`]/.test(requirement)
    ) {
      return requirement.trim();
    }
  } catch {
    // Fall back to the CLI's supported minimum when no requirement is recorded.
  }
  return '>=22.17.0';
}

async function ensureTargetWritable(appRoot: string): Promise<void> {
  if (!(await dirExists(appRoot))) {
    return;
  }

  const entries = await readdir(appRoot);
  if (entries.length > 0) {
    throw new Error(`Docs app target directory is not empty: ${appRoot}`);
  }
}

export async function scaffoldDocsApp(
  options: ScaffoldDocsAppOptions,
  overrides: Partial<ScaffoldDocsAppDependencies> = {},
): Promise<ScaffoldDocsAppResult> {
  if (options.framework === 'markdown') {
    return applyMarkdownDocsPlan(await planMarkdownDocs(options));
  }
  const appRoot = join(options.repoRoot, options.targetDir);
  const templateDir = getTemplateDir(options.framework);
  const templateRoot = join(options.assetsRoot, 'templates', templateDir);
  const frameworkConfig = FRAMEWORK_CONFIGS[options.framework];
  const createdFiles: string[] = [];
  const depContext = await resolveOatDepContext(
    options.repoRoot,
    options.assetsRoot,
  );
  const dependencies = {
    ...DEFAULT_SCAFFOLD_DEPENDENCIES,
    ...overrides,
  };

  if (!(await fileExists(join(templateRoot, frameworkConfig.sentinelFile)))) {
    throw new Error(`Docs app templates not found under ${templateRoot}`);
  }

  await ensureTargetWritable(appRoot);
  await ensureDir(appRoot);
  const packageManagerField = await buildPackageManagerField(
    options,
    appRoot,
    dependencies,
  );

  const nodeRequirement = await detectNodeRequirement(options.repoRoot);

  for (const templateFile of frameworkConfig.templateFiles) {
    const source = join(templateRoot, templateFile.source);
    const destination = join(appRoot, templateFile.destination);
    const template = await readFile(source, 'utf8');
    const rendered = renderTemplate(
      template,
      options,
      depContext,
      packageManagerField,
      nodeRequirement,
      templateFile.destination === 'package.json',
    );
    await ensureDir(dirname(destination));
    await writeFile(destination, rendered, 'utf8');
    createdFiles.push(templateFile.destination);
  }

  return {
    appRoot,
    createdFiles,
    documentationConfig: buildDocumentationConfig(
      options.framework,
      options.targetDir,
    ),
  };
}
