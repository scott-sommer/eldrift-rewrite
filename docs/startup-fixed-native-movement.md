# Fixed paths through shared native movement

ED-29: movement.follow accepts an immutable transit plan and an observed cursor index. It shares the existing movement reservation, legality/access checks, traffic resolution and action arbiter with searched movement. It checks actual position, planned name, service destination, mobility and the next native transition, and never substitutes a search/detour. Traffic occupancy can refuse a step. A separate observed cursor records requested motion without advancing; only the actual next native position earns one path step. Unexpected displacement, skipped steps and duplicate request phases refuse. Caller retains immutable route binding and cursor persistence; this cursor alone is not a financial-prefix proof.

Native follow settlement does not update navigator progress, because the fixed path has its own observed cursor owner. The initial native run on1f6512c exposed that boundary: shared flush called uninitialized navigator progress and threw. Correctionb0e7ae1 and a real-service flush regression keep settlement with the correct owner. The failed raw run remains archived. Labor ports were narrowed to the movement method they actually use.

## Checks

Initial affected14 tests/5files passed560ms; smoke76/15 passed558ms. After the native correction, targeted7/3 passed351ms; quality1107production/934test files zero Lizard violations and packaged bundle passed. Full units were not run for this increment.

Clean native corrected movement, navigation and occupied-exit scenarios PASS onb0e7ae1. Trace source31cb04b retains the actual movement observations: cursor[0,1,1], positions[(20,20),(21,20),(21,20)], outcomes[running,done,done]. Fixed and searched calls cannot issue a second movement for the same unit/frame. Exact prior movement assertions remain and cursor assertions were added. Five source-bound raw runs (including initial failure and corrected trace) are preserved in docs/evidence/startup-fixed-native-movement.json.

## Remaining

This is the dispatch entry point for a route contract; it does not activate one for production crews. Add durable authority/body/topology/phase-bound route activation, observation at planning and handoff boundaries, and explicit collection/delivery/retirement transitions. Join native facts into the home project, represent household/miner movement and validate actual physical progress before new payment. Exact shared-source native calendars,5ms and broader ED-29 gates remain open. Existing production tasks continue choosing their current routes until that integration is qualified.
