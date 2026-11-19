import type { RemoteQuote } from '../portfolio-model';
import type { RemoteManagementPorts, RemoteManagementRequest } from './model';
import { remoteReservation } from '../reservation-view';
/** Refresh only separately admitted reservation duration; source production facts retain their measured age. */
export function refreshAdmittedReservations(quotes: RemoteQuote[], ports: RemoteManagementPorts, request: RemoteManagementRequest): RemoteQuote[] {
  if (!quotes.length) return quotes;
  const summary = ports.summary(quotes[0]!.assessment.room); if (!summary) return [];
  const reservation = { ...remoteReservation(summary,request.policy.traversal.username,request.tick),observedAt: request.tick };
  return quotes.map(quote => ({ assessment: { ...quote.assessment,reservation } }));
}
