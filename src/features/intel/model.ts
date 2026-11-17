export interface IntelPosition { x: number; y: number }
export interface IntelObject extends IntelPosition { id: string }
export interface IntelController extends IntelObject {
  level: number; owned: boolean; owner: string | null;
  reservation: { username: string; ticksToEnd: number } | null;
}
export interface IntelSource extends IntelObject { capacity: number }
export interface IntelMineral extends IntelObject { type: string }
export interface IntelStructure extends IntelObject { type: string; owner: string | null; owned: boolean; hostile: boolean }
export interface IntelUnit extends IntelObject { owner: string; owned: boolean; power: boolean }
export interface IntelExit { direction: 1 | 3 | 5 | 7; room: string }
export type IntelRoomStatus = 'normal' | 'closed' | 'novice' | 'respawn' | 'unknown';
export interface RoomSummary {
  room: string; observedAt: number; status: IntelRoomStatus; statusTimestamp: number | null;
  controller: IntelController | null; sources: IntelSource[]; mineral: IntelMineral | null;
  structures: IntelStructure[]; units: IntelUnit[]; exits: IntelExit[];
  highway: boolean; keeper: boolean; center: boolean;
}
export interface LegacyIntelRecord {
  lastSeen: number | null; owned: boolean; sourceIds: string[]; structureIds: string[]; hostileIds: string[];
}
export interface IntelFailure { id: string; tick: number; reason: string }
export interface IntelRecord extends LegacyIntelRecord {
  summary: RoomSummary | null; lastVisit: number | null; lastFailure: IntelFailure | null;
}
