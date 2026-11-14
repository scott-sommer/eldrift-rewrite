# Rewrite charter

Build a new, configurable Screeps bot using the existing bot as a selective porting reference. Preserve observable implemented capabilities and document intentional defect corrections. The full objective is in goal-objective.md; current delivery status is in Jira ED.

## Completion evidence
Every capability must identify legacy file/symbol and commit, active/operator/dormant/partial/placeholder classification, new owner, port/clean/rebuild disposition, intentional deviations, tests, evidence level, and implementation commit. No capability is silently deferred.

## Milestones
ED-1 foundations; ED-2 runtime; ED-3 owned economy; ED-4 assessment-driven planning; ED-5 scouting/remotes/expansion; ED-6 defense/missions; ED-7 industry; ED-8 controls/diagnostics; ED-9 parity/performance/release.
Issue-level prerequisites govern ordering. The source inventory must validate this initial decomposition before claiming completeness.

## Testing strategy
Use one primary fast unit runner, small contract fixtures and an actual tick-stepped engine harness. Keep ordinary iterations to relevant tests plus a broad shallow smoke suite when full execution becomes burdensome. Run all required suites at milestones. Measure timing; do not assume native server compatibility.
Test reset, vision loss, target loss, ownership contention, resource scarcity and incomplete paths. Confirm issued intents using later observations. Separate persistent test worlds from disposable scenarios. Record tool versions, seed, tick budget and packaged commit with results.

## Current state
Planning records initialized; ED-10 remains in progress. No production implementation, build, tests or capability-parity evidence exists yet. Next: inventory all 60 source modules and flags/console controls, write initial architecture decisions and regression register, then scaffold under ED-11.
