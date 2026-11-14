import { logisticsPool } from '../../src/capabilities/logistics/request';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeHaulingTask } from '../../src/app/native-hauling-task';
import { createNativeSupportView } from '../../src/app/native-support-view';
import { createTaskRunner } from '../../src/app/task-runner';
import { selectHaulingTask } from '../../src/app/select-hauling-task';
import { settleHaulingTask } from '../../src/app/settle-hauling-task';
import { recoverNativeCargo } from '../../src/app/native-cargo-recovery';
import { observeTransfer } from '../../src/adapters/screeps/transfer-observation';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { supportOwner } from '../../src/features/recovery/support-identity';
import { haulingOwner } from '../../src/features/logistics/identity';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
const state = createMemoryPort(() => Memory);
const dispatch = createNativeDispatch(state);
const observe = createNativeSupportView(() => 70);
const definitions = { haul: createNativeHaulingTask(state, dispatch, { version: 'support', blockedRooms: [], costs: {}, maximumRooms: 16 }, observe) };
const execute = createTaskRunner(state, definitions, () => Game.time);
export function loop() {
  const creep = Game.creeps['support']!;
  const owner = supportOwner('W0N1', 'E0N1');
  creep.memory.population = { owner, home: 'W0N1' };
  Game.creeps['local']!.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  const source = Game.rooms['W0N1']!.storage!;
  const sink = Game.rooms['E0N1']!.storage!;
  createLogisticsRequests(state, 'W0N1').submit({ id: 'shipment', owner, source: source.id, sink: sink.id,
    resource: 'energy', quantity: 50, priority: 2, expiresAt: 1000 }, Game.time);
  botLoop();
  dispatch.activate();
  settleHaulingTask(state, definitions, creep, observeTransfer);
  recoverNativeCargo(state, definitions, creep, 'W0N1', 0);
  selectHaulingTask(state, definitions, { home: 'W0N1', name: creep.name, unitId: creep.id, tick: Game.time,
    cargoTotal: creep.store.getUsedCapacity() }, request => observe(creep, request), request => request.owner === owner);
  execute(creep.name, creep);
  dispatch.flush();
  const reservedStock = createQuantityReservations(state).list(Game.time).flatMap(claim => claim.allocations)
    .filter(item => item.pool === logisticsPool('stock', source.id, 'energy')).reduce((sum, item) => sum + item.amount, 0);
  const row = { reservedStock, room: creep.pos.roomName, x: creep.pos.x, y: creep.pos.y, source: source.store.energy,
    target: sink.store.energy, cargo: creep.store.energy, localCargo: Game.creeps['local']!.store.energy };
  const memory = Memory as Memory & { supportTransport?: (typeof row)[] };
  (memory.supportTransport ??= []).push(row);
}
