# Capability inventory interpretation

source-inventory.json accounts for all 60 legacy modules with hashes, source symbols, imports, proposed owners, porting dispositions, Jira work and per-scope parity evidence updated as implementation is qualified. Seven ED-22 work/recovery modules now link concrete tests and implementation commits; their later integration/control/migration gates remain explicit in docs/worker-role-acceptance.md. operator-inventory.json records 60 registered console functions; flag-inventory.json records 26 documented flag forms plus the source-discovered Art-region convention. Hashes, reachability and command/flag maps are source-level evidence; linked execution artifacts establish only their stated behavior scope.

The two defensive strategy stubs are placeholders: they reject planning and return the input unchanged. They become planned enhancements under ED-26. room.strategy.js and role.courier.js are unreachable through literal imports from main; external invocation remains unverified, so their distinctive behavior must be characterized before retirement. Reachability does not establish that every function is active.

Known partial paths: controller.processBuildFlags returns immediately at line 48; the active call at line 1173 uses util.processBuildFlags. Keep console-exposed helpers even if no tick caller exists. Treat version suffixes as historical names, not evidence of obsolescence: courierV2 and the older builder retain consumers.

Capability ownership preserves dedicated Upgrade Rooms (features/economy/work), labs and boosting (features/industry), power harvesting and keeper operations (features/missions/expeditions), terminal/market flows (features/trade), and operator controls (adapters/operator). Shared extraction, tasks and movement must not depend on those policies.

Before closing ED-10, complete command-to-operation ownership and flag-handler verification. During each port, refine capability granularity, record exact source symbol/lines and intentional deviations, and replace empty evidence with tests and implementation commits. A module-level map alone never proves parity.

ED-36 has [configured lab reaction evidence](industry-lab-reactions.md). labV2.js is explicitly partial: direct production/topology/resource claims are qualified, while chains, supply/drain, boosts and operator setup remain open.

ED-36 now also has [persistent lab assignment and shared hauling evidence](industry-lab-transport.md): refill/drain, explicit product change, cancellation while work is admitted, depleted supply, reset and warehouse floors. Automatic chains and boost/specialist/operator paths remain explicit partial-module obligations.
