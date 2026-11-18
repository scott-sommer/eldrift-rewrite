const assert = require('node:assert/strict');
const { TerrainMatrix } = require('screeps-server-mockup');
const { reloadStampDraft } = require('./stamp-draft.cjs');
async function scoutFallbackWorld(server) {
  await server.world.setTerrain('W0N1',new TerrainMatrix());
  const { db } = await server.world.load();
  await db['rooms.objects'].update({ room: 'W0N1', type: 'controller' },{ $set: { level: 2, downgradeTime: 20000 } });
}
async function reloadScoutFallback(server, bot, modules, index) {
  return reloadStampDraft(server,bot,modules,index,[11,59,109]);
}
function verifyScoutFallback(memory,evidence) {
  const rows = memory.scoutFallbackRows;
  evidence.scoutFallback = { rows, operations: memory.scoutFallbackOperations, reloads: memory.stampReloads,
    witness: memory.scoutFallbackWitness };
  assert.deepEqual(evidence.errors,[]); assert.deepEqual(evidence.messages,[]);
  assert.equal(rows.length,140); assert.deepEqual(memory.stampReloads,[12,60,110]);
  assert.deepEqual(memory.scoutFallbackOperations,['Fallback:A','Other-Fallback:Z',0,0,0]);
  assert.ok(rows.some(row => row.units.some(unit => unit.spawning)), 'fallback demand must recruit through the real spawn coordinator');
  for (const row of rows) {
    assert.ok(row.units.length <= 1 && row.pending <= 1);
    assert.ok(row.controls.every(control => control.objective === null && control.assigned.length === 0));
    assert.equal(row.witness,memory.scoutFallbackWitness);
  }
  const at = (row,goal) => row.units.some(unit => !unit.spawning && unit.room === 'W0N1'
    && Math.max(Math.abs(unit.x-goal.x),Math.abs(unit.y-goal.y)) <= 1);
  assert.ok(rows.some(row => row.tick < 40 && at(row,{ x: 40,y: 25 })), 'initial selector must reach the first stable matching flag');
  assert.ok(rows.some(row => row.tick > 40 && row.tick < 85 && at(row,{ x: 10,y: 25 })), 'moved native flag must invalidate the movement goal');
  assert.ok(rows.some(row => row.tick > 85 && row.tick < 135 && at(row,{ x: 45,y: 45 })), 'removed first match must yield to the remaining matching flag');
  const final = rows.at(-1).units[0];
  assert.ok(rows.filter(row => row.tick >= 138).every(row => row.flags.length === 0 && row.units[0].x === final.x && row.units[0].y === final.y));
  assert.ok(rows.some(row => row.visit !== null), 'actual room entry must still pass physical-visit stabilization');
}
module.exports = { scoutFallbackWorld, reloadScoutFallback, verifyScoutFallback };
