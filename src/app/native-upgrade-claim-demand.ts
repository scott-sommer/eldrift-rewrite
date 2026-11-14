import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { upgradeClaimTarget } from './native-upgrade-claimer';
/** Disable/sponsor changes cancel only this sponsor's obsolete claimer requests, even without target vision. */
export function cancelObsoleteUpgradeClaimers(state: StatePort, home: string, config: (room: string) => Readonly<RuntimeConfig>): void {
  if (state.read('spawning/' + home) === undefined) return;
  const queue = createSpawnQueue(state, home);
  for (const request of queue.list()) {
    const target = upgradeClaimTarget(request.owner);
    if (!target) continue;
    const settings = config(target);
    if (!settings.upgradeLifecycleEnabled || (settings.upgradeRoomSponsor || target) !== home) queue.cancel(request.id, request.owner);
  }
}
