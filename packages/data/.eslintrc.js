module.exports = {
  root: true,
  extends: ['@repo/eslint-config/index.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
  },
  env: {
    browser: true,
  },
  rules: {
    // Temporarily allow unused vars for existing code
    'no-unused-vars': 'off',
    'no-undef': 'off',
  },
};
