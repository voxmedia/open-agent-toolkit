export default {
  // TypeScript/JavaScript files: lint and format with oxlint + oxfmt
  '*.{ts,tsx,js,jsx}': [
    'oxlint --fix',
    'oxfmt --write --no-error-on-unmatched-pattern',
  ],

  // .mjs/.cjs sources (skill tests, smoke helpers, release tools) are not
  // matched by the *.{ts,tsx,js,jsx} task above, so they had no commit-time
  // formatting at all. Format only: oxlint currently covers tools/smoke and
  // .agents/skills through `pnpm lint` and nothing else, so linting every
  // .mjs at commit would add an unaudited failure surface.
  '*.{mjs,cjs}': ['oxfmt --write --no-error-on-unmatched-pattern'],

  // JSON and Markdown under packages/cli/assets/ are excluded: .gitignore
  // ignores that directory, so lint-staged's re-stage (`git add` without -f)
  // fails for its tracked files and lint-staged still exits 0. .oxfmtrc
  // ignorePatterns skips that tree, so no formatting is lost.

  // JSON files: format with oxfmt
  '!(packages/cli/assets/**)*.json': [
    'oxfmt --write --no-error-on-unmatched-pattern',
  ],

  // Markdown files: format with oxfmt
  // --no-error-on-unmatched-pattern: files under .oxfmtrc ignorePatterns (for
  // example immutable explainer-kit run packages) must not fail the hook.
  '!(packages/cli/assets/**)*.md': [
    'oxfmt --write --no-error-on-unmatched-pattern',
  ],
};
