# Incremental development test loop

Use the selected smoke suite plus relevant targeted tests for routine development. The full unit suite is reserved for major milestones and is a prerequisite for closing an implementation ticket, not a check to repeat on every edit or push. This workflow follows the user's explicit testing preference.

```powershell
npm test
npx vitest run test/features/boosted-builder-policy.test.ts test/features/worker-boost-policy.test.ts test/config/worker-boosts.test.ts
npm run quality
npm run check:bundle
```

`npm test` now runs the same selected suite as `npm run test:smoke`. Use explicit test paths with `npx vitest run` for targeted work; appending a non-smoke file to npm test filters the smoke selection rather than selecting that file. Select producer/consumer and state/ownership tests when changing a shared boundary. Run the relevant packaged native scenario when behavior depends on actual engine effects; native cases remain serial. Re-run failed or affected checks after fixes rather than repeatedly broadening to the whole suite.

## Smoke selection

`tools/vitest.smoke.config.mjs` selects 15 existing test files. It refuses stale file paths. It reuses real behavioral tests rather than adding copies of implementation tests.

| Boundary | Selected files |
| --- | --- |
| Composition, dispatch, configuration | application, game-loop, config/resolve |
| Action ownership and durable state | action-arbiter, versioned-state, tasks |
| Spawn, movement, mining | spawn-allocation, path-service, mining-cycle |
| Logistics and ordinary work | hauling-settlement, work-selection |
| Assessment/layout and construction | candidate-evaluator, construction-executor |
| Industry state and readiness | lab-production, boost-requests |

Keep smoke small and representative. New feature edge cases belong in targeted tests. Change this selection when responsibilities change or a recurring cross-cutting regression shows a missing boundary; do not add every new feature's files automatically. Detailed role, planning, remote, operator, migration and failure combinations remain in targeted/full suites.

## Milestones and CI

```powershell
npm run test:full
```

Run full units before closing a Jira implementation ticket, a major integrated milestone or a release-candidate gate, together with the ticket's other required native/quality/performance/migration checks. Full-unit success alone does not establish parity or release readiness.

Routine push/PR CI runs smoke on Windows/Linux alongside quality, pinned processor comparisons, suite-report validation and bundle checks. To obtain full exact-source milestone CI, manually dispatch the Quality workflow with full_unit_suite=true on the intended ref. Both matrix jobs must pass the full-unit step before recording full-suite milestone evidence. Routine smoke CI is not full-unit evidence; historical manifests describe the workflow and source that actually ran at their time.

Keep existing unit tests available; this changes when they are selected, not the preservation of detailed behavior coverage. Record smoke/targeted/full separately in Jira and evidence with exact commands, source revisions, case counts and durations.

## Initial measurement

On this Windows checkout, the selected suite passes 76 cases across 15 files in 1.17 seconds. The current boosted-builder targeted group passes 13 cases across 3 files in 0.217 seconds. These are observed development runs, not a cross-platform performance guarantee. No full-unit run was needed to introduce the selection; previous full-suite results remain historical evidence for their recorded sources.
