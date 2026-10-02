export const approvedH1Changes = [
  {
    sourcePage: 'index.md',
    destinationPage: 'index.md',
    sourceHeading: 'OAT Documentation',
    destinationHeading: 'Home',
    sourceAnchor: 'oat-documentation',
    destinationAnchor: 'home',
  },
  {
    sourcePage: 'workflows/projects/index.md',
    destinationPage: 'workflows/projects/index.md',
    sourceHeading: 'Workflow & Projects',
    destinationHeading: 'Projects',
    sourceAnchor: 'workflow--projects',
    destinationAnchor: 'projects',
  },
  {
    sourcePage: 'workflows/index.md',
    destinationPage: 'workflows/choose-workflow.md',
    sourceHeading: 'Agentic Workflows',
    destinationHeading: 'Choose a Workflow',
    sourceAnchor: 'agentic-workflows',
    destinationAnchor: 'choose-a-workflow',
  },
];

export function normalizeApprovedH1(sourcePage, section) {
  const change = approvedH1Changes.find((row) => row.sourcePage === sourcePage);
  if (!change)
    throw new Error(`No approved H1 normalization for ${sourcePage}`);
  const firstLine = section.split('\n')[0];
  if (firstLine === `# ${change.sourceHeading}`) return section;
  if (firstLine !== `# ${change.destinationHeading}`)
    throw new Error(`Unapproved H1 for ${sourcePage}: ${firstLine}`);
  return `# ${change.sourceHeading}${section.slice(firstLine.length)}`;
}
