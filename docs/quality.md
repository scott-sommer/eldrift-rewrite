# Quality checks

Create an isolated environment using python -m venv .venv. Install tools/quality/requirements.txt with .venv/Scripts/python.exe -m pip install -r tools/quality/requirements.txt on Windows or .venv/bin/python on Linux. Dependencies are pinned, including Lizard 1.22.2.

npm run quality combines type checks, correctness linting, architecture checks and the Lizard gate. npm test runs tooling rejection tests and the current behavior suite. npm run test:smoke stays short for iterations; run relevant tests alongside it and the full suite at milestones.

Lizard uses standard CCN, maximum 10 per function; function NLOC maximum 50; file NLOC maximum 300. Equality with a limit passes. Blank/comment lines do not count. src is enforced; test is reported separately. tools, dependencies, dist and legacy source are outside production scope. artifacts/lizard.json records metrics and violations. A missing production source set fails rather than yielding a false green.

There are no current exceptions. Before introducing an exception, record its exact file/function, measured value, justification and review condition in versioned configuration and extend the checker/tests to enforce that narrow allowance. Do not suppress all warnings or increase global limits for one algorithm.

The CI workflow runs the same commands on Windows and Linux. Its remote execution remains unverified until the repository can be published using an authorized Git credential. It never uploads to Screeps.

Dependency audit observation: npm reported seven moderate entries tracing to one minimatch glob-amplification advisory (GHSA-g3hv-75wg-m249) in typescript-eslint's development dependency tree. ESLint itself uses patched minimatch 11.0.8; typescript-estree uses 10.2.6. npm's proposed automatic fix downgrades typescript-eslint across a compatibility boundary, so it was not applied blindly. Review a supported update or a tested narrow override before release; no runtime bundle dependency uses this parser. Audit output is in ignored artifacts/npm-audit.json.
