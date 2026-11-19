import { managementFixture } from './remote-management';
import { reservationQuote } from './reservation-quote';
import { createRemoteManagement } from '../../src/features/remotes/management/cycle';
import { reservationPlan } from '../../src/features/remotes/reservation/plan';
export function reservationManagementFixture() {
  const f = managementFixture(), quote = reservationQuote();
  f.request.policy.candidates[0]!.reservation = quote; f.request.policy.portfolio.maximumSlots = 10;
  for (const item of f.offer.quotes) item.assessment.policy.reservation = { energyPerTick: 0,spawnLoad: 0,shares: 1 };
  const manager = createRemoteManagement(f.state,'W0N1',{ ...f.ports,currentReservation: () => true });
  manager.advance(f.request,{ rooms: 1,sources: 2 },() => true);
  const lease = f.assignments.owner('E0N1',20)!, record = manager.read(), plan = reservationPlan(lease,record,20,100)!;
  return { ...f,quote,manager,lease,record,plan };
}
