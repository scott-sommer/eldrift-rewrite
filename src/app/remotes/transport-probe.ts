export type TransportProbe = (unit: string, phase: string) => void;
/** Synchronous diagnostic scope only; no state, clock, authority or admission decisions. */
export function createTransportProbe(trace?: TransportProbe) {
  let unit = '', phase = 'idle';
  function step<T>(name: string, work: () => T): T {
    if (!trace) return work();
    const previous = phase; phase = name; trace(unit,'transport:'+phase+':begin');
    try { return work(); } finally { trace(unit,'transport:'+phase+':end'); phase = previous; }
  }
  return { step,
    run<T>(name: string, work: () => T): T {
      if (!trace) return work();
      unit = name;
      try { return step('run',work); } finally { unit = ''; }
    },
    guard(admit: () => boolean): () => boolean {
      if (!trace) return admit;
      return () => { const allowed = admit(); if (!allowed) trace(unit,'transport:'+phase+':denied'); return allowed; };
    },
  };
}
