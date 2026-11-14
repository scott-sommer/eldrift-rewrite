/** Legacy recovery suppresses distributors through equality, then restores at least one. */
export function distributorTarget(configured: number, active: boolean, energy: number, restartEnergy: number): number {
  if (![configured, energy, restartEnergy].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid distributor policy');
  return active ? energy > restartEnergy ? Math.max(1, configured) : 0 : configured;
}
