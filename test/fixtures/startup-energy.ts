import type { StartupEnergyLayout } from '../../src/capabilities/economy/startup/energy/model';
export function startupEnergyLayout(): StartupEnergyLayout {
  return { structures: [{ id: 'spawn',kind: 'spawn',energy: 300,capacity: 300 },{ id: 'second',kind: 'spawn',energy: 100,capacity: 300 },
    { id: 'near',kind: 'extension',energy: 50,capacity: 50 },{ id: 'far',kind: 'extension',energy: 50,capacity: 50 }],
    orders: [{ spawn: 'spawn',structures: ['spawn','second','near','far'] },{ spawn: 'second',structures: ['second','spawn','far','near'] }] };
}
