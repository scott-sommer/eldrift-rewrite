import fs from 'node:fs';
import { expect, test } from 'vitest';
import { legacy } from './legacy.mjs';
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/legacy/room-memory-v1.json', import.meta.url), 'utf8'));

test('spawn requests retain manual marker, priority, boost, timestamp and specialist memory', () => {
  const Memory = structuredClone(fixture.memory);
  let id = 0;
  const ctx = legacy(['manualSpawnTask', 'spawnTask'], { Memory, Game: { time: 100 }, util: { getNextId: () => ++id }, OK: 0 });
  const memory = { assignedNode: { x: 10, y: 20, roomName: 'W2N2' } };
  expect(ctx.manualSpawnTask(-10, 'miner', 'W1N1', 2, memory)).toBe(0);
  expect(ctx.spawnTask(20, 'courier', 'W1N1')).toBe(0);
  expect(Memory.spawnTasks[0]).toEqual({ priority: -10, role: 'miner', roomName: 'W1N1', id: 1, timestamp: 100, boostLevel: 2, manual: true, memory });
  expect(Memory.spawnTasks[1].manual).toBe(false);
  expect(Memory.spawnTasks[1].boostLevel).toBe(0);
});

test.each([false, true])('manual build uses flag location, preserves string RCL, and respects existing cap %s', capped => {
  const sample = structuredClone(fixture);
  let removed = false;
  const flag = { ...sample.manualBuild, remove: () => { removed = true; } };
  const types = ['spawn', 'extension', 'road', 'wall', 'rampart', 'link', 'storage', 'tower', 'observer', 'power_spawn', 'extractor', 'lab', 'terminal', 'container', 'nuker', 'factory'];
  const constants = Object.fromEntries(types.map(type => ['STRUCTURE_' + type.toUpperCase(), type]));
  const ctx = legacy(['processBuildFlags'], { ...constants, Memory: sample.memory, FIND_MY_STRUCTURES: 1, CONTROLLER_STRUCTURES: { extension: { 8: 60 } }, console: { log() {} },
    Game: { flags: [flag], rooms: { W1N1: { find: () => capped ? Array(60).fill({}) : [] } } },
    _: items => ({ filter: fn => ({ value: () => items.filter(fn) }) }) });
  ctx.processBuildFlags();
  expect(removed).toBe(!capped);
  expect(sample.memory.build.W9N9).toBeUndefined();
  expect(sample.memory.build.W1N1.extension).toEqual(capped ? [] : [{ t: 'extension', pos: flag.pos, level: '3', source: 'flag', priority: -1000, key: 'extension:20:21' }]);
});

test('spawn processing selects lowest numeric priority and waits rather than skipping an unaffordable task', () => {
  const tasks = [{ id: 1, role: 'builder', priority: 20, roomName: 'W1N1' }, { id: 2, role: 'courier', priority: -5, roomName: 'W1N1' }];
  const attempts = [];
  const starvation = [];
  const ctx = legacy(['processSpawnTasks'], { Memory: { spawnTasks: tasks }, Game: { rooms: { W1N1: { controller: { level: 8 }, energyCapacityAvailable: 800 } } }, OK: 0, ERR_NOT_ENOUGH_ENERGY: -6,
    getRoomSpawnTasks: () => tasks.slice(), getAvailableSpawn: () => ({ name: 'Spawn1', canCreateCreep: () => -6 }),
    getBody: role => { attempts.push(role); return ['carry', 'move']; }, applyBoosts: (_task, memory) => memory, applyTaskMemory: (_task, memory) => memory,
    util: { recordSpawnStarvation: (...args) => starvation.push(args) } });
  ctx.processSpawnTasks('W1N1');
  expect(attempts).toEqual(['courier']);
  expect(starvation).toEqual([['W1N1', 'Spawn1']]);
  expect(tasks.map(task => task.id)).toEqual([1, 2]);
});
