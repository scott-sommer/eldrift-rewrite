import type { StatePort } from '../persistence/versioned-state';
import { createScoutRetirement } from '../features/intel/scout-retirement';
/** Other feature cleanup may replay; each retirement handler owns idempotence. */
export function withScoutRetirement(state: StatePort, retire: (id: string) => void, clock: () => number) {
  const scout = createScoutRetirement(state, clock);
  return (id: string): void => { retire(id); scout(id); };
}
