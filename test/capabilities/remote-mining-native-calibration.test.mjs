import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { startupMiningFrame } from '../../src/capabilities/economy/startup/delivery-mining';
import { advanceStartupSource } from '../../src/capabilities/economy/startup/source';
const base = new URL('../../docs/evidence/',import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('remote-startup-runtime-native.json',base),'utf8'));
const run = manifest.runs.find(run => run.scenario === '--remote-startup-staged');
const raw = readFileSync(new URL(run.remoteStartup.rowsFile,base));
const rows = raw.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
const at = tick => rows.find(row => row.tick === tick);

test('station calibration is tied to clean native source and its immutable 5000-row archive',() => {
  expect(run.status).toBe('passed'); expect(run.provenance.dirty).toBe(false);
  expect(run.provenance.commit).toBe('1bb16a769c2c06b2ebfed75c2f18cb3f8cadfc21');
  expect(createHash('sha256').update(raw).digest('hex')).toBe(run.remoteStartup.rowsSha256);
  expect(rows).toHaveLength(5000);
});

test('native 4-WORK/CARRY50 station harvests full output, drops overflow and hands off before observed collection',() => {
  const first = at(1305), last = at(1322);
  const result = { source: { energy: first.source.energy,capacity: first.source.capacity,regenerationTicks: 300,regenerationIn: null },
    containerEnergy: 0,minerCargoEnergy: 0,harvestedEnergy: 0,overflowEnergy: 0,uncapturedOverflowEnergy: 0 };
  const wave = { request: 'native-miner',startAt: 1305,endAt: 1340,carryCapacity: 50,harvestPower: 8,buildPower: 20 };
  let observedCollection = 0;
  for (let tick = first.tick; tick < last.tick; tick++) {
    const before = at(tick), after = at(tick+1);
    const deposit = startupMiningFrame(result,wave,tick,2000);
    // Replay observed courier collection only; this does not predict native courier/task travel timing.
    const collected = after.units.filter(unit => unit.family === 'courier').reduce((sum,unit) => {
      const previous = before.units.find(value => value.name === unit.name);
      return sum+Math.max(0,unit.cargo-(previous?.cargo ?? 0));
    },0);
    expect(result.containerEnergy,'pre-frame container can fund collection at '+tick).toBeGreaterThanOrEqual(collected);
    result.containerEnergy -= collected; observedCollection += collected;
    result.containerEnergy += deposit; advanceStartupSource(result.source,1);
    expect(result.source.energy,'source stock at '+after.tick).toBe(after.source.energy);
    expect(result.minerCargoEnergy,'miner CARRY at '+after.tick).toBe(after.units.find(unit => unit.family === 'miner').cargo);
  }
  expect(result).toMatchObject({ harvestedEnergy: 120,overflowEnergy: 12,uncapturedOverflowEnergy: 0,containerEnergy: 0,minerCargoEnergy: 8 });
  expect(observedCollection).toBe(112);
  expect(result.harvestedEnergy).toBe(observedCollection+result.containerEnergy+result.minerCargoEnergy);
});
