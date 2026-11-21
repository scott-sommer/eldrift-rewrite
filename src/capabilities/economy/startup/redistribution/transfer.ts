import { copyPlain } from '../../../../core/plain-data';
import { validateRedistribution, redistributionIdentity } from './validation';
import { restoreRedistribution } from './checkpoint';
import type { StartupRedistributionInput, StartupRedistributionPorts, StartupRedistributionCheckpoint, StartupRedistributionState } from './model';
/** Physical pickup/cargo/deposit only; finance, funded births and actual native actions retain their owners. */
export function createStartupRedistribution(input: StartupRedistributionInput, ports: StartupRedistributionPorts, checkpoint?: StartupRedistributionCheckpoint) {
  validateRedistribution(input); return new Redistribution(copyPlain(input),ports,checkpoint);
}
class Redistribution {
  private readonly state: StartupRedistributionCheckpoint;
  constructor(private readonly input: StartupRedistributionInput, private readonly ports: StartupRedistributionPorts, checkpoint?: StartupRedistributionCheckpoint) {
    this.state = checkpoint === undefined ? { format: 1,binding: redistributionIdentity(input),through: -1,busy: [],
      trips: input.trips.map(trip => ({ id: trip.id,phase: 'waiting',cargo: 0,picked: 0,delivered: 0,lost: 0,arrivalAt: null,expiresAt: null,doneAt: null })) }
      : restoreRedistribution(input,checkpoint);
  }
  step(tick: number) {
    if (!Number.isSafeInteger(tick) || tick !== this.state.through+1 || tick > this.input.horizon) throw new Error('Redistribution frame order');
    const effects = { withdrawn: 0,delivered: 0,lost: 0,missed: 0 };
    for (let index = 0; index < this.state.trips.length; index++) {
      const state = this.state.trips[index]!;
      const result = this.deliver(state,index,tick); effects.delivered += result.delivered; effects.lost += result.lost;
    }
    for (let index = 0; index < this.state.trips.length; index++) {
      const trip = this.input.trips[index]!, state = this.state.trips[index]!;
      if (state.phase !== 'waiting' || trip.pickupAt !== tick) continue;
      const picked = this.pickup(state,index,tick); effects.withdrawn += picked; effects.missed += picked === 0 ? 1 : 0;
    }
    this.state.through = tick; return effects;
  }
  checkpoint(): StartupRedistributionCheckpoint { return copyPlain(this.state); }
  result() {
    return this.state.trips.reduce((sum,trip) => ({ cargo: sum.cargo+trip.cargo,picked: sum.picked+trip.picked,delivered: sum.delivered+trip.delivered,lost: sum.lost+trip.lost }),{ cargo: 0,picked: 0,delivered: 0,lost: 0 });
  }
  private pickup(state: StartupRedistributionState, index: number, tick: number): number {
    const trip = this.input.trips[index]!, worker = this.ports.worker(trip.request);
    if (!worker || !validWorker(worker,tick) || this.busy(trip.request,tick)) { state.phase = 'missed'; state.doneAt = tick; return 0; }
    const wanted = Math.min(trip.energy,worker.capacity), amount = accepted(this.ports.withdraw(wanted),wanted);
    if (amount === 0) { state.phase = 'missed'; state.doneAt = tick; return 0; }
    state.phase = 'carrying'; state.picked = amount; state.cargo = amount;
    state.arrivalAt = tick+1+trip.loadedTicks; state.expiresAt = worker.expiresAt; return amount;
  }
  private deliver(state: StartupRedistributionState, index: number, tick: number) {
    if (state.phase !== 'carrying') return { delivered: 0,lost: 0 };
    if (tick >= state.expiresAt!) {
      const lost = state.cargo; this.ports.lose(lost); state.lost += lost; state.cargo = 0; state.phase = 'lost'; state.doneAt = tick;
      return { delivered: 0,lost };
    }
    if (tick < state.arrivalAt!) return { delivered: 0,lost: 0 };
    const amount = accepted(this.ports.deposit(state.cargo,{ ...this.input.trips[index]! }),state.cargo); state.cargo -= amount; state.delivered += amount;
    if (state.cargo === 0) {
      state.phase = 'complete'; state.doneAt = tick;
      const trip = this.input.trips[index]!, until = tick+1+trip.returnTicks;
      this.state.busy = [...this.state.busy.filter(worker => worker.request !== trip.request),{ request: trip.request,until }];
    }
    return { delivered: amount,lost: 0 };
  }
  private busy(request: string, tick: number): boolean {
    if (this.state.busy.some(worker => worker.request === request && tick < worker.until)) return true;
    return this.state.trips.some((state,index) => state.phase === 'carrying' && this.input.trips[index]!.request === request);
  }
}
function accepted(amount: number, maximum: number): number {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > maximum) throw new Error('Invalid redistribution transfer effect');
  return amount;
}
function validWorker(worker: { activeAt: number; expiresAt: number; capacity: number }, tick: number): boolean {
  if (![worker.activeAt,worker.expiresAt,worker.capacity].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid redistribution worker facts');
  return worker.activeAt <= tick && tick < worker.expiresAt && worker.capacity > 0 && worker.capacity <= 2500;
}
