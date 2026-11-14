import { afterEach, expect, test, vi } from 'vitest';
import { createNativeControllerActions } from '../../src/adapters/screeps/controller-actions';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { cancelObsoleteUpgradeClaimers } from '../../src/app/native-upgrade-claim-demand';
import { upgradeClaimerOwner, upgradeClaimTarget } from '../../src/app/native-upgrade-claimer';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { defaults } from '../../src/config/model';
import type { Envelope } from '../../src/persistence/versioned-state';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const game = { time: 1, gcl: { level: 1 }, rooms: {} };
  for (const [name, value] of Object.entries({ Game: game, OK: 0, ERR_BUSY: -4, ERR_NOT_OWNER: -1, ERR_INVALID_TARGET: -7, ERR_GCL_NOT_ENOUGH: -15 })) vi.stubGlobal(name, value);
  const actions = () => createNativeControllerActions(state, createActionArbiter(() => game.time));
  return { state, game, actions };
}
test('controller admission survives reconstruction and reserves one available GCL slot', () => {
  const { game, actions } = fixture();
  const invoke = vi.fn(() => 0);
  const creep = { id: 'c', name: 'c', my: true, claimController: invoke } as unknown as Creep;
  const first = { id: 'target' } as StructureController;
  expect(actions().claim(creep, first, 'one')).toBe(0);
  expect(actions().claim(creep, first, 'two')).toBe(-4);
  expect(actions().claim({ ...creep, id: 'other', name: 'other' } as Creep, { id: 'other-target' } as StructureController, 'two')).toBe(-4);
  expect(invoke).toHaveBeenCalledTimes(1);
  game.time++;
  game.gcl.level = 0;
  expect(actions().claim(creep, first, 'one')).toBe(-15);
});
test('uncertain unclaim cannot repeat in the same tick and native rejection does not fake ownership change', () => {
  const { game, actions } = fixture();
  const unclaim = vi.fn(() => { throw new Error('uncertain'); });
  const controller = { id: 'target', my: true, unclaim } as unknown as StructureController;
  expect(() => actions().unclaim(controller, 'owner')).toThrow('uncertain');
  expect(actions().unclaim(controller, 'owner')).toBe(-4);
  expect(unclaim).toHaveBeenCalledTimes(1);
  game.time++;
  expect(actions().unclaim({ ...controller, my: false } as StructureController, 'owner')).toBe(-1);
});
test('unseen target cancellation respects lifecycle enablement, sponsor and unrelated owners', () => {
  const { state } = fixture();
  const queue = createSpawnQueue(state, 'W0N1');
  for (const [id, owner] of [['claim', upgradeClaimerOwner('E0N1')], ['other', 'ordinary']]) queue.submit({
    id: id!, name: id!, owner: owner!, room: 'W0N1', body: ['claim', 'move'], readyAt: 1, expiresAt: 100, priority: 10 });
  cancelObsoleteUpgradeClaimers(state, 'W0N1', () => ({ ...defaults, upgradeLifecycleEnabled: true, upgradeRoomSponsor: 'W0N1' }));
  expect(queue.list()).toHaveLength(2);
  cancelObsoleteUpgradeClaimers(state, 'W0N1', () => ({ ...defaults, upgradeLifecycleEnabled: true, upgradeRoomSponsor: 'W1N1' }));
  expect(queue.list().map(request => request.owner)).toEqual(['ordinary']);
  expect(upgradeClaimTarget(upgradeClaimerOwner('E0N1'))).toBe('E0N1');
  expect(upgradeClaimTarget('upgrade-claimer:bad')).toBeUndefined();
});

test('rejected native claims retain admission only for their tick and can retry without a success receipt', () => {
  const { game, actions } = fixture();
  const invoke = vi.fn().mockReturnValueOnce(-12).mockReturnValue(0);
  const creep = { id: 'c', name: 'c', my: true, claimController: invoke } as unknown as Creep;
  const controller = { id: 'target' } as StructureController;
  expect(actions().claim(creep, controller, 'owner')).toBe(-12);
  expect(actions().claim(creep, controller, 'owner')).toBe(-4);
  expect(invoke).toHaveBeenCalledTimes(1);
  game.time++;
  expect(actions().claim(creep, controller, 'owner')).toBe(0);
  expect(invoke).toHaveBeenCalledTimes(2);
});
