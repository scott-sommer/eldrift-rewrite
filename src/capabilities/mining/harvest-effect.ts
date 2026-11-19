/** Native energy harvest removes full available WORK output, then drops any CARRY overflow. */
export function energyHarvestEffect(power: number, sourceEnergy: number, cargo: number, capacity: number) {
  if (![power,sourceEnergy,cargo,capacity].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000) || cargo > capacity) throw new Error('Invalid energy harvest quantities');
  const harvestedEnergy = Math.min(power,sourceEnergy), stored = cargo+harvestedEnergy;
  return { harvestedEnergy,carriedEnergy: Math.min(stored,capacity),overflowEnergy: Math.max(0,stored-capacity) };
}
