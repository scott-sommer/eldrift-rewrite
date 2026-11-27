import { tileKey } from '../../../../../capabilities/movement/traffic/model';
import { copyPlain } from '../../../../../core/plain-data';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { TransitState } from '../../../../../capabilities/movement/transit/model';
import type { ForecastCourierPhysical } from '../observation';
import type { PaidMovementExternalFrame } from '../movement/model';
import type { HomeHaulingInput } from './model';
export class HomeWorldBodies {
  private readonly bodies = new Map<string,ForecastCourierPhysical>();
  private readonly expires = new Map<string,number>();
  constructor(home: HomeHaulingInput,private readonly paid: ReadonlySet<string>) {
    for (const body of home.bodies) {
      const worker = home.workers.find(worker => worker.name === body.name)!;
      this.bodies.set(body.unit,{ position: copyPlain(worker.position),fatigue: worker.fatigue,spawning: worker.spawning });
      if (worker.ticksToLive !== null) this.expires.set(body.unit,home.observedAt+worker.ticksToLive);
    }
  }
  restore(rows: readonly (ForecastCourierPhysical & { unit: string })[]): void {
    if (rows.length !== this.bodies.size || new Set(rows.map(row => row.unit)).size !== rows.length) throw new Error('Invalid home body checkpoint roster');
    const next = new Map(rows.map(row => {
      const opening = this.bodies.get(row.unit); tileKey(row.position);
      if (!opening || !Number.isSafeInteger(row.fatigue) || row.fatigue < 0 || row.spawning !== opening.spawning) throw new Error('Invalid home body checkpoint');
      return [row.unit,copyPlain({ position: row.position,fatigue: row.fatigue,spawning: row.spawning })] as const;
    }));
    for (const [unit,body] of next) this.bodies.set(unit,body);
  }
  get(unit: string): ForecastCourierPhysical {
    const body = this.bodies.get(unit); if (!body) throw new Error('Unknown home world body'); return copyPlain(body);
  }
  validate(frame: PaidMovementExternalFrame,tick: number): void {
    if ([...this.expires.values()].some(expiresAt => tick >= expiresAt) || [...this.bodies.values()].some(body => body.spawning)) throw new Error('Home world body lifecycle transition required');
    const observed = [...frame.occupants,...frame.states.map(state => ({ unit: state.unit,position: state.position }))];
    if (new Set(observed.map(body => body.unit)).size !== observed.length || observed.some(body => this.paid.has(body.unit))) throw new Error('Ambiguous outside world bodies');
    for (const [unit,body] of this.bodies) {
      if (this.paid.has(unit)) continue;
      const outside = observed.find(value => value.unit === unit);
      if (!outside || !withinRange(body.position,outside.position,0)) throw new Error('Missing or changed outside world body');
      validateOutsideFatigue(body,frame.states.find(state => state.unit === unit));
    }
  }
  commit(states: readonly TransitState[]): void {
    for (const state of states) {
      const body = this.bodies.get(state.unit); if (!body) continue;
      body.position = { ...state.position }; body.fatigue = state.fatigue;
    }
  }
  snapshot() { return [...this.bodies].map(([unit,physical]) => ({ unit,...copyPlain(physical) })); }
}

function validateOutsideFatigue(body: ForecastCourierPhysical,state: TransitState | undefined): void {
  if (state && state.fatigue !== body.fatigue) throw new Error('Outside world body fatigue changed');
  if (!state && body.fatigue > 0) throw new Error('Outside world fatigue requires a transit state');
}
