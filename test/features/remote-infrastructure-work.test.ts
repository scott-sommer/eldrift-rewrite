import { expect, test } from 'vitest';
import { infrastructureFixture } from '../fixtures/remote-infrastructure';
import { selectRemoteInfrastructureWork } from '../../src/features/remotes/infrastructure/work';
import type { RemoteWorkSite } from '../../src/features/remotes/infrastructure/work';
function fixture() {
  const f = infrastructureFixture(); f.store.save(0,f.demand,f.draft,1);
  const site = (id: string,room: string,x: number,type = 'road'): RemoteWorkSite => ({ id,position: { room,x,y: 25 },type,owned: true,ready: true,progress: 0,total: 300 });
  const sites = [site('home-road','W0N1',48),site('remote-road','E0N1',1),site('station','E0N1',2,'container')];
  const origin = { room: 'W0N1',x: 47,y: 25 }, record = f.store.read();
  const select = (input = sites, rooms = ['W0N1','E0N1']) => selectRemoteInfrastructureWork(record,f.demand,2,input,origin,rooms);
  return { ...f,site,sites,origin,record,select };
}
test('planned containers precede roads and admitted intermediate/home rooms remain serviceable',() => {
  const f = fixture(); expect(f.select()?.id).toBe('station'); expect(f.select(f.sites,['W0N1'])?.id).toBe('home-road');
  expect(f.select(f.sites.filter(site => site.type === 'road'))?.id).toBe('home-road');
});
test('unplanned, foreign, complete, blocked and disabled work cannot acquire a build order',() => {
  const f = fixture();
  expect(f.select([f.site('unplanned','E0N1',40),{ ...f.sites[0]!,owned: false },{ ...f.sites[1]!,progress: 300 },{ ...f.sites[2]!,ready: false }])).toBeUndefined();
  f.demand.infrastructure = { roads: false,containers: false }; expect(f.select()).toBeUndefined();
});
test('generation, expiry and home authority fence retained plans and target retention',() => {
  const f = fixture(); const select = (demand = f.demand,tick = 2) => selectRemoteInfrastructureWork(f.record,demand,tick,f.sites,f.origin,['W0N1','E0N1']);
  expect(select({ ...f.demand,generation: 2 })).toBeUndefined(); expect(select(f.demand,51)).toBeUndefined(); expect(select({ ...f.demand,home: 'W1N1' })).toBeUndefined();
  const roads = f.sites.filter(site => site.type === 'road');
  expect(selectRemoteInfrastructureWork(f.record,f.demand,2,roads,f.origin,['W0N1','E0N1'],'remote-road')?.id).toBe('remote-road');
});
