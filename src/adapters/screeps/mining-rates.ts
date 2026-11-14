import { harvestRate } from '../../capabilities/mining/rate';
import type { MiningStation } from '../../capabilities/mining/station';
import type { BodyPart } from '../../capabilities/spawning/body';
import { observePopulation } from './population';
type Kind = MiningStation['kind'];
function profile(kind: Kind) {
  return kind === 'energy' ? { power: HARVEST_POWER, interval: 1 }
    : { power: HARVEST_MINERAL_POWER, interval: EXTRACTOR_COOLDOWN + 1 };
}
export function nativeHarvestRate(body: readonly BodyPartDefinition[], kind: Kind): number {
  return harvestRate(body.map(part => ({
    type: part.type, hits: part.hits,
    multiplier: harvestMultiplier(part),
  })), profile(kind));
}
export function plannedHarvestRate(body: readonly BodyPart[], kind: Kind): number {
  return harvestRate(body.map(type => ({ type, hits: 100, multiplier: 1 })), profile(kind));
}
/** Rate is potential production, not a measurement of delivered resources. */
export function observeMiningPopulation(kind: Kind) {
  return observePopulation().map(unit => ({ ...unit, rate: nativeHarvestRate(Game.creeps[unit.name]!.body, kind) }));
}

function harvestMultiplier(part: BodyPartDefinition): number {
  if (part.type !== WORK || !part.boost) return 1;
  const boost = BOOSTS[WORK][part.boost as keyof typeof BOOSTS.work];
  return boost && 'harvest' in boost ? boost.harvest : 1;
}
