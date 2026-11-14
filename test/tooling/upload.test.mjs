import { expect, test } from 'vitest';
import { uploadRequest, sendUpload } from '../../tools/deploy/request.mjs';
const variables = { SCREEPS_LOCAL_TOKEN: 'fixture-token', SCREEPS_LOCAL_BRANCH: 'test' };
test('constructs an explicit local branch upload without exposing credentials in URL', () => {
  const request = uploadRequest('local', 'exports.loop = () => {};', variables);
  expect(request.url).toBe('http://127.0.0.1:21025/api/user/code');
  expect(JSON.parse(request.options.body).branch).toBe('test');
  expect(request.options.headers['X-Token']).toBe('fixture-token');
});
test('rejects unknown environments, missing configuration and nonlocal local targets', () => {
  expect(() => uploadRequest('other', '', variables)).toThrow('named environment');
  expect(() => uploadRequest('local', '', {})).toThrow('token and explicit');
  expect(() => uploadRequest('local', '', { ...variables, SCREEPS_LOCAL_URL: 'https://screeps.com' })).toThrow('loopback');
});
test('requires server acknowledgement and reports HTTP failure', async () => {
  const request = uploadRequest('local', '', variables);
  await expect(sendUpload(request, async () => ({ ok: false, status: 401 }))).rejects.toThrow('401');
  await expect(sendUpload(request, async () => ({ ok: true, json: async () => ({ error: 'failed' }) }))).rejects.toThrow('acknowledge');
  await expect(sendUpload(request, async () => ({ ok: true, json: async () => ({ ok: 1 }) }))).resolves.toEqual({ ok: 1 });
});
