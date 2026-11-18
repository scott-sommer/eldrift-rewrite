import type { RuntimeConfig } from '../config/model';
/** Per-home pause/bucket/fraction policy gates new vision, never an already-issued next-tick capture. */
export function observerHomeEnabled(config: Readonly<RuntimeConfig> | undefined): boolean {
  if (!config?.observersEnabled || !config.backgroundEnabled) return false;
  return Game.cpu.bucket >= config.minimumBucket && Game.cpu.getUsed() < Game.cpu.tickLimit * config.backgroundCpuFraction;
}
