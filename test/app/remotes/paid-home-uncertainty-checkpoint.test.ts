import { expect,test } from 'vitest';
import { paidHaulingPhysicalFixture } from '../../fixtures/paid-hauling-physical';
import { paidMiningBankingFixture } from '../../fixtures/paid-mining-banking';
import { recordUncertainTransfer } from '../../../src/features/logistics/uncertainty';
import type { Incidents } from '../../../src/features/logistics/uncertainty';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { taskScope } from '../../../src/app/task-runner';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';

test('JSON restore preserves historical uncertainty for couriers and miners, but rejects changed identity, binding and clocks',() => {
  const courier = paidHaulingPhysicalFixture();
  // A previous unrelated failed/unknown transfer has no receipt in the current trip.
  const request = { id: 'past',owner: 'past-owner',source: 'container',sink: 'bank',resource: 'energy',quantity: 5,priority: 0,expiresAt: 99 };
  recordUncertainTransfer(courier.shared.state,{ home: 'W0N1',request,scope: taskScope('paid-courier','past'),tick: 99,cargo: 32,
    attempt: { id: 'past-effect',unit: 'native-id',target: 'bank',room: 'W0N1',resource: 'energy',kind: 'transfer',tick: 98,amount: 5,cargoBefore: 32,
      requestKey: logisticsPool('request-binding','W0N1',request.owner,request.id) } });
  const miner = paidMiningBankingFixture(); miner.world.step(miner.frame(10));
  miner.world.step({ ...miner.frame(11),operations: [{ kind: 'settle' }] }); miner.world.step(miner.frame(12));
  for (const [fixture,unit] of [[courier,'native-id'],[miner,'miner-id']] as const) {
    const checkpoint = JSON.parse(JSON.stringify(fixture.world.checkpoint()));
    const resumed = resumeHomeHaulingWorld(checkpoint,fixture.configure);
    expect(resumed.checkpoint()).toEqual(checkpoint);
    for (const change of ['home','unit','target','request','clock','schema']) {
      const bad = structuredClone(checkpoint);
      const incidents = bad.state.find((row: { key: string }) => row.key === 'logistics-uncertainty/'+unit)!.value.data as Incidents;
      const incident = incidents.entries[0]!;
      if (change === 'home') incident.home = 'W9N9';
      if (change === 'unit') incident.attempt.unit = 'another-body';
      if (change === 'target') incident.attempt.target = 'another-bank';
      if (change === 'request') incident.attempt.requestKey = 'another-request';
      if (change === 'clock') incident.tick = bad.inventory.nextTick;
      if (change === 'schema') incidents.discarded = -1;
      expect(() => resumeHomeHaulingWorld(bad,fixture.configure),change).toThrow();
    }
  }
});
