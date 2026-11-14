const { miningWorkWorld, verifyMiningWork } = require('./mining-work.cjs');
const { colonyMiningWorld, verifyColonyMining, colonyMineralWorld } = require('./colony-mining.cjs');
const { specialistMiningWorld, verifySpecialistMining } = require('./specialist-mining.cjs');
const { miningWorld, verifyMining } = require('./mining.cjs');
const { contentionWorld, verifyContention } = require('./spawn-contention.cjs');
const { unseenWorld, verifyUnseen, occupiedExitWorld, verifyOccupiedExit } = require('./unseen.cjs');
const { exitsWorld, verifyExits, verifyNavigation } = require('./exits.cjs');
const { trafficWorld, verifyTraffic } = require('./traffic.cjs');
const { recoveryWorld, verifyRecovery, loadedRecoveryWorld, verifyServiceRecovery } = require('./recovery.cjs');
const { movementWorld, verifyMovement } = require('./movement.cjs');
const { resourceWorld, verifyResources } = require('./resources.cjs');
const { workWorld, verifyWork } = require('./work.cjs');
const { actionBundle, actionWorld, verifyActions, verifyTasks } = require('./actions.cjs');
const { prepareReload, verifyReload } = require('./reload.cjs');
const { provenance, sampleTick } = require('./report.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ScreepsServer, TerrainMatrix } = require('screeps-server-mockup');
const root = path.resolve(__dirname, '../..');
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
const directory = fs.mkdtempSync(path.join(root, 'artifacts/engine-'));
const server = new ScreepsServer({ path: directory, logdir: path.join(directory, 'logs'), port: 32147 });
const evidence = { status: 'running', directory, messages: [], errors: [], samples: [] };
let stopped = false;
function finish(code, error) {
  if (stopped) return;
  stopped = true;
  evidence.childPids = Object.values(server.processes).map(child => child.pid);
  evidence.status = code === 0 ? 'passed' : 'failed';
  if (error) evidence.failure = String(error.stack ?? error);
  try {
    fs.writeFileSync(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2));
  } finally {
    server.stop();
  }
  console.log('ENGINE_EVIDENCE ' + path.join(directory, 'evidence.json'));
  process.exit(code);
}
const timeout = setTimeout(() => { console.error('Engine smoke exceeded 60 seconds', directory); finish(1, new Error('Engine smoke timeout')); }, process.argv.includes('--inject-timeout') ? 1500 : 60000);
server.on('error', error => { console.error(error); finish(1, error); });
(async () => {
  await server.world.reset();
  await server.world.stubWorld();
  const modules = { main: fs.readFileSync(path.join(root, 'dist/main.js'), 'utf8') };
  if (process.argv.includes('--actions')) modules.main = await actionBundle(root);
  if (process.argv.includes('--inject-error')) modules.main += '\nconst original = module.exports.loop; module.exports = { loop: () => { original(); throw new Error("ENGINE_SENTINEL"); } };';
  if (process.argv.includes('--tasks')) modules.main = await actionBundle(root, 'task-bot');
  if (process.argv.includes('--work')) modules.main = await actionBundle(root, 'work-bot');
  if (process.argv.includes('--resources')) modules.main = await actionBundle(root, 'resource-bot');
  if (process.argv.includes('--movement')) modules.main = await actionBundle(root, 'movement-bot');
  if (process.argv.includes('--maintenance')) modules.main = await actionBundle(root, 'maintenance-bot');
  if (process.argv.includes('--retirement')) modules.main = await actionBundle(root, 'retirement-bot');
  if (process.argv.includes('--paths')) modules.main = await actionBundle(root, 'path-bot');
  if (process.argv.includes('--recovery')) modules.main = await actionBundle(root, 'recovery-bot');
  if (process.argv.includes('--traffic')) modules.main = await actionBundle(root, 'traffic-bot');
  if (process.argv.includes('--exits')) modules.main = await actionBundle(root, 'exit-bot');
  if (process.argv.includes('--navigation')) modules.main = await actionBundle(root, 'navigation-bot');
  if (process.argv.includes('--service-recovery')) modules.main = await actionBundle(root, 'service-recovery-bot');
  if (process.argv.includes('--unseen')) modules.main = await actionBundle(root, 'unseen-navigation-bot');
  if (process.argv.includes('--occupied-exit')) modules.main = await actionBundle(root, 'occupied-exit-bot');
  if (process.argv.includes('--spawn')) modules.main = await actionBundle(root, 'spawn-bot');
  if (process.argv.includes('--spawn-contention')) modules.main = await actionBundle(root, 'spawn-contention-bot');
  if (process.argv.includes('--stations')) modules.main = await actionBundle(root, 'stations-bot');
  if (process.argv.includes('--mining')) modules.main = await actionBundle(root, 'mining-bot');
  if (process.argv.includes('--specialist-mining')) modules.main = await actionBundle(root, 'specialist-mining-bot');
  if (process.argv.includes('--colony-mining')) modules.main = await actionBundle(root, 'colony-mining-bot');
  if (process.argv.includes('--mineral-depletion') || process.argv.includes('--mineral-capacity')) modules.main = await actionBundle(root, 'mineral-depletion-bot');
  if (process.argv.includes('--mining-work')) modules.main = await actionBundle(root, 'mining-work-bot');
  if (process.argv.includes('--colony-mineral')) modules.main = await actionBundle(root, 'colony-mineral-bot');
  evidence.provenance = provenance(root, modules.main);
  const bot = await server.world.addBot({ username: 'eldrift-smoke', room: 'W0N1', x: 15, y: 15, modules });
  if (process.argv.includes('--actions') || process.argv.includes('--tasks')) await actionWorld(server, bot);
  if (process.argv.includes('--retirement')) await actionWorld(server, bot);
  if (process.argv.includes('--work')) await workWorld(server, bot);
  if (process.argv.includes('--resources')) await resourceWorld(server, bot);
  if (process.argv.includes('--movement') || process.argv.includes('--paths')) await movementWorld(server, bot);
  if (process.argv.includes('--recovery')) await recoveryWorld(server, bot);
  if (process.argv.includes('--traffic')) await trafficWorld(server, bot);
  if (process.argv.includes('--exits') || process.argv.includes('--navigation')) await exitsWorld(server, bot);
  if (process.argv.includes('--service-recovery')) await loadedRecoveryWorld(server, bot);
  if (process.argv.includes('--unseen')) await unseenWorld(server, bot);
  if (process.argv.includes('--occupied-exit')) await occupiedExitWorld(server, bot);
  if (process.argv.includes('--spawn')) await server.world.setTerrain('W0N1', new TerrainMatrix());
  if (process.argv.includes('--spawn-contention')) await contentionWorld(server, bot);
  if (process.argv.includes('--stations')) {
    await actionWorld(server, bot);
    await server.world.setTerrain('W0N1', new TerrainMatrix());
    await server.world.addRoomObject('W0N1', 'container', 21, 20, {
      store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
    });
  }
  if (process.argv.includes('--mining')) await miningWorld(server, bot);
  if (process.argv.includes('--specialist-mining')) await specialistMiningWorld(server, bot);
  if (process.argv.includes('--colony-mining')) await colonyMiningWorld(server);
  if (process.argv.includes('--mineral-depletion') || process.argv.includes('--mineral-capacity')) {
    await specialistMiningWorld(server, bot);
    const { db } = await server.world.load();
    await db['rooms.objects'].update({ room: 'W0N1', type: 'mineral', x: 30, y: 20 }, { $set: { mineralAmount: 1 } });
    if (process.argv.includes('--mineral-capacity')) {
      await db['rooms.objects'].update({ room: 'W0N1', type: 'mineral', x: 30, y: 20 }, { $set: { mineralAmount: 1000 } });
      await db['rooms.objects'].update({ room: 'W0N1', name: 'mineral-miner' }, { $set: {
        store: { H: 49 }, body: [{ type: 'work', hits: 100, boost: 'UO' }, { type: 'carry', hits: 100 }, { type: 'move', hits: 100 }],
      } });
    }
    await server.world.addRoomObject('W0N1', 'container', 30, 21, {
      store: {}, storeCapacity: 2000, hits: 250000, hitsMax: 250000, nextDecayTime: 1000,
    });
  }
  if (process.argv.includes('--mining-work')) await miningWorkWorld(server, bot);
  if (process.argv.includes('--colony-mineral')) await colonyMineralWorld(server, bot);
  const messages = evidence.messages;
  const errors = evidence.errors;
  await server.common.storage.pubsub.subscribe(`user:${bot.id}/console`, event => {
    const payload = JSON.parse(event);
    messages.push(...(payload.messages?.log ?? []));
    if (payload.error) errors.push(payload.error);
  });
  await server.start();
  if (process.argv.includes('--inject-timeout')) await new Promise(() => {});
  const initial = Number(await server.world.gameTime);
  const samples = evidence.samples;
  const tickCount = process.argv.includes('--colony-mineral') ? 25 : process.argv.includes('--colony-mining') ? 45 : process.argv.includes('--specialist-mining') ? 8 : process.argv.includes('--mining') ? 5 : process.argv.includes('--spawn') ? 12 : process.argv.includes('--service-recovery') ? 8 : process.argv.includes('--recovery') ? 6 : 3;
  for (let tick = 0; tick < tickCount; tick++) {
    if (process.argv.includes('--reload')) {
      const reloaded = await prepareReload(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    samples.push(await sampleTick(server, bot));
  }
  assert.deepEqual(errors, [], 'Engine reported bot exceptions');
  const memory = JSON.parse(await bot.memory);
  assert.equal(Number(await server.world.gameTime), initial + tickCount);
  assert.equal(memory.eldrift.format, 1);
  assert.equal(memory.eldrift.records['operator/config'].owner, 'operator');
  if (process.argv.includes('--actions')) verifyActions(memory);
  if (process.argv.includes('--reload')) verifyReload(memory, initial);
  if (process.argv.includes('--tasks')) verifyTasks(memory);
  if (process.argv.includes('--work')) verifyWork(memory);
  if (process.argv.includes('--resources')) verifyResources(memory);
  if (process.argv.includes('--movement')) verifyMovement(memory);
  if (process.argv.includes('--maintenance')) assert.deepEqual(memory.maintenanceEvidence.remaining, [['short', 'long'], ['long'], ['long']]);
  if (process.argv.includes('--retirement')) {
    assert.deepEqual(memory.retirementEvidence, { counts: [2, 1, 1], requested: 0 });
    assert.deepEqual(memory.eldrift.records['units/creeps'].data.units, []);
    assert.deepEqual(memory.eldrift.records['tasks/action-worker'].data.queue, []);
    assert.equal(memory.eldrift.records['reservations/empire'].data.claims[0].holder, 'unrelated');
  }
  if (process.argv.includes('--paths')) assert.deepEqual(memory.pathEvidence, { searches: [1, 1, 2], positions: [[20, 20], [21, 20], [21, 20]], statuses: ['complete', 'complete', 'complete'] });
  if (process.argv.includes('--recovery')) verifyRecovery(memory);
  if (process.argv.includes('--traffic')) verifyTraffic(memory);
  if (process.argv.includes('--exits')) verifyExits(memory);
  if (process.argv.includes('--navigation')) verifyNavigation(memory);
  if (process.argv.includes('--service-recovery')) verifyServiceRecovery(memory);
  if (process.argv.includes('--unseen')) verifyUnseen(memory);
  if (process.argv.includes('--occupied-exit')) verifyOccupiedExit(memory);
  if (process.argv.includes('--spawn')) {
    assert.equal(memory.spawnEvidence.accepted, 1);
    assert.equal(memory.spawnEvidence.observed[0], false);
    assert.equal(memory.spawnEvidence.observed.at(-1), true);
    assert.ok(memory.spawnEvidence.spawning.includes(true));
    assert.equal(memory.spawnEvidence.spawning.at(-1), false);
  }
  if (process.argv.includes('--spawn-contention')) verifyContention(memory);
  if (process.argv.includes('--mining')) verifyMining(memory);
  if (process.argv.includes('--specialist-mining')) verifySpecialistMining(memory);
  if (process.argv.includes('--colony-mining')) verifyColonyMining(memory);
  if (process.argv.includes('--mineral-depletion')) assert.deepEqual(memory.depletionEvidence, [[0, 0], [1, 0], [0, 1]]);
  if (process.argv.includes('--mining-work')) verifyMiningWork(memory);
  if (process.argv.includes('--mineral-capacity')) assert.deepEqual(memory.depletionEvidence, [[49, 0], [0, 49], [3, 49]]);
  if (process.argv.includes('--colony-mineral')) assert.deepEqual(memory.colonyMineral, { workers: 1, queued: 0, delivered: 1 });
  assert.deepEqual(messages, []);
  const report = { provenance: provenance(root, modules.main), samples, ticks: tickCount, initial, final: Number(await server.world.gameTime), memoryBytes: Buffer.byteLength(JSON.stringify(memory)), directory };
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  clearTimeout(timeout);
  finish(0);
})().catch(error => { console.error(error); clearTimeout(timeout); finish(1, error); });


















