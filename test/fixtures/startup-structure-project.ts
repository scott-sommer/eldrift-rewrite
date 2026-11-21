import { startupHouseholdProject } from './startup-household-project';
export function startupStructureProject() {
  const input = startupHouseholdProject(), spawning = input.project.spawning;
  spawning.funding = { ...spawning.funding,capacity: 350,energyLayout: {
    structures: [{ id: 'spawn',kind: 'spawn',energy: 300,capacity: 300 },{ id: 'extension',kind: 'extension',energy: 0,capacity: 50 }],
    orders: [{ spawn: 'spawn',structures: ['spawn','extension'] }],
  } };
  input.household!.redistribution.trips = input.household!.redistribution.trips.map(trip => ({ ...trip,destination: 'spawn' }));
  return input;
}
