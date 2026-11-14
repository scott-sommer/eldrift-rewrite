# Eldrift rewrite

A capability-preserving rewrite of Eldrift-Directive. The bot currently contains only the composition and packaging seam; no gameplay parity is claimed.

## Local development

Use Node 24.22.1 and npm 11.19.1 in E:\dev\personal\screeps\eldrift-rewrite.

- npm ci: install the locked dependencies.
- npm run typecheck: strict TypeScript checks.
- npm run test:smoke: fast broad smoke subset.
- npm test: full current unit suite; initially identical to the smoke subset.
- npm run test:watch: interactive affected-test development.
- npm run build: CommonJS dist/main.js plus external source map.
- npm run check:bundle: build and load the output in an isolated Node VM without Node globals; verifies loop export and source-map contents. This is not the Screeps engine.

Build/test commands do not upload. Upload tooling and named environment configuration remain to be implemented; no credentials belong in source control.

## Structure and records

src/app owns composition; src/main.ts exports loop. Upcoming modules follow the dependency boundaries in AGENTS.md and docs/architecture-decisions.md. tools contains local build/verification code; test/smoke contains the short development subset.

Read docs/goal-objective.md and docs/planning-acceptance.md. Jira ED owns current progress; docs/backlog-baseline.json is the original planning snapshot. Source, console and flag inventories carry provenance and required evidence. Legacy source is read-only.

## Tool choice

TypeScript 7.0.2, esbuild 0.28.2, Vitest 5.1.0 and @types/screeps 3.4.0 are pinned in package.json and package-lock.json. esbuild emits a neutral-platform CommonJS bundle; Vitest supplies the single unit runner. Sources: https://esbuild.github.io/api/ and https://vitest.dev/guide/ . Real-engine compatibility remains ED-14. Lizard/dependency enforcement remains ED-12.

## Architecture verification

npm run check:boundaries parses every production TypeScript file and rejects layer violations, external/aliased imports, computed module loading and game-global references in core. test/tooling is exercised by npm test; use npm test -- test/tooling/boundaries.test.mjs for targeted checks. Fixtures stay under ignored artifacts/.

The checker uses the pinned typescript-ast alias for TypeScript 6's JavaScript compiler API; the TypeScript 7 compiler package did not expose the required createSourceFile/ScriptTarget API in the compatibility check. Type checking remains on TypeScript 7. This is a development-only parser dependency.

## Mapping a runtime stack position

Retain dist/main.js.map from the exact deployed build. Run npm run trace -- dist/main.js.map LINE COLUMN using the one-based generated line/column from the stack. The tool prints the original TypeScript file, line and column. It rejects unmapped/invalid positions. A different build's map is not valid evidence. The tooling test bundles a throwing TypeScript function, executes it, and maps its real exception location back to line 2. Mapping is local; no diagnostic library is shipped to the bot.
