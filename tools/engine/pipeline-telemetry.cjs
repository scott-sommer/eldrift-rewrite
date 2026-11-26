const assert = require('node:assert/strict');
function proofIdentity(proof) {
  if (!proof) return null;
  const { frames,events,...fixed } = proof;
  return JSON.stringify(fixed);
}
function validateRows(rows,tick,label,maximum) {
  assert.ok(Array.isArray(rows) && rows.length <= maximum,label+' must be a bounded array');
  assert.ok(rows.every(row => row && row.tick === tick),label+' has missing, duplicated or stale tick data');
}
/** Collect only passive fixture histories between completed ticks; never inject decisions or receipts. */
function createPipelineTelemetry(maximumTicks = 10000) {
  assert.ok(Number.isSafeInteger(maximumTicks) && maximumTicks > 0,'Invalid telemetry tick limit');
  const rows = [], frames = [], events = [], metrics = [];
  let lastTick = 0, identity = null, failedCapture = null;
  function drain(memory,tick) {
    assert.equal(memory.pipelineConfiguredMode,true,'External telemetry requires configured pipeline mode');
    assert.equal(tick,lastTick+1,'Telemetry tick gap or duplicate');
    assert.ok(tick <= maximumTicks,'Telemetry tick limit exceeded');
    validateRows(memory.pipelineRows,tick,'Pipeline rows',1);
    assert.equal(memory.pipelineRows.length,1,'Every completed tick needs its actual pipeline row');
    const proof = memory.pipelineCalibration, nextIdentity = proofIdentity(proof);
    if (identity !== null) assert.equal(nextIdentity,identity,'Calibration proof changed or disappeared');
    if (proof) {
      validateRows(proof.frames,tick,'Calibration frames',1);
      validateRows(proof.events,tick,'Calibration events',128);
    }
    rows.push(...memory.pipelineRows); memory.pipelineRows = [];
    if (proof) {
      frames.push(...proof.frames); events.push(...proof.events);
      proof.frames = []; proof.events = []; identity = nextIdentity;
    }
    lastTick = tick;
  }
  async function capture(server,bot,tick) {
    const raw = await bot.memory, memory = JSON.parse(raw);
    try {
      drain(memory,tick);
      const encoded = JSON.stringify(memory), { env } = server.common.storage;
      await env.set(env.keys.MEMORY+bot.id,encoded);
      metrics.push({ tick,memoryBeforeBytes: Buffer.byteLength(raw),memoryAfterBytes: Buffer.byteLength(encoded),
        rows: rows.length,frames: frames.length,events: events.length });
    } catch (error) { failedCapture = { tick,memory }; throw error; }
  }
  function restore(memory) {
    assert.deepEqual(memory.pipelineRows,[],'Final observations must be captured before reconstruction');
    assert.equal(proofIdentity(memory.pipelineCalibration),identity,'Final calibration proof changed');
    memory.pipelineRows = rows;
    if (memory.pipelineCalibration) {
      assert.deepEqual(memory.pipelineCalibration.frames,[]); assert.deepEqual(memory.pipelineCalibration.events,[]);
      memory.pipelineCalibration.frames = frames; memory.pipelineCalibration.events = events;
    }
  }
  function report() {
    const history = { pipelineRows: rows,frames,events };
    return { mode: 'external-fixture-history-v1',ticks: lastTick,externalBytes: Buffer.byteLength(JSON.stringify(history)),
      counts: { rows: rows.length,frames: frames.length,events: events.length },metrics,history,
      proof: identity === null ? null : JSON.parse(identity),failedCapture };
  }
  return { drain,capture,restore,report };
}
module.exports = { createPipelineTelemetry };
