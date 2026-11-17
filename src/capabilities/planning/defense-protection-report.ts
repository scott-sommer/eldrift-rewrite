import { defenseSeparation } from './defense-separation';
import type { DefenseSeparationInput } from './defense-separation';
export interface ProtectionDecision { id: string; reason: string }
/** Every exposed asset needs an explicit policy decision; reports retain exemptions even if naturally safe. */
export function defenseProtectionReport(input: DefenseSeparationInput, exemptions: readonly ProtectionDecision[]) {
  const ids = new Set(input.assets.map(asset => asset.id)), exempt = new Map<string, string>();
  for (const item of exemptions) {
    if (!ids.has(item.id) || exempt.has(item.id) || !item.reason.trim()) throw new Error('Invalid protection exemption');
    exempt.set(item.id, item.reason);
  }
  const separation = defenseSeparation(input), exposed = new Set(separation.exposed);
  const protectedAssets = input.assets.filter(asset => !exposed.has(asset.id)).map(asset => asset.id).sort();
  const uncovered = separation.exposed.filter(id => !exempt.has(id));
  const intentionallyUnprotected = [...exempt].sort(([a], [b]) => a < b ? -1 : Number(a > b))
    .map(([id, reason]) => ({ id, reason, exposed: exposed.has(id) }));
  return { protectedAssets, uncovered, intentionallyUnprotected, acceptable: uncovered.length === 0 };
}
