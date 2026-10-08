'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { QRArtwork } from '@/lib/qr';

type Props = { artwork: QRArtwork; view: '2d' | '3d'; snow: boolean; resetKey: number };

function artworkTexture(art: QRArtwork) {
  const canvas = document.createElement('canvas');
  const scale = 20;
  canvas.width = canvas.height = (art.size + 8) * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = art.color;
  art.cells.forEach((cell, i) => { if (cell) ctx.fillRect((i % art.size + 4) * scale, (Math.floor(i / art.size) + 4) * scale, scale, scale); });
  ctx.save(); ctx.translate(4 * scale, 4 * scale); ctx.scale(scale, scale);
  ctx.strokeStyle = art.color; ctx.lineWidth = (art.lineWidth + .55) * 2; ctx.lineCap = 'round';
  ctx.beginPath(); art.lines.forEach(s => { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }); ctx.stroke();
  ctx.strokeStyle = 'white'; ctx.lineWidth = art.lineWidth * 2; ctx.stroke();
  art.cells.forEach((cell, i) => {
    const x = i % art.size, y = Math.floor(i / art.size);
    ctx.fillStyle = cell ? art.color : 'white'; ctx.fillRect(x + (1-art.dotSize)/2, y + (1-art.dotSize)/2, art.dotSize, art.dotSize);
    if (art.reserved[i]) { ctx.fillStyle = cell ? art.color : 'white'; ctx.fillRect(x,y,1,1); }
  }); ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function snowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(64, 64); ctx.strokeStyle = 'white'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50);
    for (const level of [23, 37]) { ctx.moveTo(-11, -level - 8); ctx.lineTo(0, -level); ctx.lineTo(11, -level - 8); }
    ctx.stroke(); ctx.restore();
  }
  return new THREE.CanvasTexture(canvas);
}

