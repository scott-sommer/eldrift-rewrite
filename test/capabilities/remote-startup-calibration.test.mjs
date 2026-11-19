import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { forecastSelfBuild } from '../../src/capabilities/economy/startup/self-build';
import { forecastStartupCash } from '../../src/capabilities/economy/startup/cash';
const rows = readFileSync(new URL('../../docs/evidence/remote-bootstrap-rows.jsonl',import.meta.url),'utf8').trim().split('\n').map(line => JSON.parse(line));
test('build forecast reproduces archived native progress, cargo and regeneration checkpoints',() => {
  const checkpoints = new Set([35,36,37,39,334,335,336,634,635,934,935,1234,1235,1284,1285]);
  for (const row of rows.filter(row => checkpoints.has(row.tick))) {
    const forecast = forecastSelfBuild({ remainingProgress: 5000,carriedEnergy: 0,carryCapacity: 50,harvestPower: 8,buildPower: 20,maximumTicks: row.tick-35,
      source: { energy: 1500,capacity: 1500,regenerationTicks: 300,regenerationIn: null } });
    expect(forecast.sourceEnergy,'source stock at '+row.tick).toBe(row.sourceEnergy);
    expect(forecast.carriedEnergy,'miner cargo at '+row.tick).toBe(row.units.find(unit => unit.kind === 'miner').cargo);
    expect(forecast.constructionEnergy,'site progress at '+row.tick).toBe(row.sites[0]?.progress ?? 5000);
  }
});
test('cash projection reconciles actual bootstrap births and confirmed receipts without charging self-build to home',() => {
  const flows = []; let birthCost = 0, credited = 0;
  for (const row of rows) {
    if (row.birthCost > birthCost) flows.push({ id: 'birth-'+row.tick,kind: 'birth',energy: row.birthCost-birthCost,firstTick: row.tick,interval: null,occurrences: 1 });
    if (row.credited > credited) flows.push({ id: 'delivery-'+row.tick,kind: 'delivery',energy: row.credited-credited,firstTick: row.tick,interval: null,occurrences: 1 });
    birthCost = row.birthCost; credited = row.credited;
  }
  const result = forecastStartupCash({ homeEnergy: rows[0].homeTotal,protectedEnergy: 0,horizon: rows.at(-1).tick,readyAt: 1285,selfHarvestedConstruction: 5000,flows });
  expect(result).toMatchObject({ endingEnergy: rows.at(-1).homeTotal,minimumEnergy: 350,requiredHomeEnergy: 950,birthEnergy: 950,deliveredEnergy: 288,homeConstructionEnergy: 0,firstDeliveryAt: 1303,firstRecoveryAt: null,constructionRecoveryMargin: -5662 });
});
