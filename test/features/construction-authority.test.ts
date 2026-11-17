import { expect, test } from 'vitest';
import { constructionAuthority } from '../../src/features/construction/authority';
const room = { room: 'W1N1', visible: true, owned: false };
const policy = { rooms: ['W1N1'], username: 'eldrift' };
test('remote approval permits only infrastructure without foreign ownership or reservation', () => {
  expect(constructionAuthority(room).allowed).toBe(false);
  expect(constructionAuthority(room, policy, 'road').allowed).toBe(true);
  expect(constructionAuthority({ ...room, reservation: 'eldrift' }, policy, 'container').allowed).toBe(true);
  expect(constructionAuthority(room, policy, 'spawn').reason).toBe('remote-structure-type');
  expect(constructionAuthority({ ...room, owner: 'other' }, policy, 'road').allowed).toBe(false);
  expect(constructionAuthority({ ...room, reservation: 'other' }, policy, 'road').allowed).toBe(false);
  expect(constructionAuthority({ ...room, visible: false }, policy, 'road').allowed).toBe(false);
  expect(constructionAuthority({ ...room, owned: true }, undefined, 'spawn').allowed).toBe(true);
});
