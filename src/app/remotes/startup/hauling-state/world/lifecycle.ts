import { createCreepMaintenance } from '../../../../creep-maintenance';
import { createLogisticsRetirement } from '../../../../logistics-retirement';
import { createTickAdmission } from '../../../../tick-admission';
import { settleHaulingTask } from '../../../../settle-hauling-task';
import { observePhysicalTransfer } from '../transfer-observation';
import { homeMinerDefinitions } from './control';
import { unitRosterSchema } from '../../../../../persistence/units/schema';
import type { UnitIdentity } from '../../../../../persistence/units/schema';
import type { HomeHaulingInput,HomeWorldEnvironment,HomeConfirmedDelivery } from './model';
import type { HomeWorldBodies } from './bodies';
import type { EnergyInventoryFrame } from '../../../../../capabilities/resources/energy-inventory/frame';
import type { PaidHaulingForecastSeed } from '../service';
import type { homeWorldReceiptCollector } from './receipts';
/** Same before-dispatch retirement owner and20-unit cap as native, over an explicit complete owned roster. */
export function createHomeLifecycle(home: HomeHaulingInput,seed: PaidHaulingForecastSeed,inventory: EnergyInventoryFrame,bodies: HomeWorldBodies,environment: HomeWorldEnvironment,receipts: ReturnType<typeof homeWorldReceiptCollector>) {
  if (!home.ecology?.bodies?.length) return undefined;
  if (!environment.lifecycleRoster) throw new Error('Complete modeled lifecycle roster required');
  let roster: readonly UnitIdentity[] = [],candidates: ReturnType<typeof receipts.capture> = [],retired: UnitIdentity[] = [],deliveries: HomeConfirmedDelivery[] = [];
  const maintain = createCreepMaintenance(seed.state,() => roster,homeMinerDefinitions,createLogisticsRetirement(seed.state),unit => {
    settleHaulingTask(seed.state,homeMinerDefinitions,unit,attempt => observePhysicalTransfer(inventory,attempt,environment.visible(attempt.room,inventory.tick())));
    deliveries.push(...receipts.confirmed(candidates.filter(candidate => candidate.worker.unit === unit.id),inventory.tick()));
    retired.push(unit);
  });
  const admit = createTickAdmission(seed.state,() => true,inventory.tick,maintain);
  return { run() {
    roster = environment.lifecycleRoster!(inventory.tick()); validateRoster(home,bodies,roster);
    candidates = receipts.capture(); retired = []; deliveries = [];
    const admitted = admit();
    return { admitted,retired,deliveries,owned: new Set(roster.map(unit => unit.id)) };
  } };
}
function validateRoster(home: HomeHaulingInput,bodies: HomeWorldBodies,roster: readonly UnitIdentity[]): void {
  if (roster.length > 512 || !unitRosterSchema.valid({ units: [...roster] })) throw new Error('Invalid modeled owned lifecycle roster');
  for (const body of home.bodies) {
    const current = roster.find(unit => unit.name === body.name);
    if (bodies.isAlive(body.unit)) {
      if (current?.id !== body.unit) throw new Error('Modeled lifecycle roster loses a live body');
    } else if (current) throw new Error('Prospective body transition required');
  }
}
