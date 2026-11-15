const assert = require('node:assert/strict');
const { bootstrapSalvageWorld } = require('./bootstrap-salvage.cjs');
async function bootstrapAssignmentWorld(server, bot) {
  await bootstrapSalvageWorld(server, bot, 'assigned');
  for (const [x, y] of [[21, 18], [23, 19]]) await server.world.addRoomObject('W0N1', 'source', x, y,
    { energy: 3000, energyCapacity: 3000, nextRegenerationTime: 1000 });
}
async function depleteAssignedSource(server, tick) {
  if (tick !== 5) return;
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'source', x: 23 },
    { $set: { energy: 0, nextRegenerationTime: 1000 } });
}
function verifyBootstrapAssignment(memory, messages) {
  const rows = memory.assignment;
  console.log('ASSIGNMENT_SUMMARY ' + JSON.stringify(rows));
  assert.ok(messages.every(message => !message.includes('Error:')));
  assert.ok(rows.filter(row => row.tick < 5).every(row => row.assignedX === 23), 'farther assignment is retained');
  assert.ok(rows.some(row => row.tick < 5 && row.far < 3000), 'assigned source is actually harvested');
  const depleted = rows.find(row => row.far === 0);
  assert.equal(depleted.assignedX, 21, 'first observation of depletion switches source');
  assert.ok(rows.filter(row => row.tick >= depleted.tick).every(row => row.assignedX === 21));
  assert.ok(rows.at(-1).near < 3000, 'replacement source is actually harvested');
  assert.ok(rows.at(-1).progress > 0, 'harvested energy advances construction');
  assert.ok(rows.every(row => row.wall === 1000), 'source switching does not dismantle walls');
}
module.exports = { bootstrapAssignmentWorld, depleteAssignedSource, verifyBootstrapAssignment };
