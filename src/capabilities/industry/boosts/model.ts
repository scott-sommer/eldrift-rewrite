export interface BoostStep { part: string; resource: string; count: number }
export interface BoostRequest {
  id: string; owner: string; unit: string; name: string; home: string;
  steps: readonly BoostStep[]; expiresAt: number; required: boolean; preferredLab?: string;
}
export interface BoostBodyPart { type: string; hits: number; boost: string | null }
export interface BoostUnit { id: string; name: string; owner: string; home: string; spawning: boolean; body: readonly BoostBodyPart[] }
export interface BoostAttempt { tick: number; before: number; count: number; resource: string; part: string; code: number | null }
export type BoostStatus = 'pending' | 'issued' | 'confirmed' | 'cancelled' | 'expired' | 'failed';
export interface BoostJob {
  request: BoostRequest; status: BoostStatus; lab: string | null; attempt: BoostAttempt | null;
  observed: number[]; cancelRequested: boolean; acknowledged: boolean; reason: string | null;
}
export function terminalBoost(job: BoostJob): boolean { return !['pending','issued'].includes(job.status); }
export function holdsBoostUnit(job: BoostJob): boolean {
  return !terminalBoost(job) || (job.request.required && job.status !== 'confirmed' && !job.acknowledged);
}
export function boostIdentity(request: Pick<BoostRequest,'owner' | 'id'>): string { return JSON.stringify([request.owner,request.id]); }
export function boostScope(request: Pick<BoostRequest,'owner' | 'id'>): string { return 'boost:'+boostIdentity(request); }
export function boostServiceOwner(request: Pick<BoostRequest,'owner' | 'id'>): string { return 'industry-boost:'+boostIdentity(request); }

export function boostReadiness(job: BoostJob | null | undefined): 'absent' | 'waiting' | 'ready' | 'failed' {
  if (!job) return 'absent';
  return terminalBoost(job) ? (job.status === 'confirmed' ? 'ready' : 'failed') : 'waiting';
}
