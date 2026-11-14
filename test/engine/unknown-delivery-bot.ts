import { loop as recoveryLoop } from './cargo-recovery-bot';
export function loop() { recoveryLoop(false, true, 2); }
