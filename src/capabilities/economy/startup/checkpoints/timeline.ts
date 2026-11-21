import type { StartupEnergyCheckpoint } from '../energy/model';
import { copyPlain } from '../../../../core/plain-data';
import { bodyCost } from '../../../spawning/body';
import { integer, keys, record, requireCheckpoint } from './validation';
import type { StartupSpawnInput, StartupScheduledBirth, StartupSpawnSlot } from '../spawn-model';
import type { StartupCashCheckpoint } from './cash';
import type { StartupFundingCheckpoint } from './funding';
export interface StartupTimelineCheckpoint {
  energy?: StartupEnergyCheckpoint;
  tick: number; slots: StartupSpawnSlot[]; births: StartupScheduledBirth[];
  receiptCount: number; receiptIds: string[]; funding: StartupFundingCheckpoint; accounting: StartupCashCheckpoint;
}
export function restoreTimelineCheckpoint(input: StartupSpawnInput, value: unknown): StartupTimelineCheckpoint {
  requireCheckpoint(record(value)); const saved = value as StartupTimelineCheckpoint;
  requireCheckpoint(keys(value as Record<string,unknown>,['tick','slots','births','receiptCount','receiptIds','funding','accounting',...(input.funding.energyLayout ? ['energy'] : [])]));
  requireCheckpoint(integer(saved.tick,0,input.cash.horizon+1));
  requireCheckpoint(Array.isArray(saved.births) && saved.births.length <= input.requests.length);
  validateBirths(input,saved);
  requireCheckpoint(validReceipts(input,saved));
  requireCheckpoint(record(saved.accounting) && saved.accounting.tick === saved.tick);
  return copyPlain(saved);
}
function validateBirths(input: StartupSpawnInput, saved: StartupTimelineCheckpoint): void {
  const available = new Map(input.spawns.map(slot => [slot.id,slot.availableAt]));
  const seen = new Set<string>(); let previous = 0;
  for (const birth of saved.births) {
    requireCheckpoint(record(birth));
    const request = input.requests.find(request => request.id === birth.request), start = available.get(birth.spawn);
    requireCheckpoint(!!request && start !== undefined && !seen.has(birth.request));
    requireCheckpoint(validBirth(birth,request!,saved.tick,Math.max(previous,start!)));
    requireCheckpoint(!input.liveNames.has(request!.name));
    seen.add(birth.request); available.set(birth.spawn,birth.activeAt); previous = birth.startAt;
  }
  requireCheckpoint(Array.isArray(saved.slots) && saved.slots.length === input.spawns.length);
  requireCheckpoint(saved.slots.every((slot,index) => record(slot) && slot.id === input.spawns[index]!.id && slot.room === input.room && slot.availableAt === available.get(slot.id)));
}
function validBirth(birth: StartupScheduledBirth, request: StartupSpawnInput['requests'][number], tick: number, earliest: number): boolean {
  if (!integer(birth.startAt,Math.max(earliest,request.readyAt),Math.min(tick-1,request.expiresAt-1))) return false;
  if (birth.cost !== bodyCost(request.body) || birth.activeAt !== birth.startAt+request.body.length*3) return false;
  return !request.placement || request.placement.spawn === birth.spawn;
}
function validReceipts(input: StartupSpawnInput, saved: StartupTimelineCheckpoint): boolean {
  if (!integer(saved.receiptCount,0,160016) || !Array.isArray(saved.receiptIds)) return false;
  const base = [...input.cash.flows.map(flow => flow.id),...input.requests.map(request => 'birth:'+request.id)];
  if (saved.receiptIds.length !== base.length+saved.receiptCount) return false;
  if (!saved.receiptIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 512)) return false;
  const ids = new Set(saved.receiptIds);
  return ids.size === saved.receiptIds.length && base.every(id => ids.has(id));
}
