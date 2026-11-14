# Regression register

Evidence is source inspection and the original focused probes, not a full legacy engine run. Implement corrected-behavior tests under ED-13 and confirm relevant intent semantics under ED-14.

| Source | Finding | Required corrected behavior |
|---|---|---|
| main.js:61 | Position equality ignores room | Coordinates in different rooms are distinct |
| main.js:67 | Border zero and 49 compare equal | Different border coordinates remain distinct |
| main.js:83 | Original fallback invoked without receiver | Adapter preserves receiver and original semantics |
| utilV2.js:3155 | Existing sites counted again during reconciliation | Count sites once; accept remaining room/global budget |
| room.layout.shared.js:954 | Partial path accepted | Explicit incomplete result cannot validate connectivity |
| role.hunter.js:88 | Assignment inside border condition | Position is not mutated by predicate |
| utilV2.js:2547 | Equality comparison to NaN | Invalid numeric input handled explicitly |
| controller.js:1122 | Invader-core dispatch shadowed | Specialized behavior is reachable and tested |
| resourceManager.js:128,144 | Unseen room clears shared cache | Preserve unrelated state and mark observation stale |

Intentional policy change: compare eligible layout candidates after hard validation rather than accepting standard solely because it fits. Record chosen strategy and score reasons.

No regression in this register has been verified against the new implementation yet.

Additional control-review regressions:
- defend.js:65: contradictory null/undefined conjunction prevents intended Safe trigger. Test no hostile, hostile inside/outside boundary, unavailable safe mode and non-owned controller.
- controller.js:1566 vicinity: contradictory occupied-timer conjunction prevents occupied transition. Define invasion-to-occupation timing explicitly, test recovery and independent processing of multiple vassals.
- consoleCommands.clearRoomData: destructive default and unclaimRoom alias need explicit adapter semantics and ownership/target validation; ordinary planning must never invoke them.
