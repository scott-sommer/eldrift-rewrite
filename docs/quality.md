# Quality checks

Create an isolated environment using python -m venv .venv. Install tools/quality/requirements.txt with .venv/Scripts/python.exe -m pip install -r tools/quality/requirements.txt on Windows or .venv/bin/python on Linux. Dependencies are pinned, including Lizard 1.22.2.

npm run quality combines type checks, correctness linting, architecture checks and the Lizard gate. npm test runs tooling rejection tests and the current behavior suite. npm run test:smoke stays short for iterations; run relevant tests alongside it and the full suite at milestones.

Lizard uses standard CCN, maximum 10 per function; function NLOC maximum 50; file NLOC maximum 300. Equality with a limit passes. Blank/comment lines do not count. src is enforced; test is reported separately. tools, dependencies, dist and legacy source are outside production scope. artifacts/lizard.json records metrics and violations. A missing production source set fails rather than yielding a false green.

There are no current exceptions. Before introducing an exception, record its exact file/function, measured value, justification and review condition in versioned configuration and extend the checker/tests to enforce that narrow allowance. Do not suppress all warnings or increase global limits for one algorithm.

The CI workflow runs the same commands on Windows and Linux. Its remote execution remains unverified until the repository can be published using an authorized Git credential. It never uploads to Screeps.

Dependency audit (2026-11-14): scoped override for @typescript-eslint/typescript-estree pins minimatch 11.0.8, correcting GHSA-g3hv-75wg-m249 (https://github.com/advisories/GHSA-g3hv-75wg-m249). Its sole runtime call uses the retained minimatch(filePath, pattern, { dot: true }) API. Clean npm ci and npm ls verify the override; npm audit reports zero vulnerabilities. Quality checks, all 15 tests (1.66s), and packaged bundle checks pass. Remove the override when the parser adopts a patched dependency upstream. This is a development dependency, absent from the game bundle.

