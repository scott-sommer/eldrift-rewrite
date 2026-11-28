import type { WorkProfile } from '../../capabilities/actions/work-profile';
/** Capture SDK opening availability before processor damage; bonuses include inactive WORK. */
export function nativeWorkProfile(body: readonly BodyPartDefinition[],action: 'repair' | 'build',power: number): WorkProfile {
  const work = body.filter(part => part.type === 'work');
  return { workParts: work.filter(part => part.hits > 0).length,boostBonuses: work.map(part => {
    if (!part.boost) return 0;
    const boost = BOOSTS.work[part.boost as keyof typeof BOOSTS.work];
    if (!boost) throw new Error('Unknown native WORK boost');
    const multiplier = action in boost ? (boost as Partial<Record<typeof action,number>>)[action] : undefined;
    return multiplier === undefined ? 0 : (multiplier-1)*power;
  }) };
}
