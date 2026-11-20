import { createNativeIndustryOperator } from './app/native-industry-operator';
import { createNativeBot } from './app/native-bot';
export const loop = createNativeBot();

/** Screeps console: require('main').industry.boosts; state is read only when a command is invoked. */
export const industry = createNativeIndustryOperator();
