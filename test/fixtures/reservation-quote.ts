import { selectBufferedReservation } from '../../src/features/remotes/reservation/body-policy';
import type { ReservationQuote } from '../../src/features/remotes/reservation/model';
export function reservationQuote(home = 'W0N1', room = 'E0N1', observedAt = 15): ReservationQuote {
  const policy = { lifetime: 600,outboundTicks: 25,returnTicks: 25,replacementMargin: 25,reservePerClaim: 1,decayPerTick: 1,maximumReservation: 5000,minimumBufferTicks: 100 };
  const selected = selectBufferedReservation(1300,policy)!;
  return { status: 'quoted',...selected,policy,home,room,controller: { id: 'controller',position: { room,x: 25,y: 25 } },observedAt,
    travel: { status: 'complete',identity: JSON.stringify([home,room,'controller',25]),outboundTicks: 25,returnTicks: 25,rooms: [home,room],operations: 100,profile: 'balanced-claim-move' } };
}
