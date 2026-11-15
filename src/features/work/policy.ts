export type WorkerMode = 'builder' | 'fortifier' | 'upgrader';
export interface WorkPolicy {
  downgradeThreshold: number;
  criticalRepairFraction: number;
  routineRepairFraction: number;
  rampartHits: number;
  wallHits: number;
  barrierDistanceWeight: number;
  legacyFortificationCeiling?: number;
  allowUpgrade: boolean;
  allowMaxLevelUpgrade: boolean;
  constructionOrder: readonly string[];
}
export const defaultWorkPolicy: Readonly<WorkPolicy> = Object.freeze({
  downgradeThreshold: 5000, criticalRepairFraction: 0.2, routineRepairFraction: 0.8,
  rampartHits: 50000, wallHits: 50000, barrierDistanceWeight: 20000,
  allowUpgrade: true, allowMaxLevelUpgrade: true,
  constructionOrder: Object.freeze(['spawn', 'extension', 'tower', 'storage', 'container', 'road']),
});
export function validateWorkPolicy(policy: Readonly<WorkPolicy>): void {
  if (![policy.downgradeThreshold, policy.rampartHits, policy.wallHits, policy.barrierDistanceWeight]
    .every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid work policy bounds');
  if (![policy.criticalRepairFraction, policy.routineRepairFraction].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error('Invalid repair fraction');
  if (policy.criticalRepairFraction > policy.routineRepairFraction) throw new Error('Critical repair threshold exceeds routine threshold');
  if (policy.legacyFortificationCeiling !== undefined && (!Number.isFinite(policy.legacyFortificationCeiling) || policy.legacyFortificationCeiling < 0)) throw new Error('Invalid fortification ceiling');
  if (new Set(policy.constructionOrder).size !== policy.constructionOrder.length) throw new Error('Duplicate construction priority');
}
