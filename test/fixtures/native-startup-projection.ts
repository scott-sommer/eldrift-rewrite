import { vi } from 'vitest';
import { startupFactsFixture } from './native-startup-facts';
import { startupTravelPlan } from './startup-travel';
import { createStartupTravel } from '../../src/features/remotes/startup/travel';
import { createNativeStartupProjection } from '../../src/app/remotes/startup/projection/native';
import type { NativeStartupProjectionOptions, NativeStartupQuote } from '../../src/app/remotes/startup/projection/model';
export function startupProjectionFixture() {
  const f = startupFactsFixture(); f.home.energyAvailable = 1300;
  for (const [name,value] of Object.entries({ CONTAINER_CAPACITY: 2000,CONTAINER_HITS: 250000,CONTAINER_DECAY: 5000,CONTAINER_DECAY_TIME: 100 })) vi.stubGlobal(name,value);
  const result = f.observe(f.request); if (result.status !== 'observed') throw new Error('Expected current source facts');
  const facts = result.facts, plan = startupTravelPlan();
  plan.spawn = { id: facts.spawns[0]!.id,position: facts.spawns[0]!.position,exit: { room: f.request.home,x: 23,y: 25 } };
  plan.endpoint = { id: facts.endpoint.id,position: facts.endpoint.position,deposit: { room: f.request.home,x: 26,y: 25 } };
  const costs = { 'miner-approach': 10,'miner-return': 20,'courier-approach': 12,'courier-empty': 15,'courier-loaded': 16 };
  const measured = createStartupTravel(f.state,f.request.home,leg => ({ status: 'complete',ticks: costs[leg.kind],operations: 1,arrival: { ...leg.destination } }))(plan,'fixture-static',1,5,() => true);
  if (measured.status !== 'complete') throw new Error('Expected complete geometry quote');
  const quote: NativeStartupQuote = { ...measured,observedAt: 1,facts };
  const options: NativeStartupProjectionOptions = { horizon: 1500,protectedEnergy: 350,unaffordable: 'skip',repairPolicy: { criticalFraction: 0.2,energyReserve: 20 },refills: [],householdFlows: [],sinkChanges: [],births: [
    { kind: 'miner',retireTicks: 40,request: { id: 'future-miner',name: 'future-miner',owner: f.miner.owner,room: f.request.home,body: plan.miner,priority: 1,readyAt: 0,expiresAt: 1501 } },
    { kind: 'courier',retireTicks: 40,minimumBatch: 25,request: { id: 'future-courier',name: 'future-courier',owner: f.courier.owner,room: f.request.home,body: plan.courier,priority: 2,readyAt: 0,expiresAt: 1501 } },
  ] };
  return { ...f,quote,options,convert: createNativeStartupProjection(f.state) };
}
