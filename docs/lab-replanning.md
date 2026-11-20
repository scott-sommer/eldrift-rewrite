# Durable lab replanning (ED-36 / ED-39)

The legacy consoleCommands.js removeLabs/removeAllLabs (baseline f2bbf7e8, lines178/182) directly empty labsV2 cached assignments. The rewrite adds an explicit maintenance intent so the industry owner can retire a reaction assignment before recomputing it from unchanged configuration and current physical facts.

```js
var labs = require('main').industry.labs;
labs.requestReplan('W0N1');
labs.requestReplans(['W0N1', 'W1N1']);
labs.replanStatus('W0N1');
```

Requests require visible owned rooms, valid names, at most50 distinct homes and at most50 total pending rooms. Every home validates before one intent write. Duplicate pending requests coalesce. Status is read-only and works for an unseen room; empty requests do not initialize absent state. Processing a room does not discard requests for other rooms.

The industry controller cancels its unclaimed reaction services and waits for ordinary admitted supply/receipts/recovery before setting its assignment to null. It performs no production or replacement admission during that drain tick. On the next eligible run, existing production policy and topology reconciliation rebuild normally. Pending maintenance survives module/JSON resets and visibility loss; an unobserved/unprocessed room remains pending. No task, claim, transfer journal, room intel, configured boost role or actor pin is cleared.

This preserves the assignment invalidation/rebuild intent with deliberate deferred settlement. It is not a literal legacy cache mutation or a global Game alias. It does not stop production permanently, drain every physical lab, remove structures, reset dedicated boost bindings, or acknowledge a boost job. Use configuration policy/role retirement and the boost owner controls for those separate operations. General legacy aliases and exact boost-cache dispositions remain open.

## State and rollback

New namespace industry-lab-maintenance/empire, owner industry, schema1: bounded pending room list. Reads reject future/corrupt/foreign state. Default operation creates no namespace. Existing state versions/config keys are unchanged.

Before downgrading, keep current code running until replanStatus is false for every requested home and ordinary admitted supply is settled. Preserve existing assignments, task queues, reservations and journals. Older code predating this namespace ignores the intent rather than refusing downgrade; it may simply resume a retained assignment. Do not claim an older-reader future-version safety gate for this new namespace. Existing lab/boost rollback requirements still apply.

## Validation status and next work

Qualified source is `8ac69a1a47fdcb973cb8cbd45cbe80c25675b9d4`; implementation is `18a96f1`. Local type/lint/boundary and pinned Lizard1.22.2 pass with889production/737testfiles, zero violations. Full units pass1,946cases/479files in14.07seconds alongside the native batch. Processor comparisons pass4/.224seconds, report validation1/.1502324seconds and bundle checks15lab methods. Focused+smoke9/3files/.269seconds were run at the implementation checkpoint before fixture-only changes. Exact final-source [CI44834265926](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44834265926) passes Windows/Linux all six required steps.

Twelve clean native cases pass: new maintenance handoff, ordinary lab supply/operator/switch/cancel/chain, bulk role allocation, in-flight boost-role switch/removal, worker boost, Upgrade Room and packaged smoke. The new case runs320ticks with observed pending-intent reload5 plus31/181. At tick4 the command observes10cargo and leaves configuration bytes unchanged; the old assignment is retained at4/5, then receipts settle, cargo becomes0 and the assignment retires at6. It rebuilds from unchanged OH policy at7. Final state banks15OH and30incompatible X, leaves no manufactured product in labs and no courier cargo/tasks/live quantity claims, and stores an empty pending list. The feature's own schema/namespace is recorded; other lab schemas remain unchanged.

Two earlier clean attempts at5c92ead and a837a56 completed runtime but failed the test's fixed-tick carried-cargo precondition. Their timing assumptions were replaced with an actual observed cargo trigger and a persisted pending-state reload trigger, without changing production code. Both failures remain separately archived. The [manifest](evidence/lab-replanning.json) retains raw/row/source hashes, full plans/requests, assignment envelopes, reload provenance, receipts, terminal observations and complete CI jobs. Across project history361trace archives verify, including failures; this is not361passing scenarios. Registry273has not been fully rerun.

This qualifies the bounded observed native handoff and rebuild. Visibility-loss, actor/structure death and cross-version rollback rehearsal extensions remain open. Instrumented test Memory accumulates rows, so it is not production CPU/memory/soak evidence. General legacy global aliases and full boost-cache reset semantics, specialists, optimized bodies and empire production remain incomplete.
