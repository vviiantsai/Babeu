/* ============================================================
   dither.js — give a plain photo the 維時 look:
   moody, high-contrast, film-grain jewel tones (default),
   or a hard pointillist/duotone dither. No dependencies.

   USAGE:  <img src="images/plum.jpg" data-treat
                data-mode="grain"     (grain | dither | duotone | mono; default grain)
                data-contrast="1.5"   (default 1.45)
                data-saturate="1.25"  (grain only; default 1.2)
                data-grain="0.16"     (grain amount 0..1; default 0.14)
                data-scale="2">        (dither/duotone pixel size; default 2)

   Draws the image to a canvas, applies the treatment, and swaps the
   <img> for the processed <canvas>.
   ============================================================ */
(() => {
  const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;

  // 4x4 Bayer matrix for ordered dithering (the pointillist mode)
  const BAYER = [
    [0, 8, 2, 10], [12, 4, 14, 6],
    [3, 11, 1, 9], [15, 7, 13, 5]
  ].map(r => r.map(v => (v + 0.5) / 16));
  const LOW = [12, 10, 9], HIGH = [244, 241, 234];   // duotone endpoints

  function process(img) {
    const mode     = img.dataset.mode || 'grain';
    const contrast = parseFloat(img.dataset.contrast) || 1.45;
    const saturate = parseFloat(img.dataset.saturate) || 1.2;
    const grain    = parseFloat(img.dataset.grain)    || 0.14;
    const scale    = parseFloat(img.dataset.scale)    || 2;

    const pixelated = (mode === 'dither' || mode === 'duotone' || mode === 'mono');
    const w = pixelated ? Math.max(1, Math.floor(img.naturalWidth  / scale)) : img.naturalWidth;
    const h = pixelated ? Math.max(1, Math.floor(img.naturalHeight / scale)) : img.naturalHeight;

    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);

    const image = ctx.getImageData(0, 0, w, h);
    const px = image.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = px[i], g = px[i + 1], b = px[i + 2];

        if (mode === 'grain') {
          // contrast around mid grey
          r = clamp((r - 128) * contrast + 128);
          g = clamp((g - 128) * contrast + 128);
          b = clamp((b - 128) * contrast + 128);
          // saturation
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          r = clamp(lum + (r - lum) * saturate);
          g = clamp(lum + (g - lum) * saturate);
          b = clamp(lum + (b - lum) * saturate);
          // film grain — monochromatic noise, stronger in shadows
          const n = (Math.random() - 0.5) * 255 * grain * (1.2 - lum / 255);
          r = clamp(r + n); g = clamp(g + n); b = clamp(b + n);
          px[i] = r; px[i + 1] = g; px[i + 2] = b;
        } else {
          // luminance → ordered dither
          let l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          l = Math.min(1, Math.max(0, (l - 0.5) * contrast + 0.5));
          const on = l > BAYER[y & 3][x & 3];
          const t = on ? 1 : 0;
          if (mode === 'mono') {
            px[i] = px[i + 1] = px[i + 2] = t * 255;
          } else if (mode === 'duotone') {
            px[i]     = LOW[0] + (HIGH[0] - LOW[0]) * t;
            px[i + 1] = LOW[1] + (HIGH[1] - LOW[1]) * t;
            px[i + 2] = LOW[2] + (HIGH[2] - LOW[2]) * t;
          } else { // 'dither' — keep colour, quantise each channel through Bayer
            const thr = BAYER[y & 3][x & 3];
            px[i]     = (((r / 255 - 0.5) * contrast + 0.5) > thr) ? Math.min(255, r * 1.15) : r * 0.35;
            px[i + 1] = (((g / 255 - 0.5) * contrast + 0.5) > thr) ? Math.min(255, g * 1.15) : g * 0.35;
            px[i + 2] = (((b / 255 - 0.5) * contrast + 0.5) > thr) ? Math.min(255, b * 1.15) : b * 0.35;
          }
        }
      }
    }
    ctx.putImageData(image, 0, 0);

    if (pixelated) { c.style.imageRendering = 'pixelated'; }
    c.style.width = '100%'; c.style.height = 'auto';
    c.className = img.className;
    img.replaceWith(c);
  }

  function run() {
    // accept data-treat (new) or data-dither (legacy)
    document.querySelectorAll('img[data-treat],img[data-dither]').forEach(img => {
      if (img.complete && img.naturalWidth) process(img);
      else img.addEventListener('load', () => process(img), { once: true });
    });
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', run);
  else run();
})();
