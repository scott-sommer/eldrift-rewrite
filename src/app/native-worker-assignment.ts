import type { RuntimeConfig } from '../config/model';
import { chooseWorkerSource } from '../features/work/source-assignment';
import { movementPosition } from '../adapters/screeps/movement-traffic';
/** Fill missing automatic assignments; explicit existing assignments remain authoritative. */
export function assignNativeWorkerSource(creep: Creep, room: Room, settings: Readonly<RuntimeConfig>): void {
  if (!settings.workersEnabled || settings.workerMode !== 'upgrader' || settings.workerEnergyProfile !== 'upgrader' || creep.memory.workerSource) return;
  const assignments = Object.values(Game.creeps).flatMap(unit => unit.memory.workerSource ? [unit.memory.workerSource] : []);
  const selected = chooseWorkerSource(room.find(FIND_SOURCES).map(source => ({ id: source.id, position: movementPosition(source.pos) })), assignments);
  if (selected) creep.memory.workerSource = selected;
}
