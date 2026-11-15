const assert = require('node:assert/strict');
function verifyLayoutPlacement(memory) {
  assert.equal(memory.layoutPlacement.length, 3);
  assert.deepEqual(memory.layoutPlacement[0], {
    predictedRoad: true, predictedExtension: false, extension: -7, road: 0,
  });
  for (const row of memory.layoutPlacement.slice(1)) {
    assert.deepEqual(row, { spawnPresent: true, roadSite: true, extensionSite: false });
  }
}
module.exports = { verifyLayoutPlacement };
