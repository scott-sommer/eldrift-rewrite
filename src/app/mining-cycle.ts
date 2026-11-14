import type { MiningStation } from '../capabilities/mining/station';
import type { BodyPart } from '../capabilities/spawning/body';
import type { StatePort } from '../persistence/versioned-state';
import { createStationStore } from '../features/mining/station-store';
import { applyMiningDemand, miningOwner } from '../features/mining/demand';
import type { MiningDemand, MiningUnit } from '../features/mining/demand';
import { createMiningTaskBehavior } from './mining-task';
import type { MiningTaskPorts } from './mining-task';
import { createTaskRunner } from './task-runner';
import { assignMiningTask } from './assign-mining-task';
export interface MiningRoomObservation { room: string; stations: readonly MiningStation[] | undefined }
export interface MiningCyclePorts<Context> extends MiningTaskPorts<Context> {
  plan(station: MiningStation): MiningDemand | undefined;
  productionRate(body: readonly BodyPart[], station: MiningStation): number;
  context(unit: string): Context;
  taskLifetime: number;
}
/** Owns mining orchestration; spawn dispatch and shared movement flush remain empire-wide. */
export function createMiningCycle<Context>(state: StatePort, ports: MiningCyclePorts<Context>) {
  const definitions = { mine: createMiningTaskBehavior(state, ports) };
  const execute = createTaskRunner(state, definitions, ports.clock);
  let lastTick = -1;
  return {
    definitions,
    run(observations: readonly MiningRoomObservation[], units: readonly MiningUnit[]) {
      const tick = ports.clock();
      if (lastTick === tick) return [];
      lastTick = tick;
      for (const observation of observations) {
        for (const station of observedStations(state, observation, tick)) {
          const plan = ports.plan(station);
          if (!plan) continue;
          applyMiningDemand(state, plan, units, tick, body => ports.productionRate(body, station));
          for (const unit of units.filter(unit => unit.owner === miningOwner(station) && unit.room === plan.home)) {
            assignMiningTask(state, definitions, unit.name, station, tick, ports.taskLifetime);
          }
        }
      }
      return units.map(unit => ({ unit: unit.name, outcome: execute(unit.name, ports.context(unit.name)) }));
    },
  };
}

function observedStations(state: StatePort, observation: MiningRoomObservation, tick: number): MiningStation[] {
  const store = createStationStore(state, observation.room);
  const previous = store.read(tick).stations;
  store.observe(tick, observation.stations);
  const current = store.read(tick).stations;
  const present = new Set(current.map(station => station.id));
  const removed = previous.filter(station => !present.has(station.id))
    .map(station => ({ ...station, risk: 'unknown' as const, throughput: 0 }));
  return [...current, ...removed];
}
