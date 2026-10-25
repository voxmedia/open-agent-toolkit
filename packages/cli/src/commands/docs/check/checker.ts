import {
  createExclusionMatcher,
  isExcludedPath,
} from '@commands/docs/shared/exclusions';
import {
  DOCS_CHECK_RULES,
  type DocsCheckRule,
} from '@config/documentation-check';

import type { DocsCheckResult, DocsFinding, Report } from './check.types';
import { checkCommands } from './commands';
import { checkDiagrams } from './diagrams';
import { readPage, readerFiles, resolveCheckTarget } from './files';
import type { ParsedPage } from './markdown';
import { checkNavigation } from './navigation';
import { checkProvenance, checkReaders } from './reader-rules';

/** Read-only portable checker. Output paths are content-root-relative POSIX. */
export async function checkDocs(options: {
  cwd: string;
  targetDir?: string;
  rules?: string[];
  /** Receives human notices; they never enter the JSON result. */
  onNotice?: (message: string) => void;
}): Promise<DocsCheckResult> {
  const unknown = options.rules?.find(
    (rule) => !DOCS_CHECK_RULES.includes(rule as DocsCheckRule),
  );
  if (unknown)
    throw new Error(
      `Unknown docs check rule "${unknown}". Choose: ${DOCS_CHECK_RULES.join(', ')}.`,
    );
  const target = await resolveCheckTarget(options.cwd, options.targetDir);
  for (const notice of target.notices) options.onNotice?.(notice);
  const policy = target.documentation.check;
  const findings: DocsFinding[] = [];
  const exceptions =
    policy?.exceptions?.map((e) => ({
      ...e,
      matcher: createExclusionMatcher([e.path]),
    })) ?? [];
  const report: Report = (ruleId, defaultSeverity, path, message, line) => {
    if (options.rules?.length && !options.rules.includes(ruleId)) return;
    let severity = policy?.rules?.[ruleId] ?? defaultSeverity;
    for (const e of exceptions)
      if (e.rule === ruleId && isExcludedPath(e.matcher, path))
        severity = e.severity ?? 'off';
    if (severity === 'off') return;
    findings.push({
      ruleId,
      severity,
      path,
      ...(line === undefined ? {} : { line }),
      message,
    });
  };
  const pages: ParsedPage[] = [];
  for (const path of await readerFiles(target)) {
    try {
      const page = await readPage(target, path);
      pages.push(page);
      if (page.frontmatterError)
        report('frontmatter', 'error', path, page.frontmatterError, 1);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      const safeCode =
        typeof code === 'string' && /^[A-Z][A-Z0-9_]*$/.test(code)
          ? code
          : 'UNKNOWN';
      report(
        'frontmatter',
        'error',
        path,
        `Cannot read documentation source (${safeCode}); check file permissions and readability.`,
        1,
      );
    }
  }
  await checkReaders(target, pages, report);
  checkProvenance(target, pages, report);
  if (!options.rules?.length || options.rules.includes('navigation'))
    await checkNavigation(target, report, (ruleId, path, line) =>
      findings.some(
        (f) => f.ruleId === ruleId && f.path === path && f.line === line,
      ),
    );
  if (!options.rules?.length || options.rules.includes('commands'))
    await checkCommands(target, pages, report);
  if (
    !options.rules?.length ||
    options.rules.some((r) =>
      [
        'mermaid',
        'diagram-accessibility',
        'diagram-pairs',
        'diagram-freshness',
        'image-alt',
      ].includes(r),
    )
  )
    await checkDiagrams(target, pages, report);
  findings.sort((a, b) =>
    a.path < b.path
      ? -1
      : a.path > b.path
        ? 1
        : (a.line ?? 0) - (b.line ?? 0) ||
          a.ruleId.localeCompare(b.ruleId) ||
          a.message.localeCompare(b.message),
  );
  return {
    summary: {
      errors: findings.filter((f) => f.severity === 'error').length,
      warnings: findings.filter((f) => f.severity === 'warn').length,
    },
    findings,
  };
}
