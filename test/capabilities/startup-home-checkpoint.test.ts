import { expect,test } from 'vitest';
import { startupHomeBirthInput,startupHomeHouseholdInput,startupHomeInput } from '../fixtures/startup-home';
import { createStartupHomeProject } from '../../src/capabilities/economy/startup/home/project';
const json = <T>(value: T): T => JSON.parse(JSON.stringify(value));
test('joint home checkpoint resumes identically at every motion, service and receipt boundary',() => {
  const input = startupHomeInput(),expected = createStartupHomeProject(input); expected.advance(31);
  for (let through = 0; through <= 31; through++) {
    const project = createStartupHomeProject(input); project.advance(through); const saved = json(project.checkpoint());
    const resumed = createStartupHomeProject(input,saved); resumed.advance(31);
    expect(resumed.result()).toEqual(expected.result());
    expect(project.checkpoint()).toEqual(saved);
  }
});
test('joint restore rejects input changes, wrong source attribution and missing physical history',() => {
  const input = startupHomeInput(),project = createStartupHomeProject(input); project.advance(8); const saved = json(project.checkpoint());
  const changed = startupHomeInput(); changed.sink.capacity++;
  expect(() => createStartupHomeProject(changed,saved)).toThrow('checkpoint');
  const foreign = json(saved); foreign.sources[0]!.settled[0]!.request = 'b';
  expect(() => createStartupHomeProject(input,foreign)).toThrow('checkpoint');
  const lost = json(saved); lost.sources[0]!.trips = [];
  expect(() => createStartupHomeProject(input,lost)).toThrow('checkpoint');
  const relabel = json(saved); relabel.sources.reverse();
  expect(() => createStartupHomeProject(input,relabel)).toThrow('checkpoint');
});
test('joint restore cannot credit due receipts early or forge shared sink capacity',() => {
  const input = startupHomeInput(),project = createStartupHomeProject(input); project.advance(7); const saved = json(project.checkpoint());
  expect(saved.sources[0]!.due[0]!.tick).toBe(7);
  const early = json(saved); early.sources[0]!.settled.push(early.sources[0]!.due.pop()!);
  expect(() => createStartupHomeProject(input,early)).toThrow('checkpoint');
  const capacity = json(saved); capacity.sink.free++;
  expect(() => createStartupHomeProject(input,capacity)).toThrow('checkpoint');
  const cash = json(saved); cash.timeline.accounting.state.deliveredEnergy++;
  expect(() => createStartupHomeProject(input,cash)).toThrow('checkpoint');
});

test('joint birth and household cargo checkpoints restore without replaying payments or sink releases',() => {
  for (const input of [startupHomeBirthInput(),startupHomeHouseholdInput()]) {
    const expected = createStartupHomeProject(input); expected.advance(31);
    for (const through of [0,1,6,7,8,9,12,13,31]) {
      const partial = createStartupHomeProject(input); partial.advance(through);
      const resumed = createStartupHomeProject(input,json(partial.checkpoint())); resumed.advance(31);
      expect(resumed.result()).toEqual(expected.result());
    }
  }
});
test('joint source restoration refuses a physically overlapping but individually valid opening prefix',() => {
  const input = startupHomeInput(),route = input.sources[1]!.motion.routes[0]!,opening = input.sources[1]!.motion.openings![0]!;
  route.empty.origin.y = 25; route.loaded.path[1]!.y = 25; opening.plan.path[3]!.y = 25;
  const project = createStartupHomeProject(input); project.advance(8); const saved = json(project.checkpoint());
  const transit = saved.sources[1]!.trips[0]!.transit;
  transit.index = 4; transit.position = { room: 'W0N1',x: 10,y: 25 }; transit.arrivedAt = 8;
  expect(() => createStartupHomeProject(input,saved)).toThrow('occupancy');
});
