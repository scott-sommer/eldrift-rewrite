# Architecture decisions

## ADR 001: New implementation with selective ports
Accepted: user rewrite objective. The legacy SHA is frozen for provenance, not a requirement to reproduce defects. Keep the legacy checkout unchanged. Characterize useful decision logic, port into explicit owners, and distinguish behavioral corrections from feature loss. Inventory dormant entrypoints before retiring them.

## ADR 002: Dependency direction and composition
Accepted. app wires core, capabilities, features, world, persistence, configuration and adapters. core uses plain data and no Game/Memory/PathFinder globals. Features own policy and depend on narrow capability interfaces. Adapters implement those interfaces. No dependency-injection container or universal services object is needed. Keep implementation folders aligned to these responsibilities.

## ADR 003: State and action ownership
Accepted. Persist versioned IDs and plain records; reconstruct handlers and caches after reset. A creep has one behavior owner per tick. Accepted intents are not completed effects; verify effects in subsequent observations. Bounded transition evaluation is shared between creep tasks and missions, while their lifecycle data stays separate. Reservations release on death, cancellation and ownership changes.

## ADR 004: Planning pipeline
Accepted. Assessment -> eligible strategies -> bounded candidate generation -> hard validation -> comparable scoring -> versioned committed plan -> construction reconciliation. Generation cannot create sites. Preserve manual constraints and last valid plans. Support standard, constrained and stamp strategies plus terrain-aware and exit-perimeter defenses. Default migration is additive. Separate bootstrap geometry must not conflict with the eventual plan.

## ADR 005: Configuration and persistence
Accepted. Precedence: defaults, environment, empire, room profile, room override, temporary override. Validate known fields, retain zero/false, replace arrays by default and expose effective-value provenance. Each memory namespace has an owner; unseen is not destroyed. Migrations are idempotent and resumable. Introduce segments only if measurement justifies complexity.

## ADR 006: Quality and test cadence
Accepted. Lizard 1.22.2 standard CCN is authoritative: maximum 10 CCN, 50 function NLOC and 300 file NLOC. Its -L flag is not a file-length limit; the wrapper must use file metrics. Reproducible type/dependency checks and behavior tests complement metrics. Iterations use relevant tests plus fast broad smoke coverage; milestone gates run the full applicable suite. Engine verification uses pinned versions and tick budgets. Report actual timings, CPU/memory and failures.

## Pending decisions
ED-11 selects and pins the bundler/test runner after a compatibility check. ED-14 establishes the real-engine execution route on this Windows machine. ED-18 evaluates movement library adoption behind a stable port. These are not implemented or validated yet.
