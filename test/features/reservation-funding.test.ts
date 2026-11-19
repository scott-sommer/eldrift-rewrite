import { expect, test } from 'vitest';
import { allocateReservationBirths } from '../../src/features/remotes/reservation/funding';
test('new and replacement births share bank capital above reserve and prior queued demand',() => {
  const births = [{ owner: 'east',cost: 1300,needed: true },{ owner: 'north',cost: 1950,needed: true }];
  expect([...allocateReservationBirths(births,55000,50000,2000)]).toEqual(['east']);
  expect([...allocateReservationBirths(births,55000,50000,1750)]).toEqual(['east','north']);
  expect([...allocateReservationBirths(births,50000,50000,0)]).toEqual([]);
});
test('existing healthy service remains selected without spending another body budget',() => {
  const births = [{ owner: 'east',cost: 1300,needed: false },{ owner: 'north',cost: 1300,needed: true }];
  expect([...allocateReservationBirths(births,0,50000,100)]).toEqual(['east']);
  expect([...allocateReservationBirths(births,51300,50000,0)]).toEqual(['east','north']);
});
test('invalid or duplicate funding scopes fail instead of silently minting birth capacity',() => {
  expect(() => allocateReservationBirths([],NaN,0,0)).toThrow();
  expect(() => allocateReservationBirths([{ owner: 'same',cost: 1300,needed: true },{ owner: 'same',cost: 1,needed: true }],1,0,0)).toThrow();
});
