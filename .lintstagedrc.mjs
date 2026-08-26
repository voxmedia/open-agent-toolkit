export default {
  // TypeScript/JavaScript files: lint and format with oxlint + oxfmt
  '*.{ts,tsx,js,jsx}': [
    'oxlint --fix',
    'oxfmt --write --no-error-on-unmatched-pattern',
  ],

  // JSON files: format with oxfmt
  '*.json': ['oxfmt --write --no-error-on-unmatched-pattern'],

  // Markdown files: format with oxfmt
  // --no-error-on-unmatched-pattern: files under .oxfmtrc ignorePatterns (for
  // example immutable explainer-kit run packages) must not fail the hook.
  '*.md': ['oxfmt --write --no-error-on-unmatched-pattern'],
};
