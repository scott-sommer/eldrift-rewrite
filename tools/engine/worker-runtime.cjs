const assert = require('node:assert/strict');
function verifyWorkerRuntime(memory) {
  const rows = memory.workerRuntime;
  assert.deepEqual(rows.map(({ kind, sites, hits, progress, energy }) => ({ kind, sites, hits, progress, energy })), [
    { kind: 'build', sites: 1, hits: 3900, progress: 0, energy: 20 },
    { kind: 'repair', sites: 0, hits: 3900, progress: 0, energy: 15 },
    { kind: 'upgrade', sites: 0, hits: 4000, progress: 0, energy: 14 },
    { kind: 'upgrade', sites: 0, hits: 4000, progress: 1, energy: 13 },
    { kind: 'none', sites: 0, hits: 4000, progress: 2, energy: 12 },
    { kind: 'upgrade', sites: 0, hits: 4000, progress: 2, energy: 12 },
  ]);
  assert.equal(rows[2].id, rows[3].id, 'upgrade task persists');
  assert.notEqual(rows[3].id, rows[5].id, 'reenabling creates a fresh task');
}
module.exports = { verifyWorkerRuntime };
