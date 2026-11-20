const assert = require('node:assert/strict');
function verifySpawnPlacement(memory,evidence) {
  const result = memory.spawnEvidence;
  assert.deepEqual(result.rejected,[-7]); assert.deepEqual(result.directions,[7]);
  assert.deepEqual(result.actualExit,result.exit); assert.equal(result.activeAt,11); assert.equal(result.queueVersion,2);
  assert.deepEqual(result.legacy,{ id: 'legacy',name: 'legacy',owner: 'unrelated',room: 'W0N1',body: ['move'],priority: 10,readyAt: 100,expiresAt: 200 });
  evidence.spawnPlacement = result;
}
module.exports = { verifySpawnPlacement };
