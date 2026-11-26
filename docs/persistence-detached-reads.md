# Detached adapter reads

StatePort.detachedReads is an optional positive contract: every read returns a fresh plain-data-validated graph without shared mutable references. The native Memory adapter already satisfies this using copyPlain on every read, so it declares the contract. Other adapters retain defensive schema-layer copying unless they explicitly provide the same guarantee.

openState and peekState can use that private snapshot directly. Envelope ownership, supported version, migrations and schema validation still execute on every call. saveState retains fresh owner/version checks, validation and detached writes. This introduces no caching, retained authority, persistence format changes or shared mutable snapshots. Custom decorators that replace read must preserve the declared contract or omit the marker.

Tests cover nested read/write/reset isolation, legacy read-only migration followed by committed open, direct external corruption, wrong owner and future version. Existing planning inspection and task checkpoint contracts remain targeted regressions. Native engine timing is required before claiming a performance improvement or low-budget qualification.
