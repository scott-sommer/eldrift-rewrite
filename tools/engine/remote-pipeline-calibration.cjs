const assert = require('node:assert/strict');
function verifyPipelineCalibration(memory,evidence) {
  const proof = memory.pipelineCalibration; evidence.pipelineCalibration = { proof,rows: memory.pipelineRows,births: memory.pipelineBirths,attempts: memory.pipelineCalibrationAttempts,policy: memory.pipelineCalibrationPolicy,economicChecks: memory.pipelineEconomicChecks }; assert.ok(proof);
  const epoch = proof.quote.observedAt, cutoff = epoch+proof.horizon, rows = memory.pipelineRows;
  const actualBirths = proof.result.spawning.births.map(birth => { const observed = memory.pipelineBirths[birth.request]; return { request: birth.request,predictedStart: epoch+birth.startAt,actualStart: observed?.seenAt,predictedActive: epoch+birth.activeAt,actualActive: observed?.activeAt }; });
  const predictedMining = epoch+proof.result.spawning.births.find(birth => proof.input.project.workers.some(worker => worker.request === birth.request)).activeAt+proof.quote.legs.find(leg => leg.kind === 'miner-approach').ticks;
  const actualMining = proof.events.find(event => event.action === 'harvest')?.tick, firstIncome = rows.find(row => row.income > 0)?.tick;
  const predictedReceipts = proof.result.delivery.receipts.map(receipt => ({ tick: epoch+receipt.tick,energy: receipt.energy }));
  const actualReceipts = rows.flatMap((row,index) => { const energy = row.income-(rows[index-1]?.income ?? 0); return row.tick <= cutoff && energy > 0 ? [{ tick: row.tick,energy }] : []; });
  const repairs = { predicted: proof.result.maintenance.repairEnergy,actual: proof.events.filter(event => event.action === 'repair').reduce((sum,event) => sum+event.amount,0) };
  const comparison = { epoch,cutoff,repairs,receipts: { predicted: predictedReceipts,actual: actualReceipts },births: actualBirths,firstMining: { predicted: predictedMining,actual: actualMining },firstIncome: { predicted: epoch+proof.result.delivery.firstDeliveryAt,actual: firstIncome },harvested: { predicted: proof.result.delivery.harvestedEnergy,actual: proof.events.filter(event => event.action === 'harvest').reduce((sum,event) => sum+event.amount,0) },delivered: { predicted: proof.result.delivery.deliveredEnergy,actual: rows.find(row => row.tick === cutoff)?.income } };
  evidence.pipelineCalibration.comparison = comparison;
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]); assert.ok(cutoff < rows.at(-1).tick);
  for (const birth of actualBirths) { assert.equal(birth.actualStart,birth.predictedStart); assert.equal(birth.actualActive,birth.predictedActive); }
  assert.equal(actualMining,predictedMining,'First native harvest must match the quoted activation/approach frame');
  assert.equal(firstIncome,comparison.firstIncome.predicted,'First settled receipt must match the projected calendar');
  assert.deepEqual(actualReceipts,predictedReceipts,'Every settled receipt frame and amount must match the prospective calendar');
  assert.equal(repairs.actual,repairs.predicted,'Native upkeep spend must match the projection');
  if (memory.pipelineEconomicMode) {
    assert.ok(proof.economic);
    const accepted = memory.pipelineEconomicChecks.filter(check => check.allowed);
    assert.deepEqual(accepted.map(check => ({ request: check.request,tick: check.tick })),actualBirths.map(birth => ({ request: birth.request,tick: birth.actualStart })));
    assert.ok(accepted.every(check => check.bindingMatches));
  }
  assert.equal(comparison.harvested.actual,comparison.harvested.predicted); assert.equal(comparison.delivered.actual,comparison.delivered.predicted);
}
module.exports = { verifyPipelineCalibration };
