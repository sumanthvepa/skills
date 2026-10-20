// -------------------------------------------------------------------
// eslint.backend.mjs: ESLint rules for Node backends
//
// Copyright (C) 2026 Sumanth Vepa.
//
// This program is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see
// <https://www.gnu.org/licenses/>.
// -------------------------------------------------------------------

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
