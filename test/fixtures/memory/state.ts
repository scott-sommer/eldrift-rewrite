import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { openState, saveState } from '../../../src/persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../src/persistence/versioned-state';
import { colonySchema } from '../../../src/features/colony/state';
import { planSchema } from '../../../src/features/planning/plan-state';
import { missionSchema } from '../../../src/features/missions/state';
import { operatorSchema } from '../../../src/features/operator/state';
import { intelSchema } from '../../../src/persistence/intel/schema';
import { taskSchema } from '../../../src/persistence/tasks/schema';
import { reservationSchema } from '../../../src/persistence/reservations/schema';
import type { Claim } from '../../../src/persistence/reservations/schema';
import { unitRosterSchema } from '../../../src/persistence/units/schema';
import type { UnitIdentity } from '../../../src/persistence/units/schema';
export { measureSerialization } from '../../../src/persistence/diagnostics';
function put<T>(port: StatePort, key: string, schema: StateSchema<T>, data: T): void {
  openState(port, key, schema);
  saveState(port, key, schema, data);
}
export function memoryFixture(rooms: number) {
  if (!Number.isSafeInteger(rooms) || rooms < 1 || rooms > 20) throw new Error('Fixture room count must be 1..20');
  const memory: { eldrift?: unknown } = {};
  const port = createMemoryPort(() => memory);
  const claims: Claim[] = [];
  const units: UnitIdentity[] = [];
  put(port, 'operator/config', operatorSchema, { empire: { allies: ['fixture-ally'], backgroundEnabled: true } });
  for (let index = 0; index < rooms; index++) {
    const room = `W${index}N1`;
    put(port, `colony/${room}`, colonySchema(room, 'fixture'), { room, owner: 'fixture', mode: 'normal', recovery: { active: false, checkedAt: 100 } });
    put(port, `intel/${room}`, intelSchema, { lastSeen: 100, owned: true, sourceIds: [`${room}-source-a`, `${room}-source-b`], structureIds: Array.from({ length: 100 }, (_, i) => `${room}-structure-${i}`), hostileIds: [] });
    put(port, `planning/${room}`, planSchema(room, ['road']), { room, revision: 1, strategy: 'size-fixture', entries: Array.from({ length: 150 }, (_, i) => ({ type: 'road', x: i % 30 + 1, y: Math.floor(i / 30) + 1, rcl: 3, priority: i, source: 'strategy' as const })) });
    const missionId = `defend-${room}`;
    const contracts = { defend: { validOptions: (value: unknown) => value === room, validCriteria: (value: unknown) => value === null } };
    put(port, `missions/${missionId}`, missionSchema(missionId, contracts), { id: missionId, status: 'active', stageIndex: 0, stages: [{ kind: 'defend', options: room, criteria: null }], units: [] });
    for (let i = 0; i < 20; i++) {
      const name = `${room}-worker-${i}`;
      units.push({ name, id: `id-${name}` });
      const definitions = { collect: { phases: ['work'], validPayload: (v: unknown) => v === `${room}-source-a` } };
      put(port, `tasks/${name}`, taskSchema(name, definitions), { unit: name, queue: Array.from({ length: 3 }, (_, task) => ({ id: `task-${task}`, kind: 'collect', phase: 'work', payload: `${room}-source-a`, retries: 0, wakeAt: 100, expiresAt: 1000 })) });
      claims.push({ resource: `slot-${name}`, holder: name, scope: `task-${name}`, expiresAt: 1000 });
    }
  }
  put(port, 'reservations/empire', reservationSchema, { claims });
  put(port, 'units/creeps', unitRosterSchema, { units });
  return memory;
}
