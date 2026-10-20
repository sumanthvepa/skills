// -------------------------------------------------------------------
// dependency-cruiser.cjs:
//   dependency-cruiser rules for Node backend layers
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

// Copy to .dependency-cruiser.cjs in the Node backend's root.
// Install: npm install --save-dev dependency-cruiser
// Script:  "depcruise": "depcruise src --config .dependency-cruiser.cjs"
//
// Enforces backend-layering (LAY-02 .. LAY-05, LAY-07) for a layout of
// src/{api,services,domain,infrastructure}, with src/main.ts and
// src/config.ts as the composition root. ADJUST paths if you use
// per-feature folders (e.g. ^src/[^/]+/domain).

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'LAY-07: no circular dependencies',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-is-pure',
      comment: 'LAY-02: domain depends on nothing outside itself',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/(api|services|infrastructure|config|main)' },
    },
    {
      name: 'domain-no-frameworks',
      comment: 'LAY-02: no web, ORM, HTTP, or SDK packages in the domain',
      severity: 'error',
      from: { path: '^src/domain' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'],
        // ADJUST: allowlist small pure utilities if the team agrees.
        pathNot: 'node_modules/(decimal\\.js|big\\.js)/',
      },
    },
    {
      name: 'domain-no-node-io',
      comment: 'LAY-02: no fs, net, http, child_process in the domain',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'services-depend-on-domain-only',
      comment: 'LAY-03: services never import api or infrastructure',
      severity: 'error',
      from: { path: '^src/services' },
      to: { path: '^src/(api|infrastructure|main)' },
    },
    {
      name: 'services-no-orm',
      comment: 'LAY-03: data access goes through domain ports',
      severity: 'error',
      from: { path: '^src/services' },
      to: {
        path: 'node_modules/(@prisma/client|prisma|drizzle-orm|kysely|pg|mysql2|mongodb|mongoose|typeorm|sequelize|knex)/',
      },
    },
    {
      name: 'api-is-thin',
      comment: 'LAY-04: api calls services, never infrastructure or the database',
      severity: 'error',
      from: { path: '^src/api' },
      to: {
        path: [
          '^src/infrastructure',
          'node_modules/(@prisma/client|prisma|drizzle-orm|kysely|pg|mysql2|mongodb|mongoose|typeorm|sequelize|knex)/',
        ],
      },
    },
    {
      name: 'infrastructure-implements-ports',
      comment: 'LAY-05: infrastructure depends on the domain only',
      severity: 'error',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/(api|services|main)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
