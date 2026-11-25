import { copyPlain } from '../../../../../core/plain-data';
import { accepted, laborWorker, validateLabor } from './validation';
import type { HouseholdLaborInput, HouseholdLaborJob, HouseholdLaborPorts, HouseholdLaborState } from './model';
/** Finite unboosted paid-body work windows; native target admission remains a separate port. */
export function createHouseholdLabor(input: HouseholdLaborInput, ports: HouseholdLaborPorts) {
  validateLabor(input); return new Labor(copyPlain(input),ports);
}
class Labor {
  private through = -1;
  private readonly jobs: HouseholdLaborState[];
  constructor(private readonly input: HouseholdLaborInput, private readonly ports: HouseholdLaborPorts) {
    this.jobs = input.jobs.map(job => ({ id: job.id,phase: 'waiting',cargo: 0,picked: 0,spent: 0,returned: 0,lost: 0,workAt: null,stopAt: null,returnAt: null,expiresAt: null,doneAt: null,rate: 0 }));
  }
  step(tick: number): void {
    if (!Number.isSafeInteger(tick) || tick !== this.through+1 || tick > this.input.horizon) throw new Error('Household labor frame order');
    this.jobs.forEach((state,index) => this.advance(state,this.input.jobs[index]!,tick));
    this.jobs.forEach((state,index) => {
      const job = this.input.jobs[index]!;
      if (state.phase === 'waiting' && job.pickupAt === tick) this.pickup(state,job,tick);
    });
    this.through = tick;
  }
  result() { return copyPlain({ through: this.through,jobs: this.jobs }); }
  private pickup(state: HouseholdLaborState, job: HouseholdLaborJob, tick: number): void {
    const observed = this.ports.worker(job.request), worker = observed && laborWorker(observed,job,tick);
    if (!worker || this.busy(job.request,tick)) { state.phase = 'missed'; state.doneAt = tick; return; }
    const amount = accepted(this.ports.withdraw(Math.min(job.energy,worker.capacity),job),Math.min(job.energy,worker.capacity));
    if (!amount) { state.phase = 'missed'; state.doneAt = tick; return; }
    Object.assign(state,{ phase: 'working',cargo: amount,picked: amount,rate: worker.rate,expiresAt: worker.expiresAt,
      workAt: tick+1+job.outboundTicks,stopAt: tick+1+job.outboundTicks+job.workTicks });
  }
  private advance(state: HouseholdLaborState, job: HouseholdLaborJob, tick: number): void {
    if (state.phase !== 'working' && state.phase !== 'returning') return;
    if (tick >= state.expiresAt!) {
      if (state.cargo) this.ports.lose(state.cargo,job); state.lost += state.cargo; state.cargo = 0; state.phase = 'expired'; state.doneAt = tick; return;
    }
    if (state.phase === 'returning') { this.returnCargo(state,job,tick); return; }
    if (tick < state.workAt!) return;
    const amount = accepted(this.ports.consume(Math.min(state.rate,state.cargo),job),Math.min(state.rate,state.cargo));
    state.cargo -= amount; state.spent += amount;
    if (!state.cargo || tick+1 >= state.stopAt!) { state.phase = 'returning'; state.returnAt = tick+1+job.returnTicks; }
  }
  private returnCargo(state: HouseholdLaborState, job: HouseholdLaborJob, tick: number): void {
    if (tick < state.returnAt!) return;
    const amount = state.cargo ? accepted(this.ports.deposit(state.cargo,job),state.cargo) : 0;
    state.cargo -= amount; state.returned += amount;
    if (!state.cargo) { state.phase = 'complete'; state.doneAt = tick; }
  }
  private busy(request: string, tick: number): boolean {
    return this.jobs.some((state,index) => this.input.jobs[index]!.request === request && (state.phase === 'working' || state.phase === 'returning' || state.doneAt === tick && state.phase === 'complete'));
  }
}
