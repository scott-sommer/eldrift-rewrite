import { vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupApprovals } from '../../src/features/remotes/startup/approvals/catalog';
import { startupTravelLegs } from '../../src/features/remotes/startup/travel-plan';
import { remoteFleetOwner } from '../../src/features/remotes/fleet/identity';
import { resolveConfig } from '../../src/config/resolve';
import { startupDeliveryInput } from './startup-delivery';
import { startupTravelPlan } from './startup-travel';
export function economicCohortFixture() {
  let root = {}; const state = createMemoryPort(() => root), plan = startupTravelPlan(), home = plan.home, input = startupDeliveryInput();
  input.project.spawning.room = home; input.project.spawning.cash.horizon = 1000; input.project.source.energy = 1000; input.project.source.capacity = 1000;
  const original = input.project.spawning.requests;
  input.project.spawning.requests = original.map((request,index) => ({ ...request,id: 'ed-'+home+'-'+(index+1),name: 'ed-'+home+'-'+(index+1),room: home,
    owner: remoteFleetOwner({ ...plan,kind: index === 0 ? 'miner' : 'courier' }),readyAt: 20,expiresAt: 120,placement: { spawn: plan.spawn.id,exit: { ...plan.spawn.exit } },admission: { kind: 'remote-startup',generation: 1,observedAt: 1 } }));
  const renamed = (id: string) => input.project.spawning.requests[original.findIndex(request => request.id === id)]!.id;
  input.project.workers = input.project.workers.map(worker => ({ ...worker,request: renamed(worker.request) })); input.couriers = input.couriers.map(worker => ({ ...worker,request: renamed(worker.request) }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,id: plan.spawn.id,room: home }));
  plan.miner = [...input.project.spawning.requests[0]!.body]; plan.courier = [...input.project.spawning.requests[1]!.body];
  const quote = { status: 'complete' as const,identity: JSON.stringify([plan,'measured']),plan,operations: 5,legs: startupTravelLegs(plan).map(leg => ({ kind: leg.kind,ticks: leg.kind === 'miner-approach' ? 0 : 1,operations: 1,arrival: { ...leg.destination } })) };
  const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1000,maximumHouseholdCapital: 1000 };
  const query = { room: plan.room,source: plan.source,generation: 1,binding: 'current-world',observedAt: 1,expiresAt: 100,tick: 1,input };
  const config = { ...resolveConfig({},1).values,remoteStartupPolicy: 'economic' as const,remoteStartupHorizon: 1000,remoteStartupFrames: 250 };
  const game = { time: 1,creeps: {} }; vi.stubGlobal('Game',game);
  const planner = createStartupPlanningJob(state,home), approvals = createStartupApprovals(state,home);
  const context = { query,quote,rooms: [home,plan.room],policy,binding: query.binding,tick: 1,births: [] };
  planner.advance({ ...query,expectedRevision: 0 },1);
  return { state,home,query,config,context,planner,approvals,root: () => JSON.stringify(root),reload: () => { root = JSON.parse(JSON.stringify(root)); },at(tick: number) { game.time = tick; context.tick = tick; context.query.tick = tick; } };
}
