import { startupDeliveryInput } from './startup-delivery';
import { createTransitPlan } from '../../src/capabilities/movement/transit/plan';
export function startupInitialMotionInput(fatigue = 4) {
  const input = startupDeliveryInput();
  input.project.spawning.requests = []; input.project.workers = []; input.couriers = [];
  input.project.remainingProgress = 0; input.project.spawning.cash = { ...input.project.spawning.cash,horizon: 30,homeEnergy: 0,selfHarvestedConstruction: 0 };
  input.project.spawning.funding.initialEnergy = 0;
  input.initial = { containerEnergy: 0,miner: null,couriers: [{ id: 'paid-courier',body: ['carry','move'],availableAt: 0,expiresAt: 100,remainingSpawnTicks: 0,retireTicks: 10,energy: 32,
    phase: 'deliver',mode: 'courier',outboundTicks: 0,returnTicks: 0,collectionTicks: 1,deliveryTicks: 1,minimumBatch: 1,turnaroundTicks: 1 }] };
  const point = (x: number) => ({ room: 'W0N1',x,y: 25 });
  const plan = (origin: number,path: number[]) => createTransitPlan({ unit: 'paid-courier',order: 'paid-courier',owner: 'paid-owner',priority: 0,weight: 0,recovery: 2,origin: point(origin),path: path.map(point) });
  input.motion = { routes: [{ request: 'paid-courier',approach: plan(10,[11,12]),empty: plan(10,[11,12]),loaded: plan(12,[11,10]) }],
    terrain: [10,11,12,13,14].map(x => ({ position: point(x),rate: 2 })),blockers: [],
    openings: [{ request: 'paid-courier',owner: 'paid-owner',plan: plan(14,[13,12,11,10]),readyAt: 0,fatigue }] };
  return input;
}
