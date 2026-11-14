export interface UnitObservation {
  readonly id: string;
  readonly owner: string;
  readonly owned: boolean;
}
export interface StructureObservation {
  readonly id: string;
  readonly type: string;
  readonly owned: boolean;
}
export interface RoomObservation {
  readonly name: string;
  readonly owned: boolean;
  readonly units: readonly UnitObservation[];
  readonly structures: readonly StructureObservation[];
}
export interface ObservationSource {
  visibleRooms(): readonly string[];
  observeRoom(name: string): RoomObservation;
}
export interface RoomView extends RoomObservation {
  readonly ownUnits: readonly UnitObservation[];
  readonly allies: readonly UnitObservation[];
  readonly threats: readonly UnitObservation[];
  readonly structuresByType: ReadonlyMap<string, readonly StructureObservation[]>;
}
export interface ObservationFailure {
  readonly room: string;
  readonly error: unknown;
}
export interface TickView {
  readonly tick: number;
  readonly rooms: ReadonlyMap<string, RoomView>;
  readonly ownedRooms: readonly RoomView[];
  readonly failures: readonly ObservationFailure[];
}
