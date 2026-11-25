import { mobilityCosts } from './mobility';
import type { BodyPart } from '../spawning/body';
/** Intact planned body; live damage/boost observations belong to the native adapter. */
export function plannedMobility(body: readonly BodyPart[], load: number) {
  return mobilityCosts(body.map(type => ({ kind: type === 'move' ? 'move' : type === 'carry' ? 'carry' : 'other',
    active: true,movePower: type === 'move' ? 1 : 0,carryCapacity: type === 'carry' ? 50 : 0 })),load);
}
