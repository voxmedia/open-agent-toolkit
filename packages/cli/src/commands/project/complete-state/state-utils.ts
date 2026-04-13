import {
  getFrontmatterBlock,
  getFrontmatterField,
} from '@commands/shared/frontmatter';
import {
  replaceFrontmatter,
  upsertFrontmatterField,
} from '@commands/shared/frontmatter-write';

export interface CompleteProjectStateOptions {
  archived: boolean;
  nowUtc: string;
  today: string;
}

function replaceLine(
  content: string,
  pattern: RegExp,
  nextLine: string,
): string {
  return pattern.test(content) ? content.replace(pattern, nextLine) : content;
}

function findSectionBounds(
  content: string,
  heading: string,
): { start: number; bodyStart: number; end: number } | null {
  const marker = `## ${heading}\n\n`;
  const start = content.indexOf(marker);
  if (start === -1) {
    return null;
  }

  const bodyStart = start + marker.length;
  const nextHeading = content.indexOf('\n## ', bodyStart);
  return {
    start,
    bodyStart,
    end: nextHeading === -1 ? content.length : nextHeading,
  };
}

function readSectionBody(content: string, heading: string): string {
  const bounds = findSectionBounds(content, heading);
  if (!bounds) {
    return '';
  }

  return content.slice(bounds.bodyStart, bounds.end).trim();
}

function replaceSection(
  content: string,
  heading: string,
  body: string,
): string {
  const bounds = findSectionBounds(content, heading);
  if (!bounds) {
    return content;
  }

  return [
    content.slice(0, bounds.start),
    `## ${heading}\n\n${body.trim()}\n`,
    content.slice(bounds.end),
  ].join('');
}

function renderCompletedProgress(content: string): string {
  const existingLines = readSectionBody(content, 'Progress')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.startsWith('- ✓'));

  if (!existingLines.includes('- ✓ Project lifecycle complete')) {
    existingLines.push('- ✓ Project lifecycle complete');
  }

  return existingLines.join('\n');
}

export function renderCompletedProjectState(
  content: string,
  options: CompleteProjectStateOptions,
): string {
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    throw new Error('state.md is missing frontmatter');
  }

  let nextBlock = upsertFrontmatterField(
    frontmatter,
    'oat_lifecycle',
    'complete',
    true,
  ).nextBlock;
  nextBlock = upsertFrontmatterField(
    nextBlock,
    'oat_project_completed',
    `"${options.nowUtc}"`,
    true,
  ).nextBlock;
  nextBlock = upsertFrontmatterField(
    nextBlock,
    'oat_project_state_updated',
    `"${options.nowUtc}"`,
    true,
  ).nextBlock;

  let nextContent =
    nextBlock === frontmatter
      ? content
      : replaceFrontmatter(content, nextBlock);

  nextContent = replaceLine(
    nextContent,
    /^\*\*Status:\*\*.*$/m,
    '**Status:** Complete',
  );
  nextContent = replaceLine(
    nextContent,
    /^\*\*Last Updated:\*\*.*$/m,
    `**Last Updated:** ${options.today}`,
  );

  const currentPhase = options.archived
    ? 'Lifecycle complete; archived locally'
    : 'Lifecycle complete';
  nextContent = replaceSection(nextContent, 'Current Phase', currentPhase);
  nextContent = replaceSection(
    nextContent,
    'Progress',
    renderCompletedProgress(nextContent),
  );
  nextContent = replaceSection(
    nextContent,
    'Next Milestone',
    'None. Project complete.',
  );

  const currentLifecycle = getFrontmatterField(nextBlock, 'oat_lifecycle');
  if (currentLifecycle !== 'complete') {
    throw new Error('Failed to set oat_lifecycle: complete');
  }

  return nextContent;
}
