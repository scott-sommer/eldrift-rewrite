import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import type { StatePort, Envelope } from '../../src/persistence/versioned-state';
interface PlanningProof {
  savedAt: number; initialThrough: number; initialRevision: number; pendingBefore: number;
  resumedAt?: number; recoveredThrough?: number; nextThrough?: number; nextRevision?: number;
  completeThrough?: number; completeRevision?: number; readOnly?: boolean; owner?: string; version?: number;
  result?: ReturnType<typeof forecastStartupProject>; uninterrupted?: ReturnType<typeof forecastStartupProject>;
}
interface PlanningMemory extends Memory { startupPlanningProof?: PlanningProof }
/** Production job ownership with synthetic model inputs; no native economic selection is implied. */
export function snapshotStartupPlanningJob(state: StatePort): void {
  const input = startupDeliveryInput(), home = 'W0N1', memory = Memory as PlanningMemory;
  input.project.spawning.room = home;
  input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: home }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const owner = createStartupPlanningJob(state,home);
  const request = { room: 'E0N1',source: 'fixture-source',generation: 1,binding: 'fixture-planning-v1',observedAt: 149,expiresAt: 249,tick: Game.time,input };
  if (Game.time === 149) {
    const result = owner.advance({ ...request,expectedRevision: 0 },43), record = owner.read();
    if (result.status !== 'deferred' || result.frames !== 43 || !record.job) throw new Error('Expected persisted partial startup planning job');
    memory.startupPlanningProof = { savedAt: Game.time,initialThrough: record.job.checkpoint.tick,initialRevision: record.revision,pendingBefore: record.job.checkpoint.due.length };
    return;
  }
  const proof = memory.startupPlanningProof, recovered = owner.read();
  if (!proof || !recovered.job || owner.result(request)) throw new Error('Incomplete forecast must survive reset without exposing a result');
  const next = owner.advance({ ...request,expectedRevision: recovered.revision },1), record = owner.read();
  if (next.status !== 'deferred' || next.frames !== 1) throw new Error('Expected one restored planning frame');
  const complete = owner.advance({ ...request,expectedRevision: record.revision },57), final = owner.read();
  if (complete.status !== 'complete') throw new Error('Expected complete persisted startup planning job');
  const before = JSON.stringify(Memory.eldrift), result = owner.result(request), readOnly = before === JSON.stringify(Memory.eldrift);
  const envelope = state.read('remoteStartupPlanning/W0N1') as Envelope;
  Object.assign(proof,{ resumedAt: Game.time,recoveredThrough: recovered.job.checkpoint.tick,nextThrough: record.job?.checkpoint.tick,nextRevision: record.revision,
    completeThrough: complete.through,completeRevision: final.revision,readOnly,owner: envelope.owner,version: envelope.version,result,uninterrupted: forecastStartupProject(input) });
}
