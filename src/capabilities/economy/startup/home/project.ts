import { startupHomeOccupants } from './occupants';
import { copyPlain } from '../../../../core/plain-data';
import { tileKey } from '../../../movement/traffic/model';
import { StartupProjectSource } from '../project-source';
import { createStartupProjectTimeline } from '../project-timeline';
import { createStartupSink } from '../sink';
import { startupProjectCouriers,startupProjectWaves } from '../initial';
import { startupDeliveryCouriers,advanceStartupCouriers } from '../delivery-couriers';
import { projectCourierRoute } from '../courier-trips/project-route';
import { advanceStartupCourierGroups } from '../courier-trips/groups';
import { prepareStartupHomeProject } from './input';
import type { StartupHomeProjectInput } from './model';
import type { StartupScheduledBirth } from '../spawn-model';
import type { StartupProjectReceipt } from '../checkpoints/project-model';
import type { StartupCourierTrip } from '../courier-trips/model';
/** Forward-only joint model. Persistence and native financial admission are separate integration gates. */
export function createStartupHomeProject(raw: StartupHomeProjectInput) {
  const input = prepareStartupHomeProject(raw),horizon = input.spawning.cash.horizon;
  const anchor = input.sources[0]!.input;
  const timeline = createStartupProjectTimeline({ ...anchor,project: { ...anchor.project,spawning: input.spawning,workers: input.sources.flatMap(source => source.input.project.workers) },couriers: input.sources.flatMap(source => source.input.couriers),...(input.household ? { household: input.household } : {}) });
  const sink = createStartupSink(input.sink,input.spawning.cash),births: StartupScheduledBirth[] = [];
  const sources = input.sources.map(source => ({ ...source,state: new StartupProjectSource(source.input),workers: startupProjectCouriers(source.input,[]),trips: [] as StartupCourierTrip[],settled: [] as StartupProjectReceipt[] }));
  const due = new Map<number,{ source: string; receipt: StartupProjectReceipt }[]>(); let tick = 0;
  const ports = { legal: (request: { to: Parameters<typeof tileKey>[0]; via?: Parameters<typeof tileKey>[0] }) => input.terrain.has(tileKey(request.to)) && input.terrain.has(tileKey(request.via ?? request.to)),
    terrain(position: Parameters<typeof tileKey>[0]) { const fact = input.terrain.get(tileKey(position)); if (!fact) throw new Error('Missing home terrain'); return fact.rate; } };
  function step(): void {
    const added = timeline.begin(tick); births.push(...added); sink.prepare(tick);
    const frames = sources.map(source => {
      source.workers.push(...startupDeliveryCouriers(source.input,added));
      const wave = startupProjectWaves(source.input,births).find(wave => wave.startAt <= tick && tick < wave.endAt);
      return source.state.prepare(tick,wave);
    });
    const groups = sources.map(source => ({ source: source.id,workers: source.workers,previous: source.trips,
      routes: source.motion.routes.flatMap(route => projectCourierRoute(source.input,route,source.motion.openings,births)),
      service: (worker: typeof source.workers[number],ready: (worker: typeof source.workers[number],tick: number) => boolean) => advanceStartupCouriers([worker],source.state.delivery,tick,horizon,sink,ready) }));
    const occupants = startupHomeOccupants(input.blockers,tick);
    const next = advanceStartupCourierGroups(groups,tick,occupants,ports);
    for (const [index,source] of sources.entries()) { source.trips = next[index]!.trips; }
    sink.finish(); for (const frame of frames) frame.finish();
    queue(); settle(); tick++;
  }
  function queue(): void {
    for (const source of sources) {
      for (const receipt of source.state.delivery.receipts) {
        const rows = due.get(receipt.tick) ?? [];
        rows.push({ source: source.id,receipt: { ...receipt,id: 'remote-delivery:'+receipt.request+':'+receipt.tick } }); due.set(receipt.tick,rows);
      }
      source.state.delivery.receipts = [];
    }
  }
  function settle(): void {
    const rows = due.get(tick) ?? []; rows.sort((a,b) => a.receipt.request.localeCompare(b.receipt.request));
    const settlement = timeline.finish(rows.map(row => row.receipt),energy => sink.occupyAfterFrame(energy));
    sink.releaseAfterFrame(settlement.picked+settlement.spent);
    for (const row of rows) sources.find(source => source.id === row.source)!.settled.push(row.receipt);
    due.delete(tick);
  }
  return {
    advance(maximumFrames: number,guard: () => boolean = () => true) {
      if (!Number.isSafeInteger(maximumFrames) || maximumFrames < 0 || maximumFrames > 10001) throw new Error('Invalid home frame budget');
      let frames = 0; while (tick <= horizon && frames < maximumFrames && guard()) { step(); frames++; }
      return { frames,through: tick,done: tick > horizon };
    },
    result() { return copyPlain({ through: tick,spawning: timeline.result(),sink: sink.result(),sources: sources.map(source => ({ id: source.id,...source.state.result(tick,source.workers.reduce((sum,worker) => sum+worker.cargo,0),source.settled),trips: source.trips })) }); },
  };
}
