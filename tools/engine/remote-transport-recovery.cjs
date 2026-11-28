const assert = require('node:assert/strict');
/** A fresh body or unrelated banking receipt cannot stand in for productive recovery. */
function verifyRemoteTransportRecovery(attempts,metadata) {
  const observed = attempts.filter(attempt => attempt.result?.status === 'observed' && attempt.result.amount > 0);
  const opening = observed.filter(attempt => attempt.kind === 'withdraw' && attempt.tick < metadata.threatAt).sort((a,b) => a.tick-b.tick)[0];
  assert.ok(opening,'threat must interrupt an actual courier collection');
  const resumed = observed.filter(attempt => attempt.unit === opening.unit && attempt.kind === 'withdraw' && attempt.tick >= metadata.clearedAt && attempt.requestKey !== opening.requestKey)
    .sort((a,b) => a.tick-b.tick)[0];
  assert.ok(resumed,'the same native courier must resume a fresh productive trip after safe authority returns');
  const delivery = observed.find(attempt => attempt.unit === resumed.unit && attempt.kind === 'transfer' && attempt.tick > resumed.tick && attempt.requestKey === resumed.requestKey);
  assert.ok(delivery,'resumed productive cargo must have its own confirmed delivery');
  return { unit: opening.unit,interruptedWithdraw: opening.id,resumedWithdraw: resumed.id,resumedAt: resumed.tick,
    resumedTransfer: delivery.id,deliveredAt: delivery.tick,confirmedEnergy: delivery.result.amount };
}
module.exports = { verifyRemoteTransportRecovery };
