import { createArtwork, type FlakeStyle } from './qr';
self.onmessage = (event: MessageEvent<{ id: number; value: string; style: FlakeStyle; detail: number; color: string }>) => {
  const { id, value, style, detail, color } = event.data;
  try { self.postMessage({ id, artwork: createArtwork(value, style, detail, color) }); }
  catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Could not create this QR.' }); }
};
