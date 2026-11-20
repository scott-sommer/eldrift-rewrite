# Operator lab policy and inspection

ED-36 source `61c7571` exposes `require('main').industry.labs` beside the boost API. It changes desired configuration through the existing operator namespace and reports industry state without rewriting it. Initial implementation `76ca9c5` and native snapshot correction `a6a2145` remain traceable in the evidence.

## Commands

```js
var labs = require('main').industry.labs;
labs.inspect('W0N1');
labs.configure('W0N1', {
  labReactionsEnabled: true, labReactionProduct: 'OH',
  labReactionTarget: 15, labReagentReserve: 5, labTransportBatch: 20
});
labs.temporary('W0N1', { labReactionsEnabled: false }, Game.time + 100);
labs.clearTemporary('W0N1');
labs.clearOverride('W0N1', ['labReactionProduct']);
```

`configure` merges only known lab keys into that room's persistent override, including chain targets, batches, reserves, transport policy and excluded lab IDs. `clearOverride` removes the named lab keys, or all lab override keys when omitted, to reveal profile/empire/default policy again. Profiles, other rooms and unrelated override keys are preserved. These commands do not assign lab input/output roles by writing live state directly.

Mutations require a visible room with an owned controller. Products introduced by the patch must appear in the native REACTIONS table; reserved lab IDs must refer to currently owned labs in that room. Normal configuration validation checks types, bounds, duplicates and the full resulting store before one write. Invalid, unsupported, corrupt or future-version data refuses without partial configuration writes. Repeating an equivalent command makes no additional write. Empty clears do not initialize configuration or industry namespaces.

Inspection accepts a valid room name even when unseen/unowned and preserves saved state. It reports detached lab values, their winning configuration layers, the room's lab override and temporary values/expiry/activity, current assignment, current production step, boost lab pins and current owned lab facts. Assignment/production are observations from their feature-owned state, not proof that a new command has already taken effect. Empty native stock/cooldown fields normalize to zero/null before plain-data copying. Returned objects cannot mutate persistence.

The game loop deliberately uses one configuration snapshot per tick. A command reports newly stored effective policy; gameplay adopts it at its next configuration snapshot. It cannot revoke native effects already admitted earlier in that tick. A production pause stops new industry work under the ordinary controller while admitted cargo and receipts settle; it does not clear courier tasks, quantity claims, assignments or journals by force. Changing products follows ordinary drain/refill and assignment reconciliation.

## Temporary lifetime

`temporary(home, patch, expiresAt)` takes an absolute future safe-integer tick. The patch applies while `Game.time < expiresAt`; at the boundary the underlying layers are effective again. Existing active lab temporary fields merge under that single room-level deadline. Active unrelated temporary fields can be preserved only with their original deadline; changing it refuses rather than silently extending or shortening another feature's policy.

`clearTemporary` removes only lab keys and preserves unrelated active fields and their deadline. Expired temporary data can be replaced by a new command; expired unrelated settings are not revived into the new interval. The canonical configuration still stores one temporary interval per room, so independently timed feature overrides require the broader ED-39 control model or a matching deadline. Tests cover active JSON reset, boundary expiry, mixed-key clearing and repeated commands. The new native scenario resets after expiry and after product switch; it does not separately reset during its active temporary interval.

## Qualification and corrections

Full local checks pass 1,919 unit cases / 471 files in 12.72 s; focused + smoke 16 / 4 files in 0.266 s; types/lint/boundaries and Lizard 1.22.2 pass with 877 production / 719 test files and zero violations. Processor comparisons pass 4 in 0.196 s and suite-report check 1 in 0.1241104 s; bundle checks include five exported lab commands and absent-room inspection without Node globals. These local full checks precede only the CJS settlement-verifier correction; final exact-source [CI 44808367785](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44808367785) reruns all six required checks on Windows and Ubuntu.

Ten clean final-source native cases pass in 62.040 s: new operator lab policy, manual product switching, supply cancellation, local chain, direct reactions, boost operator cancellation, reaction/boost coexistence, automatic worker boosts, Upgrade Room and packaged smoke.

The new 320-tick case configures OH through the public API, pauses from ticks 8–19, resumes automatically at 20 and switches to UH at 140. During the pause, actual 20-unit cargo at 8–9 clears at 10 while credited receipts increase from 10 to 30 and the old assignment releases. No fake cancellation flag is needed for admitted work. The controller resumes with the room override source at 20; both 15 OH and 15 UH are banked by 320, along with all 30 initial incompatible X. End cargo/tasks are empty and live claims are zero. Module reloads at 31/181 retain policy and normal execution. Fixture timing is observation, not a route guarantee; receipt aggregates can decrease later when old service history is pruned.

Two prior runs remain explicitly failed in the [manifest](evidence/operator-labs.json):

- Clean source `76ca9c5` exposed a real native adapter defect: missing lab energy/stock/cooldown fields reached strict plain copying as undefined. The engine reported exceptions before domain-row capture. A focused regression reproduced it before `a6a2145` normalized those fields.
- Clean source `a6a2145` completed physical production with no bot exceptions but failed an incorrect verifier expectation that admitted service would have a cancelled retained record. The existing owner lets claimed work finish and may later prune old history. `61c7571` instead verifies the actual paused cargo-to-receipt credit and assignment release from contemporaneous observations. The prior run is not relabeled as passed.

The manifest retains failed measurement/domain rows when available, original error summaries and raw/source/row hashes separately from the ten final successes. Registry 265 was not fully rerun. This is not aggregate CPU/memory/soak or cross-version rollback qualification.

## Scope and compatibility

No schema or configuration keys are added: `operator/config` remains version 1 and all edits use existing lab settings. Pre-API rollback removes the console functions, while earlier controllers can still interpret those configured layers subject to their existing supported keys. Preserve admitted tasks, stock claims and native receipts through rollback; full rehearsal remains ED-44.

This supplies safe equivalents for inspecting current production and editing per-room desired lab policy. It does not claim legacy `removeLabs`/`removeAllLabs` cache-clearing aliases, `setAllBoosts`, every dedicated boost-lab role assignment or the full `consoleCommands.js` contract. Bulk/compatibility operations, specialist mission producers, optimized boosted bodies, empire allocation, broader visibility/depletion recovery and remaining ED-39 flags/controls remain open. Normal replanning and these controls never destroy structures.
