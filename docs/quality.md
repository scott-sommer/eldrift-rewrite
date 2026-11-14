# Quality checks

Create an isolated environment using python -m venv .venv. Install tools/quality/requirements.txt with .venv/Scripts/python.exe -m pip install -r tools/quality/requirements.txt on Windows or .venv/bin/python on Linux. Dependencies are pinned, including Lizard 1.22.2.

npm run quality combines type checks, architecture checks and the Lizard gate; correctness linting is being integrated under ED-12. npm test runs tooling rejection tests and the current behavior suite. npm run test:smoke stays short for iterations; run relevant tests alongside it and the full suite at milestones.

Lizard uses standard CCN, maximum 10 per function; function NLOC maximum 50; file NLOC maximum 300. Equality with a limit passes. Blank/comment lines do not count. src is enforced; test is reported separately. tools, dependencies, dist and legacy source are outside production scope. artifacts/lizard.json records metrics and violations. A missing production source set fails rather than yielding a false green.

There are no current exceptions. Before introducing an exception, record its exact file/function, measured value, justification and review condition in versioned configuration and extend the checker/tests to enforce that narrow allowance. Do not suppress all warnings or increase global limits for one algorithm.

The CI workflow runs the same commands on Windows and Linux. Its remote execution remains unverified until the repository can be published using an authorized Git credential. It never uploads to Screeps.
