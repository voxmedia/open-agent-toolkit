import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { IA_PRESET_IDS, type IaPresetId } from '@config/documentation-ia';

export const IA_PRESETS = IA_PRESET_IDS;
export type IaPreset = IaPresetId;
export interface PresetSelection {
  iaPreset?: IaPreset;
  plannedPages?: number;
}

/** Validate the opt-in pair before planning or writing any scaffold files. */
export function resolvePresetSelection(
  preset?: string,
  count?: string | number,
): PresetSelection {
  if (preset === undefined && count === undefined) return {};
  if (preset === undefined || count === undefined)
    throw new Error('--ia-preset and --planned-pages are required together.');
  if (!IA_PRESETS.includes(preset as IaPreset))
    throw new Error(
      `Unknown IA preset "${preset}". Choose: ${IA_PRESETS.join(', ')}.`,
    );
  if (
    !/^\d+$/.test(String(count)) ||
    !Number.isSafeInteger(Number(count)) ||
    Number(count) < 1
  )
    throw new Error(
      '--planned-pages must be an integer of at least 1 (anticipated reader pages only).',
    );
  return { iaPreset: preset as IaPreset, plannedPages: Number(count) };
}

interface Track {
  path: string;
  title: string;
  principle: string;
  purpose: string;
  sections: [title: string, guidance: string][];
}
const engineering: Track = {
  path: 'engineering',
  title: 'Engineering',
  principle:
    'Domain and implementation contracts alongside paired feature pages',
  purpose:
    'Engineering is hybrid: enter by domain or implementation contract when changing shared behavior, and by feature when following its paired Product and QA pages.',
  sections: [
    [
      'Domain contracts',
      'Place shared domain rules, interface boundaries and invariants here; link the features that depend on them.',
    ],
    [
      'Feature implementation',
      'Link implementation details for each feature to its Product intent, shared domain contracts and QA validation.',
    ],
    [
      'Operations and failure modes',
      'Place diagnosis, recovery and operational limits here; link runbooks and incident solution records.',
    ],
  ],
};
const TRACKS: Record<IaPreset, Track[]> = {
  'product-engineering-qa': [
    {
      path: 'product',
      title: 'Product',
      principle: 'Feature or journey',
      purpose:
        'Product readers enter by feature or journey to understand availability, intended behavior and user-visible boundaries.',
      sections: [
        [
          'Availability',
          'Describe who can use each feature, supported environments and known availability limits; link its feature page.',
        ],
        [
          'Journeys and behavior',
          'Place feature goals and ordered user journeys here, with their expected user-visible outcomes.',
        ],
        [
          'States and boundaries',
          'Document visible states, transitions, empty and error behavior, and what each feature excludes.',
        ],
      ],
    },
    engineering,
    {
      path: 'qa',
      title: 'QA',
      principle: 'Feature or journey with reproducible verification',
      purpose:
        'QA readers enter by feature or journey to reproduce behavior with named seeds, ready signals, exact expectations and cleanup.',
      sections: [
        [
          'Seeds and configuration',
          'Place reproducible test data, configuration and ready signals here; identify safe setup and cleanup.',
        ],
        [
          'Scenarios',
          'Organize validation by feature or journey, with actions, exact expectations and links to the supported contract.',
        ],
        [
          'Execution evidence',
          'Keep dated runs, observed results and discrepancies here, separate from planned automation and implemented assertions.',
        ],
      ],
    },
  ],
  'consumer-maintainer': [
    {
      path: 'consumer',
      title: 'Consumer',
      principle: 'Reader task and supported contract',
      purpose:
        'Consumers enter by the task they need to complete and the supported contract they can rely on.',
      sections: [
        [
          'Start here',
          'Link the shortest supported first task, including prerequisites and a result the reader can verify.',
        ],
        [
          'Tasks',
          'Place bounded procedures for consumer goals here; link required inputs and verification steps.',
        ],
        [
          'Supported reference',
          'Collect supported interfaces, inputs, outputs and compatibility limits for consumer lookup.',
        ],
      ],
    },
    {
      path: 'maintainer',
      title: 'Maintainer',
      principle: 'Change, operation and maintenance responsibility',
      purpose:
        'Maintainers enter by the responsibility they own: implementation, delivery, operations or support of the shared contract.',
      sections: [
        [
          'Implementation contracts',
          'Place internal interfaces, invariants and ownership boundaries here for maintainers changing behavior.',
        ],
        [
          'Delivery',
          'Document release preparation, compatibility checks, rollout and rollback responsibilities here.',
        ],
        [
          'Operations',
          'Link routine maintenance, diagnostic procedures and recovery runbooks, with their authority and safety boundaries.',
        ],
      ],
    },
  ],
  'domain-engineering': [engineering],
  'task-type': [
    {
      path: 'tutorials',
      title: 'Tutorials',
      principle: 'Learning by a complete safe exercise',
      purpose:
        'Learners enter through a guided exercise with a clear starting state and an independently verifiable result.',
      sections: [
        [
          'Prerequisites',
          'State the required knowledge, access, environment and safe starting data before the reader begins.',
        ],
        [
          'Guided exercise',
          'Walk through one complete learning exercise in order, explaining what each step demonstrates.',
        ],
        [
          'Expected result',
          'Show how to recognize a successful exercise and compare the observed result with the learning goal.',
        ],
      ],
    },
    {
      path: 'how-to',
      title: 'How-to',
      principle: 'One concrete reader task',
      purpose:
        'Readers who know their goal enter by task, confirm prerequisites and follow a bounded procedure.',
      sections: [
        [
          'Prerequisites',
          'State the required knowledge, access, environment and safe starting data before the reader begins.',
        ],
        [
          'Procedure',
          'Give the ordered actions for one concrete task, including decision points and supported alternatives.',
        ],
        [
          'Verification and cleanup',
          'Explain how to check the task result, remove temporary resources and recover from an incomplete attempt.',
        ],
      ],
    },
    {
      path: 'reference',
      title: 'Reference',
      principle: 'Lookup by supported interface or contract',
      purpose:
        'Readers enter by a named interface or contract to find exact inputs, outputs, defaults and supported limits.',
      sections: [
        [
          'Interfaces',
          'Describe supported commands, APIs or configuration fields with their accepted inputs and observable outputs.',
        ],
        [
          'Defaults and limits',
          'Record source-verified defaults, supported ranges and compatibility constraints for precise lookup.',
        ],
        [
          'Failure behavior',
          'Describe errors, partial outcomes and recovery expectations for each supported interface.',
        ],
      ],
    },
    {
      path: 'explanation',
      title: 'Explanation',
      principle: 'Understanding concepts and tradeoffs',
      purpose:
        'Readers enter by a concept or design question to understand relationships, constraints and tradeoffs.',
      sections: [
        [
          'Concepts',
          'Explain the vocabulary and mental models readers need before following task or reference pages.',
        ],
        [
          'Relationships',
          'Show how the concepts and components depend on one another, linking their canonical contracts.',
        ],
        [
          'Tradeoffs',
          'Explain design choices, alternatives and constraints, linking the decisions that establish them.',
        ],
      ],
    },
  ],
  'toolkit-cli': [
    {
      path: 'tools',
      title: 'Tools',
      principle: 'Tool, skill or command invocation',
      purpose:
        'Tool users enter by command or skill, confirm prerequisites and mutation scope, then inspect the expected output.',
      sections: [
        [
          'Invocation',
          'Document how to invoke each command or skill, including prerequisites and supported examples.',
        ],
        [
          'Inputs and side effects',
          'Describe accepted arguments and configuration, mutation scope, required approval and external effects.',
        ],
        [
          'Outputs',
          'Document result fields, generated artifacts, exit behavior and the next action each outcome supports.',
        ],
      ],
    },
    {
      path: 'workflows',
      title: 'Workflows',
      principle: 'Reader goal across a sequence of tools',
      purpose:
        'Workflow users enter by their goal and follow an ordered sequence of tools with explicit authority and handoffs.',
      sections: [
        [
          'Starting state',
          'State the reader goal, required inputs, authority and ready signals before a workflow begins.',
        ],
        [
          'Sequence and handoffs',
          'Order the tools and decisions, naming what each step passes to the next responsible actor.',
        ],
        [
          'Completion evidence',
          'Define the observable result that closes the workflow and where to retain its execution evidence.',
        ],
      ],
    },
  ],
  'flat-small': [
    {
      path: 'start-here',
      title: 'Start here',
      principle: 'Reader goal in a flat grouped index',
      purpose:
        'Readers enter by their immediate goal, using one grouped index instead of navigating a hierarchy before choosing a task.',
      sections: [
        [
          'Reader tasks',
          'Group links by the immediate goals readers need to accomplish, keeping each procedure focused.',
        ],
        [
          'Reference',
          'Link canonical interface and configuration facts for lookup without repeating them in task pages.',
        ],
        [
          'Operations',
          'Link routine maintenance, diagnostic procedures and recovery runbooks, with their authority and safety boundaries.',
        ],
      ],
    },
  ],
};
const SUPPORT_TEMPLATES = [
  'alert-runbook',
  'solution-record',
  'command-reference',
  'skill-command-guide',
  'decisions-pointer',
  'per-area-agents',
];
const TRIAD_TEMPLATES = [
  'product-feature',
  'engineering-feature',
  'qa-validation',
  'screen-spec',
  ...SUPPORT_TEMPLATES,
];
export function mergeTemplateExclusion(paths: string[] = []): string[] {
  return [...new Set([...paths, 'contributing/templates/**'])];
}
function page(title: string, description: string, body: string): string {
  return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n# ${title}\n\n${body}\n`;
}
function link(title: string, path: string, description: string): string {
  return `- [${title}](${path}) - ${description}`;
}

