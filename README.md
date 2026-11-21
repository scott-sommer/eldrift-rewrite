# Eldrift rewrite

A capability-preserving rewrite of Eldrift-Directive. Implemented colony, logistics, planning, scouting and remote milestones are recorded in the versioned capability evidence. Full capability parity and release-candidate qualification remain in progress; Jira ED is authoritative for current status.

## Local development

Use Node 24.22.1 and npm 11.19.1 in E:\dev\personal\screeps\eldrift-rewrite.

- npm ci: install the locked dependencies.
- npm run typecheck: strict TypeScript checks.
- npm test or npm run test:smoke: selected fast smoke suite for incremental work.
- npx vitest run test/path.test.ts: relevant targeted tests alongside smoke.
- npm run test:full: full unit suite, reserved for major milestones and before closing an implementation ticket.
- npm run quality: type, lint, dependency-boundary and pinned Lizard gates.
- npm run test:processors: controlled pinned engine-processor comparisons, installed separately as described below.
- npm run test:watch: interactive affected-test development.
- npm run build: CommonJS dist/main.js plus external source map.
- npm run check:bundle: build and load the output in an isolated Node VM without Node globals; verifies loop export and source-map contents. This is not the Screeps engine.

Install Lizard into `.venv` using `tools/quality/requirements.txt` (Windows: `python -m venv .venv`, then `.venv/Scripts/python.exe -m pip install -r tools/quality/requirements.txt`). For lightweight processor comparisons, run `npm ci --prefix tools/processors --ignore-scripts` once, then `npm run test:processors`; these do not start a private server.

For local real-engine setup, follow [the harness guide](docs/engine-harness.md). Native cases must run serially. Routine shared startup/cash changes can use:

```powershell
npm run test:engine -- --remote-startup-admission
npm run test:engine -- --remote-startup-refusal
npm run test:engine
```

The first two cover positive cold-start admission and protected refusal over150 ticks each; default packaged smoke covers the ordinary entry point. Full construction/payback remains a separate longer scenario. Use `npm run test:engine:suite` for milestone-wide native regression, not each small edit. Reports and per-case provenance distinguish full from focused qualification.

Build/test commands do not upload. Upload is a separate explicit command with named environments; no credentials belong in source control.

## Structure and records

src/app owns composition; src/main.ts exports loop. Modules follow the dependency boundaries in AGENTS.md and docs/architecture-decisions.md. tools contains local build/verification code; tools/vitest.smoke.config.mjs selects existing representative tests across the layers, including test/smoke. See [the incremental test loop](docs/incremental-test-loop.md).

Read docs/goal-objective.md and docs/planning-acceptance.md. Jira ED owns current progress; docs/backlog-baseline.json is the original planning snapshot. Source, console and flag inventories carry provenance and required evidence. Legacy source is read-only.

## Tool choice

TypeScript 6.0.3, esbuild 0.28.2, Vitest 5.1.0 and @types/screeps 3.4.0 are pinned in package.json and package-lock.json. esbuild emits a neutral-platform CommonJS bundle; Vitest supplies the single unit runner. Sources: https://esbuild.github.io/api/ and https://vitest.dev/guide/ . Pinned real-engine setup is documented in docs/engine-harness.md; per-feature qualification is recorded under docs/evidence. Lizard1.22.2 and dependency boundaries are enforced by npm run quality.

## Architecture verification

npm run check:boundaries parses every production TypeScript file and rejects layer violations, external/aliased imports, computed module loading and game-global references in core. test/tooling is exercised by npm run test:full at milestones; use npx vitest run test/tooling/boundaries.test.mjs for targeted checks. Generated engine artifacts and reports stay under ignored artifacts/; source fixtures live under test/fixtures.

The compiler and AST checker use TypeScript 6.0.3, within typescript-eslint 8.72.2 supported peer range. The initial TypeScript 7 choice was replaced after compatibility validation; the redundant parser alias was removed.

## Mapping a runtime stack position

Retain dist/main.js.map from the exact deployed build. Run npm run trace -- dist/main.js.map LINE COLUMN using the one-based generated line/column from the stack. The tool prints the original TypeScript file, line and column. It rejects unmapped/invalid positions. A different build's map is not valid evidence. The tooling test bundles a throwing TypeScript function, executes it, and maps its real exception location back to line 2. Mapping is local; no diagnostic library is shipped to the bot.

## Explicit upload environments

Build first. For a local private server, set SCREEPS_LOCAL_TOKEN and SCREEPS_LOCAL_BRANCH in the process environment, optionally SCREEPS_LOCAL_URL (defaults to http://127.0.0.1:21025), then run npm run upload -- local. The branch must already exist. A local profile only accepts loopback hosts. Do not assume every private-server authentication plugin accepts the same token; ED-14 verifies the selected server setup.

For a separately authorized live deployment, set SCREEPS_LIVE_TOKEN and SCREEPS_LIVE_BRANCH, then run npm run upload -- live --confirm-live. The command sends only the bundled main module and replaces that branch's module set; retain the matching source map locally. It does not create or activate a branch. Builds and tests never call upload. Tokens are never placed in URLs or logs. HTTP failures, redirects and missing server acknowledgement fail the command. No real server upload has been performed during scaffold validation.

Protocol references: https://docs.screeps.com/auth-tokens.html and https://github.com/screeps/backend-local/blob/master/lib/game/api/user.js .
