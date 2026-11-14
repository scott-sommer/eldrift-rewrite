# ED-10 planning baseline acceptance

All 60 modules have hashes, source symbols, static reachability classification, proposed owners, porting dispositions and Jira mappings. Audit corrected a missing dormant courier mapping (ED-21) and the object-literal patroller export (run at line 12).
All 60 registered console operations have handler/source references, proposed owners and test requirements. All 26 documented flag forms have behavior descriptions, source candidates and porting test requirements. operator-behavior.md records reviewed semantic differences and inactive paths; runtime characterization remains ED-13 and feature work.
Architecture decisions, charter, full goal, roadmap/backlog, development instructions, test cadence, provenance and regression register are versioned. Every parity evidence record remains explicitly not implemented. This completes the initial planning inventory, not the rewrite or proof of gameplay behavior.

Future source discoveries refine the inventory under the responsible feature ticket. Do not classify an implemented capability as deferred without user agreement. Preserve exact source SHA and file hashes when porting.

Validation: 60/60 modules have owners/issues/symbols; 60/60 console controls have owners; 26 documented flag records; source hashes previously verified against the frozen checkout; git diff --check passes. No production test suite exists yet. Local SSH publication remains blocked by the wrong account; local commits are intact.
