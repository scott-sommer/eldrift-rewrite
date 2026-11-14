import { range } from './model';
import type { LinkView, LinkRoom, LinkRoles } from './model';
/** Stable geometry classification; source links cannot also be storage/controller endpoints. */
export function classifyLinks(links: readonly LinkView[], room: LinkRoom): LinkRoles {
  const ordered = [...links].filter(link => link.active).sort((a, b) => a.id.localeCompare(b.id));
  const inputs = ordered.filter(link => room.sources.some(source => range(source, link.position) <= 2));
  const remaining = ordered.filter(link => !inputs.includes(link));
  const storage = room.storage ? remaining.filter(link => range(room.storage!, link.position) <= 3)
    .sort((a, b) => range(room.storage!, a.position) - range(room.storage!, b.position) || a.id.localeCompare(b.id))[0] : undefined;
  const controllers = remaining.filter(link => link !== storage && room.controller !== undefined && range(room.controller, link.position) < 3);
  const relays = remaining.filter(link => link !== storage && !controllers.includes(link));
  return { inputs, controllers, relays, ...(storage ? { storage } : {}) };
}
