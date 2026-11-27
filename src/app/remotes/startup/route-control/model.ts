import type { PaidCourierOpening } from '../motion-observation/opening-model';
import type { PaidUnitContext } from '../motion-observation/model';
import type { PaidCourierActiveRoute } from '../../../../features/remotes/startup/routes/model';
export type PaidRouteInspection = { status: 'ready'; opening: PaidCourierOpening; routeVersion: string; topologyVersion: string } | { status: 'deferred'; reason: string };
export type PaidRouteInspector = (context: PaidUnitContext,guard: () => boolean) => PaidRouteInspection;
export type PaidRouteControlResult = { status: 'ready'; revision: number; route: PaidCourierActiveRoute } | { status: 'deferred'; reason: string };
