# Operator boost commands

ED-36 source `f3b8cb0` exposes `require('main').industry.boosts` in the shipped CommonJS bot. Commands use the existing industry queue and shared native funding projection. There are no new game globals, persistence namespaces, configuration keys or native action shortcuts. This is the boost-specific operator surface; general ED-39 commands, flags and lab configuration controls remain separate obligations.

## Console use

```js
var boosts = require('main').industry.boosts;
boosts.list();                 // bounded to the existing 64-request queue
boosts.list('W0N1');           // optional home filter
boosts.get(owner, requestId);  // null if absent

var submitted = boosts.aliases('creep-name', ['upgrade'], {
  id: 'manual-upgrade-1', expiresAt: Game.time + 100, required: true
});

// Or request exact target counts, optionally constraining lab selection:
boosts.request('creep-name', [{ part: WORK, resource: RESOURCE_CATALYZED_GHODIUM_ACID, count: 2 }], {
  id: 'manual-exact-1', expiresAt: Game.time + 100, required: true,
  preferredLab: 'owned-lab-id'
});
```

These two submission examples are alternatives. A held actor cannot accept competing requests. IDs identify immutable requests within the actual population owner; retain the original absolute deadline for replay, and use a new ID for a different intent. Ordinary submission refuses an expired deadline. Alias re-evaluation may choose a different tier as stock changes, so inspect an existing request rather than repeatedly issuing a newly evaluated intent under its old ID.

The command derives actual native ID/name and population owner/home from the currently owned creep. Missing, unowned or unassigned actors refuse. Spawning creeps use the separate spawn boost contract rather than this post-birth interface. Exact compounds are checked against the native BOOSTS catalog; request shape/count and duplicate body-type rules still come from the industry schema. Accepted queue admission is not a promise that all current body/visibility/travel/lab conditions will succeed.

`aliases` accepts the nine legacy effect names (`move`, `heal`, `work`, `attack`, `ranged_attack`, `tough`, `upgrade`, `build`, `carry`) through the shared strongest-affordable-tier selector. This explicit operator command does not silently apply the automatic remote-upgrader skip rule. An unavailable owned/visible home or active preferred lab returns `accepted:false` with `home-labs-unavailable`. An unfunded/body-incompatible selection returns `kit-unavailable` plus the selection reason. A full queue or another held request can also return `accepted:false`. No rejected result means boost success.

Alias selection uses current validated home configuration and the same bank-floor, lab-local and outstanding-promise accounting as automatic workers. A preferred lab restricts the local-kit budget to that actual owned active lab; transferable banks remain available. The budget is a snapshot, not an exclusive reservation throughout approach. Exact requests can deliberately wait for later supply under their deadline; the native executor acquires actual stock/lab/body admission before effects.

## Inspect, cancel and acknowledge

Read results include detached request/status/body observations, `readiness` and `holdsUnit`. Listing decodes the queue once. Editing a returned object cannot alter persistence. Read and absent cancel/acknowledge commands do not initialize an unused queue. There is no operator method for setting confirmed status, fabricating observations, clearing tasks or discarding journals.

```js
var job = boosts.get(owner, requestId);
boosts.cancel(owner, requestId);
// Inspect again on a later tick. Once terminal, deliberately consume success
// or choose abort/fallback for failure:
boosts.acknowledge(owner, requestId);
```

Cancellation records intent. An admitted native boost can still consume resources and affect the body. Cancellation during an issued attempt waits for later observation; it never erases that effect or turns a cancelled job into ready. Cancelling an already terminal job leaves its recorded outcome intact. Acknowledging pending/issued work refuses. For a required failed/cancelled/expired outcome, acknowledgement is the explicit abort/fallback decision that releases the actor gate, not mission readiness. Only observed confirmation returns ready. Acknowledgement does not force lab/supply cleanup to complete immediately.

Commands use the exact owner and ID from inspection. They cannot redirect the request to another actor or take over another feature's task. Worker policy can consume confirmed/optional worker outcomes itself; required failures and foreign-feature outcomes retain their existing owner decisions. Effects/gates already admitted in the current tick remain conservative; an operator call cannot revoke native intents already issued by earlier gameplay. Submit before activation or expect scheduling to handle the intent on the next tick.

## Qualification and compatibility

Full local checks pass 1,910 unit cases / 469 files in 13.43 s under concurrent native load, focused + smoke 14 / 4 files in 0.319 s, four processor comparisons in 0.200 s, suite-report check in 0.1257766 s and bundle checks. Type/lint/boundary checks and Lizard 1.22.2 pass with 873 production / 716 test files and zero violations. The CommonJS bundle verifier checks the six exported commands and an absent read without Node globals. [CI 44799750148](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44799750148) passes both Windows/Linux jobs and all six required checks on exact source.

Eleven clean native cases pass in 57.532 s: operator commands, ordinary boost, direct cancellation, contracted birth, alias fallback, automatic normal/optional/shortage workers, lab chain, Upgrade Room and packaged smoke. The new 100-tick operator case submits through the production export's alias API, cancels through that API after tick-13 admission and resets before tick-14 observation. Two actual XGH2O WORK parts remain on the body while the outcome is cancelled/not ready. Controller progress stays zero before explicit API acknowledgement at 40; ordinary work later resumes and reaches 216 by 100. No lab stock/energy, attempt, boost claim or pin remains. Unit cases additionally cover detached inspection, immutable replay/conflict, missing ownership, spawning actors, unsupported compounds and unsettled/wrong-owner acknowledgement.

The [manifest](evidence/operator-boosts.json) preserves actual rows, reset witnesses, source/raw hashes and CI step results. These cases do not prove every console error branch natively or qualify general operator/lab/flag parity. Registry 264 was not fully rerun; CPU/memory/soak and cross-version rollback remain open.

No schema/configuration migration is introduced here. The API can be recreated after reset because its state port reads current Memory lazily. Rolling back to a pre-export build removes these console methods while existing boost state still belongs to its normal owners; update operator scripts and preserve required-failure decisions, tasks, supplies and journals. The earlier spawn-schema/birth-intake rollback obligations still apply.
