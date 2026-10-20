// ESLint flat-config fragment for Node/TypeScript backends.
// Copy next to eslint.config.mjs and spread it in:
//
//   import tseslint from 'typescript-eslint';
//   import { backendRules } from './eslint.backend.mjs';
//   export default tseslint.config(
//     ...tseslint.configs.recommendedTypeChecked,
//     ...backendRules,
//   );

export const backendRules = [
  {
    files: ['src/**/*.ts'],
    ignores: ['src/config.ts'],
    rules: {
      // CFG-02: environment is read once, in src/config.ts.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read configuration from the Settings object (src/config.ts), not process.env (CFG-02).',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // OPS-01: log through the logger.
      'no-console': 'error',
      // SEC-03: no dynamic code execution.
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      // Unhandled async errors.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
