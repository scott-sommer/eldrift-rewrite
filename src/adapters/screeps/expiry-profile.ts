import { corpseSalvage } from '../../capabilities/resources/body-remains';
// Exported by pinned engine globals; absent from the pinned community SDK declarations.
declare const CREEP_PART_MAX_ENERGY: number;
/** Ordinary owned-creep natural expiry, with one processor-time life tick remaining. */
export function nativeExpiryProfile(body: readonly BodyPartDefinition[]) {
  const resources = corpseSalvage(body.map(part => ({ cost: BODYPART_COST[part.type],...(part.boost ? { boost: String(part.boost) } : {}) })),{
    dropRate: CREEP_CORPSE_RATE,ticksToLive: 1,lifetime: body.some(part => part.type === 'claim') ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME,
    maximumPartEnergy: CREEP_PART_MAX_ENERGY,boostEnergy: LAB_BOOST_ENERGY,boostMineral: LAB_BOOST_MINERAL,
  });
  if (Object.entries(resources).some(([resource,amount]) => resource !== 'energy' && amount > 0)) throw new Error('Expiry salvage requires a physical resource model');
  return { salvageEnergy: resources.energy!,tombstoneDecay: body.length*TOMBSTONE_DECAY_PER_PART };
}
