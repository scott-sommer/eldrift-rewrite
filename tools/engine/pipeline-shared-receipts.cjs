const assert = require('node:assert/strict');
function decode(value,prefix) {
  assert.ok(typeof value === 'string' && value.startsWith(prefix));
  const decoded = JSON.parse(value.slice(prefix.length)); assert.ok(Array.isArray(decoded)); return decoded;
}
function observedReceipts(memory) {
  const receipts = memory.pipelineRemote;
  assert.ok(receipts.observedAt,'native settlement observation clocks are required');
  const births = Object.values(memory.pipelineBirths), observed = [];
  for (const [id,energy] of Object.entries(receipts.amounts)) {
    const attempt = decode(id,'logistics:'); assert.equal(attempt[0],'attempt');
    const birth = births.find(birth => birth.id === attempt[1]); assert.ok(birth,'receipt must belong to an actually born unit');
    const identity = decode(birth.owner,'remote-fleet:'); assert.equal(identity.length,4);
    const tick = receipts.observedAt[id]; assert.ok(Number.isSafeInteger(tick) && tick >= 0);
    observed.push({ source: identity[2],tick,energy });
  }
  return observed;
}
function frames(receipts) {
  const sums = new Map();
  for (const receipt of receipts) sums.set(receipt.tick,(sums.get(receipt.tick) ?? 0)+receipt.energy);
  return [...sums].sort(([a],[b]) => a-b).map(([tick,energy]) => ({ tick,energy }));
}
function verifySharedReceipts(memory,evidence) {
  const observed = observedReceipts(memory);
  const comparisons = memory.pipelineSharedApprovals.map(approval => ({ source: approval.source,epoch: approval.observedAt,cutoff: approval.cutoff,
    receipts: { predicted: frames(approval.receipts),actual: frames(observed.filter(receipt => receipt.source === approval.source && receipt.tick <= approval.cutoff)) } }));
  evidence.sharedHome.comparisons = comparisons;
  for (const comparison of comparisons) assert.deepEqual(comparison.receipts.actual,comparison.receipts.predicted,'Every source settled receipt frame and amount must match its prospective calendar');
}
module.exports = { verifySharedReceipts };
