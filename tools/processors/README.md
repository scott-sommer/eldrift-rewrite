# Pinned processor comparisons

From the repository root:

```powershell
npm ci --prefix tools/processors --ignore-scripts
npm run test:processors
```

This lean dependency set contains pinned `@screeps/engine`4.3.2 and `@screeps/common`2.16.1 sources. Vitest loads the TypeScript model through the root toolchain and runs selected upstream processor functions with explicit fixture objects, clock, bulk and constants ports. It does not initialize a backend, database, native driver or private server. Controlled comparisons complement ordinary unit tests and packaged real-engine scenarios; they do not replace full runtime qualification.

The normal `npm test` loop requires only the root dependencies. Processor checks use `.check.mjs` filenames and a separate explicit Vitest include so they do not accidentally enter that loop. The Windows/Linux Quality workflow installs this lockfile without install scripts and runs the comparisons separately. No CI execution on either hosted platform is implied by local Windows results.

Keep fixtures local and trusted. The pinned upstream dependency graph retains Lodash3.10.1; the recorded npm audit reports one critical transitive Lodash finding and two moderate inherited package findings, with no compatible automatic fix. These are isolated comparison dependencies, excluded from the gameplay bundle. Do not expose this fixture runner to user-supplied payloads or substitute a different major Lodash implementation while claiming equivalence to the pinned engine. Broader upstream dependency remediation remains separate from reproducing these processor semantics.


`hauling.check.mjs` compares the shared energy inventory against pinned creep withdrawal/transfer processors: explicit processing orders for competing withdrawals and a deposit, mixed-resource receiving capacity, and insufficient sender stock. It checks stores and actual event amounts. These fixture comparisons do not establish global native processing order or replace the packaged full-tick scenarios.

`harvest.check.mjs` compares full energy harvest, shared-capacity clipping, automatic standing-container overflow, ground merge/decay, explicit harvest/withdrawal ordering and a300-frame source regeneration cycle. These action-physics fixtures do not install a native miner controller or qualify a full future home forecast.
