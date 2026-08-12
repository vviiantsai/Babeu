/* ============================================================
   dither.js — turn a plain photo into a high-contrast, pointillist,
   pixel-dithered specimen. Moody by default.

   USAGE:  <img src="images/plum.jpg"
                data-dither          (required — opts the image in)
                data-contrast="1.6"  (optional, default 1.5)
                data-scale="3"       (optional pixel size, default 2)
                data-mode="mono">    (mono | duotone, default duotone)

   The script draws the image to a canvas, crushes contrast, applies an
   ordered (Bayer 4x4) dither so edges break into hard dots, and swaps the
   <img> for the processed <canvas>. No dependencies.
   ============================================================ */
(() => {
  // 4x4 Bayer matrix, normalised 0..1 — the classic ordered-dither threshold map
  const BAYER = [
    [0, 8, 2, 10], [12, 4, 14, 6],
    [3, 11, 1, 9], [15, 7, 13, 5]
  ].map(r => r.map(v => (v + 0.5) / 16));

  // duotone endpoints — deep near-black → warm paper. tweak to taste.
  const LOW  = [10, 9, 8];
  const HIGH = [244, 241, 234];

  function process(img) {
    const scale    = parseFloat(img.dataset.scale)    || 2;     // pixel chunk size
    const contrast = parseFloat(img.dataset.contrast) || 1.5;
    const mode     = img.dataset.mode || 'duotone';

    const w = Math.max(1, Math.floor(img.naturalWidth  / scale));
    const h = Math.max(1, Math.floor(img.naturalHeight / scale));

    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        // luminance
        let lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
        // contrast around mid grey
        lum = Math.min(1, Math.max(0, (lum - 0.5) * contrast + 0.5));
        // ordered-dither: compare against the tiled Bayer threshold
        const on = lum > BAYER[y & 3][x & 3];
        const t  = on ? 1 : 0;
        if (mode === 'mono') {
          const v = t * 255;
          px[i] = px[i + 1] = px[i + 2] = v;
        } else { // duotone
          px[i]     = LOW[0] + (HIGH[0] - LOW[0]) * t;
          px[i + 1] = LOW[1] + (HIGH[1] - LOW[1]) * t;
          px[i + 2] = LOW[2] + (HIGH[2] - LOW[2]) * t;
        }
      }
    }
    ctx.putImageData(data, 0, 0);

    // upscale with nearest-neighbour so the dots stay crisp & pixelated
    c.style.width = '100%';
    c.style.height = 'auto';
    c.style.imageRendering = 'pixelated';
    c.className = img.className;
    img.replaceWith(c);
  }

  function run() {
    document.querySelectorAll('img[data-dither]').forEach(img => {
      if (img.complete && img.naturalWidth) process(img);
      else img.addEventListener('load', () => process(img), { once: true });
    });
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', run);
  else run();
})();
