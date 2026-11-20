import { validateSpawnPlacement, matchesSpawn, copySpawnRequest } from './placement';
import { bodyCost, partCosts } from './body';
import type { SpawnRequest, SpawnSlot, SpawnAssignment, UnaffordablePolicy } from './request';
function validate(requests: readonly SpawnRequest[], slots: readonly SpawnSlot[], energy: Readonly<Record<string, number>>, tick: number): void {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid spawn tick');
  if (new Set(slots.map(slot => slot.id)).size !== slots.length) throw new Error('Duplicate spawn');
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const request of requests) {
    validateRequest(request);
    if (ids.has(request.id) || names.has(request.name)) throw new Error('Duplicate spawn request');
    ids.add(request.id); names.add(request.name);
  }
  if (Object.values(energy).some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Invalid room energy');
}
export function validateRequest(request: SpawnRequest): void {
  if (![request.id, request.owner, request.room, request.name].every(value => typeof value === 'string' && value.length > 0) || !Number.isFinite(request.priority)) throw new Error('Invalid spawn identity');
  validateSpawnPlacement(request.placement,request.room);
  if (!validHome(request.home)) throw new Error('Invalid population home');
  if (![request.readyAt, request.expiresAt].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid spawn timing');
  if (request.expiresAt <= request.readyAt) throw new Error('Empty spawn lifetime');
  if (!request.body.length || request.body.length > 50 || request.body.some(part => !Object.hasOwn(partCosts, part))) throw new Error('Invalid spawn body');
}
/** Pure proposal: only execution receipts may remove requests from persistent queues. */
export function allocateSpawns(requests: readonly SpawnRequest[], slots: readonly SpawnSlot[], energy: Readonly<Record<string, number>>,
  liveNames: ReadonlySet<string>, tick: number, unaffordable: UnaffordablePolicy): SpawnAssignment[] {
  validate(requests, slots, energy, tick);
  const remaining = new Map(Object.entries(energy));
  const available = [...slots].filter(slot => !slot.busy).sort((a, b) => a.id.localeCompare(b.id));
  const blocked = new Set<string>();
  const assignments: SpawnAssignment[] = [];
  const eligible = requests.filter(request => request.readyAt <= tick && tick < request.expiresAt && !liveNames.has(request.name))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  for (const request of eligible) {
    if (blocked.has(request.room)) continue;
    const index = available.findIndex(slot => matchesSpawn(request,slot));
    if (index < 0) continue;
    const cost = bodyCost(request.body);
    const budget = remaining.get(request.room) ?? 0;
    if (cost > budget) {
      if (unaffordable === 'wait') blocked.add(request.room);
      continue;
    }
    const slot = available.splice(index, 1)[0]!;
    remaining.set(request.room, budget - cost);
    assignments.push({ spawn: slot.id, request: copySpawnRequest(request), cost });
  }
  return assignments;
}


function validHome(home: unknown): boolean { return home === undefined || (typeof home === 'string' && home.length > 0); }
