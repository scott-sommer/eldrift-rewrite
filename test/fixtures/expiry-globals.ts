import { vi } from 'vitest';
/** Pinned SDK constants used by the native profile boundary; processor tests independently compare them. */
export function stubExpiryGlobals(): void {
  for (const [key,value] of Object.entries({ BODYPART_COST: { work: 100,carry: 50,move: 50,claim: 600 },CREEP_CORPSE_RATE: 0.2,CREEP_LIFE_TIME: 1500,CREEP_CLAIM_LIFE_TIME: 600,CREEP_PART_MAX_ENERGY: 125,LAB_BOOST_ENERGY: 20,LAB_BOOST_MINERAL: 30,TOMBSTONE_DECAY_PER_PART: 5 })) vi.stubGlobal(key,value);
}
