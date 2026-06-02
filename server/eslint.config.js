// Pragmatic ESLint flat config (ESLint v9). Goal: catch real bugs (undefined vars,
// unused vars, accidental globals) without drowning a working codebase in style noise.
// Style is delegated to Prettier (eslint-config-prettier disables conflicting rules).
const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

module.exports = [
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        // Node.js runtime globals
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // server intentionally logs to stdout; structured logger lands in Phase 5
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
    },
  },
  {
    // Tests use the node:test globals.
    files: ['test/**/*.js'],
    languageOptions: {
      globals: { describe: 'readonly', it: 'readonly', test: 'readonly', before: 'readonly', after: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
    },
  },
  {
    ignores: ['node_modules/**', 'backups/**', 'public/**', 'numera.db*'],
  },
];
