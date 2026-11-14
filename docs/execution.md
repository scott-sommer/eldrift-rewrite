# Execution framework

ED-17 begins with a pure bounded transition runner. Domain-owned handlers receive injected context and return running, done, blocked/retry, failed or phase-transition outcomes. The runner copies its input checkpoint, bounds handler evaluations, retains retry counts across phases and serialization, sleeps until retryAt, and fails at expiry or retry exhaustion. It does not equate an issued game intent with completion: action adapters must return running until later observations prove effects.

This is a new mechanism; legacy role/mission policies will be selectively ported into handlers. Callers must validate persisted records through owned schemas before execution. Handler exceptions propagate to the existing fault-isolation boundary. Persistence adapters, action ownership/budgets, cancellation integration and real-engine action scenarios remain ED-17 work. ED-14/16 remain open; starting this independent primitive does not claim their acceptance gates are complete.

Validation: transition-cycle bound, detached checkpoints, serialized retry continuation, sleeping, retry exhaustion, expiry, unknown phases and explicit target failure are covered. Four execution/smoke tests passed in207ms; quality/Lizard passed with zero violations.

Action arbitration now tracks one behavior owner per unit per tick and injected compatibility slot sets. Compatible disjoint slots may issue under that owner; conflicting calls never invoke their adapter. Rejected return codes free their slots for a fallback, while thrown/uncertain calls retain reservations to prevent duplicate intents. Tick change clears ephemeral ownership; units are independent. An issued result records acceptance only, never observed completion. Concrete Screeps compatibility groups and engine confirmation remain adapter work; the example test slot labels do not define game rules.

Six execution/smoke tests passed in199ms; quality/Lizard passed with zero violations.

Task schema v2 persists retries and expiresAt alongside phase/wakeAt. Version1 migration supplies zero retries and MAX_SAFE_INTEGER expiry to preserve prior unlimited lifetime; subsequent opens preserve accumulated retry state. Both persisted task validation and execution entry use the same checkpoint validator. Regression covers v1 migration, serialized reset, preserved nonzero retry count and rejected negative counters. 44 relevant tests passed; full lifecycle executor wiring remains pending.
