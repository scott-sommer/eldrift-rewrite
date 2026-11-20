import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createCreepMaintenance } from '../../src/app/creep-maintenance';
import { createLogisticsRetirement } from '../../src/app/logistics-retirement';
import { settleHaulingTask } from '../../src/app/settle-hauling-task';
import { assignHaulingTask } from '../../src/app/assign-hauling-task';
import { validHaulingPayload } from '../../src/app/hauling-task';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import type { Envelope } from '../../src/persistence/versioned-state';
const definitions = { haul: { phases: ['work'],validPayload: validHaulingPayload } };
function fixture() {
  let memory = {}, roster = [{ name: 'courier',id: 'old' }];
  const base = createMemoryPort(() => memory);
  let failReceipt = false;
  const state = { ...base,write(key: string,value: Envelope) {
    if (failReceipt && key === 'logistics-requests/home') { failReceipt = false; throw new Error('interrupted receipt'); }
    base.write(key,value);
  } };
  const request = { id: 'delivery',owner: 'room',source: 'source',sink: 'sink',resource: 'energy',quantity: 30,priority: 0,expiresAt: 2 };
  const maintain = (tick: number,events = true) => createCreepMaintenance(state,() => roster,definitions,createLogisticsRetirement(state),unit =>
    settleHaulingTask(state,definitions,unit,() => ({ tick,...(events ? { events: [{ source: 'old',target: 'sink',resource: 'energy',amount: 30 }] } : {}) })));
  maintain(1)(); createLogisticsRequests(state,'home').submit(request,1);
  assignHaulingTask(state,definitions,'courier','job',{ home: 'home',unitId: 'old',request },1,2);
  createTransferJournal(state,'old').begin({ id: 'last',requestKey: logisticsPool('request-binding','home','room','delivery'),
    unit: 'old',target: 'sink',room: 'home',resource: 'energy',kind: 'transfer',tick: 1,amount: 30,cargoBefore: 30 });
  return { state,maintain,die: () => { roster = []; },interrupt: () => { failReceipt = true; },reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}

test('dead couriers settle final transfers before task cleanup, including an interrupted receipt and JSON reset',() => {
  const f = fixture(); f.die(); f.interrupt();
  expect(f.maintain(2)).toThrow('interrupted receipt');
  expect(f.state.read('tasks/courier')).toMatchObject({ data: { queue: [{ id: 'job' }] } });
  f.reset(); expect(f.maintain(2)()).toBe(true); expect(f.maintain(2)()).toBe(true);
  expect(f.state.read('logistics-requests/home')).toMatchObject({ data: { records: [{ receipts: [{ id: 'last',amount: 30 }] }] } });
  expect(f.state.read('tasks/courier')).toMatchObject({ data: { queue: [] } });
  expect(f.state.read('logistics-attempts/old')).toBeUndefined();
  expect(f.state.read('logistics-retired/empire')).toMatchObject({ data: { entries: [{ journal: { acknowledged: true,result: { status: 'observed',amount: 30 } } }] } });
});

test.each([[2,false],[3,true]])('missing or stale room events cannot invent dead-courier receipts (%i,%s)',(tick,events) => {
  const f = fixture(); f.die(); expect(f.maintain(tick,events)()).toBe(true);
  expect(f.state.read('logistics-requests/home')).toMatchObject({ data: { records: [{ receipts: [] }] } });
  expect(f.state.read('logistics-retired/empire')).toMatchObject({ data: { entries: [{ journal: { acknowledged: true,result: null },incidents: { entries: [{ attempt: { id: 'last' },cargo: null }] } }] } });
});
