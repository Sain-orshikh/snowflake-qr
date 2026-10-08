# Snowflake QR

A one-page Next.js QR generator with a snowflake embedded in the QR pattern, real animated snowfall, and interactive 2D / 3D previews.

## Start

```sh
npm install
npm run dev
```

Open http://localhost:3000. Build a static export with `npm run build` (output: `out/`).

## Controls

- Enter a website link. Choose Crystal, Branch, or Stellar, an ink color, and a detail level.
- Use 2D for the overhead view. In 3D, move the pointer for subtle parallax or drag to rotate; arrow keys work with the preview focused. Reset restores the camera.
- Snow toggles the animated flakes. Reduced-motion preferences start with snow off; users can opt in.
- Save QR exports a clean SVG or a 1200 × 1200 PNG, including its white quiet zone. Snow, shadows, and camera perspective are never included.

## Scanning

Uses high QR error correction. The white snowflake preserves small data centers and every reserved function module. The generator adjusts the data marks until jsQR decodes the decorated image to the exact destination at two resolutions. Generation runs in a worker to keep controls responsive. SVG and PNG share the verified matrix. Very dense links may fall back to an undecorated QR and show a notice. Always test the final code on target devices and at intended print size: software verification is not a guarantee for all cameras or conditions.

## Checks

```sh
npm run typecheck
npm run test:qr
npm run build
```

No backend or account is required. Link data stays in the browser. The font stylesheet is fetched from Google Fonts and falls back to system fonts offline.
