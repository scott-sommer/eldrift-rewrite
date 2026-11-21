import { copyPlain } from '../../../../core/plain-data';
import { StartupCheckpointCapacityError } from '../checkpoints/capacity';
import { validateEnergyLayout, validateEnergyEvent, energyLayoutIdentity, energyNatural } from './validation';
import type { StartupEnergyLayout, StartupEnergyCheckpoint, StartupEnergyEvent } from './model';
export function createStartupEnergyLedger(input: StartupEnergyLayout, checkpoint?: StartupEnergyCheckpoint) {
  validateEnergyLayout(input); return new EnergyLedger(copyPlain(input),checkpoint);
}
interface EnergyDebit { id: string; energy: number }
class EnergyLedger {
  private readonly points;
  private readonly orders;
  private readonly events: StartupEnergyEvent[] = [];
  private readonly charged = new Set<string>();
  private readonly binding: string;
  constructor(private readonly input: StartupEnergyLayout, checkpoint?: StartupEnergyCheckpoint) {
    this.binding = energyLayoutIdentity(input);
    this.points = new Map(input.structures.map(point => [point.id,{ ...point }]));
    this.orders = new Map(input.orders.map(order => [order.spawn,[...order.structures]]));
    if (checkpoint !== undefined) this.restore(copyPlain(checkpoint));
  }
  available(): number { return [...this.points.values()].reduce((sum,point) => sum+point.energy-(point.reservedEnergy ?? 0),0); }
  charge(spawn: string, energy: number, tick: number, holder: string): boolean {
    const event: StartupEnergyEvent = { kind: 'charge',spawn,energy,tick,holder }; this.validateNext(event);
    if (this.charged.has(holder)) throw new Error('Duplicate energy charge holder');
    const order = this.orders.get(spawn); if (!order) throw new Error('Unknown energy charge origin');
    const debits = this.planDebits(order,energy);
    if (!debits) return false;
    for (const debit of debits) this.points.get(debit.id)!.energy -= debit.energy;
    this.events.push(event); this.charged.add(holder); return true;
  }
  private planDebits(order: readonly string[], energy: number): EnergyDebit[] | undefined {
    const debits: EnergyDebit[] = []; let remaining = energy;
    for (const id of order) {
      const point = this.points.get(id)!, amount = Math.min(remaining,point.energy);
      if (amount > point.energy-(point.reservedEnergy ?? 0)) return undefined;
      if (amount) debits.push({ id,energy: amount }); remaining -= amount;
      if (!remaining) break;
    }
    return remaining ? undefined : debits;
  }
  deposit(structure: string, maximum: number, tick: number, holder: string): number {
    if (!energyNatural(maximum)) throw new Error('Invalid energy deposit');
    const point = this.points.get(structure); if (!point) throw new Error('Unknown energy deposit structure');
    const energy = Math.min(maximum,point.capacity-point.energy-(point.reservedCapacity ?? 0));
    if (!energy) return 0;
    const event: StartupEnergyEvent = { kind: 'deposit',structure,energy,tick,holder }; this.validateNext(event);
    point.energy += energy; this.events.push(event); return energy;
  }
  checkpoint(): StartupEnergyCheckpoint {
    const saved: StartupEnergyCheckpoint = { format: 1,binding: this.binding,points: [...this.points.values()].map(point => ({ id: point.id,energy: point.energy })),events: copyPlain(this.events) };
    if (JSON.stringify(saved).length > 1048576) throw new StartupCheckpointCapacityError('Energy checkpoint capacity');
    return saved;
  }
  result() {
    return { available: this.available(),charged: this.events.filter(event => event.kind === 'charge').reduce((sum,event) => sum+event.energy,0),
      deposited: this.events.filter(event => event.kind === 'deposit').reduce((sum,event) => sum+event.energy,0),points: [...this.points.values()].map(point => ({ id: point.id,energy: point.energy })) };
  }
  private validateNext(event: StartupEnergyEvent): void {
    validateEnergyEvent(event);
    if (this.events.length >= 8192) throw new StartupCheckpointCapacityError('Energy event capacity');
    const last = this.events.at(-1); if (!last) return;
    if (event.tick < last.tick || event.tick === last.tick && last.kind === 'deposit' && event.kind === 'charge') throw new Error('Energy frame phase order');
  }
  private restore(saved: StartupEnergyCheckpoint): void {
    if (saved.format !== 1 || saved.binding !== this.binding || !Array.isArray(saved.events) || saved.events.length > 8192) throw new Error('Invalid energy checkpoint binding');
    if (JSON.stringify(saved).length > 1048576) throw new StartupCheckpointCapacityError('Energy checkpoint capacity');
    for (const event of saved.events) this.replay(event);
    this.validateSavedPoints(saved);
  }
  private replay(event: StartupEnergyEvent): void {
    validateEnergyEvent(event);
    if (event.kind === 'charge') {
      if (!this.charge(event.spawn,event.energy,event.tick,event.holder)) throw new Error('Unfunded energy history');
    } else if (this.deposit(event.structure,event.energy,event.tick,event.holder) !== event.energy) throw new Error('Overfilled energy history');
  }
  private validateSavedPoints(saved: StartupEnergyCheckpoint): void {
    const expected = new Map(this.result().points.map(point => [point.id,point.energy]));
    if (!Array.isArray(saved.points) || saved.points.length !== expected.size || new Set(saved.points.map(point => point.id)).size !== saved.points.length || !saved.points.every(point => expected.get(point.id) === point.energy)) throw new Error('Energy checkpoint conservation');
  }
}
