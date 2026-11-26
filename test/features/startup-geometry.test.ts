import { expect, test } from 'vitest';
import { nearestStartupGeometry } from '../../src/features/remotes/startup/geometry';
import type { StartupGeometryFacts } from '../../src/features/remotes/startup/geometry';
function fixture(): StartupGeometryFacts {
  return { home: 'W0N1',room: 'E0N1',source: { id: 'source',position: { room: 'E0N1',x: 6,y: 25 } },spawns: [{ id: 'spawn',position: { room: 'W0N1',x: 47,y: 25 } }],endpoints: [{ id: 'bank',position: { room: 'W0N1',x: 45,y: 25 } }],stations: [{ position: { room: 'E0N1',x: 5,y: 25 },status: 'ready' },{ position: { room: 'E0N1',x: 7,y: 25 },status: 'empty' }],miner: ['work','carry','move'],courier: ['carry','move'] };
}
const standable = (point: { room: string; x: number; y: number }) => !(point.room === 'E0N1' && point.x === 6 && point.y === 25);
test('world-relative service geometry prefers existing infrastructure and detaches the proposal',() => {
  const facts = fixture(), before = JSON.stringify(facts), plan = nearestStartupGeometry(facts,standable)!;
  expect(plan.spawn.exit).toEqual({ room: 'W0N1',x: 48,y: 25 }); expect(plan.endpoint.deposit).toEqual({ room: 'W0N1',x: 46,y: 25 }); expect(plan.collection).toEqual({ room: 'E0N1',x: 4,y: 25 });
  plan.station.x = 1; expect(JSON.stringify(facts)).toBe(before);
});
test('blocked services try another station; missing home ports or no standable tiles refuses',() => {
  const facts = fixture();
  expect(nearestStartupGeometry(facts,point => standable(point) && !(point.room === 'E0N1' && point.x <= 5))?.station.x).toBe(7);
  expect(nearestStartupGeometry({ ...facts,endpoints: [] },standable)).toBeUndefined(); expect(nearestStartupGeometry(facts,() => false)).toBeUndefined();
});
test('translated rooms and coordinates drive the same strategy without fixture coordinates',() => {
  const facts = fixture(); facts.home = 'E3S2'; facts.room = 'E3S3';
  facts.spawns[0]!.position = { room: facts.home,x: 20,y: 10 }; facts.endpoints[0]!.position = { room: facts.home,x: 22,y: 10 }; facts.source.position = { room: facts.room,x: 20,y: 6 }; facts.stations = [{ position: { room: facts.room,x: 20,y: 5 },status: 'building' }];
  const plan = nearestStartupGeometry(facts,() => true)!;
  expect(plan.spawn.exit).toEqual({ room: facts.home,x: 20,y: 11 }); expect(plan.station).toEqual({ room: facts.room,x: 20,y: 5 }); expect(plan.collection).toEqual({ room: facts.room,x: 21,y: 4 });
});
