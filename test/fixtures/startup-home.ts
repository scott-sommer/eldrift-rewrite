import { startupInitialMotionInput } from './startup-initial-motion';
import type { StartupHomeProjectInput,StartupHomeSourceInput } from '../../src/capabilities/economy/startup/home/model';
export function startupHomeInput(): StartupHomeProjectInput {
  const base = startupInitialMotionInput(),spawning = base.project.spawning;
  spawning.room = 'W0N1'; spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: 'W0N1' }));
  const sources = ['a','b'].map((name,index) => {
    const input = JSON.parse(JSON.stringify(base,(_key,value) => value instanceof Set ? [] : value).replaceAll('paid-courier',name)) as typeof base;
    const motion = input.motion!;
    if (index) {
      for (const route of motion.routes) for (const plan of [route.approach,route.empty,route.loaded]) { plan.origin.y++; for (const point of plan.path) point.y++; }
      for (const opening of motion.openings!) { opening.plan.origin.y++; for (const point of opening.plan.path) point.y++; }
      for (const fact of motion.terrain) fact.position.y++;
    }
    return { id: name,requests: [],project: { workers: [],remainingProgress: 0,source: input.project.source },couriers: [],containerCapacity: input.containerCapacity,container: input.container,initial: input.initial!,motion } satisfies StartupHomeSourceInput;
  });
  return { spawning,sink: { capacity: 50,freeCapacity: 50,changes: [] },sources };
}

export function startupHomeBirthInput(): StartupHomeProjectInput {
  const input = startupHomeInput(); input.spawning.cash.homeEnergy = 200;
  input.spawning.funding = { capacity: 200,initialEnergy: 200,refills: [] };
  input.spawning.requests = input.sources.map((source,index) => {
    const id = 'request:'+index,name = source.id;
    delete source.initial; delete source.motion.openings;
    source.requests = [id]; source.couriers = [{ request: id,outboundTicks: 2,returnTicks: 2,retireTicks: 10,minimumBatch: 1 }];
    source.motion.routes = source.motion.routes.map(route => ({ ...route,request: id,approach: { ...route.approach,unit: id },empty: { ...route.empty,unit: id },loaded: { ...route.loaded,unit: id } }));
    return { id,name,owner: 'paid-owner',room: 'W0N1',body: ['carry','move'],priority: index,readyAt: 0,expiresAt: 30 };
  });
  return input;
}

export function startupHomeHouseholdInput(): StartupHomeProjectInput {
  const input = startupHomeInput();
  input.spawning.cash.homeEnergy = 164; input.spawning.funding = { capacity: 100,initialEnergy: 100,refills: [] };
  input.spawning.requests = [{ id: 'house',name: 'house',owner: 'house',room: 'W0N1',body: ['carry','move'],priority: 0,readyAt: 0,expiresAt: 30 }];
  input.sink = { capacity: 100,freeCapacity: 36,changes: [] };
  input.household = { endpointEnergy: 64,redistribution: { horizon: 30,trips: [{ id: 'refill',request: 'house',pickupAt: 6,loadedTicks: 2,returnTicks: 1,energy: 50 }] } };
  return input;
}
