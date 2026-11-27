# Shared service timing trace

ED-29 remains In Progress. Source d32f6e2 adds passive SDK outcomes and all-unit positions for shared-case ticks 120–210. The bounded fixture probe issues no intents and does not change financial admission or receipt assertions.

Native engine-GzTNwo completes 1,000 frames but fails exact per-source receipt calendars. The first source starts with matching 124/56 and 132/56 frames; its next actual receipts are 151/100 and 157/68 versus prospective 150/100 and 158/68. The second source first settles at 176/56 versus 175/56. Birth, capital and cleanup checks preceding the calendar assertion pass. This is failed qualification, not a passing shared strategy.

At tick 149 courier ed-W0N1-5 is at W0N1(47,24) carrying 100. At 150 it is at deposit (46,25) and the SDK accepts its transfer; settlement is independently observed at 151. The second-cohort ed-W0N1-8 occupies spawn (47,25) throughout these frames. Courier ed-W0N1-6 later transfers 68 at 156, settled at 157. Opposite timing errors preclude a uniform route-padding correction. These observations identify route-phase/occupancy comparison as the next investigation; they do not yet prove that the spawn occupant caused the delay.

Validation: typecheck, lint, boundaries and pinned Lizard pass (1,052 production / 911 test files; zero violations). Fixed smoke 76 tests / 15 files passes in 488 ms; packaged bundle loads without Node globals. Full units and milestone CI were intentionally not run for this diagnostic increment. Raw native output and exact hashes are retained in the adjacent evidence manifest.
