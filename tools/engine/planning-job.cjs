const assert = require('node:assert/strict');
async function reloadPlanningJob(server, bot, modules, index) {
  if (![5, 39, 90, 159, 199, 209].includes(index)) return;
  const { db, env } = server.common.storage;
  const main = modules.main + '\n(Memory.jobReloadWitnesses ??= []).push({tick:Game.time,next:Memory.eldrift.records["planning-jobs/W0N1"].data.checkpoint?.next ?? 2});';
  await db['users.code'].update({ user: bot.id }, { $set: { modules: { ...modules, main }, timestamp: Date.now() } });
  await env.del('scrScriptCachedData:' + bot.id);
  return main;
}
function verifyPlanningJob(memory) {
  const rows = memory.jobRows;
  assert.equal(rows.length, 230);
  assert.deepEqual(memory.jobReloadWitnesses, [{ tick: 6, next: 0 }, { tick: 40, next: 0 }, { tick: 91, next: 1 }, { tick: 160, next: 1 }, { tick: 200, next: 2 }, { tick: 210, next: 2 }]);
  assert.ok(rows.some(row => row.next === 1 && row.revision === 0));
  assert.equal(rows.at(-1).committed, true);
  for (const row of rows) {
    const reset = [0, 5, 39, 90, 159, 199, 209].filter(index => index < row.tick).at(-1);
    assert.equal(row.calls, row.tick - reset);
    assert.equal(row.revision, row.tick >= 199 ? 1 : 0);
    assert.equal(row.strategy, row.tick >= 199 ? 'constrained' : null);
    if (row.committed) assert.equal(row.next, 2);
  }
  const job = memory.eldrift.records['planning-jobs/W0N1'];
  assert.equal(job.owner, 'planning-jobs');
  assert.equal(job.version, 3);
  assert.equal(job.data.revision, 201);
  assert.equal(job.data.checkpoint, undefined);
  assert.equal(job.data.receipt.outcome, 'committed');
  assert.equal(job.data.receipt.completedAt, 200);
  assert.equal(job.data.receipt.planRevision, 1);
  assert.ok(rows.slice(200).every(row => row.status === 'idle'));
  assert.equal(memory.recoveredCommit, true);
  assert.equal(rows[198].committed, false);
  assert.equal(rows[199].committed, true);
  assert.equal(memory.planningJob, undefined);
  const request = memory.eldrift.records['planning-requests/W0N1'];
  assert.equal(request.owner, 'planning-requests');
  assert.equal(request.version, 1);
  assert.equal(request.data.revision, 1);
  assert.equal(request.data.request.basePlan.revision, 0);
  const plan = memory.eldrift.records['planning/W0N1'].data;
  assert.equal(plan.entries.filter(entry => entry.type === 'extension').length, 60);
  assert.deepEqual(plan.provenance.costs, { hauling: 64, service: 337, capacityShortfall: 0, swamps: 0, defense: 94, migration: 312 });
  const ramparts = plan.entries.filter(entry => entry.type === 'rampart');
  assert.equal(ramparts.length, 94);
  assert.ok(ramparts.every(entry => entry.rcl === 6));
  const perimeter = ramparts.filter(entry => entry.tag === 'perimeter');
  const controller = ramparts.filter(entry => entry.tag === 'controller');
  assert.equal(perimeter.length, 86);
  assert.equal(controller.length, 8);
  assert.ok(perimeter.every(entry => entry.priority === 50));
  assert.ok(controller.every(entry => entry.priority === 40 && Math.max(Math.abs(entry.x - 40), Math.abs(entry.y - 40)) === 1));
  const minX = Math.min(...perimeter.map(entry => entry.x)), maxX = Math.max(...perimeter.map(entry => entry.x));
  const minY = Math.min(...perimeter.map(entry => entry.y)), maxY = Math.max(...perimeter.map(entry => entry.y));
  assert.equal(perimeter.length, 2 * (maxX - minX + maxY - minY));
  assert.ok(perimeter.every(entry => entry.x === minX || entry.x === maxX || entry.y === minY || entry.y === maxY));
  assert.equal(new Set(ramparts.map(entry => entry.x + ':' + entry.y)).size, 94);
  assert.equal(plan.provenance.committedAt, 199);
  assert.deepEqual(plan.entries.find(entry => entry.type === 'storage'), {
    type: 'storage', x: 25, y: 25, rcl: 4, priority: -777,
    source: 'operator', tag: 'manual-storage', dependencies: [],
  });
  assert.equal(memory.planningProfile.prepare.calls, 4, 'Hard checks rebuild for both scoring reloads');
  console.log('PLANNING_PROFILE ' + JSON.stringify(memory.planningProfile));
  console.log('PLANNING_JOB ' + JSON.stringify({ committedAt: plan.provenance.committedAt, strategy: plan.strategy }));
}
module.exports = { reloadPlanningJob, verifyPlanningJob };
