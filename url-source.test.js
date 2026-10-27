const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSourceUrl } = require('../src/url-source');

test('converts GitHub blob link to raw content URL', () => {
  assert.equal(normalizeSourceUrl('https://github.com/example/repo/blob/main/script.lua').href,
    'https://raw.githubusercontent.com/example/repo/main/script.lua');
});
test('converts Pastebin paste URL to raw URL', () => {
  assert.equal(normalizeSourceUrl('https://pastebin.com/AbCd1234').href,
    'https://pastebin.com/raw/AbCd1234');
});
test('converts Pastefy paste URL to raw URL', () => {
  assert.equal(normalizeSourceUrl('https://pastefy.app/AbCd1234').href,
    'https://pastefy.app/AbCd1234/raw');
});
test('rejects non-HTTPS URLs', () => {
  assert.throws(() => normalizeSourceUrl('http://pastebin.com/AbCd1234'), /HTTPS/);
});
test('rejects hosts outside the supported list', () => {
  assert.throws(() => normalizeSourceUrl('https://example.com/script.lua'), /Unsupported URL host/);
});
