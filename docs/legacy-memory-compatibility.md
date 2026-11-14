# Legacy memory compatibility policy

Baseline: Eldrift-Directive f2bbf7e8c44addc7c426abb5458e393c9502ff5f. The rewrite owns only Memory.eldrift and its versioned namespace records. It must not clear or reinterpret other root keys. Current production startup imports no legacy state automatically. This is a policy and release contract; no legacy import/rollback rehearsal is claimed complete.

## Selection rules

| Legacy state | Treatment at the eventual migration boundary |
| --- | --- |
| Explicit operator settings and room-mode choices | Map only named, reviewed fields into validated operator/colony records; preserve false/zero values and provenance. Unknown fields are reported, never silently accepted. |
| Manual construction entries in Memory.build | Preserve operator intent separately from generated plans. room.layout.js distinguishes entries whose source is not roomPlan; use that distinction as a characterization starting point, then validate coordinates, types, duplicates and conflicts against the target schema. ED-27 owns the conversion behavior. |
| Generated layouts, cached paths and room/global caches | Reconstruct from current observations and approved strategies. Preserve existing structures and manual constraints; do not execute stale generated construction orders. Temporary vision loss does not authorize clearing old intel. |
| Creeps, tasks and claims | Reconcile names AND current object identities. Translate only supported role/task contracts; rebuild exclusive claims from accepted assignments. Do not import raw handlers, promises, cached objects or obsolete queues. Unknown live roles require an explicit conversion or retirement plan before cutover. |
| Memory.missions, Memory.missionPlans and Memory.formations | Preserve linked operator intent as a consistent set. mission.js resolves these references together. Unsupported stage/tactic/formation contracts block activation of the affected mission; report them in the migration preview. Do not flatten these into a generic task or silently cancel them. ED-33/34 own the capability mappings. |
| Lab, boost, power and inter-room resource assignments | Convert only after the corresponding feature defines ownership and reconciliation rules. Recheck current stores, structures and creep state; stale reservations are not accepted merely because they deserialize. |
| Unknown namespaces, corrupt/future versions | Preserve the source snapshot, report exact records and block dependent work. No blanket deletion or best-effort overwrite. |

## Import protocol required by ED-44

1. Capture the source code SHA, exact serialized Memory snapshot and hash, target build/lock hashes, shard/time and configuration. Keep recoverable originals outside the mutable game state.
2. Produce a read-only dry-run manifest: selected source paths, target owners/schema versions, mappings, conflicts, unsupported capabilities and estimated size. Cross-record dependencies must be explicit.
3. Validate a separate candidate snapshot using the target schemas and current observations. Live IDs are not proof of ownership; absent objects in unseen rooms are not proof of destruction. Preserve operator provenance and avoid importing transient intent results.
4. Apply immutable, versioned migration manifests through bounded, idempotent steps with checkpoints. A reset after writing data but before its checkpoint must replay safely. Do not dispatch gameplay against a partially converted dependency set.
5. Rehearse interruption, retry, corrupt inputs, unknown versions, already-migrated inputs and same-name replacement on disposable actual-engine worlds. Assert unrelated legacy data is unchanged and accepted capabilities still work. Record exact evidence in ED-44.
6. Rehearse rollback using the matched old build and saved Memory, accounting for world changes that cannot be undone by restoring JSON. Define the point after which forward repair is safer. Restoring a snapshot alone is not proof of rollback safety.

Code deployment and a destructive live migration remain a separate user decision. Foundation schema migrations and synthetic capacity fixtures do not satisfy ED-44 or capability-parity gates.
