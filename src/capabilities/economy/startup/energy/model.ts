export interface StartupEnergyStructure {
  id: string; kind: 'spawn' | 'extension'; energy: number; capacity: number; reservedEnergy?: number; reservedCapacity?: number;
}
export interface StartupEnergyRegeneration { eligibleSpawns: readonly string[]; otherRoomEnergy: number }
export interface StartupEnergyLayout { regeneration?: StartupEnergyRegeneration; structures: readonly StartupEnergyStructure[]; orders: readonly { spawn: string; structures: readonly string[] }[] }
export type StartupEnergyEvent =
  | { kind: 'charge'; holder: string; spawn: string; energy: number; tick: number }
  | { kind: 'ambient'; holder: string; structure: string; energy: number; tick: number }
  | { kind: 'deposit'; holder: string; structure: string; energy: number; tick: number };
export interface StartupEnergyCheckpoint { format: 1 | 2; ambientThrough?: number; binding: string; points: { id: string; energy: number }[]; events: StartupEnergyEvent[] }
