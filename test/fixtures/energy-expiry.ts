import type { EnergyEcology,EnergyBody } from '../../src/capabilities/resources/energy-inventory/model';
export const expiryPosition = { room: 'W0N1',x: 10,y: 10 };
export function expiryBody(): EnergyBody {
  return { id: 'unit',position: expiryPosition,expiresAt: 101,salvageEnergy: 0,tombstoneId: 'forecast:tomb',tombstoneDecay: 15 };
}
export function expiryEcology(): EnergyEcology {
  return { sources: [],ground: [],containers: [],bodies: [expiryBody()],decayDivisor: 1000 };
}
export const expiryOrder = (operations: readonly { key: string }[]) => operations.map(operation => operation.key);
export const expiryPoses = [{ id: 'unit',position: expiryPosition }];
export const expiryStore = (id = 'unit',energy = 20,capacity = 50) => ({ id,energy,capacity,usedCapacity: energy,freeEnergyCapacity: capacity-energy });
