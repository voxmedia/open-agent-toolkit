import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_BUILD_SCRIPT = 'turbo run build';
const ROOT_PACKAGE_PATH = 'package.json';

type RootPackagePatchReason =
  | 'missing-package-json'
  | 'no-build-script'
  | 'non-turbo-build-script'
  | 'existing-filter-flags'
  | 'existing-build-docs-script'
  | 'disabled';

type RootPackagePatchStatus =
  | 'applied'
  | 'dry-run'
  | 'skipped'
  | 'disabled'
  | 'already-configured';

interface RootPackageJson {
  scripts?: Record<string, string>;
}

export interface RootPackagePatchResult {
  status: RootPackagePatchStatus;
  reason?: RootPackagePatchReason;
  packageJsonPath: string;
  diff?: string;
  manualSnippet?: string;
  warnings: string[];
}

interface RootPackagePatchDependencies {
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  writeFile: (
    path: string,
    content: string,
    encoding: BufferEncoding,
  ) => Promise<void>;
}

interface RootPackagePatchOptions {
  repoRoot: string;
  appName: string;
  dryRun: boolean;
  enabled: boolean;
}

const DEFAULT_DEPENDENCIES: RootPackagePatchDependencies = {
  readFile,
  writeFile,
};

function runsTurboBuild(script: string): boolean {
  return /\bturbo\s+run\s+build\b/.test(script);
}

