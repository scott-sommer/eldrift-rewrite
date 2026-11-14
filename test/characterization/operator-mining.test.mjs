import { expect, test } from 'vitest';
import { legacy } from './legacy.mjs';
const quiet = { log() {} };
function flag(name) {
  return { name, pos: { x: 12, y: 14, roomName: 'W2N2' }, removed: false, remove() { this.removed = true; } };
}
const filter = (items, predicate) => Object.values(items).filter(predicate);

test('claim parser requires exact command and home; consumes only successful queue requests', () => {
  const flags = ['CreateRoom:W1N1:Override:AutoExpand', 'CreateRoom:', 'xCreateRoom:W1N1', 'CreateRoom:W3N3'].map(flag);
  const requests = [];
  const ctx = legacy(['processClaimFlags'], { _: { filter }, Game: { flags }, OK: 0, console: quiet,
    queueClaimIntent: (...args) => { requests.push(args); return args[0] === 'W1N1' ? 0 : -1; } });
  ctx.processClaimFlags();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(['W1N1', flags[0].pos, { override: true, auto: true, source: 'flag', targetRoomName: 'W2N2' }]);
  expect(flags.map(f => f.removed)).toEqual([true, false, false, false]);
});

test('mining flag stays pending without visibility and clears its cached path only on success', () => {
  const target = flag('Mine:W1N1');
  const scouts = [];
  let result = -1;
  const ctx = legacy(['processMiningFlags'], { _: { filter }, Game: { flags: [target] }, Memory: { paths: { [target.name]: ['cached'] } }, OK: 0, console: quiet,
    addSource: () => result, queueVisibilityScout: (...args) => { scouts.push(args); return true; } });
  ctx.processMiningFlags();
  expect(scouts).toEqual([['W1N1', 'W2N2']]);
  expect(target.removed).toBe(false);
  expect(ctx.Memory.paths[target.name]).toEqual(['cached']);
  result = 0;
  ctx.processMiningFlags();
  expect(target.removed).toBe(true);
  expect(ctx.Memory.paths[target.name]).toBeUndefined();
});

test('remote mining arrival is reported once and prevents an end-of-life failure', () => {
  const reports = [];
  const ctx = legacy(['isTrackedRemoteMiner', 'updateRemoteReachability'], { remoteManager: { recordRemoteMinerReachability: (...args) => reports.push(args) } });
  const creep = { memory: { role: 'miner', homeRoom: 'W1N1', assignedNode: { roomName: 'W2N2' }, sourceId: 'source-a' }, ticksToLive: 100 };
  ctx.updateRemoteReachability(creep, false);
  expect(reports).toEqual([]);
  ctx.updateRemoteReachability(creep, true);
  ctx.updateRemoteReachability(creep, true);
  creep.ticksToLive = 1;
  ctx.updateRemoteReachability(creep, false);
  expect(reports).toEqual([['W1N1', 'source-a', 'W2N2', true]]);
  expect(creep.memory.remoteReachabilityReported).toBe('success');
});

test('unreached dying remote miner reports failure once; local and mineral miners are excluded', () => {
  const reports = [];
  const ctx = legacy(['isTrackedRemoteMiner', 'updateRemoteReachability'], { remoteManager: { recordRemoteMinerReachability: (...args) => reports.push(args) } });
  const creep = { memory: { role: 'miner', homeRoom: 'W1N1', assignedNode: { roomName: 'W2N2' }, sourceId: 'source-a' }, ticksToLive: 1 };
  ctx.updateRemoteReachability(creep, false);
  ctx.updateRemoteReachability(creep, false);
  expect(reports).toHaveLength(1);
  expect(reports[0][3]).toBe(false);
  creep.memory.role = 'mineralMiner';
  expect(ctx.isTrackedRemoteMiner(creep)).toBe(false);
  creep.memory.role = 'miner';
  creep.memory.assignedNode.roomName = 'W1N1';
  expect(ctx.isTrackedRemoteMiner(creep)).toBe(false);
});
