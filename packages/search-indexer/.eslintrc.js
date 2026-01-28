module.exports = {
  root: true,
  extends: ['@repo/eslint-config/index.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
  },
  overrides: [
    {
      files: ['**/*.test.ts'],
      parserOptions: {
        project: false,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
