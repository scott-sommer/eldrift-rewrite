import { industry } from '../../src/main';
import { runBoosts } from './boost-cycle';
export function loop() { industry.labs.setReactionsPaused(true); runBoosts('coexist'); }
