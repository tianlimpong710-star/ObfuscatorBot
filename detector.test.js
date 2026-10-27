const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { detectLuraphVersion, detectPrometheus, detectMoonsec, detectAny } = require('../src/detector');

const samples = [
  ['Luraph V14.7.txt', '14.7'],
  ['Luraph V14.8.txt', '14.8'],
  ['Luraph V14.9.txt', '14.9'],
  ['Luraph V15.0.txt', '15']
];
for (const [filename, expectedVersion] of samples) {
  test(`detects ${filename} as Luraph v${expectedVersion}`, () => {
    const fixtureName = filename.replace('Luraph V15.0.txt', 'luraph-v15.lua').replace('Luraph V14.7.txt', 'luraph-v14.7.lua').replace('Luraph V14.8.txt', 'luraph-v14.8.lua').replace('Luraph V14.9.txt', 'luraph-v14.9.lua');
    const source = fs.readFileSync(path.join(__dirname, 'fixtures', fixtureName), 'utf8');
    assert.deepEqual(detectLuraphVersion(source), { type: 'luraph', version: expectedVersion });
    assert.deepEqual(detectAny(source), { type: 'luraph', version: expectedVersion });
  });
}

test('detects headerless Luraph signature as version unknown', () => {
  assert.deepEqual(detectLuraphVersion('local s = LPH_ENCSTR("x")'), { type: 'luraph', version: 'unknown' });
});
test('detects Prometheus header', () => {
  assert.equal(detectPrometheus('-- Prometheus Obfuscator\nreturn {}'), true);
  assert.deepEqual(detectAny('-- Prometheus Obfuscator\nreturn {}'), { type: 'prometheus' });
});
test('detects MoonSec header', () => {
  assert.equal(detectMoonsec('-- MoonSec V3\nreturn {}'), true);
  assert.deepEqual(detectAny('-- MoonSec V3\nreturn {}'), { type: 'moonsec' });
});
test('does not label ordinary Lua as a supported obfuscator', () => {
  assert.equal(detectAny('local x = 1\nprint(x)'), null);
});
