import type { MiningStation } from '../../capabilities/mining/station';
import type { Position } from '../../capabilities/movement/step';
import type { HaulingRoute } from '../../capabilities/logistics/demand';
export interface CourierRouteEndpoint { station: MiningStation; source: Position; sink: Position; production: number }
export interface CourierRoutePorts {
  travel(from: Position, to: Position, loaded: boolean): { ticks: number; arrival: Position } | undefined;
  replacement(to: Position): number | undefined;
}
/** Each source contributes its own complete round trip; failed searches never become zero-length routes. */
export function estimateCourierRoutes(endpoints: readonly CourierRouteEndpoint[], ports: CourierRoutePorts,
  serviceTicks: number, delayTicks: number) {
  const routes: HaulingRoute[] = [];
  const unavailable: string[] = [];
  let travelTicks = 0;
  for (const endpoint of endpoints) {
    const loaded = ports.travel(endpoint.source, endpoint.sink, true);
    const empty = loaded && ports.travel(loaded.arrival, endpoint.source, false);
    const replacement = ports.replacement(endpoint.source);
    if (!loaded || !empty || replacement === undefined) { unavailable.push(endpoint.station.id); continue; }
    routes.push({ id: endpoint.station.id, production: endpoint.production, outboundTicks: empty.ticks,
      loadedReturnTicks: loaded.ticks, serviceTicks, delayTicks });
    travelTicks = Math.max(travelTicks, replacement);
  }
  return { routes, travelTicks, unavailable };
}
