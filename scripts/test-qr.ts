import assert from 'node:assert/strict';
import { createArtwork, verifyArtwork, type FlakeStyle } from '../lib/qr';
const links = ['https://example.com/', 'https://openai.com/', 'https://example.com/menu?table=12&location=seoul', 'https://example.com/눈송이?이름=겨울', 'https://example.com/' + 'long-path-'.repeat(25)];
for (const value of links) {
  for (const style of ['crystal', 'branch', 'stellar'] as FlakeStyle[]) {
    const started = Date.now();
    const art = createArtwork(value, style, 45, '#111216');
    assert.ok(art.verified);
    assert.ok(verifyArtwork(art, 7));
    assert.ok(art.svg.includes('fill="white"'));
    console.log(`${style} ${value.slice(0,45)}: decoded (${art.size} modules, strength ${art.strength}, ${Date.now()-started}ms)`);
  }
}
for (const detail of [0,100]) for (const color of ['#111216','#173864','#17473f']) {
  const art = createArtwork('https://example.org/snow', 'crystal', detail, color);
  assert.ok(verifyArtwork(art, 7));
}
assert.throws(() => createArtwork('', 'crystal', 45, '#111216'));
assert.throws(() => createArtwork('x'.repeat(601), 'crystal', 45, '#111216'));
console.log('All QR decoding checks passed.');
