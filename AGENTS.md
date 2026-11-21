# Eldrift rewrite development contract

Primary workspace: E:\dev\personal\screeps\eldrift-rewrite. Run development, builds and tests here.
Read docs/goal-objective.md for the complete user objective and docs/backlog-baseline.json for the initial plan. Jira ED is authoritative for current status; the JSON is an immutable planning snapshot.
Legacy E:\dev\personal\screeps\Eldrift-Directive is read-only, baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Preserve implemented capabilities, including labs, power harvesting, Upgrade Rooms and operator-invoked behavior. Classify dormant, partial and placeholder code explicitly.

## Architecture
Use TypeScript, plain composition/factory injection and narrow ports. Organize folders by responsibility: app, core, capabilities, features, world, persistence, adapters/screeps, config.
Core has no game globals or feature imports. Capabilities never import role/empire policy. Each persistent namespace and creep action has an explicit owner. Separate room assessment, candidate strategies, validation/scoring, persisted plans and construction execution.
Extract cohesive classes/modules when responsibility or size warrants it; extract methods when branching obscures intent. Do not hide coupling inside a universal service locator.

## Quality and evidence
Pin Lizard 1.22.2 initially, standard CCN. Production limits: function CCN <=10 (target <=8), function NLOC <=50, file NLOC <=300 (target <=250). Narrow exceptions require versioned rationale; formatting compression is not remediation.
For incremental work run npm run test:smoke (also npm test) plus only the relevant existing test files with npx vitest run <paths>. Do not run the full unit suite for each edit, feature checkpoint or routine push. Reserve npm run test:full for major milestones, as a prerequisite for closing a Jira implementation ticket, and release-candidate gates. Routine CI uses the selected smoke suite; request the manual Quality workflow full_unit_suite=true on the exact milestone source before closure. A green routine CI run is not evidence that full units passed. Keep the smoke selection in tools/vitest.smoke.config.mjs small and representative; add feature-specific cases to targeted runs rather than growing smoke with every feature. Record actual commands, scope and durations. Type checks, dependency checks and real-engine scenarios complement unit tests. Distinguish source inspection, mocked contracts and actual engine evidence.
Record provenance and deliberate corrections for ported code. Preserve unrelated changes. Never mark missing or unexecuted evidence complete.

## Delivery
Start at ED-10 and follow issue dependencies. Transition ED items as work starts and finishes; record exact checks, outcomes, limitations and commit/PR links. Do not modify VES.
Make coherent commits and push tested milestones to scott-sommer/eldrift-rewrite. Keep durable decisions and capability evidence alongside code. When external setup blocks a task, record it and continue independent work.
Completion requires all capability and layout gates, packaged engine tests, measured CPU/memory and soak results, migration/rollback rehearsal and release documentation. A scaffold is not completion. Live deployment remains a separate user decision.
