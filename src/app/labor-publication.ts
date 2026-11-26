import { openState, peekState, saveState } from '../persistence/versioned-state';
import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { peekSpawnIdentity, reserveExpectedSpawnIdentity } from '../features/population/spawn-identity';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { createLaborTaskStaging } from '../features/work/stage-labor-task';
import { laborPublicationSchema } from '../features/work/labor-publication';
import type { LaborPublication } from '../features/work/labor-publication';
import { materializeLaborBirth } from '../features/work/labor-birth';
import { readLaborProposalSnapshot } from '../capabilities/economy/startup/household/labor/proposal-reader';
import type { SpawnRequest } from '../capabilities/spawning/request';
import { withdrawLaborPublication } from './labor-publication-cleanup';
export interface LaborPublicationPorts { now(): number; occupied(name: string): boolean; born(request: SpawnRequest): boolean }
/** Durable enqueue orchestration only; callers retain economic/current-fact admission and final dispatch. */
export function createLaborPublication(state: StatePort, home: string, ports: LaborPublicationPorts, definitions: Readonly<Record<string,TaskDefinition>> = {}) {
  const schema = laborPublicationSchema(home), key = stateKey('labor-publications',home), staging = createLaborTaskStaging(state,definitions);
  const read = () => peekState(state,key,schema)?.entry ?? null;
  function save(entry: LaborPublication | null): void { openState(state,key,schema); saveState(state,key,schema,{ entry }); }
  function maintain() {
    const entry = read(); if (!entry) return 'idle' as const;
    if (ports.born(entry.request)) { save(null); return 'born' as const; }
    if (ports.occupied(entry.request.name)) return 'occupied' as const;
    if (ports.now() <= entry.request.readyAt) return 'pending' as const;
    if (!withdrawLaborPublication(state,entry,definitions)) return 'conflict' as const;
    save(null); return 'withdrawn' as const;
  }
  function publish(value: unknown, current: () => boolean, admitted: () => boolean) {
    const proposal = readLaborProposalSnapshot(value), birth = materializeLaborBirth(proposal,ports.now(),true);
    if (proposal.input.request.room !== home || birth.status !== 'ready' || proposal.observedAt !== ports.now()) return 'stale' as const;
    let entry = read();
    if (entry && JSON.stringify(entry.proposal) !== JSON.stringify(proposal)) return 'busy' as const;
    if (ports.occupied(birth.request.name)) return 'occupied' as const;
    if (!current() || !admitted()) return revoke();
    if (!entry) {
      if (peekSpawnIdentity(state,home) !== birth.request.id) return 'identity-conflict' as const;
      entry = { phase: 'prepared',proposal,request: birth.request }; save(entry);
    }
    if (entry.phase === 'revoked') return 'revoked' as const;
    return advance(entry,current,admitted);
  }
  function revoke() {
    const entry = read();
    if (entry) { entry.phase = 'revoked'; save(entry); }
    return 'refused' as const;
  }
  function advance(entry: LaborPublication, current: () => boolean, admitted: () => boolean) {
    if (entry.phase === 'prepared') {
      if (!reserveExpectedSpawnIdentity(state,home,entry.request.id)) { save(null); return 'identity-conflict' as const; }
      entry.phase = 'reserved'; save(entry);
    }
    if (!current() || !admitted()) return revoke();
    const staged = staging.stage(entry.proposal,ports.now(),current);
    if (staged !== 'staged' && staged !== 'existing') return staged;
    createSpawnQueue(state,home).submit(entry.request);
    const existing = entry.phase === 'queued'; entry.phase = 'queued'; save(entry);
    return existing ? 'existing' as const : 'published' as const;
  }
  return { publish,maintain,read };
}
