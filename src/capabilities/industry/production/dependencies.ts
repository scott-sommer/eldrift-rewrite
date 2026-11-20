import type { ProductionInventory, ProductionOptions, ProductionStep, RecipeLookup } from './model';
/** One speculative ledger per attempt; failed dependency walks never consume real inventory. */
export class ProductionDependencies {
  private readonly stock = new Map<string,number>();
  private readonly debt = new Map<string,number>();
  private first: ProductionStep | null = null;
  constructor(private readonly root: string,private readonly inventory: ProductionInventory,private readonly reserve: number,private readonly unit: number,
    private readonly recipe: RecipeLookup,private readonly budget: { remaining: number }) {}
  plan(amount: number): ProductionStep | null { return this.produce(this.root,amount,[]) ? this.first : null; }
  private produce(product: string,amount: number,path: readonly string[]): boolean {
    this.visit(product,path);
    const reagents = this.recipe(product);
    if (!reagents) return false;
    const next = [...path,product];
    if (!reagents.every(resource => this.acquire(resource,amount,next))) return false;
    this.first ??= { root: this.root,product,reagents: [...reagents],target: (this.inventory.total[product] ?? 0)+amount };
    return true;
  }
  private acquire(resource: string,amount: number,path: readonly string[]): boolean {
    const available = this.available(resource), taken = Math.min(available,amount), missing = amount-taken;
    this.stock.set(resource,available-taken);
    if (!missing) return true;
    const debt = this.reserveDebt(resource), produced = Math.ceil((missing+debt)/this.unit)*this.unit;
    if (!this.produce(resource,produced,path)) return false;
    this.debt.set(resource,0); this.stock.set(resource,produced-missing-debt);
    return true;
  }
  private available(resource: string): number {
    if (!this.stock.has(resource)) this.stock.set(resource,Math.max(0,(this.inventory.available[resource] ?? 0)-this.floor(resource)));
    return this.stock.get(resource)!;
  }
  private reserveDebt(resource: string): number {
    if (!this.debt.has(resource)) this.debt.set(resource,Math.max(0,this.floor(resource)-(this.inventory.available[resource] ?? 0)));
    return this.debt.get(resource)!;
  }
  private floor(resource: string): number { return this.reserve+(this.inventory.reserveGap[resource] ?? 0); }
  private visit(product: string,path: readonly string[]): void {
    if (path.includes(product)) throw new Error('Cyclic reaction dependency');
    if (path.length >= 16 || this.budget.remaining-- <= 0) throw new Error('Lab production planning budget exhausted');
  }
}
function integer(value: number,minimum: number,maximum: number): boolean { return Number.isSafeInteger(value) && value >= minimum && value <= maximum; }
export function validateProductionOptions(options: ProductionOptions): void {
  if (!integer(options.reactionAmount,1,3000)) throw new Error('Invalid reaction unit');
  if (!integer(options.batch,options.reactionAmount,3000)) throw new Error('Invalid production batch');
  if (!integer(options.inputReserve,0,1000000)) throw new Error('Invalid production reserve');
  if (!integer(options.maximumNodes,1,10000)) throw new Error('Invalid production budget');
}
