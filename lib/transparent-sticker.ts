/**
 * Helpers for exporting a DOM node as a PNG sticker with a real alpha channel.
 * Safari/WebKit often paints an opaque white (or black) matte behind "transparent"
 * HTML — flood-fill from the corners to knock that matte out.
 */

/** Knock out a solid matte color connected to the canvas edges. */
export function knockoutCornerMatte(
  canvas: HTMLCanvasElement,
  matte: { r: number; g: number; b: number },
  tolerance = 32
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  if (w < 2 || h < 2) return;

  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];

  const isKnockable = (i: number) => {
    const a = d[i + 3];
    if (a < 12) return true; // already clear — flood through
    if (a < 200) return false; // soft UI chrome — leave alone
    return (
      Math.abs(d[i] - matte.r) <= tolerance &&
      Math.abs(d[i + 1] - matte.g) <= tolerance &&
      Math.abs(d[i + 2] - matte.b) <= tolerance
    );
  };

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    if (!isKnockable(idx * 4)) return;
    visited[idx] = 1;
    stack.push(idx);
  };

  push(0, 0);
  push(w - 1, 0);
  push(0, h - 1);
  push(w - 1, h - 1);
  push((w / 2) | 0, 0);
  push((w / 2) | 0, h - 1);
  push(0, (h / 2) | 0);
  push(w - 1, (h / 2) | 0);

  while (stack.length) {
    const idx = stack.pop()!;
    const i = idx * 4;
    d[i + 3] = 0;
    const x = idx % w;
    const y = (idx / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  ctx.putImageData(image, 0, 0);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Could not encode PNG'));
      else resolve(blob);
    }, 'image/png');
  });
}

/** True if any corner pixel still looks fully opaque (export failed to keep alpha). */
export function cornersLookOpaque(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  const w = canvas.width;
  const h = canvas.height;
  const samples = [
    ctx.getImageData(0, 0, 1, 1).data,
    ctx.getImageData(w - 1, 0, 1, 1).data,
    ctx.getImageData(0, h - 1, 1, 1).data,
    ctx.getImageData(w - 1, h - 1, 1, 1).data,
  ];
  return samples.some((p) => p[3] > 240);
}
