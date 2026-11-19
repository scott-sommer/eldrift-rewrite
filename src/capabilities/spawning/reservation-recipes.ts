import { bodyPlan } from './body';
import type { BodyPart } from './body';
/** Selective legacy CLAIM/MOVE ratio; reject MOVE-only and single-CLAIM automatic reservation bodies. */
export function bufferedReserver(budget: number, claims: number) {
  if (!Number.isSafeInteger(claims) || claims < 2 || claims > 8) throw new Error('Invalid buffered CLAIM count');
  const parts: BodyPart[] = [...Array<BodyPart>(claims).fill('claim'),...Array<BodyPart>(claims).fill('move')];
  return bodyPlan(parts,budget);
}
