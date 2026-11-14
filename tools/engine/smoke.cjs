const { actionBundle, actionWorld, verifyActions } = require('./actions.cjs');
const { prepareReload, verifyReload } = require('./reload.cjs');
const { provenance, sampleTick } = require('./report.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ScreepsServer } = require('screeps-server-mockup');
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
  evidence.provenance = provenance(root, modules.main);
  const bot = await server.world.addBot({ username: 'eldrift-smoke', room: 'W0N1', x: 15, y: 15, modules });
  if (process.argv.includes('--actions')) await actionWorld(server, bot);
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
  for (let tick = 0; tick < 3; tick++) {
    if (process.argv.includes('--reload')) {
      const reloaded = await prepareReload(server, bot, modules, tick);
      if (reloaded) evidence.reloadProvenance = provenance(root, reloaded);
    }
    samples.push(await sampleTick(server, bot));
  }
  assert.deepEqual(errors, [], 'Engine reported bot exceptions');
  const memory = JSON.parse(await bot.memory);
  assert.equal(Number(await server.world.gameTime), initial + 3);
  assert.equal(memory.eldrift.format, 1);
  assert.equal(memory.eldrift.records['operator/config'].owner, 'operator');
  if (process.argv.includes('--actions')) verifyActions(memory);
  if (process.argv.includes('--reload')) verifyReload(memory, initial);
  assert.deepEqual(messages, []);
  const report = { provenance: provenance(root, modules.main), samples, ticks: 3, initial, final: Number(await server.world.gameTime), memoryBytes: Buffer.byteLength(JSON.stringify(memory)), directory };
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  clearTimeout(timeout);
  finish(0);
})().catch(error => { console.error(error); clearTimeout(timeout); finish(1, error); });










