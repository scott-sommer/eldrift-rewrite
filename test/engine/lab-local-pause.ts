import { industry } from '../../src/main';
import { labReceiptTotal } from './lab-empire-change';
declare global { interface Memory { localReactionPause?: { tick: number; cargo: number; receipts: number } } }
export function changeLocalReactionPause(): void {
  const previous = Memory.localReactionPause;
  if (previous) {
    if (Game.time === previous.tick+30) industry.labs.setReactionsPaused(false);
    return;
  }
  const courier = Game.creeps['boost-courier']!, cargo = courier.store.getUsedCapacity(RESOURCE_HYDROGEN)+courier.store.getUsedCapacity(RESOURCE_UTRIUM);
  if (!cargo || !industry.labs.inspect('W0N1').assignment) return;
  Memory.localReactionPause = { tick: Game.time,cargo,receipts: labReceiptTotal('W0N1') };
  industry.labs.setReactionsPaused(true);
}
