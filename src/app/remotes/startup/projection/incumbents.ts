import { createRemoteFleetStore } from '../../../../features/remotes/fleet/store';
import { remoteFleetIdentity } from '../../../../features/remotes/fleet/identity';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
import type { StartupInitialState, StartupInitialCourier, StartupInitialMiner } from '../../../../capabilities/economy/startup/initial-model';
import type { StartupWorkerFacts } from '../facts-model';
import type { NativeStartupQuote, NativeStartupProjectionOptions } from './model';
/** Imports observed healthy lives at known service endpoints; no guessed on-route ETA. */
export function observeStartupIncumbents(state: StatePort, quote: NativeStartupQuote, options: NativeStartupProjectionOptions) {
  const station = quote.facts.station.facts;
  const initial: StartupInitialState = { containerEnergy: station.status === 'ready' ? station.availableEnergy : 0,miner: null,couriers: [] };
  const couriers: StartupInitialCourier[] = [], profiles = createRemoteFleetStore(state,quote.plan.home).read().actors;
  for (const worker of quote.facts.workers) {
    const context = workerContext(profiles,quote,worker);
    if (!context || !adoptWorker(initial,couriers,quote,worker,context,options.incumbentMinimumBatch)) return refused();
  }
  initial.couriers = couriers;
  return { status: 'ready' as const,initial: hasInventory(initial) ? initial : undefined };
}
function hasInventory(initial: StartupInitialState): boolean { return initial.containerEnergy > 0 || !!initial.miner || initial.couriers.length > 0; }
function workerContext(profiles: readonly RemoteFleetProfile[], quote: NativeStartupQuote, worker: StartupWorkerFacts) {
  const identity = remoteFleetIdentity(worker.owner), profile = profiles.find(profile => profile.owner === worker.owner);
  if (!identity || identity.source !== quote.plan.source || !profile || profile.generation !== quote.facts.authority?.generation) return undefined;
  if (!supportedWorker(worker,quote.plan[identity.kind])) return undefined;
  const returned = quote.legs.find(leg => leg.kind === (identity.kind === 'miner' ? 'miner-return' : 'courier-loaded'))!.ticks+1;
  const retireTicks = Math.max(profile.retireTicks,returned); if (retireTicks > 1500) return undefined;
  const base: StartupInitialMiner = { id: worker.name,body: worker.body.map(part => part.type),availableAt: 0,expiresAt: worker.ticksToLive!,remainingSpawnTicks: 0,retireTicks,energy: worker.energy };
  return { kind: identity.kind,willing: profile.desired > 0,base };
}
function adoptWorker(initial: StartupInitialState, couriers: StartupInitialCourier[], quote: NativeStartupQuote, worker: StartupWorkerFacts, context: NonNullable<ReturnType<typeof workerContext>>, minimumBatch: number | undefined): boolean {
  if (context.kind === 'miner') {
    if (initial.miner || !context.willing || !samePosition(worker.position,quote.plan.station)) return false;
    initial.miner = context.base; return true;
  }
  const courier = incumbentCourier(quote,worker,context.base,minimumBatch); if (!courier) return false;
  if (!context.willing) courier.mode = 'return-only';
  couriers.push(courier); return true;
}

function supportedWorker(worker: StartupWorkerFacts, body: NativeStartupQuote['plan']['miner']): boolean {
  return !worker.spawning && Number.isSafeInteger(worker.ticksToLive) && Number(worker.ticksToLive) > 0
    && worker.body.every(part => part.hits === 100 && part.boost === null) && JSON.stringify(worker.body.map(part => part.type)) === JSON.stringify(body);
}
function incumbentCourier(quote: NativeStartupQuote, worker: StartupWorkerFacts, base: { id: string; body: StartupInitialCourier['body']; expiresAt: number; availableAt: number; remainingSpawnTicks: number; retireTicks: number; energy: number }, minimumBatch: number | undefined): StartupInitialCourier | undefined {
  if (worker.fatigue > 0 || minimumBatch === undefined) return undefined;
  const legs = new Map(quote.legs.map(leg => [leg.kind,leg.ticks]));
  const atCollection = samePosition(worker.position,quote.plan.collection), atDeposit = samePosition(worker.position,quote.plan.endpoint.deposit);
  if (!atCollection && !atDeposit) return undefined;
  const availableAt = worker.energy > 0 ? (atDeposit ? 0 : legs.get('courier-loaded')!) : (atCollection ? 0 : legs.get('courier-empty')!);
  return { ...base,availableAt,phase: worker.energy > 0 ? 'deliver' : 'collect',mode: 'courier',outboundTicks: legs.get('courier-empty')!,returnTicks: legs.get('courier-loaded')!,collectionTicks: 1,deliveryTicks: 1,minimumBatch };
}
function samePosition(a: NativeStartupQuote['plan']['station'], b: typeof a): boolean { return a.room === b.room && a.x === b.x && a.y === b.y; }
function refused() { return { status: 'deferred' as const,reason: 'existing-workforce' }; }
