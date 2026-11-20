export interface ProductionTarget { product: string; amount: number; priority: number }
export interface ProductionInventory {
  total: Readonly<Record<string,number>>;
  available: Readonly<Record<string,number>>;
  reserveGap: Readonly<Record<string,number>>;
}
export interface ProductionStep { root: string; product: string; reagents: readonly [string,string]; target: number }
export interface ProductionOptions { batch: number; reactionAmount: number; inputReserve: number; maximumNodes: number }
export type RecipeLookup = (product: string) => readonly [string,string] | null;
