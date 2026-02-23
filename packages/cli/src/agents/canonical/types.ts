export type CanonicalAgentTools = string | string[];

export interface CanonicalAgentFrontmatter extends Record<string, unknown> {
  name: string;
  description: string;
  tools?: CanonicalAgentTools;
  model?: string;
  readonly?: boolean;
  color?: string;
}

export interface CanonicalAgentDocument {
  filePath: string;
  body: string;
  frontmatter: CanonicalAgentFrontmatter;
  name: string;
  description: string;
  tools?: CanonicalAgentTools;
  model?: string;
  readonly?: boolean;
  color?: string;
  extensions: Record<string, unknown>;
}
