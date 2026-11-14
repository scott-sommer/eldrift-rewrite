import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('dist/main.js', 'utf8');
const module = { exports: {} };
const messages = [];
const game = { time: 1, rooms: {}, cpu: { tickLimit: 20, bucket: 10000, getUsed: () => 0 } };
const context = vm.createContext({ module, exports: module.exports, Game: game, console: { log: message => messages.push(message) } });
vm.runInContext(source, context, { filename: 'main.js', timeout: 1000 });
assert.equal(typeof module.exports.loop, 'function');
vm.runInContext('module.exports.loop(); module.exports.loop();', context, { timeout: 1000 });
assert.deepEqual(messages, []);
const map = JSON.parse(await readFile('dist/main.js.map', 'utf8'));
assert.ok(map.sources.some(path => path.endsWith('src/main.ts')));
assert.ok(map.sourcesContent.every(content => typeof content === 'string'));
console.log('CommonJS loop loads and runs without Node globals; source map includes original sources.');

