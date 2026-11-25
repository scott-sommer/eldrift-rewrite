import { startupStructureProject } from './startup-structure-project';
export function startupPassiveProject() {
  const input = startupStructureProject();
  input.project.spawning.funding.energyLayout!.regeneration = { eligibleSpawns: ['spawn'],otherRoomEnergy: 0 };
  return input;
}
