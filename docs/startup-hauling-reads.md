# Assigned hauling reads and uncertain transfers

Implementation source: b500d544b9994bcab7c159455bf0ef2bc5b2a822. [Raw evidence manifest](evidence/startup-hauling-reads.json) preserves all four terminal outcomes with clean source provenance.

Assigned trips now look up one current pending request without constructing and sorting the entire pending list. Clear transfer journals avoid redundant settlement reads; acknowledged unknown attempts remain protected until explicit retirement. Existing live authority, receipt accounting and transfer recovery remain responsible for correctness.

The unknown-delivery and unknown-recovery native scenarios passed. The configured 5ms campaign failed the exact receipt calendar: all three births and activations matched, as did first harvest (168), first income (185), and repair (88). Through cutoff 804, delivery was 1846 against predicted 3080, harvest 3224 against 3264, with 26 actual receipt frames against 53 predicted; the second receipt was already late (197 against 196). This does not establish full paid-service execution under 5ms.

The supported-budget configured campaign timed out. Preserve it as failed execution evidence, not a supported-budget regression diagnosis or a pass. Previous source-qualified passes do not qualify b500d54.

Incremental checks on implementation: quality passed (1041 production and 893 test files; zero violations); nine targeted files passed 34 tests; fixed smoke passed 76 tests in 15 files; packaged CommonJS bundle passed. The smoke suite was verified again in 1.73 seconds. Full units and full milestone CI were not run; ED-29 remains open.

Next investigation: selected home endpoints currently scan and rank every eligible room structure before filtering the known endpoint. A direct current-object lookup could retain all ownership, active-state, room, resource and capacity checks while avoiding that work. Any change needs targeted endpoint-policy tests and source-qualified native checks; do not relax the receipt calendar or increase the 5ms gate to obtain a pass.
