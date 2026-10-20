// ESLint flat-config fragments that enforce frontend/backend separation.
// Copy next to eslint.config.mjs and spread the variant you need:
//
//   import tseslint from 'typescript-eslint';
//   import { reactSpaBoundaries } from './eslint.boundaries.mjs';   // or nextjsBoundaries
//   export default tseslint.config(
//     ...tseslint.configs.recommended,
//     ...reactSpaBoundaries,
//   );
//
// ESLint catches imports and calls; it cannot tell whether a component
// computes a business rule. The architecture-review agent covers that.

// Packages that must never run in the browser (SEP-04, SEP-06, SEC-05).
// ADJUST: add your organization's server SDKs.
const SERVER_ONLY_PACKAGES = [
  'pg', 'mysql2', 'mongodb', 'mongoose', 'redis', 'ioredis',
  '@prisma/client', 'drizzle-orm', 'drizzle-orm/*', 'kysely', 'knex', 'typeorm', 'sequelize',
  'firebase-admin', 'firebase-admin/*',
  '@supabase/supabase-js',          // allow only via ADR with server-side policies
  'openai', '@anthropic-ai/sdk', '@google/genai', '@google/generative-ai',
  '@aws-sdk/*', '@azure/*', '@google-cloud/*',
  'stripe',                          // server SDK; use @stripe/stripe-js in the browser
  'jsonwebtoken', 'bcrypt', 'bcryptjs', 'argon2',
  'node:*', 'fs', 'child_process',
];

const serverPackagesRule = (extraPatterns = []) => [
  'error',
  {
    patterns: [
      {
        group: SERVER_ONLY_PACKAGES,
        message: 'Server-only package in frontend code. Move this to the backend and call it through the API (SEP-04, SEP-06).',
      },
      ...extraPatterns,
    ],
  },
];

const networkOnlyInApiLayer = [
  'error',
  { name: 'fetch', message: 'Call the backend through src/api (SEP-04).' },
  { name: 'XMLHttpRequest', message: 'Call the backend through src/api (SEP-04).' },
];

const safeRendering = {
  // SEC-04
  'no-restricted-syntax': [
    'error',
    {
      selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
      message: 'Do not render raw HTML; if unavoidable, sanitize with DOMPurify and add a justification (SEC-04, QG-04).',
    },
    {
      selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
      message: 'Do not assign raw HTML (SEC-04).',
    },
  ],
  'no-eval': 'error',
  'no-new-func': 'error',
  'no-implied-eval': 'error',
};

const noTokensInWebStorage = {
  // SEC-06: flag every web storage write so tokens are never stored there.
  'no-restricted-properties': [
    'error',
    { object: 'localStorage', property: 'setItem', message: 'No tokens or sensitive data in localStorage (SEC-06). Justify non-sensitive use with a comment.' },
  ],
};

/** React + Vite SPA: src/api/ is the only network layer. */
export const reactSpaBoundaries = [
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-globals': networkOnlyInApiLayer,
      'no-restricted-imports': serverPackagesRule([
        { group: ['axios', 'ky', 'ofetch'], message: 'HTTP clients belong in src/api (SEP-04).' },
      ]),
    },
  },
  {
    files: ['src/api/**/*.{ts,tsx,js,jsx}'],
    rules: { 'no-restricted-imports': serverPackagesRule() },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    rules: { ...safeRendering, ...noTokensInWebStorage },
  },
];

/**
 * Next.js App Router with src/server/ as the in-app backend
 * (see frontend-backend-separation/references/full-stack-frameworks.md).
 * Also add `import 'server-only';` to every module under src/server/.
 */
export const nextjsBoundaries = [
  {
    // Client-side code: components, hooks, client helpers.
    files: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': networkOnlyInApiLayer,
      'no-restricted-imports': serverPackagesRule([
        { group: ['@/server/*', '@/server/**', '**/server/**'], message: 'UI code must not import the server layer (SEP-07).' },
      ]),
    },
  },
  {
    // Routes, pages, server actions, route handlers: thin adapters.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': networkOnlyInApiLayer,
      'no-restricted-imports': serverPackagesRule([
        {
          group: ['@/server/domain/*', '@/server/domain/**', '@/server/infrastructure/*', '@/server/infrastructure/**'],
          message: 'Routes and server actions call src/server/services, not the domain or infrastructure directly (SEP-07, LAY-04).',
        },
      ]),
    },
  },
  // src/server/ (the in-app backend) may use server packages; its layer
  // rules are enforced by dependency-cruiser (assets/boundaries/node),
  // with paths adjusted to ^src/server/(api|services|domain|infrastructure).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/server/config.ts'],
    rules: {
      // Only NEXT_PUBLIC_* values reach the browser; server config is read in one place.
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Read configuration via src/server/config.ts (CFG-02, SEC-05).' },
        noTokensInWebStorage['no-restricted-properties'][1],
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: safeRendering,
  },
];
