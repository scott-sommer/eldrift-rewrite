const assert = require('node:assert/strict');
function verifyPipelineGeometry(memory,evidence) {
  const plan = memory.pipelineCalibration?.quote.plan, calls = memory.pipelineServiceCalls;
  evidence.pipelineGeometry = { plan,calls };
  assert.ok(plan); assert.ok(calls);
  assert.ok(plan.spawn.exit.x > plan.spawn.position.x,'observed nearest geometry uses the source-facing exit rather than the old fixed fixture exit');
  assert.equal(plan.spawn.exit.y,plan.spawn.position.y);
  for (const action of ['harvest','withdraw','transfer']) assert.ok(Object.keys(calls).some(key => key.startsWith(action+':')));
  assert.ok(Object.values(calls).every(row => row.matches && row.count > 0),'actual native productive service must match the automatically generated proposal');
}
module.exports = { verifyPipelineGeometry };
