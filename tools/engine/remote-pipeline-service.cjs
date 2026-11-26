const assert = require('node:assert/strict');
function verifyPipelineService(memory,evidence) {
  const plans = memory.pipelineServicePlans, calls = memory.pipelineServiceCalls; evidence.pipelineService = { plans,calls };
  assert.equal(Object.keys(plans).length,1); assert.ok(Object.keys(calls).length >= 3);
  for (const action of ['harvest','withdraw','transfer']) assert.ok(Object.entries(calls).some(([key,row]) => key.startsWith(action+':') && row.count > 0));
  assert.ok(Object.values(calls).every(row => row.matches && row.count > 0));
  const plan = Object.values(plans)[0].plan;
  assert.deepEqual(plan.station,{ room: 'E0N1',x: 5,y: 25 }); assert.deepEqual(plan.collection,{ room: 'E0N1',x: 4,y: 25 }); assert.deepEqual(plan.endpoint.deposit,{ room: 'W0N1',x: 46,y: 25 });
}
module.exports = { verifyPipelineService };
