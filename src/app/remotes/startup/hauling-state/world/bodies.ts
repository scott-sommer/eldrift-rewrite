import { deadHomeBodies } from './lifetimes';
import type { EnergyEcology,EnergyBodyPosition } from '../../../../../capabilities/resources/energy-inventory/model';
import { tileKey } from '../../../../../capabilities/movement/traffic/model';
import { copyPlain } from '../../../../../core/plain-data';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { TransitState } from '../../../../../capabilities/movement/transit/model';
import type { ForecastCourierPhysical } from '../observation';
import type { PaidMovementExternalFrame } from '../movement/model';
import type { HomeHaulingInput } from './model';
export class HomeWorldBodies {
  private readonly bodies = new Map<string,ForecastCourierPhysical>();
  private readonly dead = new Set<string>();
  private readonly names = new Map<string,string>();
  private readonly profiled: ReadonlySet<string>;
  private readonly expires = new Map<string,number>();
  constructor(home: HomeHaulingInput,private readonly paid: ReadonlySet<string>) {
    this.profiled = new Set(home.ecology?.bodies?.map(body => body.id) ?? []);
    for (const body of home.bodies) {
      const worker = home.workers.find(worker => worker.name === body.name)!;
      this.names.set(body.name,body.unit);
      this.bodies.set(body.unit,{ position: copyPlain(worker.position),fatigue: worker.fatigue,spawning: worker.spawning });
      if (worker.ticksToLive !== null) this.expires.set(body.unit,home.observedAt+worker.ticksToLive);
    }
  }
  restore(rows: readonly (ForecastCourierPhysical & { unit: string })[],ecology?: EnergyEcology): void {
    const dead = deadHomeBodies(ecology);
    this.retire(dead);
    if (rows.length !== this.bodies.size || new Set(rows.map(row => row.unit)).size !== rows.length) throw new Error('Invalid home body checkpoint roster');
    const next = new Map(rows.map(row => {
      const opening = this.bodies.get(row.unit); tileKey(row.position);
      if (!opening || !Number.isSafeInteger(row.fatigue) || row.fatigue < 0 || row.spawning !== opening.spawning) throw new Error('Invalid home body checkpoint');
      return [row.unit,copyPlain({ position: row.position,fatigue: row.fatigue,spawning: row.spawning })] as const;
    }));
    for (const [unit,body] of next) this.bodies.set(unit,body);
    this.validateLifePoses(ecology);
  }
  isAlive(unit: string): boolean { return this.bodies.has(unit); }
  liveNames(names: ReadonlySet<string>): ReadonlySet<string> { return new Set([...names].filter(name => this.bodies.has(this.names.get(name)!))); }
  get(unit: string): ForecastCourierPhysical {
    const body = this.bodies.get(unit); if (!body) throw new Error('Unknown home world body'); return copyPlain(body);
  }
  validate(frame: PaidMovementExternalFrame,tick: number): void {
    if ([...this.expires.values()].some(expiresAt => tick >= expiresAt) || [...this.bodies.values()].some(body => body.spawning)) throw new Error('Home world body lifecycle transition required');
    const observed = [...frame.occupants,...frame.states.map(state => ({ unit: state.unit,position: state.position }))];
    if (observed.some(body => this.dead.has(body.unit))) throw new Error('Dead outside world body');
    if (new Set(observed.map(body => body.unit)).size !== observed.length || observed.some(body => this.paid.has(body.unit))) throw new Error('Ambiguous outside world bodies');
    for (const [unit,body] of this.bodies) {
      if (this.paid.has(unit)) continue;
      const outside = observed.find(value => value.unit === unit);
      if (!outside || !withinRange(body.position,outside.position,0)) throw new Error('Missing or changed outside world body');
      validateOutsideFatigue(body,frame.states.find(state => state.unit === unit));
    }
  }
  finalPositions(states: readonly TransitState[]): EnergyBodyPosition[] {
    return [...this.bodies].filter(([id]) => this.profiled.has(id)).map(([id,body]) => ({ id,position: { ...(states.find(state => state.unit === id)?.position ?? body.position) } }));
  }
  commit(states: readonly TransitState[],ecology?: EnergyEcology): void {
    for (const state of states) {
      const body = this.bodies.get(state.unit); if (!body) continue;
      body.position = { ...state.position }; body.fatigue = state.fatigue;
    }
    this.retire(deadHomeBodies(ecology));
  }
  private retire(dead: ReadonlySet<string>): void {
    for (const id of dead) {
      if (!this.profiled.has(id)) throw new Error('Undeclared home body death');
      this.bodies.delete(id); this.expires.delete(id); this.dead.add(id);
    }
  }
  private validateLifePoses(ecology?: EnergyEcology): void {
    for (const life of ecology?.bodies ?? []) {
      const body = this.bodies.get(life.id); if (life.diedAt !== undefined) continue;
      if (!body || !withinRange(body.position,life.position,0)) throw new Error('Home lifetime body pose mismatch');
    }
  }
  snapshot() { return [...this.bodies].map(([unit,physical]) => ({ unit,...copyPlain(physical) })); }
}

function validateOutsideFatigue(body: ForecastCourierPhysical,state: TransitState | undefined): void {
  if (state && state.fatigue !== body.fatigue) throw new Error('Outside world body fatigue changed');
  if (!state && body.fatigue > 0) throw new Error('Outside world fatigue requires a transit state');
}
