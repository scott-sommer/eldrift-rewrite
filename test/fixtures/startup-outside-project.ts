import { startupPassiveProject } from './startup-passive-project';
export function startupOutsideProject() {
  const input = startupPassiveProject();
  input.project.spawning.cash.flows = [{ id: 'outside-upkeep',kind: 'upkeep',spending: 'outside-spawn',energy: 1,firstTick: 20,interval: 10,occurrences: 4 }];
  return input;
}
