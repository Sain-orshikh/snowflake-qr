import QRCode from 'qrcode';
import jsQR from 'jsqr';

export type FlakeStyle = 'crystal' | 'branch' | 'stellar';
export type QRArtwork = { svg: string; size: number; cells: number[]; reserved: number[]; lines: Segment[]; lineWidth: number; dotSize: number; color: string; value: string; strength: number; verified: boolean };
type Segment = [number, number, number, number];

function segments(size: number, style: FlakeStyle, detail: number): Segment[] {
  const out: Segment[] = [];
  const center = size / 2;
  const radius = size * (style === 'stellar' ? .34 : .38);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 - Math.PI / 2;
    const point = (x: number, y: number): [number, number] => [center + x * Math.cos(angle) - y * Math.sin(angle), center + x * Math.sin(angle) + y * Math.cos(angle)];
    const add = (a: [number, number], b: [number, number]) => out.push([...point(...a), ...point(...b)] as Segment);
    add([0, 0], [radius, 0]);
    const levels = detail > 65 ? [.32, .55, .76] : [.43, .70];
    for (const pos of levels) {
      const length = radius * (pos > .65 ? .20 : .28);
      for (const side of [-1, 1]) {
        add([radius * pos, 0], [radius * pos + length * .62, side * length * .78]);
      }
    }
    if (style === 'crystal') {
      add([radius * .76, 0], [radius * .88, radius * .10]);
      add([radius * .88, radius * .10], [radius, 0]);
      add([radius * .76, 0], [radius * .88, -radius * .10]);
      add([radius * .88, -radius * .10], [radius, 0]);
    }
    if (style === 'stellar') {
      add([radius * .40, 0], [radius * .30, radius * .32]);
      add([radius * .30, radius * .32], [radius * .62, radius * .36]);
    }
  }
  return out;
}

function distance(x: number, y: number, s: Segment) {
  const dx = s[2] - s[0], dy = s[3] - s[1];
  const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (y - s[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - s[0] - t * dx, y - s[1] - t * dy);
}

export function rasterize(cells: number[], size: number, scale = 5, color = '#111216') {
  const width = (size + 8) * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  const rgb = color.match(/[a-f\d]{2}/gi)!.map(h => parseInt(h, 16));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!cells[y * size + x]) continue;
    for (let py = 0; py < scale; py++) for (let px = 0; px < scale; px++) {
      const offset = (((y + 4) * scale + py) * width + (x + 4) * scale + px) * 4;
      data[offset] = rgb[0]; data[offset + 1] = rgb[1]; data[offset + 2] = rgb[2];
    }
  }
  return { data, width };
}

export function verifies(cells: number[], size: number, value: string, scale = 5, color = '#111216') {
  const { data, width } = rasterize(cells, size, scale, color);
  return jsQR(data, width, width, { inversionAttempts: 'dontInvert' })?.data === value;
}

export function renderArtwork(art: Omit<QRArtwork, 'svg' | 'verified'>, scale = 8) {
  const { size, cells, color, lines, lineWidth, dotSize, reserved } = art;
  const width = (size + 8) * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  const rgb = color.match(/[a-f\d]{2}/gi)!.map(h => parseInt(h, 16));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cell = cells[y * size + x];
    const protectedCell = reserved[y * size + x];
    const nearby = lines.filter(s => distance(x + .5, y + .5, s) < lineWidth + 1.3);
    for (let py = 0; py < scale; py++) for (let px = 0; px < scale; px++) {
      const xx = (px + .5) / scale, yy = (py + .5) / scale;
      const center = Math.abs(xx - .5) <= dotSize / 2 && Math.abs(yy - .5) <= dotSize / 2;
      let dark = !!cell;
      if (!protectedCell && !center) {
        const nearest = Math.min(...nearby.map(s => distance(x + xx, y + yy, s)));
        if (nearest < lineWidth + .55) dark = true;
        if (nearest < lineWidth) dark = false;
      }
      if (!dark) continue;
      const offset = (((y + 4) * scale + py) * width + (x + 4) * scale + px) * 4;
      data[offset] = rgb[0]; data[offset + 1] = rgb[1]; data[offset + 2] = rgb[2];
    }
  }
  return { data, width };
}

export function verifyArtwork(art: QRArtwork, scale = 8) {
  const { data, width } = renderArtwork(art, scale);
  return jsQR(data, width, width, { inversionAttempts: 'dontInvert' })?.data === art.value;
}

export function createArtwork(value: string, style: FlakeStyle, detail: number, color: string): QRArtwork {
  if (!value.trim()) throw new Error('Enter a link to create your QR.');
  if (new TextEncoder().encode(value).length > 600) throw new Error('Use a shorter link (up to 600 bytes).');
  if (!/^#[a-f0-9]{6}$/i.test(color)) throw new Error('Choose a valid color.');
  const base = QRCode.create(value, { errorCorrectionLevel: 'H' });
  const qr = QRCode.create(value, { errorCorrectionLevel: 'H', version: Math.max(6, base.version) });
  const size = qr.modules.size;
  const cells = Array.from(qr.modules.data);
  const reserved = cells.map((_, i) => Number(qr.modules.isReserved(Math.floor(i / size), i % size)));
  const art: QRArtwork = { svg: '', size, cells, reserved, lines: segments(size, style, detail), lineWidth: size * (.016 + detail / 24000), dotSize: .3, color, value, strength: 1, verified: false };
  // Small centers retain the encoded data inside the white snowflake.
  // Verify the actual decorated image, not just its underlying QR matrix.
  for (const dot of [.3, .4, .5, .6, .7, 1]) {
    art.dotSize = dot;
    if (verifyArtwork(art, 8) && verifyArtwork(art, 5)) { art.verified = true; break; }
  }
  if (!art.verified) throw new Error('Could not verify this QR. Try a shorter link.');
  art.strength = art.dotSize === 1 ? 0 : 1;
  const rect = (x: number, y: number, side = 1) => `M${(x + 4 + (1 - side) / 2).toFixed(3)},${(y + 4 + (1 - side) / 2).toFixed(3)}h${side}v${side}h-${side}z`;
  let basePath = '', dots = '', lightDots = '', protectedDark = '', protectedLight = '';
  cells.forEach((cell, i) => {
    const x = i % size, y = Math.floor(i / size);
    if (cell) { basePath += rect(x, y); dots += rect(x, y, art.dotSize); } else { lightDots += rect(x, y, art.dotSize); }
    if (reserved[i]) { if (cell) protectedDark += rect(x, y); else protectedLight += rect(x, y); }
  });
  const flake = art.lines.map(s => `M${s[0]+4},${s[1]+4}L${s[2]+4},${s[3]+4}`).join('');
  const total = size + 8;
  art.svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="white"/><path d="${basePath}" fill="${color}"/><path d="${flake}" fill="none" stroke="${color}" stroke-width="${(art.lineWidth + .55) * 2}" stroke-linecap="round"/><path d="${flake}" fill="none" stroke="white" stroke-width="${art.lineWidth * 2}" stroke-linecap="round"/><path d="${dots}" fill="${color}"/><path d="${lightDots}" fill="white"/><path d="${protectedLight}" fill="white"/><path d="${protectedDark}" fill="${color}"/></svg>`;
  return art;
}
