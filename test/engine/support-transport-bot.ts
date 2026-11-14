import { createNativeSupportCourier } from '../../src/app/native-support-courier';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { createNativeLogisticsFeature } from '../../src/app/native-logistics';
import { resolveConfig } from '../../src/config/resolve';
import type { FeatureContext } from '../../src/app/runtime-model';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { supportOwner } from '../../src/features/recovery/support-identity';
import { haulingOwner } from '../../src/features/logistics/identity';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
const state = createMemoryPort(() => Memory);
const dispatch = createNativeDispatch(state);
const local = createNativeLogisticsFeature(state, dispatch);
const courier = createNativeSupportCourier(state, dispatch, () => 70);
export function loop() {
  const creep = Game.creeps['support']!;
  const owner = supportOwner('W0N1', 'E0N1');
  creep.memory.population ??= { owner, home: 'W0N1' };
  Game.creeps['local']!.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  const source = Game.rooms['W0N1']!.storage!;
  const sink = Game.rooms['E0N1']!.storage!;
  createLogisticsRequests(state, 'W0N1').submit({ id: 'shipment', owner, source: source.id, sink: sink.id,
    resource: 'energy', quantity: 50, priority: 2, expiresAt: 1000 }, Game.time);
  local.feature.run({ room: { name: 'W0N1' }, config: resolveConfig({ empire: settings.empire }, Game.time) } as FeatureContext);
  courier.run(creep, Game.time < 12);
  dispatch.flush();
  const reservedStock = createQuantityReservations(state).list(Game.time).flatMap(claim => claim.allocations)
    .filter(item => item.pool === logisticsPool('stock', source.id, 'energy')).reduce((sum, item) => sum + item.amount, 0);
  const row = { owner: creep.memory.population.owner, reservedStock, room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y, source: source.store.energy,
    target: sink.store.energy, cargo: creep.store.energy, localCargo: Game.creeps['local']!.store.energy };
  const memory = Memory as Memory & { supportTransport?: (typeof row)[] };
  (memory.supportTransport ??= []).push(row);
}
