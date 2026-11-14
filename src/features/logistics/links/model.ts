import type { Position } from '../../../capabilities/movement/step';
export interface LinkView { id: string; position: Position; energy: number; capacity: number; cooldown: number; active: boolean }
export interface LinkRoom { sources: readonly Position[]; storage?: Position; controller?: Position; storageEnergy: number }
export interface LinkRoles { inputs: readonly LinkView[]; storage?: LinkView; controllers: readonly LinkView[]; relays: readonly LinkView[] }
export interface LinkPolicy { controllerTrigger: number; storageAssistTrigger: number; relayTrigger: number; lossRatio: number }
export interface LinkTransfer { source: string; sink: string; amount: number; expectedReceived: number }
export const defaultLinkPolicy: Readonly<LinkPolicy> = Object.freeze({ controllerTrigger: 0.75, storageAssistTrigger: 0.5, relayTrigger: 500, lossRatio: 0.03 });
export function range(a: Position, b: Position): number {
  return a.room === b.room ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : Infinity;
}
