import { join } from 'node:path';

import type { PromptContext } from '@commands/shared/shared.prompts';
import type { PackName } from '@commands/tools/shared/types';
import { CliError } from '@errors/index';
import type { Command } from 'commander';

export type ProjectGuidanceChoice =
  | { choice: 'accepted'; source: 'prompt' | 'flag' }
  | { choice: 'declined'; source: 'prompt' | 'flag' }
  | { choice: 'not-requested'; source: 'non-interactive-default' };

export type AgentsGuidanceAction =
  | 'declined'
  | 'not-requested'
  | 'create'
  | 'update'
  | 'no-change'
  | 'blocked';

export interface ProjectGuidancePack {
  pack: PackName;
  scope: 'project' | 'user' | 'both';
}

export interface AgentsGuidancePlan {
  repoRoot: string | null;
  target: string | null;
  action: AgentsGuidanceAction;
  sectionKey: 'tools';
  body: string;
  legacySectionAction: 'preserve' | 'remove';
  reason: string;
  choice: ProjectGuidanceChoice;
}

export interface PlanProjectGuidanceInput {
  repoRoot: string | null;
  packs: readonly ProjectGuidancePack[];
  explicitChoice?: boolean;
  interactive: boolean;
  confirmAction: (message: string, context: PromptContext) => Promise<boolean>;
}

const PACK_DESCRIPTIONS: Record<PackName, string> = {
  core: 'Diagnostics and documentation (oat-doctor, oat-docs)',
  docs: 'Documentation and instruction governance workflows',
  workflows:
    'Project lifecycle (create, discover, plan, implement, review, complete)',
  ideas: 'Idea capture and refinement',
  'project-management':
    'Local backlog, roadmap, and reference doc management (oat-pjm-* skills)',
  utility:
    'Standalone utilities (skill authoring, maintainability review, code reviews)',
  research: 'Research, analysis, verification, and synthesis',
  brainstorm: 'Always-on brainstorming entry point with visual companion',
};

export function buildToolPacksSectionBody(
  packs: readonly ProjectGuidancePack[],
): string {
  const userPacks = packs.filter(
    (pack) => pack.scope === 'user' || pack.scope === 'both',
  );
  const hasWorkflows = packs.some((pack) => pack.pack === 'workflows');
  const lines = [
    '## Tool Packs',
    '',
    '- **Skills directory:** `.agents/skills/`',
    '- **Discover available skills:** scan `.agents/skills/*/SKILL.md`',
    '- **Refresh provider views:** `oat sync --scope all`',
    '- **Update skills to latest versions:** `oat tools update`',
  ];

  if (userPacks.length > 0) {
    lines.push(
      `- **User-scoped skills:** \`~/.agents/skills/\` (${userPacks.map(({ pack }) => pack).join(', ')} packs installed at user scope)`,
    );
  }

  lines.push('', '### Installed Packs', '');
  for (const { pack, scope } of packs) {
    const suffix =
      scope === 'user'
        ? ' _(user scope)_'
        : scope === 'both'
          ? ' _(project + user scope)_'
          : '';
    lines.push(`- **${pack}** — ${PACK_DESCRIPTIONS[pack]}${suffix}`);
  }

  if (hasWorkflows) {
    lines.push(
      '',
      '### Workflow Execution Continuation',
      '',
      '- This guidance applies only to OAT project lifecycle execution, such as `oat-project-implement`, and OAT project review/receive flows. It does not apply to non-OAT tasks or ad-hoc work outside the OAT project workflow.',
      '- When executing an OAT project implementation or OAT project review workflow, do not stop at task boundaries, phase boundaries, or other clean checkpoints unless the configured HiLL checkpoint has been reached, a real blocker exists, or explicit user input is required.',
      '- Status summaries, completed bookkeeping, and "clean boundary" pauses are not valid stop reasons. After updating tracking artifacts, continue execution until an allowed stop condition applies.',
    );
  }

  return lines.join('\n');
}

export function parseProjectGuidanceFlags(
  args: readonly string[],
): boolean | undefined {
  const accepted = args.includes('--project-guidance');
  const declined = args.includes('--no-project-guidance');
  if (accepted && declined) {
    throw new CliError(
      '--project-guidance and --no-project-guidance cannot be used together.',
      1,
    );
  }
  if (accepted) return true;
  if (declined) return false;
  return undefined;
}

export function commandProjectGuidanceChoice(
  command: Command,
): boolean | undefined {
  let root = command;
  while (root.parent) root = root.parent;
  const rawArgs = (root as Command & { rawArgs?: string[] }).rawArgs;
  return parseProjectGuidanceFlags(rawArgs ?? process.argv.slice(2));
}

export function withProjectGuidanceOptions<TCommand extends Command>(
  command: TCommand,
): TCommand {
  if (!command.options.some(({ long }) => long === '--project-guidance')) {
    command.option(
      '--project-guidance',
      'Create or refresh repository AGENTS.md tool guidance',
    );
  }
  if (!command.options.some(({ long }) => long === '--no-project-guidance')) {
    command.option(
      '--no-project-guidance',
      'Decline repository AGENTS.md tool guidance',
    );
  }
  return command;
}

export async function planProjectGuidance(
  input: PlanProjectGuidanceInput,
): Promise<AgentsGuidancePlan> {
  let choice: ProjectGuidanceChoice;
  if (input.explicitChoice === true) {
    choice = { choice: 'accepted', source: 'flag' };
  } else if (input.explicitChoice === false) {
    choice = { choice: 'declined', source: 'flag' };
  } else if (!input.interactive) {
    choice = {
      choice: 'not-requested',
      source: 'non-interactive-default',
    };
  } else {
    const accepted = await input.confirmAction(
      'Create or refresh repository AGENTS.md tool guidance?',
      { interactive: input.interactive },
    );
    choice = accepted
      ? { choice: 'accepted', source: 'prompt' }
      : { choice: 'declined', source: 'prompt' };
  }

  const body = buildToolPacksSectionBody(input.packs);
  if (choice.choice === 'declined') {
    return {
      repoRoot: input.repoRoot,
      target: input.repoRoot ? join(input.repoRoot, 'AGENTS.md') : null,
      action: 'declined',
      sectionKey: 'tools',
      body,
      legacySectionAction: 'preserve',
      reason:
        'Project guidance was declined; capability placement is unchanged.',
      choice,
    };
  }
  if (choice.choice === 'not-requested') {
    return {
      repoRoot: input.repoRoot,
      target: input.repoRoot ? join(input.repoRoot, 'AGENTS.md') : null,
      action: 'not-requested',
      sectionKey: 'tools',
      body,
      legacySectionAction: 'preserve',
      reason:
        'Project guidance was not requested. Re-run with --project-guidance to create or refresh repository AGENTS.md.',
      choice,
    };
  }
  if (!input.repoRoot) {
    return {
      repoRoot: null,
      target: null,
      action: 'blocked',
      sectionKey: 'tools',
      body,
      legacySectionAction: 'preserve',
      reason:
        'Project guidance requires a repository root; capability installation remains independent.',
      choice,
    };
  }

  return {
    repoRoot: input.repoRoot,
    target: join(input.repoRoot, 'AGENTS.md'),
    action: 'update',
    sectionKey: 'tools',
    body,
    legacySectionAction: 'remove',
    reason: 'Project guidance was accepted and is ready to apply.',
    choice,
  };
}
