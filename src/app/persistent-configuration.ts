import { configurationFor } from '../config/provider';
import type { ConfigurationStore } from '../config/provider';
import { operatorSchema } from '../features/operator/state';
import { openState } from '../persistence/versioned-state';
import type { StatePort } from '../persistence/versioned-state';
export function createPersistentConfiguration(port: StatePort, clock: () => number) {
  let tick: number | undefined;
  let snapshot: ConfigurationStore = {};
  return (room?: string) => {
    const now = clock();
    if (tick !== now) {
      snapshot = openState(port, 'operator/config', operatorSchema);
      tick = now;
    }
    return configurationFor(snapshot, room);
  };
}
