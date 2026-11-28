import { vi } from 'vitest';
import { paidHaulingPhysicalFixture } from './paid-hauling-physical';
import { enableHomeExpiry } from './home-expiry';
import { logisticsPool } from '../../src/capabilities/logistics/request';
export function homeExpiryMaintenanceFixture() {
  const owned = vi.fn(),independent = vi.fn();
  const f = paidHaulingPhysicalFixture(1400,input => {
    input.sources = []; input.bodies = []; input.workers = [];
    for (let index = 0; index < 21; index++) {
      const name = 'resident-'+index,id = 'resident-id-'+index,position = { room: 'W0N1',x: 10+index%10,y: 10+Math.floor(index/10) };
      input.bodies.push({ name,unit: id,inventory: { id,room: 'W0N1',active: true,capacityPool: logisticsPool('capacity',id),capacity: 0,energy: 0,usedCapacity: 0,freeEnergyCapacity: 0 } });
      input.workers.push({ name,owner: 'household',position,spawning: false,ticksToLive: 1,fatigue: 0,energy: 0,usedCapacity: 0,body: [{ type: 'move',hits: 100,boost: null }] });
    }
    enableHomeExpiry(input);
  });
  const frame = (tick: number) => ({ tick,operations: [{ kind: 'settle' as const },{ kind: 'external' as const,id: 'owned',run: owned },{ kind: 'external' as const,id: 'foreign',independent: true,run: independent }],
    outside: { plans: [],states: [],requestedUnits: [],occupants: tick === 100 ? f.world.snapshot().bodies.map(body => ({ unit: body.unit,position: body.position })) : [] },
    settlementOrder: (intents: readonly { id: string }[]) => intents.map(intent => intent.id),postprocessOrder: (operations: readonly { key: string }[]) => operations.map(operation => operation.key) });
  return { ...f,frame,owned,independent };
}
