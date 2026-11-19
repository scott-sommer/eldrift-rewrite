export interface RemoteCapacityRecord { home: string; revision: number; clock: number; supported: number; evaluatedAt: number | null; observedLoad: number | null }
export interface RemoteCapacityPolicy { initial: number; maximum: number; interval: number; increaseAt: number; decreaseAt: number }
