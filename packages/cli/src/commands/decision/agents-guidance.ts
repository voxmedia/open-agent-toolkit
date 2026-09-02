import { mkdir } from 'node:fs/promises';
import { isAbsolute, relative, sep } from 'node:path';

import {
  type UpsertSectionResult,
  upsertAgentsMdSection,
} from '@commands/shared/agents-md';

export const DECISION_AGENTS_SECTION_KEY = 'decisions';

const DEFAULT_DECISIONS_PATH = '.oat/repo/reference/decisions';

function portablePath(path: string): string {
  return path.split(sep).join('/');
}

function displayDecisionsPath(
  projectRoot: string,
  decisionsRoot: string,
): string {
  const relativePath = relative(projectRoot, decisionsRoot);
  if (
    relativePath.length > 0 &&
    !relativePath.startsWith('..') &&
    !isAbsolute(relativePath)
  ) {
    return portablePath(relativePath);
  }

  return portablePath(decisionsRoot);
}

export function buildDecisionAgentsSectionBody(
  decisionsPath = DEFAULT_DECISIONS_PATH,
): string {
  return [
    '### Decision Records',
    '',
    `- Durable repository decisions live under \`${decisionsPath}/\`; read \`${decisionsPath}/AGENTS.md\` before working with them.`,
    `- Before finalizing a durable repository decision, review \`${decisionsPath}/index.md\` and any relevant records.`,
    '- When the user asks to record a durable decision or confirms a proposed capture, use `oat-pjm-decision` when that skill is installed; otherwise use `oat decision new`.',
    '- Do not hand-edit the generated decision index; run `oat decision regenerate-index` after record changes or to resolve index conflicts.',
    '- Run `oat pjm doctor --json` and inspect `adoption.state` before any decision write.',
    '- If the decision surface is missing, repository adoption is absent or partial; stop and initialize it with `oat pjm init`.',
  ].join('\n');
}

export function buildScopedDecisionAgentsSectionBody(): string {
  return [
    '# Decision Record Guidance',
    '',
    '- This directory stores one Markdown file per durable repository decision plus a generated `index.md`.',
    '- Review the index and relevant existing records before finalizing a decision.',
    '- Create records with `oat decision new`; do not create IDs or filenames by hand.',
    '- Keep context, the chosen decision, and consequences in the decision record.',
    '- Do not hand-edit the generated table in `index.md`. Run `oat decision regenerate-index` after record changes or to resolve index conflicts.',
  ].join('\n');
}

export interface InitializeDecisionAgentsGuidanceOptions {
  projectRoot: string;
  decisionsRoot: string;
}

export interface DecisionAgentsGuidanceResult {
  root: UpsertSectionResult['action'];
  scoped: UpsertSectionResult['action'];
  recovery?: {
    root?: UpsertSectionResult['recovery'];
    scoped?: UpsertSectionResult['recovery'];
  };
}

export async function initializeScopedDecisionAgentsGuidance(
  decisionsRoot: string,
): Promise<UpsertSectionResult> {
  await mkdir(decisionsRoot, { recursive: true });
  return upsertAgentsMdSection(
    decisionsRoot,
    DECISION_AGENTS_SECTION_KEY,
    buildScopedDecisionAgentsSectionBody(),
  );
}

export async function initializeDecisionAgentsGuidance(
  options: InitializeDecisionAgentsGuidanceOptions,
): Promise<DecisionAgentsGuidanceResult> {
  const scoped = await initializeScopedDecisionAgentsGuidance(
    options.decisionsRoot,
  );
  const root = await upsertAgentsMdSection(
    options.projectRoot,
    DECISION_AGENTS_SECTION_KEY,
    buildDecisionAgentsSectionBody(
      displayDecisionsPath(options.projectRoot, options.decisionsRoot),
    ),
  );

  const recovery = {
    ...(root.recovery ? { root: root.recovery } : {}),
    ...(scoped.recovery ? { scoped: scoped.recovery } : {}),
  };
  return {
    root: root.action,
    scoped: scoped.action,
    ...(Object.keys(recovery).length > 0 ? { recovery } : {}),
  };
}
