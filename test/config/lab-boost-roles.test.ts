import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
test('boost role targets validate bounds and identity, snapshot deeply, and default empty',() => {
  expect(resolveConfig({},1).values.labBoostRoles).toEqual([]);
  const roles = [{ lab: 'lab',resource: 'XGH2O',mineral: 60,energy: 40 }];
  const config = resolveConfig({ roomOverride: { labBoostRoles: roles } },1); roles[0]!.mineral = 99;
  expect(config.values.labBoostRoles[0]!.mineral).toBe(60); expect(Object.isFrozen(config.values.labBoostRoles[0])).toBe(true);
  for (const bad of [[...roles,...roles],[{ ...roles[0],mineral: 3001 }],[{ ...roles[0],energy: 2001 }],[{ ...roles[0],unknown: 1 }]]) expect(() => resolveConfig({ empire: { labBoostRoles: bad } },1)).toThrow('invalid');
});
