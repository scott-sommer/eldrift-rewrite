import { expect,test } from 'vitest';
import { partitionQuantityClaims } from '../../src/persistence/quantities/partition';
import type { QuantityClaim } from '../../src/persistence/quantities/schema';
test('two selected source bookings share one home pool while foreign or wrong-scope bookings stay liabilities',() => {
  const claim = (id: string,holder: string,scope: string,amount: number): QuantityClaim => ({ id,owner: 'remote',holder,scope,expiresAt: 20,allocations: [{ pool: 'home-capacity',amount },{ pool: 'request:'+id,amount }] });
  const claims = [claim('a','a','task:a',32),claim('b','b','task:b',56),claim('foreign','other','task:other',10),claim('old','a','old-scope',4),{ ...claim('expired','old','old',100),expiresAt: 10 }];
  const result = partitionQuantityClaims(claims,10,[{ owner: 'remote',holder: 'a',scope: 'task:a' },{ owner: 'remote',holder: 'b',scope: 'task:b' }],['home-capacity']);
  expect(result.pools).toEqual([{ pool: 'home-capacity',owned: 88,external: 14 }]);
  expect(result.owned.map(claim => claim.id)).toEqual(['a','b']); expect(result.external.map(claim => claim.id)).toEqual(['foreign','old']);
  result.owned[0]!.allocations[0]!.amount = 0; expect(claims[0]!.allocations[0]!.amount).toBe(32);
  expect(() => partitionQuantityClaims([...claims,claims[0]!],10,[],[])).toThrow('partition input');
});
