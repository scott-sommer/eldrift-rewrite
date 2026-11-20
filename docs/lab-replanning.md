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

Unit/contract tests cover no-write status/empty scope, bulk ownership rejection, coalescing, JSON reset, retaining the assignment through admitted supply, completion after a matching receipt, rebuild, unrelated state preservation and future-version refusal. Quality and bundle checks include the three public methods. Full checks and exact-source CI are recorded in Jira for the source checkpoint.

Packaged native replanning qualification remains pending. Add a320tick ordinary lab-supply scenario that requests replan while a courier carries admitted cargo, reloads while maintenance is pending, observes the retained assignment and eventual null/rebuild boundary, preserves policy and receipts, banks the target product and finishes with empty cargo/tasks/live claims. Requalify ordinary lab/boost role scenarios and archive source/raw/row hashes and exact-source Windows/Linux CI. These requirements are not satisfied by unit evidence alone.
