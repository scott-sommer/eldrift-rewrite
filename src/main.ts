import { createGameLoop } from './app/game-loop';
import { createGamePorts } from './adapters/screeps/runtime';
import { configurationFor } from './config/provider';

// Gameplay features are registered here as their capability work is completed.
export const loop = createGameLoop([], {
  ...createGamePorts(),
  config: room => configurationFor({}, room),
});
