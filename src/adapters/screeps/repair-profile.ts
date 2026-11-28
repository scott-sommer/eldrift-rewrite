import type { RepairProfile } from '../../capabilities/mining/repair-effect';
/** Profile the SDK opening body before processor damage; bonus parts include already damaged WORK. */
export function nativeRepairProfile(body: readonly BodyPartDefinition[]): RepairProfile {
  const work = body.filter(part => part.type === 'work');
  return { workParts: work.filter(part => part.hits > 0).length,boostBonuses: work.map(part => {
    if (!part.boost) return 0;
    const boost = BOOSTS.work[part.boost as keyof typeof BOOSTS.work];
    if (!boost) throw new Error('Unknown native repair boost');
    return 'repair' in boost ? (boost.repair-1)*100 : 0;
  }) };
}
