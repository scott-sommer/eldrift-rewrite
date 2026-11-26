import type { Position } from '../../capabilities/movement/step';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import { sameLogisticsService } from '../../capabilities/logistics/service';
import type { RemoteTransportSource } from './native-transport-sources';
export interface RemoteTransportService { station: Position; collection: Position; deposit: Position; endpoint: string }
export function selectedTransportSource(source: RemoteTransportSource, service?: RemoteTransportService): boolean {
  if (!service) return true;
  return !('resourceType' in source) && source.pos.roomName === service.station.room && source.pos.x === service.station.x && source.pos.y === service.station.y;
}
export function transportService(service: RemoteTransportService) {
  return { collection: { ...service.collection },deposit: { ...service.deposit },avoid: [{ ...service.station }] };
}
export function selectedTransportRequest(request: LogisticsRequest, service?: RemoteTransportService): boolean {
  return !service || request.sink === service.endpoint && sameLogisticsService(request.service,transportService(service));
}
