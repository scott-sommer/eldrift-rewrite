import { createGameLoop } from './app/game-loop';
import { createPersistentConfiguration } from './app/persistent-configuration';
import { createGamePorts } from './adapters/screeps/runtime';
import { createMemoryPort } from './adapters/screeps/memory';

const ports = createGamePorts();
const state = createMemoryPort(() => Memory);
// Gameplay features are registered here as their capability work is completed.
export const loop = createGameLoop([], {
  ...ports,
  config: createPersistentConfiguration(state, () => ports.clock().tick),
});
