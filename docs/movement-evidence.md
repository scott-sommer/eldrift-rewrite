
### Exit engine evidence (2026-11-14)
The packaged exit fixture crosses east/west across W0/E0 and north/south across N0/S0. Each records the interior approach, opposite-room edge landing, then inward movement on three successive ticks. All four pass on engine 4.3.2 / driver 5.3.0. This characterizes actual engine transitions using the shared action arbiter; it does not yet implement cross-room traffic reservations. Traffic composition must distinguish the local exit tile from the remote landing tile, and must still handle occupied landings, corners, and failed transitions conservatively.
Validation: quality passed (76 production files, 75 test files, zero Lizard violations); 208 unit tests passed in 2.51s; complete engine suite 15 checks passed in 12.82s, including expected error/timeout failures. No live deployment.

### Transition geometry integration
The movement transition helper now returns both the local move target and expected room landing, rejecting directions that leave local coordinates. Direction resolution accepts either a local exit step or its remote landing without changing position equality. The real-engine exit fixture asserts the helper's predicted next position in all four directions. Corner precedence is covered by a source-derived unit contract, not yet an engine corner scenario. This helper deliberately does not decide terrain legality or reserve either tile.
Validation: 214 tests passed in 2.45s; type/lint/boundary/Lizard gates passed (77 production files, zero violations); targeted packaged exit scenario passed on engine 4.3.2.
