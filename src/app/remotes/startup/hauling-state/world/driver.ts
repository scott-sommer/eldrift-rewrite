import { readPaidHaulingForecastOpening } from '../observation';
import type { PaidHaulingServiceResult } from '../service';
import type { HomeHaulingInput,HomeHaulingFrame,HomeWorldEnvironment,HomeWorldShared,HomeConfirmedDelivery } from './model';
import { homeWorldContext } from './context';
import { validateHomeWorldFrame } from './input';
/** Ordered private physical frames; receipts are observations, never a spending permission. */
export function createHomeHaulingWorld(input: HomeHaulingInput,configure: (shared: HomeWorldShared) => HomeWorldEnvironment,
  policy: { minimumBatch: number; requestLifetime: number }) {
  const context = homeWorldContext(input,configure,policy),{ home,inventory,seed,bodies,movement,transfer,service,receipts } = context;
  const names = new Set(seed.workers.map(worker => worker.name));
  let tick = home.observedAt,failed = false;
  function usable(): void { if (failed) throw new Error('Cannot resume failed home world'); }
  function begin(frame: HomeHaulingFrame) {
    validateHomeWorldFrame(frame,tick,names); bodies.validate(frame.outside,tick); inventory.begin(tick);
    const openings = seed.workers.map(worker => readPaidHaulingForecastOpening(home.home,seed.state,inventory,worker,bodies.get(worker.unit),attempt => transfer.observe(worker,attempt)));
    movement.begin(tick,openings.map(opening => {
      const observed = opening.observed,stage = opening.continuation.stage;
      return { tick,name: observed.name,unit: observed.unit,position: observed.position,energy: observed.energy,fatigue: observed.fatigue,
        phase: stage === 'spawning' ? 'spawning' : stage === 'deliver' ? 'deliver' : 'collect',readyAt: opening.continuation.readyAt };
    }));
    service.begin(tick); return openings;
  }
  return {
    step(frame: HomeHaulingFrame) {
      usable();
      try {
        const openings = begin(frame),deliveries: HomeConfirmedDelivery[] = [],visits: PaidHaulingServiceResult[] = [];
        for (const operation of frame.operations) {
          if (operation.kind === 'settle') {
            const candidates = receipts.capture(); service.settle(); deliveries.push(...receipts.confirmed(candidates,tick));
          } else if (operation.kind === 'paid') visits.push(service.visit(operation.name,operation.work));
          else operation.run(context.shared);
        }
        service.finish();
        const transit = movement.finish(frame.outside),effects = inventory.finish(frame.settlementOrder(inventory.pending()));
        bodies.commit(transit.states); tick++;
        return { tick: frame.tick,openings,deliveries,visits,effects,transit };
      } catch (error) { failed = true; throw error; }
    },
    snapshot() { usable(); return { tick,inventories: inventory.snapshot(),bodies: bodies.snapshot() }; },
  };
}
