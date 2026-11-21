# Threshold and intermediate-stock production policy (ED-36)

`industry.labs.legacyPolicy(options?)` builds a detached shared-policy patch; preview/apply it through `previewEmpire`/`configureEmpire`. It preserves source default compound ordering and amounts, symbolic BOOST resolution and distinct duplicate thresholds. It does not enable reactions by itself or import old Memory.manager. The existing legacyTargets helper remains the unique-target convenience API; use legacyPolicy when duplicate thresholds matter.

## Responsibility and configuration

| Key | Default | Meaning |
| --- | --- | --- |
| labProductionPolicy | targets | Existing unique-target/window planning, or opt-in thresholds |
| labProductionThresholds | [] | Up to16 ordered final-product thresholds; duplicate compounds remain distinct |
| labIntermediateBase | 1000 | Global intermediate inventory target base in threshold mode |
| labIntermediatePerTerminal | 1000 | Additional target per observed owned terminal |

Ordinary targets remain unique and their original durable context is unchanged. Threshold mode first selects the deficient final threshold by priority/stable input order, then walks its compound dependencies with bounded reverse-discovery ordering from the injected recipe lookup. Only deficient intermediate compounds become additional demands. Raw inputs do not receive an intermediate target. Shared mode scales against observed owned empire terminals and recoverable stock; room-local mode uses local stock and its own terminal. Base/per-terminal values are configurable, nonnegative integers; effective target must be at most1,000,000 with at most50 terminals.

The portable capability selects demands and detects cyclic/excessive graphs within64 visits/16 compound targets. A feature policy composes that with configuration; native adapters supply stock, terminal count and REACTIONS. Existing planners still prove local funding, reserve resources and execute bounded batches. Operator validation checks both target catalogs; active shared policy signatures reject conflicting participating room overrides. Inactive configuration fields do not create false conflicts.

A target is desired inventory, not a stock cap, per-bank spend floor or success receipt. Final-product work may consume intermediates or manufacture local dependency stock while remote intermediates exist. Once all final thresholds are satisfied, this policy creates no maintenance-only intermediate demand. It does not claim all intermediate inventory remains at its target after the last final batch. Terminal transfer coordination remains ED-37.

## Durable behavior

Threshold windows bind policy, selected final threshold and effective intermediate target. Ordinary intermediate deficits are excluded from the durable context, avoiding retirement/recreation on each stock observation. Root-priority or policy/terminal-target changes retire old windows through existing admitted-work settlement. Existing namespace schemas are unchanged.

Compared with resourceManager.js, observed terminal counts refresh dynamically rather than only once per global initialization. Reserved boost/specialist stock remains excluded consistently; no unavailable remote stock funds a local effect. These are explicit ownership/lifecycle corrections. Literal console inputs, old memory import and downstream terminal/mission integrations remain separately tracked; this policy alone does not close ED-36 or establish release parity.

## Validation and rollback

Implementation checks:33 targeted tests/5 files in0.280s, smoke76/15 in0.473s, type/lint/boundaries and Lizard908 production/779 test files with zero violations, packaged23-method lab API pass. Native shared/local/duplicate-threshold qualification remains pending at this implementation checkpoint. Full units are reserved for milestone/ticket closure.

Before downgrading to a pre-policy bot, stop new admissions and settle existing windows/supply under this version. Remove the four new policy keys from every persisted configuration layer, including profiles, room overrides and temporary values; older validators reject them. Preserve tasks, requests, receipts, quantity claims and assignment state. Existing schemas are unchanged, which does not substitute for an actual rollback rehearsal under ED-44.

Independent intermediate ties use the canonical REACTIONS lookup order, which can differ from the legacy hard-coded COMPOUNDS ordering (UH before OH for UH2O in the native table). Final threshold priorities/amounts remain source-preserving; the implementation does not duplicate the old chemistry table just to retain that tie. The first shared native prototype reached15UH2O but correctly failed its fixture's assumed OH-first order; it remains failed evidence, and the fixture now asserts the explicit canonical UH-first10/5 allocation.

## Native qualification

Clean source `5dbbc87ced8cbd9626ecb3e09173a0653356d5b3` passes five640-tick cases. Shared mode with two terminals/base5/per-terminal5 admits UH10/5 windows against one global intermediate target15, progresses through OH/UH/final UH2O and banks15UH2O with one active root context despite changing intermediate deficits. Local mode uses target10 for its one terminal per room and banks15UH2O each. Duplicate thresholds OH5/UH5/OH15 do not produce OH beyond5 until UH reaches5, then finish with banked OH15/UH5. Final courier cargo/tasks and live quantity claims are empty; reloads31/121/401 preserve progress. Ordinary shared-production and local-chain regressions also pass.

[Raw/domain evidence](evidence/stock-policy-native.json) records five passes with exact source/hashes, and the separate failed tie-order prototype. CI44883057147 passes both OS jobs with full-unit steps skipped. The production-policy gap is now implemented and natively qualified in bounded cases; consolidated original-criteria milestone/full-suite and downstream parity/release gates remain unexecuted. Registry294 has not received a full rerun. Four new persisted policy keys still require rollback cleanup and live-window settlement under current code before downgrade.
