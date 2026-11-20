import type { StatePort } from '../../../persistence/versioned-state';
import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import { boostSchema, validBoostRequest } from './schema';
import type { BoostJob, BoostRequest } from '../../../capabilities/industry/boosts/model';
import { boostIdentity, holdsBoostUnit, terminalBoost } from '../../../capabilities/industry/boosts/model';
const key = 'industry-boosts/empire';
export function createBoostRequests(state: StatePort) {
  const read = () => peekState(state,key,boostSchema);
  function update(owner: string,id: string,change: (job: BoostJob) => void): void {
    const saved = openState(state,key,boostSchema), job = saved.jobs.find(job => job.request.id === id && job.request.owner === owner);
    if (!job) throw new Error('Boost request is absent');
    change(job); saveState(state,key,boostSchema,saved);
  }
  function submit(request: BoostRequest,tick: number,adoptExpired: boolean): boolean {
    validateSubmission(request,tick,adoptExpired);
    const saved = openState(state,key,boostSchema), previous = saved.jobs.find(job => boostIdentity(job.request) === boostIdentity(request));
    if (previous) { if (requestSignature(previous.request) !== requestSignature(request)) throw new Error('Boost identity conflict'); return true; }
    if (saved.jobs.some(job => job.request.unit === request.unit && holdsBoostUnit(job))) return false;
    if (saved.jobs.length >= 64) saved.jobs = saved.jobs.filter(job => !job.acknowledged || job.lab !== null);
    if (saved.jobs.length >= 64) return false;
    saved.jobs.push(initialJob(request,tick));
    saveState(state,key,boostSchema,saved); return true;
  }
  return {
    read: () => read()?.jobs ?? [], update,
    get: (owner: string,id: string) => read()?.jobs.find(job => job.request.owner === owner && job.request.id === id) ?? null,
    readiness(owner: string,id: string): 'absent' | 'waiting' | 'ready' | 'failed' {
      const job = read()?.jobs.find(job => job.request.owner === owner && job.request.id === id);
      if (!job) return 'absent';
      return terminalBoost(job) ? (job.status === 'confirmed' ? 'ready' : 'failed') : 'waiting';
    },
    submit: (request: BoostRequest,tick: number) => submit(request,tick,false),
    adoptBirth: (request: BoostRequest,tick: number) => submit(request,tick,true),
    cancel(owner: string,id: string): void { update(owner,id,job => { if (!terminalBoost(job)) job.cancelRequested = true; }); },
    acknowledge(owner: string,id: string): void { update(owner,id,job => { if (!terminalBoost(job)) throw new Error('Boost request is not settled'); job.acknowledged = true; }); },
    batch(tick: number,maximum = 8): readonly BoostJob[] {
      if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid boost tick');
      const saved = read();
      if (!saved || saved.processedAt === tick || !saved.jobs.length) return [];
      if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 64) throw new Error('Invalid boost work budget');
      const active = saved.jobs.filter(job => !terminalBoost(job) || job.lab !== null);
      if (!active.length) return [];
      const count = Math.min(maximum,active.length), jobs = Array.from({ length: count },(_,offset) => active[(saved.cursor+offset)%active.length]!);
      saved.cursor = (saved.cursor+count)%active.length; saved.processedAt = tick; saveState(state,key,boostSchema,saved);
      return jobs;
    },
  };
}
export function reservedBoostLabs(state: StatePort,room: string): readonly string[] {
  return createBoostRequests(state).read().filter(job => job.request.home === room && job.lab !== null).map(job => job.lab!);
}

function requestSignature(request: BoostRequest): string {
  return JSON.stringify([request.id,request.owner,request.unit,request.name,request.home,request.steps.map(step => [step.part,step.resource,step.count]),request.expiresAt,request.required,request.preferredLab ?? null]);
}

function validateSubmission(request: BoostRequest,tick: number,adoptExpired: boolean): void {
  if (!validBoostRequest(request) || !Number.isSafeInteger(tick) || tick < 0 || (request.expiresAt <= tick && !adoptExpired)) throw new Error('Invalid boost request');
}
function initialJob(request: BoostRequest,tick: number): BoostJob {
  const expired = request.expiresAt <= tick;
  return { request,status: expired ? 'expired' : 'pending',lab: null,attempt: null,observed: request.steps.map(() => 0),
    cancelRequested: false,acknowledged: false,reason: expired ? 'deadline' : null };
}
