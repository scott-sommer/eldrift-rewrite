const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const baseline = 'f2bbf7e8c44addc7c426abb5458e393c9502ff5f';
if (execFileSync('git', ['-C', process.argv[2], 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== baseline) throw new Error('Wrong legacy baseline');
execFileSync('git', ['-C', process.argv[2], 'diff', '--exit-code', 'HEAD', '--', 'room.rampart.strategy.perimeterWithController.js']);
const sourcePath = path.join(process.argv[2], 'room.rampart.strategy.perimeterWithController.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const cases = [
  { name: 'open', bounds: { minX: 20, maxX: 30, minY: 20, maxY: 30 }, controller: { x: 40, y: 40 }, walls: [] },
  { name: 'clipped', bounds: { minX: 2, maxX: 8, minY: 2, maxY: 8 }, controller: { x: 1, y: 1 }, walls: [] },
  { name: 'overlap', bounds: { minX: 20, maxX: 30, minY: 20, maxY: 30 }, controller: { x: 17, y: 17 }, walls: [] },
  { name: 'natural-wall', bounds: { minX: 20, maxX: 30, minY: 20, maxY: 30 }, controller: { x: 40, y: 40 }, walls: ['16:16', '17:16', '39:39'] },
  { name: 'no-controller', bounds: { minX: 30, maxX: 47, minY: 2, maxY: 40 }, walls: [] },
];
for (const item of cases) {
  const walls = new Set(item.walls);
  const shared = { RAMPART_LEVEL: 6, terrainBlocks: (_room, x, y) => walls.has(x + ':' + y),
    posKey: p => p.x + ':' + p.y, isInsideRoom: (x, y, min, max) => x >= min && y >= min && x <= max && y <= max,
    addPlanEntry: (plan, type, pos, rcl, metadata) => plan.push({ type, position: { x: pos.x, y: pos.y }, rcl, ...metadata }) };
  const sandbox = { module: { exports: {} }, require: name => {
    if (name !== 'room.layout.shared') throw new Error('Unexpected dependency'); return shared;
  }, STRUCTURE_RAMPART: 'rampart', RoomPosition: class { constructor(x, y, roomName) { Object.assign(this, { x, y, roomName }); } } };
  vm.runInNewContext(source, sandbox, { filename: sourcePath });
  const room = { name: 'W0N1', ...(item.controller ? { controller: { pos: item.controller } } : {}) };
  item.expected = sandbox.module.exports.applyRamparts(room, [], { placement: {}, rampartBounds: item.bounds });
}
fs.writeFileSync('test/fixtures/legacy-perimeter.json', JSON.stringify({
  source: 'room.rampart.strategy.perimeterWithController.js',
  baseline,
  sha256: crypto.createHash('sha256').update(source).digest('hex'), cases,
}, null, 2) + '\n');
