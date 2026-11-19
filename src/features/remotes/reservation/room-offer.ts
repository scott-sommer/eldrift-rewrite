import { copyPlain } from '../../../persistence/plain-data';
import type { RemoteRoomCandidate } from '../management/model';
import type { RemoteRoomOffer, RemoteRoomCommitment } from '../portfolio-model';
import type { RemoteEconomicPolicy } from '../assessment-model';
export function createRemoteRoomOffer(candidate: RemoteRoomCandidate, sourceIds: string[]): RemoteRoomOffer {
  const offer: RemoteRoomOffer = { room: candidate.room,sourceIds: [...sourceIds],quotes: [],commitment: copyPlain(candidate.commitment) };
  if (candidate.reservation === undefined) return offer;
  if (candidate.reservation === null) return { ...offer,reservation: null };
  const quote = copyPlain(candidate.reservation);
  return { ...offer,reservation: { quote,baseCommitment: offer.commitment },commitment: reservationCommitment(offer.commitment,quote.commitment) };
}
export function reservationCommitment(base: RemoteRoomCommitment, reserve: RemoteRoomCommitment): RemoteRoomCommitment {
  return { atomic: base.atomic,slots: base.slots+reserve.slots,energyPerTick: base.energyPerTick+reserve.energyPerTick,spawnLoad: base.spawnLoad+reserve.spawnLoad };
}
export function reservationSourcePolicy(policy: RemoteEconomicPolicy, explicit: boolean): RemoteEconomicPolicy {
  return explicit ? { ...policy,reservation: { energyPerTick: 0,spawnLoad: 0,shares: 1 } } : policy;
}
