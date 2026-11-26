# Paid geometry and financial evidence

Source14d5626 adds readStartupServiceGeometry as an explicitly read-only projection under the existing remoteStartupApprovals owner/version1 namespace. It validates the bounded record envelope/home/revision/clock, unique identities, planning context/generation, complete quote geometry and corridor. It returns only a detached plan, without initialization, writes or forecast restoration. Native paid service uses it on a cold cache miss. The existing cache still bounds source keys and matches body/home/source/generation.

This projection is not a financial approval. Complete current/capture/admit/result readers still validate and restore full financial evidence. Static geometry may remain available for already paid actors even when a financial checkpoint is invalid; no recruitment, payment or publication can use that projection as proof. Live lease, risk, task, quantity, capacity and retirement owners remain responsible for current operational authority. No persistent format or namespace was added.

## Checks

Fourteen targeted tests/four files passed539ms; fixed smoke76/15 passed549ms on committed source after native testing. Quality passed (1043 production/899 test files, zero violations) and CommonJS bundle passed. Tests cover cold recovery without a financial read, reset, detached first/warm results, wrong identity/body, incompatible owner/future format/clock, invalid geometry/corridor and duplicate identities. A corrupt financial checkpoint can supply static geometry but remains rejected by financial read/result; the geometry provider cannot satisfy a financial current read. The first-read isolation test caught a cache-reference leak, which was fixed before the commit. Header validation was extracted to meet the normal Lizard gate without exceptions.

Full units and milestone CI were not run. ED-29 remains open.

## Native evidence

[Four clean-source archives and31 refusal rows](evidence/startup-paid-geometry.json) preserve two passes and two failures, using explicit external fixture history throughout. Supported configured1000 PASS: all61 receipt frames,3528 delivered,3752 harvested,88 repair and existing withdrawal/cleanup/capital checks match. Financial-refused180 PASS: no approved paid source cohort, no remote income, only resident births and household spending; no calibration frames/events were manufactured.

Instrumented5ms1000 FAILED exact timing despite matching3264harvest/3080delivery/88repair and53 receipt frames. It observed35 and matched births135/156/168, activations156/168/180, firstharvest166/income183; first late receipt315 rather than313. It recorded31 refusals (15 yields,6 deferred actors,8 execute denials,2 whole-run denials), against60 in the prior probe. These single runs are not a controlled speedup guarantee.

Untraced5ms1000 also FAILED exact timing: observation34, starts134/155/167, activations155/167/179 and firstharvest165/income182 match, as do3264harvest/3080delivery/88repair. Actual52 receipt frames differ from53; the first late frame228 differs from227. Equal aggregates do not close the exact calendar gate.

Cold refusals remain at311(total tick CPU64.40),591(~51.59–51.70) and861(~51.97). These are absolute whole-tick CPU readings at refusal, not isolated geometry-read durations. The source separation removes a concrete unnecessary financial read but does not prove it accounts for the remaining cold cost.

## Next diagnosis

Retain a few existing actor begin/execute/done markers around actual reload ticks311/591/861 in the otherwise refusal-only fixture trace. This keeps observation bounded while distinguishing time before paid-service selection, profile/lease lookup and role execution, and avoids attributing total tick CPU to one method. Compare those same-run intervals and the first steady-state refusal before further hot-path edits; preserve an independent untraced campaign. Future schedules, shared capital, longer-route replacement, home loss and all downstream specialist/operator/parity/pressure/migration/RC requirements remain open.