export default function SnowScene({ artwork, view, snow, resetKey }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const settings = useRef({ view, snow });
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const orbit = useRef({ yaw: -.48, pitch: .72 });
  const [fallback, setFallback] = useState(false);
  useEffect(() => { settings.current = { view, snow }; }, [view, snow]);
  useEffect(() => { orbit.current = { yaw: -.48, pitch: .72 }; }, [resetKey]);
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.map?.dispose(); materialRef.current.map = artworkTexture(artwork); materialRef.current.needsUpdate = true;
    }
  }, [artwork]);

  useEffect(() => {
    const node = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false }); }
    catch { setFallback(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-label', 'Animated snow falling onto your QR code. In 3D, drag or use arrow keys to rotate.');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.tabIndex = 0;
    node.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 60);
    camera.position.set(0, 12, .001); camera.lookAt(0, 0, 0);
    const planeGeometry = new THREE.PlaneGeometry(6, 6);
    const qrMaterial = new THREE.MeshBasicMaterial({ map: artworkTexture(artwork), side: THREE.DoubleSide });
    materialRef.current = qrMaterial;
    const ground = new THREE.Mesh(planeGeometry, qrMaterial); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const rimGeometry = new THREE.PlaneGeometry(6.035, 6.035);
    const rimMaterial = new THREE.MeshBasicMaterial({ color: 0xdfe3e8 });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial); rim.rotation.x = -Math.PI / 2; rim.position.y = -.012; scene.add(rim);
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 64); grad.addColorStop(0, 'rgba(31,45,64,.16)'); grad.addColorStop(1, 'rgba(31,45,64,0)');
    sctx.fillStyle = grad; sctx.fillRect(0, 0, 128, 128);
    const shadowMap = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeometry = new THREE.PlaneGeometry(10, 10);
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.035; scene.add(shadow);
    const count = 180;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - .5) * 7.5; positions[i * 3 + 1] = Math.random() * 5; positions[i * 3 + 2] = (Math.random() - .5) * 7.5;
      speeds[i] = .35 + Math.random() * .50;
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const map = snowTexture();
    const flakeMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: .11, map, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, alphaTest: .03 });
    const flakes = new THREE.Points(geometry, flakeMaterial); scene.add(flakes);
    const resize = () => {
      const { width, height } = node.getBoundingClientRect();
      renderer.setSize(width, height);
      const aspect = width / height;
      const vertical = aspect < 1 ? 3.6 / aspect : 3.8;
      camera.left = -vertical * aspect; camera.right = vertical * aspect; camera.top = vertical; camera.bottom = -vertical; camera.updateProjectionMatrix();
      // Orthographic PointsMaterial sizes are screen pixels, so scale with the canvas.
      flakeMaterial.size = Math.max(5, Math.min(width, height) / 60);
    };
    const observer = new ResizeObserver(resize); observer.observe(node); resize();
    let drag = false, lastX = 0, lastY = 0, hoverX = 0, hoverY = 0;
    const down = (event: PointerEvent) => {
      if (settings.current.view !== '3d') return;
      drag = true; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect(); hoverX = (event.clientX - rect.left) / rect.width - .5; hoverY = (event.clientY - rect.top) / rect.height - .5;
      if (!drag) return;
      orbit.current.yaw -= (event.clientX - lastX) * .006;
      orbit.current.pitch = THREE.MathUtils.clamp(orbit.current.pitch + (event.clientY - lastY) * .005, .30, 1.20);
      lastX = event.clientX; lastY = event.clientY;
    };
    const up = () => { drag = false; };
    const leave = () => { hoverX = hoverY = 0; };
    const key = (event: KeyboardEvent) => {
      if (settings.current.view !== '3d' || !event.key.startsWith('Arrow')) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') orbit.current.yaw -= .12;
      if (event.key === 'ArrowRight') orbit.current.yaw += .12;
      if (event.key === 'ArrowUp') orbit.current.pitch = Math.min(1.20, orbit.current.pitch + .10);
      if (event.key === 'ArrowDown') orbit.current.pitch = Math.max(.30, orbit.current.pitch - .10);
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', leave); canvas.addEventListener('keydown', key);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = performance.now(), elapsed = 0;
    const desired = new THREE.Vector3();
    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, .05); last = now; elapsed += dt;
      const is3d = settings.current.view === '3d';
      const pitch = orbit.current.pitch + (reduced.matches ? 0 : hoverY * .05);
      const yaw = orbit.current.yaw + (reduced.matches ? 0 : hoverX * .10);
      if (is3d) desired.set(Math.sin(yaw) * Math.cos(pitch) * 12, Math.sin(pitch) * 12, Math.cos(yaw) * Math.cos(pitch) * 12);
      else desired.set(0, 12, .001);
      camera.position.lerp(desired, reduced.matches ? 1 : 1 - Math.exp(-dt * 8)); camera.lookAt(0, 0, 0);
      flakes.visible = settings.current.snow;
      if (settings.current.snow && !document.hidden) {
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] -= dt * speeds[i];
          positions[i * 3] += Math.sin(elapsed * .55 + i) * dt * .075;
          if (positions[i * 3 + 1] < .035) { positions[i * 3 + 1] = 4.5 + Math.random() * .5; positions[i * 3] = (Math.random() - .5) * 7.5; }
        }
        geometry.attributes.position.needsUpdate = true;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const contextLost = (event: Event) => { event.preventDefault(); setFallback(true); cancelAnimationFrame(frame); };
    canvas.addEventListener('webglcontextlost', contextLost);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('keydown', key); canvas.removeEventListener('webglcontextlost', contextLost);
      qrMaterial.map?.dispose(); qrMaterial.dispose(); planeGeometry.dispose(); rimGeometry.dispose(); rimMaterial.dispose(); shadowGeometry.dispose(); shadowMaterial.dispose(); shadowMap.dispose(); geometry.dispose(); flakeMaterial.dispose(); map.dispose(); renderer.dispose(); materialRef.current = null; canvas.remove();
    };
    // This scene lives across QR edits; its texture is replaced by the separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className={`scene ${view === '3d' ? 'inspect' : ''}`} ref={host}>
    {fallback && <div className="fallback"><div dangerouslySetInnerHTML={{ __html: artwork.svg }} /><p>3D is unavailable in this browser. Your QR is ready to save.</p></div>}
  </div>;
}
