export default {
  // TypeScript/JavaScript files: lint and format with oxlint + oxfmt
  '*.{ts,tsx,js,jsx}': ['oxlint --fix', 'oxfmt --write'],

  // JSON files: format with oxfmt
  '*.json': ['oxfmt --write'],

  // Markdown files: format with oxfmt
  '*.md': ['oxfmt --write'],
};
