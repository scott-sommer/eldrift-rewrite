import { privateHaulingState } from '../../src/app/remotes/startup/hauling-state/private-state';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { observePaidHomeControl } from '../../src/app/remotes/startup/home-observation/control';
import { stationTile } from '../../src/capabilities/mining/station';
import { taskScope } from '../../src/app/task-runner';
import type { HomeHaulingInput } from '../../src/app/remotes/startup/hauling-state/world/model';
import { startupTravelPlan } from './startup-travel';
import { logisticsPool } from '../../src/capabilities/logistics/request';
export function paidMinerControlFixture() {
  const state = privateHaulingState(),assignments = createRemoteAssignmentStore(state),plan = startupTravelPlan();
  assignments.reconcile({ home: 'W9N9',expectedRevision: 0,tick: 0,lifetime: 200,plans: [{ room: 'E1N1',sources: ['outside-source'],reserve: null,infrastructure: null }] });
  assignments.reconcile({ home: 'W0N1',expectedRevision: 1,tick: 10,lifetime: 20,plans: [{ room: 'E0N1',sources: ['source'],reserve: null,infrastructure: null }] });
  const assignment = assignments.owner('E0N1',10)!,demand = remoteAssignmentDemands(assignment,10).find(demand => demand.kind === 'mine')!;
  const record = { id: 'mine-task',kind: 'remote-mine',phase: 'work',payload: { home: 'W0N1',token: { id: demand.id,assignment: demand.assignment,generation: demand.generation,expiresAt: demand.expiresAt } },wakeAt: 12,retries: 2,expiresAt: 100 };
  const claim = { resource: 'mining-tile:'+stationTile(plan.station),holder: 'miner',scope: taskScope('miner','mine-task'),expiresAt: 20 };
  state.write('reservations/empire',{ owner: 'reservations',version: 1,data: { claims: [claim,{ resource: 'outside-tile',holder: 'resident',scope: 'resident-task',expiresAt: 5 }] } });
  const body = ['work','carry','move'] as const;
  const inventory = (id: string,energy: number,capacity: number,room: string) => ({ id,energy,capacity,usedCapacity: energy,freeEnergyCapacity: capacity-energy,room,active: true,capacityPool: logisticsPool('capacity',id) });
  const input: HomeHaulingInput = { home: 'W0N1',observedAt: 10,endpoint: { id: 'bank',energy: 0,capacity: 1000,freeCapacity: 1000 },
    inventories: [inventory('bank',0,1000,'W0N1')],bodies: [{ name: 'miner',unit: 'miner-id',inventory: inventory('miner-id',8,50,'E0N1') }],
    workers: [{ name: 'miner',owner: 'mine-owner',position: plan.station,spawning: false,ticksToLive: 1493,energy: 8,fatigue: 0,usedCapacity: 8,body: body.map(type => ({ type,hits: 100,boost: null })) }],
    claims: { owned: [],external: [] },control: observePaidHomeControl(state,10),sources: [{ plan,demand,couriers: [],miners: [{
      paid: { request: 'miner',owner: 'mine-owner',body: [...body],capacity: 50,startAt: 0,activeAt: 3,retireAt: 1400,expiresAt: 1503 },
      observation: { observedAt: 10,name: 'miner',unit: 'miner-id',owner: 'mine-owner',position: plan.station,energy: 8,fatigue: 0,activeAt: 3,retireAt: 1400,expiresAt: 1503,
        stage: 'station',assigned: true,claim,task: { record,id: record.id,wakeAt: record.wakeAt,expiresAt: record.expiresAt,scope: claim.scope } },
    }] }] };
  return { state,input,record,plan,demand };
}