function removeFilterFlags(script: string): string {
  return script
    .replace(/\s+--filter(?:=|\s+)(?:"[^"]*"|'[^']*'|\S+)/g, '')
    .trim();
}

function getFilterFlags(script: string): string[] {
  return Array.from(
    script.matchAll(/\s+(--filter(?:=|\s+)(?:"[^"]*"|'[^']*'|\S+))/g),
    (match) => match[1]!,
  );
}

function buildExcludeFilter(appName: string): string {
  return `--filter='!${appName}'`;
}

function buildIncludeFilter(appName: string): string {
  return `--filter=${appName}...`;
}

function buildManualSnippet(appName: string, baseBuildScript?: string): string {
  const buildScript = baseBuildScript?.trim() || DEFAULT_BUILD_SCRIPT;

  return [
    '"scripts": {',
    `  "build": "${buildScript} ${buildExcludeFilter(appName)}",`,
    `  "build:docs": "${buildScript} ${buildIncludeFilter(appName)}"`,
    '}',
  ].join('\n');
}

function inferIndentation(content: string): string {
  const match = /\n([ \t]+)"/.exec(content);
  return match?.[1] ?? '  ';
}

function formatJsonWithOriginalStyle(
  original: string,
  value: RootPackageJson,
): string {
  const indentation = inferIndentation(original);
  const trailingNewline = original.endsWith('\n') ? '\n' : '';
  return `${JSON.stringify(value, null, indentation)}${trailingNewline}`;
}

function splitLines(content: string): string[] {
  const trimmed = content.endsWith('\n') ? content.slice(0, -1) : content;
  return trimmed.length > 0 ? trimmed.split('\n') : [];
}

type DiffOp =
  | { type: 'context'; line: string }
  | { type: 'remove'; line: string }
  | { type: 'add'; line: string };

function buildDiffOperations(
  beforeLines: string[],
  afterLines: string[],
): DiffOp[] {
  const lengths = Array.from({ length: beforeLines.length + 1 }, () =>
    Array<number>(afterLines.length + 1).fill(0),
  );

  for (
    let beforeIndex = beforeLines.length - 1;
    beforeIndex >= 0;
    beforeIndex -= 1
  ) {
    for (
      let afterIndex = afterLines.length - 1;
      afterIndex >= 0;
      afterIndex -= 1
    ) {
      lengths[beforeIndex]![afterIndex] =
        beforeLines[beforeIndex] === afterLines[afterIndex]
          ? lengths[beforeIndex + 1]![afterIndex + 1]! + 1
          : Math.max(
              lengths[beforeIndex + 1]![afterIndex]!,
              lengths[beforeIndex]![afterIndex + 1]!,
            );
    }
  }

  const operations: DiffOp[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      operations.push({ type: 'context', line: beforeLines[beforeIndex]! });
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    if (
      lengths[beforeIndex + 1]![afterIndex]! >=
      lengths[beforeIndex]![afterIndex + 1]!
    ) {
      operations.push({ type: 'remove', line: beforeLines[beforeIndex]! });
      beforeIndex += 1;
      continue;
    }

    operations.push({ type: 'add', line: afterLines[afterIndex]! });
    afterIndex += 1;
  }

  while (beforeIndex < beforeLines.length) {
    operations.push({ type: 'remove', line: beforeLines[beforeIndex]! });
    beforeIndex += 1;
  }

  while (afterIndex < afterLines.length) {
    operations.push({ type: 'add', line: afterLines[afterIndex]! });
    afterIndex += 1;
  }

  return operations;
}

function createUnifiedDiff(
  filePath: string,
  before: string,
  after: string,
): string {
  if (before === after) {
    return '';
  }

  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);
  const operations = buildDiffOperations(beforeLines, afterLines);

  return [
    `--- ${filePath}`,
    `+++ ${filePath}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
    ...operations.map((operation) => {
      const prefix =
        operation.type === 'context'
          ? ' '
          : operation.type === 'remove'
            ? '-'
            : '+';
      return `${prefix}${operation.line}`;
    }),
  ].join('\n');
}

export async function patchRootPackageJson(
  options: RootPackagePatchOptions,
  dependencies: RootPackagePatchDependencies = DEFAULT_DEPENDENCIES,
): Promise<RootPackagePatchResult> {
  const packageJsonPath = join(options.repoRoot, ROOT_PACKAGE_PATH);

  if (!options.enabled) {
    return {
      status: 'disabled',
      reason: 'disabled',
      packageJsonPath,
      warnings: [],
    };
  }

  let originalContent: string;
  try {
    originalContent = await dependencies.readFile(packageJsonPath, 'utf8');
  } catch {
    return {
      status: 'skipped',
      reason: 'missing-package-json',
      packageJsonPath,
      manualSnippet: buildManualSnippet(options.appName),
      warnings: [
        'Skipped root package.json patch: root package.json was not found.',
      ],
    };
  }

  const parsed = JSON.parse(originalContent) as RootPackageJson;
  const currentScripts = parsed.scripts ?? {};
  const currentBuildScript = currentScripts.build;

  if (!currentBuildScript) {
    return {
      status: 'skipped',
      reason: 'no-build-script',
      packageJsonPath,
      manualSnippet: buildManualSnippet(options.appName),
      warnings: [
        'Skipped root package.json patch: scripts.build is missing, so there was no Turbo build command to update.',
      ],
    };
  }

  if (!runsTurboBuild(currentBuildScript)) {
    return {
      status: 'skipped',
      reason: 'non-turbo-build-script',
      packageJsonPath,
      manualSnippet: buildManualSnippet(options.appName),
      warnings: [
        'Skipped root package.json patch: scripts.build does not run `turbo run build`, so OAT left it unchanged.',
      ],
    };
  }

  const excludeFilter = buildExcludeFilter(options.appName);
  const filterFlags = getFilterFlags(currentBuildScript);
  const hasUserAuthoredFilters = filterFlags.some(
    (flag) => flag !== excludeFilter,
  );

  if (hasUserAuthoredFilters) {
    return {
      status: 'skipped',
      reason: 'existing-filter-flags',
      packageJsonPath,
      manualSnippet: buildManualSnippet(
        options.appName,
        removeFilterFlags(currentBuildScript),
      ),
      warnings: [
        'Skipped root package.json patch: scripts.build already uses `--filter`, so OAT left it unchanged rather than guessing how to merge filter semantics.',
      ],
    };
  }

  const nextScripts = { ...currentScripts };
  const nextBuildScript = currentBuildScript.includes(excludeFilter)
    ? currentBuildScript
    : `${currentBuildScript.trim()} ${excludeFilter}`;
  nextScripts.build = nextBuildScript;

  const baseBuildScript = removeFilterFlags(currentBuildScript);
  const desiredBuildDocsScript = `${baseBuildScript} ${buildIncludeFilter(options.appName)}`;
  const warnings: string[] = [];

  if (
    nextScripts['build:docs'] &&
    nextScripts['build:docs'] !== desiredBuildDocsScript
  ) {
    warnings.push(
      'Left scripts["build:docs"] unchanged because the root package already defines a different value.',
    );
  } else {
    nextScripts['build:docs'] = desiredBuildDocsScript;
  }

  const nextContent = formatJsonWithOriginalStyle(originalContent, {
    ...parsed,
    scripts: nextScripts,
  });
  const diff = createUnifiedDiff(
    ROOT_PACKAGE_PATH,
    originalContent,
    nextContent,
  );

  if (!diff) {
    return {
      status: 'already-configured',
      packageJsonPath,
      warnings,
    };
  }

  if (!options.dryRun) {
    await dependencies.writeFile(packageJsonPath, nextContent, 'utf8');
  }

  return {
    status: options.dryRun ? 'dry-run' : 'applied',
    packageJsonPath,
    diff,
    manualSnippet:
      warnings.length > 0
        ? buildManualSnippet(options.appName, baseBuildScript)
        : undefined,
    warnings,
  };
}
