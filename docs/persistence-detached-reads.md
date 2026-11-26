# Detached adapter reads

StatePort.detachedReads is an optional positive contract: every read returns a fresh plain-data-validated graph without shared mutable references. The native Memory adapter already satisfies this using copyPlain on every read, so it declares the contract. Other adapters retain defensive schema-layer copying unless they explicitly provide the same guarantee.

openState and peekState can use that private snapshot directly. Envelope ownership, supported version, migrations and schema validation still execute on every call. saveState retains fresh owner/version checks, validation and detached writes. This introduces no caching, retained authority, persistence format changes or shared mutable snapshots. Custom decorators that replace read must preserve the declared contract or omit the marker.

Tests cover nested read/write/reset isolation, legacy read-only migration followed by committed open, direct external corruption, wrong owner and future version. Existing planning inspection and task checkpoint contracts remain targeted regressions. Native engine timing is required before claiming a performance improvement or low-budget qualification.

## Native qualification on 6a52359

[Source-qualified evidence](evidence/startup-detached-reads.json) preserves four raw runs and two 600-row phase traces, including all three failures. The short260-tick probes intentionally end before the forecast cutoff and therefore fail economic completion; they supply timing measurements only.

Before/after medians in milliseconds: miner1.366 to1.065; courier5 1.824 to1.812; courier6 1.396 to0.960. Maxima were4.254/4.280/3.606 before and3.626/3.247/1.907 after. These are single native runs with different scheduling, not a controlled statistical speedup or a timing guarantee.

The full5ms run completed its first observation35 forecast and approved86, before all exact starts135/156/168 and activations156/168/180. First harvest166, first income183 and repair88 matched. Through cutoff802, actual delivery3080 equals predicted3080, but harvest3256 is below3264 and actual52 receipt frames differ from53 predicted. The first calendar difference is receipt229 rather than228. The exact calendar gate correctly remains FAILED; equal aggregate delivery does not qualify it.

The supported-budget1000-tick configured campaign passed. Keep its exact raw comparison as the evidence; no inference from a short probe replaces it. Full units and both-OS milestone CI were not run, and ED-29 remains open.

Incremental checks: targeted45tests/8files PASS524ms; fixedsmoke76/15 PASS489ms; quality1041production/895testfiles0violations; packaged CommonJS bundle PASS. Next inspect repeated operation-scoped hauling/task work and guard deferrals without weakening the forecast calendar or retaining live authority. Broader future schedules, shared capital, replacement and home-loss gates remain required.
