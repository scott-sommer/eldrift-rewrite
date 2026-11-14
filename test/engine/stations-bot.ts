import { loop as botLoop } from '../../src/main';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
import { validateStation } from '../../src/capabilities/mining/station';
export function loop() {
  botLoop();
  const stations = observeMiningStations('W0N1', 'safe')!;
  stations.forEach(validateStation);
  const station = stations.find(item => item.position.x === 20 && item.position.y === 20)!;
  if (!station || !station.access.some(tile => tile.x === 21 && tile.y === 20)) throw new Error('Station access missing');
  if (!station.container) throw new Error('Station container missing');
  if (observeMiningStations('W50N50', 'unknown') !== undefined) throw new Error('Unseen room treated as empty');
}
