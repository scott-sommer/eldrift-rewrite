import { forecastStartupCash } from '../../../capabilities/economy/startup/cash';
import { startupHomeStock } from './stock';
import type { StatePort } from '../../../persistence/versioned-state';
import type { StartupStructures } from './model';
/** Read existing stock and native admission claims. No projected income funds current births. */
export function startupCapitalAllows(state: StatePort, structures: StartupStructures, home: Room, reserve: number, cost: number, committed: number): boolean {
  const homeEnergy = startupHomeStock(state,structures,home).availableEnergy;
  const forecast = forecastStartupCash({ homeEnergy,protectedEnergy: reserve,horizon: 0,readyAt: 0,selfHarvestedConstruction: 0,
    flows: [{ id: 'current',kind: 'birth',energy: cost,firstTick: 0,interval: null,occurrences: 1 },
      { id: 'courier-commitment',kind: 'birth',energy: committed,firstTick: 0,interval: null,occurrences: 1 }] });
  return forecast.homeShortfall === 0;
}