/** Shared narrow content plan; bodies are loaded from the bundled canonical skill. */
export async function planPresetContent(
  options: PresetSelection & {
    assetsRoot: string;
    siteName: string;
    siteDescription?: string;
    markdown: boolean;
  },
): Promise<{
  files: { name: string; content: string }[];
  guidance: string;
} | null> {
  const selection = resolvePresetSelection(
    options.iaPreset,
    options.plannedPages,
  );
  if (!selection.iaPreset) return null;
  const preset = selection.iaPreset;
  const tracks = TRACKS[preset];
  const flat = selection.plannedPages! < 15 || preset === 'flat-small';
  const files: { name: string; content: string }[] = [];
  const rootLinks: string[] = [];
  for (const track of tracks) {
    const guideName = flat ? `${track.path}.md` : `${track.path}/start-here.md`;
    const indexName = `${track.path}/index.md`;
    const guideTitle = `${track.title}: choose a safe first task`;
    const guide = `${track.purpose}\n\n## Choose the right contract\n\nIdentify your goal and supported environment before acting. Check availability, permissions and prerequisites in the repository's current source and reviewed guidance. A missing fact is a review gap, not permission to guess.\n\n## Establish a safe starting state\n\nPrefer an isolated example or read-only inspection. Record relevant configuration and inputs, avoid real personal data, and identify the owner of any external dependency. For changes, confirm approval and a cleanup or rollback route before proceeding.\n\n## Verify the result\n\nCompare the observable result with the supported contract. Keep concepts in prose; use backticks only for literals verified in source. Separate proposed automation, implemented test assertions and dated execution evidence. Escalate a discrepancy with the input, expected result and observed evidence.\n\n## Continue\n\nReturn to the [${flat ? 'documentation map' : `${track.title} map`}](index.md) to choose the next reader goal.\n`;
    files.push({
      name: guideName,
      content: page(
        guideTitle,
        `Select prerequisites, boundaries and a verifiable first result for ${track.title.toLowerCase()} work.`,
        guide,
      ),
    });
    if (flat) {
      rootLinks.push(
        `### ${track.title}\n\n${track.purpose}\n\n${link(guideTitle, guideName, 'Choose a safe starting state and verify the result.')}\n`,
      );
    } else {
      const sections = track.sections
        .map(([title, guidance]) => `## ${title}\n\n${guidance}`)
        .join('\n\n');
      files.push({
        name: indexName,
        content: page(
          track.title,
          track.purpose,
          `${track.purpose}\n\nEntry principle: ${track.principle}. This track owns its canonical facts; route to shared contracts and paired pages rather than copying their claims.\n\n## Contents\n\n${link(guideTitle, 'start-here.md', 'Choose a safe starting state and verify the result.')}\n\n${sections}`,
        ),
      });
      rootLinks.push(link(track.title, indexName, track.purpose));
    }
  }
  const contributor = options.markdown
    ? 'contributing.md'
    : 'contributing/index.md';
  rootLinks.push(
    `${flat ? '### Contributing\n\n' : ''}${link('Contributing', contributor, 'Authoring conventions and template selection.')}\n`,
  );
  files.unshift({
    name: 'index.md',
    content: page(
      options.siteName,
      options.siteDescription?.trim() ||
        `Reader entry points for the ${preset} model.`,
      `Choose the entry matching your work context. This documentation uses the ${preset} reader model; its entry principles guide placement, while page count controls materialized depth. Confirm repository-specific behavior against source before acting.\n\n## Contents\n\n${rootLinks.join('\n')}`,
    ),
  });
  const templates =
    preset === 'product-engineering-qa'
      ? TRIAD_TEMPLATES
      : preset === 'domain-engineering'
        ? ['engineering-feature', ...SUPPORT_TEMPLATES]
        : SUPPORT_TEMPLATES;
  for (const name of templates) {
    files.push({
      name: `contributing/templates/${name}.md`,
      content: await readFile(
        join(
          options.assetsRoot,
          'skills',
          'authoring-docs',
          'references',
          'page-templates',
          `${name}.md`,
        ),
        'utf8',
      ),
    });
  }
  const table = tracks
    .map(
      (track) =>
        `| ${flat ? `index.md (group: ${track.title})` : `${track.path}/`} | ${track.title} | ${track.principle} |`,
    )
    .join('\n');
  const guidance = `## Preset selection\n\nAccepted selection supplied to init: ${preset}; anticipated reader pages: ${selection.plannedPages}. ${flat ? 'Reader structure is collapsed into grouped root headings.' : 'Reader directories are materialized at 15 or more anticipated pages.'} Contributor, template and toolchain pages are outside this reader-page estimate.\n\n| Location | Reader track | Entry principle |\n| --- | --- | --- |\n${table}\n\n${tracks.map((t) => t.purpose).join('\n\n')}\n\nUse contributing/templates/ as non-reader drafting assets. Screen specs are conditional on several journeys sharing a screen; no screen page or per-track AGENTS file is created automatically. Preserve canonical facts and paired links. This selection is not a persisted IA decision: complete the existing explicit approval/adoption and record-ia flow before claiming an authored IA record or config mirror. It does not initialize project management. Existing surfaces route to analyze and individually approved apply; init never restructures them.\n`;
  return { files, guidance };
}
