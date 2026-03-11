export const RULE_ACTIVATIONS = [
  'always',
  'glob',
  'agent-requested',
  'manual',
] as const;

export type RuleActivation = (typeof RULE_ACTIVATIONS)[number];

export interface CanonicalRuleFrontmatter extends Record<string, unknown> {
  description?: string;
  globs?: string[];
  activation: RuleActivation;
}

export interface CanonicalRuleDocument {
  filePath: string;
  body: string;
  frontmatter: CanonicalRuleFrontmatter;
  description?: string;
  globs?: string[];
  activation: RuleActivation;
}
