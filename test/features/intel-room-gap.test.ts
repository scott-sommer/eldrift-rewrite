import { expect, test } from 'vitest';
import { pathableIntelRoomGap } from '../../src/features/intel/room-gap';
import type { IntelGapRequest } from '../../src/features/intel/room-gap';
import { intelSchema } from '../../src/features/intel/schema';
function setup() {
  const rooms: Record<string, string[]> = { E0S0: ['E1S0','E0S1'], E1S0: ['E1S1'], E0S1: ['E1S1'], E1S1: [] };
  const ports = { exits: (room: string) => rooms[room], intel: (room: string) => intelSchema(room).initial(),
    status: () => 'normal' as const };
  const request: IntelGapRequest = { origin: 'E0S0', destination: 'E1S1', tick: 10, budget: { depth: 4, reads: 16 },
    policy: { mode: 'exploration', username: 'bot', allies: [], blockedRooms: [], avoidUntil: {}, allowKeeper: false,
      maximumAge: 2, maximumRooms: 16, unknownCost: 8, staleCost: 4, keeperCost: 25 } };
  return { ports, request };
}

test('unknown exploration route retains real hops and explicitly requests refresh', () => {
  const { ports, request } = setup();
  expect(pathableIntelRoomGap(request, ports)).toMatchObject({ status: 'found', exact: true, gap: 1,
    confidence: 'uncertain', route: ['E0S0','E0S1','E1S1'], refreshRooms: ['E0S1','E1S1'] });
});

test('policy assessment exhaustion cannot masquerade as an unreachable or blocked destination', () => {
  const { ports, request } = setup();
  request.policy.maximumRooms = 0;
  expect(pathableIntelRoomGap(request, ports)).toMatchObject({ status: 'unavailable', reason: 'room-budget' });
  request.policy.maximumRooms = 1;
  expect(pathableIntelRoomGap(request, ports)).toMatchObject({ status: 'unavailable', reason: 'room-budget' });
});

test('a found route after incomplete policy assessment is an upper bound, never certified minimal', () => {
  const { ports, request } = setup();
  request.policy.maximumRooms = 3;
  const original = ports.exits;
  ports.exits = room => room === 'E0S0' ? ['E0N0','E0S1','E1S0'] : room === 'E0N0' ? [] : original(room);
  expect(pathableIntelRoomGap(request, ports)).toMatchObject({ status: 'found', exact: false,
    confidence: 'uncertain', route: ['E0S0','E0S1','E1S1'] });
});

test('guard refusal remains admission failure even when it first prevents destination assessment', () => {
  const { ports, request } = setup();
  expect(pathableIntelRoomGap(request, ports, () => false)).toMatchObject({ status: 'unavailable', reason: 'admission' });
});

test('known-safe requests cannot consume an unknown exploration path as established reachability', () => {
  const { ports, request } = setup();
  request.policy.mode = 'known-safe';
  expect(pathableIntelRoomGap(request, ports)).toMatchObject({ status: 'unavailable', reason: 'blocked-destination' });
});
