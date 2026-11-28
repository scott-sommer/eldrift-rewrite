import { deadHomeBodies } from './lifetimes';
import { copyPlain } from '../../../../../core/plain-data';
import { readHomeHaulingCheckpoint } from './checkpoint';
import type { HomeHaulingCheckpoint } from './checkpoint';
import { readPaidHaulingForecastOpening } from '../observation';
import type { PaidHaulingServiceResult } from '../service';
import type { HomeHaulingInput,HomeHaulingFrame,HomeWorldEnvironment,HomeWorldShared,HomeConfirmedDelivery,HomeWorldOperation } from './model';
import { homeWorldContext } from './context';
import { validateHomeWorldFrame } from './input';
/** Ordered private physical frames; receipts are observations, never a spending permission. */
export function createHomeHaulingWorld(input: HomeHaulingInput,configure: (shared: HomeWorldShared) => HomeWorldEnvironment,
  policy: { minimumBatch: number; requestLifetime: number }) {
  return runHomeHaulingWorld(homeWorldContext(input,configure,policy),copyPlain(policy));
}
export function resumeHomeHaulingWorld(raw: HomeHaulingCheckpoint,configure: (shared: HomeWorldShared) => HomeWorldEnvironment) {
  const checkpoint = readHomeHaulingCheckpoint(raw);
  return runHomeHaulingWorld(homeWorldContext(checkpoint.input,configure,checkpoint.policy,checkpoint),checkpoint.policy);
}
function runHomeHaulingWorld(context: ReturnType<typeof homeWorldContext>,policy: HomeHaulingCheckpoint['policy']) {
  const { home,inventory,seed,bodies,movement,transfer,service,receipts } = context;
  const names = new Set(seed.workers.map(worker => worker.name));
  let tick = context.nextTick,failed = false;
  function usable(): void { if (failed) throw new Error('Cannot resume failed home world'); }
  function begin(frame: HomeHaulingFrame) {
    validateHomeWorldFrame(frame,tick,bodies.liveNames(names),context.miners && bodies.liveNames(context.miners.names)); bodies.validate(frame.outside,tick); inventory.begin(tick);
    const maintenance = context.lifecycle?.run() ?? { admitted: true,retired: [],deliveries: [],owned: new Set<string>() };
    const openings = seed.workers.filter(worker => bodies.isAlive(worker.unit)).map(worker => readPaidHaulingForecastOpening(home.home,seed.state,inventory,worker,bodies.get(worker.unit),attempt => transfer.observe(worker,attempt),movement.recovering(worker.name) || !!context.banking));
    movement.begin(tick,openings.map(opening => {
      const observed = opening.observed,stage = opening.continuation.stage;
      return { tick,name: observed.name,unit: observed.unit,position: observed.position,energy: observed.energy,fatigue: observed.fatigue,
        phase: stage === 'spawning' ? 'spawning' : stage === 'deliver' ? 'deliver' : 'collect',readyAt: opening.continuation.readyAt };
    }));
    service.begin(tick); return { openings,maintenance };
  }
  function dispatch(frame: HomeHaulingFrame,admitted: boolean,deliveries: HomeConfirmedDelivery[],visits: PaidHaulingServiceResult[]): void {
    if (!admitted) service.deferSettlement();
    for (const operation of frame.operations) {
      if (!runnable(operation,admitted)) continue;
      if (operation.kind === 'settle') {
        const candidates = receipts.capture(); service.settle(); deliveries.push(...receipts.confirmed(candidates,tick));
      } else if (operation.kind === 'paid') visits.push(service.visit(operation.name,operation.work));
      else if (operation.kind === 'miner') context.miners!.visit(operation.name);
      else operation.run(context.shared);
    }
  }
  return {
    step(frame: HomeHaulingFrame) {
      usable();
      try {
        const { openings,maintenance } = begin(frame),deliveries: HomeConfirmedDelivery[] = [...maintenance.deliveries],visits: PaidHaulingServiceResult[] = [];
        dispatch(frame,maintenance.admitted,deliveries,visits);
        service.finish();
        const outside = maintenance.admitted ? frame.outside : { ...frame.outside,requestedUnits: frame.outside.requestedUnits.filter(unit => !maintenance.owned.has(unit)) };
        const transit = movement.finish(outside),effects = inventory.finish(frame.settlementOrder(inventory.pending()),frame.postprocessOrder,bodies.finalPositions(transit.states));
        const ecology = inventory.ecologySnapshot(); bodies.commit(transit.states,ecology); movement.retire(deadHomeBodies(ecology)); tick++;
        return { tick: frame.tick,openings,deliveries,visits,effects,transit,...(context.lifecycle ? { lifecycle: { admitted: maintenance.admitted,retired: maintenance.retired } } : {}) };
      } catch (error) { failed = true; throw error; }
    },
    checkpoint(): HomeHaulingCheckpoint {
      usable();
      return copyPlain({ format: 1,input: home,policy,inventory: inventory.checkpoint(),state: seed.state.checkpoint(),movement: movement.checkpoint(),bodies: bodies.snapshot() });
    },
    snapshot() { usable(); return { tick,inventories: inventory.snapshot(),bodies: bodies.snapshot() }; },
  };
}

function runnable(operation: HomeWorldOperation,admitted: boolean): boolean {
  return admitted || operation.kind === 'external' && operation.independent === true;
}
