export interface RecoveryRoom { room: string; owned: boolean; level: number; energy: number }
export interface RecoveryDonor extends RecoveryRoom { distance: number }
export interface RecoverySupport { room: string; distance: number; requestedEnergy: number }
