export interface LogisticsRequest {
  id: string;
  owner: string;
  source: string;
  sink: string;
  resource: string;
  quantity: number;
  priority: number;
  expiresAt: number;
}
export function validateLogisticsRequest(request: LogisticsRequest): void {
  if (![request.id, request.owner, request.source, request.sink, request.resource]
    .every(value => typeof value === 'string' && value.length > 0)) throw new Error('Invalid logistics identity');
  if (request.source === request.sink) throw new Error('Logistics endpoints must differ');
  if (!Number.isSafeInteger(request.quantity) || request.quantity < 1) throw new Error('Invalid logistics quantity');
  if (!Number.isFinite(request.priority)) throw new Error('Invalid logistics priority');
  if (!Number.isSafeInteger(request.expiresAt) || request.expiresAt < 0) throw new Error('Invalid logistics expiry');
}
export function logisticsPool(kind: string, ...identity: string[]): string {
  return 'logistics:' + JSON.stringify([kind, ...identity]);
}
