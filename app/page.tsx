'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Snowflake, Download, RotateCcw, Check, Link2, ChevronDown, Move3D, LoaderCircle } from 'lucide-react';
import type { FlakeStyle, QRArtwork } from '@/lib/qr';
const SnowScene = dynamic(() => import('@/components/SnowScene'), { ssr: false });

function FlakeIcon({ variant = 'crystal' }: { variant?: FlakeStyle }) {
  return <svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth={variant === 'stellar' ? 3.5 : 3} strokeLinejoin="miter">{Array.from({ length: 6 }, (_, i) => <g key={i} transform={`rotate(${i * 60} 50 50)`}><path d="M50 50V9M50 28L37 16M50 28L63 16M50 40L34 27M50 40L66 27" />{variant === 'crystal' && <path d="M50 9L44 17L50 24L56 17Z" />}{variant === 'stellar' && <path d="M50 36L37 35L38 47M50 36L63 35L62 47" />}</g>)}</g></svg>;
}

function destination(raw: string) {
  const input = raw.trim();
  if (!input) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || (!url.hostname.includes('.') && url.hostname !== 'localhost') || /\s/.test(input)) return '';
    return url.href;
  } catch { return ''; }
}

export default function Home() {
  const [value, setValue] = useState('https://example.com');
  const [style, setStyle] = useState<FlakeStyle>('crystal');
  const [detail, setDetail] = useState(45);
  const [color, setColor] = useState('#111216');
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [snow, setSnow] = useState(true);
  const [format, setFormat] = useState<'svg' | 'png'>('svg');
  const [resetKey, setResetKey] = useState(0);
  const [artwork, setArtwork] = useState<QRArtwork | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sequence = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalized = destination(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setSnow(false);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);
  useEffect(() => {
    setBusy(true); setError(''); setSaved(false);
    const id = ++sequence.current;
    if (!normalized) { setBusy(false); setError(value.trim() ? 'Enter a valid website link.' : 'Enter a link to create your QR.'); return; }
    let worker: Worker | undefined;
    const timer = setTimeout(() => {
      worker = new Worker(new URL('../lib/qr.worker.ts', import.meta.url));
      worker.onmessage = (event: MessageEvent<{ id: number; artwork?: QRArtwork; error?: string }>) => {
        if (event.data.id !== sequence.current) return;
        if (event.data.artwork) setArtwork(event.data.artwork);
        setError(event.data.error || ''); setBusy(false); worker?.terminate();
      };
      worker.onerror = () => { if (id === sequence.current) { setError('Could not generate this QR. Please try again.'); setBusy(false); } };
      worker.postMessage({ id, value: normalized, style, detail, color });
    }, 220);
    return () => { clearTimeout(timer); worker?.terminate(); };
  }, [normalized, style, detail, color, value]);

  async function download() {
    if (!artwork || busy || error || exporting) return;
    setExporting(true);
    try {
      let blob = new Blob([artwork.svg], { type: 'image/svg+xml' });
      if (format === 'png') {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1200;
        const context = canvas.getContext('2d')!;
        const src = URL.createObjectURL(blob);
        try {
          const img = new Image(); img.src = src; await img.decode(); context.drawImage(img, 0, 0, 1200, 1200);
          blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Export failed.')), 'image/png'));
        } finally { URL.revokeObjectURL(src); }
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `snowflake-qr.${format}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      setSaved(true); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => setSaved(false), 2500);
    } catch { setError('The download failed. Please try again.'); }
    finally { setExporting(false); }
  }

  return <div className="app-shell">
    <header className="header"><a className="brand" href="/" aria-label="Snowflake home"><Snowflake size={28} strokeWidth={1.7} /><span>Snowflake<span className="brand-dot">.</span></span></a><span className="studio-label">QR STUDIO <span>01</span></span></header>
    <main className="workspace">
      <aside className="settings" aria-label="QR settings">
        <div className="intro"><h1>Create your<br /> snowflake.</h1></div>
        <div className="field-group"><label htmlFor="destination">Destination</label><div className={`url-input ${error ? 'invalid' : ''}`}><Link2 size={17} /><input id="destination" type="url" value={value} onChange={e => setValue(e.target.value)} placeholder="https://your-website.com" aria-invalid={!!error} aria-describedby={error ? 'qr-error' : undefined} spellCheck={false} autoComplete="url" maxLength={600} /></div>{error && <p className="error" id="qr-error" role="alert">{error}</p>}</div>
        <fieldset className="field-group styles"><legend>Snowflake style</legend><div className="style-grid">{(['crystal', 'branch', 'stellar'] as FlakeStyle[]).map((item, index) => <button key={item} className={`style-option ${style === item ? 'selected' : ''}`} onClick={() => setStyle(item)} aria-pressed={style === item}><span className="style-number">0{index + 1}</span><FlakeIcon variant={item} /><span>{item[0].toUpperCase() + item.slice(1)}</span></button>)}</div></fieldset>
        <fieldset className="field-group"><legend>Ink color</legend><div className="color-row">{[{ color: '#111216', label: 'Black' }, { color: '#173864', label: 'Midnight' }, { color: '#17473f', label: 'Evergreen' }].map(item => <button key={item.color} className={`swatch ${color === item.color ? 'selected' : ''}`} aria-label={item.label} aria-pressed={color === item.color} title={item.label} onClick={() => setColor(item.color)} style={{ '--ink': item.color } as React.CSSProperties}>{color === item.color && <Check size={16} />}</button>)}<span className="color-name">{color === '#111216' ? 'Black' : color === '#173864' ? 'Midnight' : 'Evergreen'}</span></div></fieldset>
        <div className="field-group detail"><div className="label-row"><label htmlFor="detail">Detail</label><span>{detail}%</span></div><input id="detail" type="range" min="0" max="100" step="5" value={detail} onChange={e => setDetail(Number(e.target.value))} style={{ '--progress': `${detail}%` } as React.CSSProperties} /><div className="range-labels"><span>Simple</span><span>Intricate</span></div></div>
        <div className="export-block"><div className="label-row"><label htmlFor="format">Export format</label><span>{format === 'svg' ? 'Vector' : '1200 × 1200'}</span></div><div className="select-wrap"><select id="format" value={format} onChange={e => setFormat(e.target.value as 'svg' | 'png')}><option value="svg">SVG · Scales to any size</option><option value="png">PNG · High resolution</option></select><ChevronDown size={16} /></div><button className="download" disabled={!artwork || busy || !!error || exporting} onClick={download}>{busy || exporting ? <LoaderCircle className="spin" size={18} /> : saved ? <Check size={18} /> : <Download size={18} />}{busy ? 'Creating your QR' : saved ? 'Downloaded' : 'Save QR'}</button><p>Just your QR. No snow, no perspective.</p></div>
      </aside>
      <section className="preview-column" aria-label="QR preview">
        <div className="preview-panel"><div className="preview-heading"><span>YOUR SNOWFLAKE</span><span className="live-label"><span className={snow ? 'live-dot' : 'still-dot'} />{snow ? 'Live snowfall' : 'Clean preview'}</span></div>
          {artwork ? <SnowScene artwork={artwork} view={view} snow={snow} resetKey={resetKey} /> : <div className="initial-state"><Snowflake size={40} strokeWidth={1} className={busy ? 'gentle-spin' : ''} /><p>{error ? 'Your snowflake starts with a link.' : 'Creating your first snowflake…'}</p></div>}
          {busy && artwork && <div className="updating"><LoaderCircle size={14} className="spin" />Updating design</div>}
          <div className="canvas-footer"><span>{view === '3d' ? 'Drag to explore · arrow keys to rotate' : 'Top view · snow falls onto the QR surface.'}</span>{view === '3d' && <button className="reset" onClick={() => setResetKey(n => n + 1)} aria-label="Reset 3D view"><RotateCcw size={15} /></button>}</div>
        </div>
        <div className="preview-toolbar"><div className="view-control" role="group" aria-label="Preview view"><button aria-pressed={view === '2d'} className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}><span className="square-icon" />2D</button><button aria-pressed={view === '3d'} className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}><Move3D size={16} />3D</button></div><div className="toolbar-divider" /><button className="snow-control" onClick={() => setSnow(s => !s)} role="switch" aria-checked={snow} aria-label="Animated snowfall"><Snowflake size={17} /><span>Snow</span><span className={`toggle ${snow ? 'on' : ''}`}><span /></span></button><div className={`verification ${error ? 'invalid-status' : ''}`} role="status">{busy ? <><LoaderCircle size={14} className="spin" /><span>Checking QR</span></> : error ? <span>Check your link</span> : artwork && <><Check size={14} /><span>Scan checked</span></>}</div></div>
        <p className="preview-note">{artwork?.strength === 0 ? 'This link needs a plain QR to scan reliably. Try a shorter link for a snowflake.' : 'Snowflake detail adapts to keep your QR readable. Test with your camera before printing.'}</p>
      </section>
    </main>
    
  </div>;
}
