export function uploadRequest(environment, source, variables) {
  const profiles = {
    local: { origin: variables.SCREEPS_LOCAL_URL ?? 'http://127.0.0.1:21025', token: variables.SCREEPS_LOCAL_TOKEN, branch: variables.SCREEPS_LOCAL_BRANCH },
    live: { origin: 'https://screeps.com', token: variables.SCREEPS_LIVE_TOKEN, branch: variables.SCREEPS_LIVE_BRANCH },
  };
  const profile = profiles[environment];
  if (!profile) throw new Error('Select a named environment: local or live.');
  const url = new URL(profile.origin);
  if (environment === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Local profile must use a loopback host.');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid server URL.');
  if (!profile.token || !profile.branch || profile.branch.startsWith('$')) throw new Error('Set token and explicit existing branch for the selected environment.');
  return {
    url: new URL('/api/user/code', url).href,
    options: {
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json', 'X-Token': profile.token },
      body: JSON.stringify({ branch: profile.branch, modules: { main: source } }),
    },
  };
}

export async function sendUpload(request, transport = fetch) {
  const response = await transport(request.url, { ...request.options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Upload HTTP failure: ${response.status}`);
  const result = await response.json();
  if (result.error || result.ok !== 1) throw new Error('Server did not acknowledge upload.');
  return result;
}
