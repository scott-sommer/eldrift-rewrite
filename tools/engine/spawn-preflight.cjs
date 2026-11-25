const assert = require('node:assert/strict');
function verifySpawnPreflight(memory,evidence) {
  const proof = memory.spawnPreflight; assert.ok(proof); assert.equal(proof.recreated,true);
  assert.deepEqual(proof.calls.map(call => [call.tick,call.name,call.code]),[[1,'safe',0]]);
  assert.equal(proof.calls[0].order.length,2); assert.deepEqual(proof.pending,['unsafe']); assert.deepEqual(proof.names,['safe']); assert.equal(proof.observedAt,3);
  // The pinned spawn tick processor regenerates one energy per eligible tick after the paid debit.
  assert.equal(proof.energy,100+(proof.observedAt-1));
  const claims = memory.eldrift.records['quantity-reservations/empire'].data.claims;
  assert.equal(claims.length,1); assert.equal(claims[0].allocations[0].amount,100);
  evidence.spawnPreflight = proof;
}
module.exports = { verifySpawnPreflight };
