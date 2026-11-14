import type { StatePort } from '../../../persistence/versioned-state';
import { reconcileServiceRequest } from '../service-request';
import type { LinkService } from './service';
export function reconcileLinkService(state: StatePort, room: string, tick: number, desired: LinkService | undefined): void {
  reconcileServiceRequest(state, room, tick, 'link-service:' + room, 3, desired ? { ...desired, resource: 'energy' } : undefined);
}
