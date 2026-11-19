import type { RemoteManagementPorts, RemoteManagementRecord } from './model';
/** Reprice changed observations before replacing a managed lease; independent actor admission still fences work. */
export function managedSourceFactsChanged(record: RemoteManagementRecord, ports: RemoteManagementPorts, guard: () => boolean): boolean {
  for (const offer of record.offers.filter(offer => record.managed.some(item => item.room === offer.room))) {
    if (!guard()) return false;
    const summary = ports.summary(offer.room); if (!summary) continue;
    for (const quote of offer.quotes) {
      const expected = quote.assessment.sourceFacts, current = summary.sources.find(source => source.id === expected.id);
      if (current && (current.x !== expected.x || current.y !== expected.y || current.capacity !== expected.capacity)) return true;
    }
  }
  return false;
}
