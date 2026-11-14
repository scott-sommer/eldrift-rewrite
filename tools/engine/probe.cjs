const { createRequire } = require('node:module');
const requireDriver = createRequire(require.resolve('@screeps/driver'));
const versions = Object.fromEntries(['screeps-server-mockup', '@screeps/engine', '@screeps/driver', '@screeps/common'].map(name => [name, require(`${name}/package.json`).version]));
const ivm = requireDriver('isolated-vm');
const isolate = new ivm.Isolate({ memoryLimit: 32 });
try {
  const context = isolate.createContextSync();
  const result = context.evalSync('21 * 2', { timeout: 1000 });
  if (result !== 42) throw new Error('Native isolate evaluation failed');
  const { ScreepsServer } = require('screeps-server-mockup');
  if (typeof ScreepsServer !== 'function') throw new Error('Missing server constructor');
  console.log(JSON.stringify({ node: process.version, platform: process.platform, versions, nativeEvaluation: result }));
} finally {
  isolate.dispose();
}
