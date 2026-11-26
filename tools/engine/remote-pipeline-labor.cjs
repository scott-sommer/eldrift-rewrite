const assert = require('node:assert/strict');
function verifyPipelineLabor(memory,evidence) {
  const proof = memory.pipelineLabor, rows = memory.pipelineRows; evidence.pipelineLabor = proof; assert.ok(proof);
  assert.equal(proof.publishedAt,1); assert.equal(proof.acknowledgedAt,2); assert.equal(proof.birthCost,200); assert.equal(proof.activeAt,10);
  assert.equal(proof.proposal.job.energy,3); assert.equal(proof.proposal.input.request.priority,5);
  assert.ok(proof.receipt,'Published labor must produce its own completion receipt');
  assert.equal(proof.receipt.request,proof.proposal.input.request.id); assert.equal(proof.receipt.picked,3); assert.equal(proof.receipt.spent,3); assert.equal(proof.receipt.returned,0); assert.equal(proof.receipt.completedAt,12);
  assert.ok(proof.idleAt > 12 && proof.idleAt < 30); assert.ok(proof.moveCodes.every(code => code === 0));
  const last = rows.at(-1); assert.equal(last.probe.labor.cargo,0); assert.deepEqual(last.probe.labor.position,[43,24]);
  assert.ok(rows.filter(row => row.tick >= 13).every(row => row.probe.labor.spent === 3));
  const task = memory.eldrift.records['tasks/'+proof.proposal.input.request.name].data;
  assert.deepEqual(task.queue,[]); assert.equal(memory.eldrift.records['labor-publications/W0N1'].data.entry,null);
  assert.ok(!Object.hasOwn(memory.pipelineBirths,proof.proposal.input.request.name),'home birth must be included once by the separate realized cost owner');
}
module.exports = { verifyPipelineLabor };
