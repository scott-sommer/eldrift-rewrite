import { tileKey } from '../../movement/traffic/model';
import type { EnergyEcology,GroundEnergy } from './model';
export function addGroundEnergy(ecology: EnergyEcology,position: GroundEnergy['position'],energy: number): void {
  if (energy === 0) return;
  const existing = ecology.ground.find(drop => tileKey(drop.position) === tileKey(position));
  if (existing) existing.energy += energy; else ecology.ground.push({ position: { ...position },energy });
}
export function decayGroundEnergy(ecology: EnergyEcology,key: string): void {
  const drop = ecology.ground.find(drop => tileKey(drop.position) === key); if (!drop) return;
  drop.energy -= Math.ceil(drop.energy/ecology.decayDivisor);
  ecology.ground = ecology.ground.filter(drop => drop.energy > 0);
}
