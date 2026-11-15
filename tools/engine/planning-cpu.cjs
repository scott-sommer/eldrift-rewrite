const assert = require('node:assert/strict');
async function capturePlanningCpu(server, bot, tick, evidence) {
  if (![48, 49, 50].includes(tick)) return;
  const memory = JSON.parse(await bot.memory);
  (evidence.planningCpuSnapshots ??= []).push({
    tick: tick + 1,
    job: memory.eldrift.records['planning-jobs/W0N1'].data,
    plan: memory.eldrift.records['planning/W0N1'].data,
  });
}
function verifyPlanningCpu(memory, evidence) {
  assert.equal(evidence.errors.length, 1, 'Exactly one injected CPU termination');
  assert.match(evidence.errors[0], /Script execution timed out\.[\s\S]*at interruptibleEvaluation/);
  const snapshots = evidence.planningCpuSnapshots;
  assert.equal(snapshots.length, 3);
  assert.ok(snapshots[0].job.checkpoint.pending, 'Work was pending before interruption');
  assert.deepEqual(snapshots[1].job, snapshots[0].job, 'Interrupted work did not advance checkpoint');
  assert.deepEqual(snapshots[1].plan, snapshots[0].plan, 'Interrupted work did not change plan');
  assert.ok(snapshots[2].job.revision > snapshots[1].job.revision, 'Planning resumes next tick');
  const job = memory.eldrift.records['planning-jobs/W0N1'].data;
  const plan = memory.eldrift.records['planning/W0N1'].data;
  assert.equal(job.receipt.outcome, 'committed');
  assert.equal(job.receipt.planRevision, 1);
  assert.equal(job.receipt.diagnostics.evaluated, 2);
  assert.equal(plan.revision, 1);
  assert.equal(plan.strategy, 'constrained');
  assert.equal(plan.entries.filter(entry => entry.type === 'extension').length, 60);
  assert.deepEqual(plan.provenance.costs, { hauling: 64, service: 337,
    capacityShortfall: 0, swamps: 0, defense: 94, migration: 312 });
  assert.ok(memory.jobRows.slice(-20).every(row => row.status === 'idle'));
  console.log('PLANNING_CPU_RECOVERY ' + JSON.stringify({ completedAt: job.receipt.completedAt,
    snapshots: snapshots.map(row => ({ tick: row.tick, revision: row.job.revision })) }));
}
module.exports = { capturePlanningCpu, verifyPlanningCpu };
