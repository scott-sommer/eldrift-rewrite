import type { MiningStation } from '../../capabilities/mining/station';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { createSpawnQueue } from '../population/spawn-queue';
import { miningOwner } from './demand';

/** Reconcile from current observations, without relying on a previous station snapshot. */
export function reconcileMiningDemand(state: StatePort, home: string, room: string,
  stations: readonly MiningStation[] | undefined): number {
  if (stations === undefined || state.read(stateKey('spawning', home)) === undefined) return 0;
  const active = new Set(stations.filter(station => station.risk === 'safe' && station.throughput > 0
    && (station.kind === 'energy' || (station.available > 0 && station.extractor)))
    .map(miningOwner));
  const queue = createSpawnQueue(state, home);
  const obsolete = queue.list().filter(request => ownerRoom(request.owner) === room && !active.has(request.owner));
  for (const request of obsolete) queue.cancel(request.id, request.owner);
  return obsolete.length;
}
function ownerRoom(owner: string): string | undefined {
  if (!owner.startsWith('mining:')) return undefined;
  try {
    const identity: unknown = JSON.parse(owner.slice('mining:'.length));
    if (Array.isArray(identity) && identity.length === 2 && identity.every(item => typeof item === 'string')) return identity[0] as string;
  } catch { /* Unknown identities belong to their original producer. */ }
  return undefined;
}
