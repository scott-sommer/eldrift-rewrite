export interface CorpsePart { cost: number; boost?: string }
export interface CorpseSalvageRules { dropRate: number; ticksToLive: number; lifetime: number; maximumPartEnergy: number; boostEnergy: number; boostMineral: number }
/** Native corpse material floors each resource after summing all parts, including damaged parts. */
export function corpseSalvage(parts: readonly CorpsePart[],rules: CorpseSalvageRules): Record<string,number> {
  validate(parts,rules);
  const rate = rules.dropRate*rules.ticksToLive/rules.lifetime,resources = new Map<string,number>([['energy',0]]);
  for (const part of parts) {
    if (part.boost) {
      resources.set(part.boost,(resources.get(part.boost) ?? 0)+rules.boostMineral*rate);
      resources.set('energy',resources.get('energy')!+rules.boostEnergy*rate);
    }
    resources.set('energy',resources.get('energy')!+Math.min(rules.maximumPartEnergy,part.cost*rate));
  }
  return Object.fromEntries([...resources].map(([resource,amount]) => [resource,Math.floor(amount)]));
}
function validate(parts: readonly CorpsePart[],rules: CorpseSalvageRules): void {
  if (parts.length < 1 || parts.length > 50 || parts.some(part => !quantity(part.cost))) throw new Error('Invalid corpse body');
  if (![rules.ticksToLive,rules.lifetime,rules.maximumPartEnergy,rules.boostEnergy,rules.boostMineral].every(quantity) || rules.lifetime < 1 || rules.ticksToLive > rules.lifetime) throw new Error('Invalid corpse quantities');
  if (!Number.isFinite(rules.dropRate) || rules.dropRate < 0 || rules.dropRate > 1) throw new Error('Invalid corpse rate');
}
function quantity(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000000; }
