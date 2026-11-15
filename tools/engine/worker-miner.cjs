const assert = require('node:assert/strict');
const { workSelectionWorld } = require('./work-selection.cjs');
async function workerMinerWorld(server, bot) {
  await workSelectionWorld(server, bot);
  const { db } = await server.world.load();
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'constructionSite' });
  await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'source' });
  await db['rooms.objects'].update({ room: 'W0N1', type: 'creep', name: 'build' }, { $set: { store: { energy: 0 } } });
  await server.world.addRoomObject('W0N1', 'source', 22, 19, { energy: 3000, energyCapacity: 3000 });
  await server.world.addRoomObject('W0N1', 'container', 21, 19,
    { store: { H: 30, energy: 50 }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000 });
  await server.world.addRoomObject('W0N1', 'container', 18, 21,
    { store: { energy: 500 }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000 });
}
function verifyWorkerMiner(memory, messages) {
  const rows = memory.workerMiner, last = rows.at(-1);
  console.log('WORKER_MINER_SUMMARY ' + JSON.stringify({ first: rows[0], last }));
  assert.ok(messages.every(message => !message.includes('Error:')));
  assert.equal(rows[0].energy, 0);
  assert.ok(rows.some(row => row.energy === 50), 'assigned deposit fills worker');
  assert.equal(last.depositEnergy, 0);
  assert.ok(rows.every(row => row.hydrogen === 30 && row.cargoHydrogen === 0 && row.unrelated === 500));
  assert.ok(last.progress > 0, 'energy funds ordinary controller upgrading');
}
module.exports = { workerMinerWorld, verifyWorkerMiner };

async function replaceWorkerDeposit(server, tick) {
  const { db } = await server.world.load();
  if (tick === 1) await db['rooms.objects'].removeWhere({ room: 'W0N1', type: 'container', x: 21 });
  if (tick === 8) await server.world.addRoomObject('W0N1', 'container', 23, 19,
    { store: { H: 30, energy: 50 }, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000 });
}
function verifyWorkerMinerReplacement(memory, messages) {
  const rows = memory.workerMiner, last = rows.at(-1);
  console.log('WORKER_MINER_REPLACEMENT_SUMMARY ' + JSON.stringify(rows));
  assert.ok(messages.every(message => !message.includes('Error:')));
  const absent = rows.filter(row => row.depositId === null);
  assert.equal(absent.length, 7);
  assert.ok(absent.every(row => row.energy === 0 && row.progress === 0 && row.unrelated === 500));
  assert.notEqual(last.depositId, rows[0].depositId, 'replacement has a new native identity');
  assert.equal(last.depositX, 23, 'worker follows the replacement position');
  assert.ok(rows.some(row => row.energy === 50));
  assert.equal(last.depositEnergy, 0);
  assert.ok(last.progress > 0);
  assert.ok(rows.every(row => row.cargoHydrogen === 0 && row.unrelated === 500));
}
module.exports.replaceWorkerDeposit = replaceWorkerDeposit;
module.exports.verifyWorkerMinerReplacement = verifyWorkerMinerReplacement;
