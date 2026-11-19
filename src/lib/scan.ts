export type Pt = { x: number; y: number };

/**
 * Flatten the four corners of a receipt (top-left, top-right, bottom-right,
 * bottom-left, in image pixels) into a straight-on rectangle, like a scanner.
 */
export function warpQuad(img: HTMLImageElement, p: Pt[], maxEdge: number): HTMLCanvasElement {
  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  let W = Math.max(dist(p[0], p[1]), dist(p[3], p[2]));
  let H = Math.max(dist(p[0], p[3]), dist(p[1], p[2]));
  const sc = Math.min(1, maxEdge / Math.max(W, H, 1));
  W = Math.max(1, Math.round(W * sc));
  H = Math.max(1, Math.round(H * sc));

  const src = document.createElement("canvas");
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sctx = src.getContext("2d");
  if (!sctx) throw new Error("No canvas");
  sctx.drawImage(img, 0, 0);
  const sd = sctx.getImageData(0, 0, src.width, src.height).data;
  const sw = src.width;
  const sh = src.height;

  // Unit square -> quad projective map (Heckbert).
  const [q0, q1, q2, q3] = p;
  const dx1 = q1.x - q2.x, dx2 = q3.x - q2.x, dx3 = q0.x - q1.x + q2.x - q3.x;
  const dy1 = q1.y - q2.y, dy2 = q3.y - q2.y, dy3 = q0.y - q1.y + q2.y - q3.y;
  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = q1.x - q0.x; b = q3.x - q0.x; c = q0.x;
    d = q1.y - q0.y; e = q3.y - q0.y; f = q0.y;
    g = 0; h = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = q1.x - q0.x + g * q1.x; b = q3.x - q0.x + h * q3.x; c = q0.x;
    d = q1.y - q0.y + g * q1.y; e = q3.y - q0.y + h * q3.y; f = q0.y;
  }

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("No canvas");
  const od = octx.createImageData(W, H);
  const o = od.data;
  for (let vy = 0; vy < H; vy += 1) {
    const v = (vy + 0.5) / H;
    for (let ux = 0; ux < W; ux += 1) {
      const u = (ux + 0.5) / W;
      const z = g * u + h * v + 1;
      const sx = Math.max(0, Math.min(sw - 1.001, (a * u + b * v + c) / z - 0.5));
      const sy = Math.max(0, Math.min(sh - 1.001, (d * u + e * v + f) / z - 0.5));
      const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy;
      const i00 = (iy * sw + ix) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const oi = (vy * W + ux) * 4;
      for (let ch = 0; ch < 3; ch += 1) {
        const top = sd[i00 + ch] + (sd[i10 + ch] - sd[i00 + ch]) * fx;
        const bot = sd[i01 + ch] + (sd[i11 + ch] - sd[i01 + ch]) * fx;
        o[oi + ch] = top + (bot - top) * fy;
      }
      o[oi + 3] = 255;
    }
  }
  octx.putImageData(od, 0, 0);
  return out;
}

/**
 * "Scan look": even out the lighting so the paper goes white even in shade or
 * under a shadow, then darken the print. Turns the image black-and-white.
 */
export function scanLook(canvas: HTMLCanvasElement) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const id = ctx.getImageData(0, 0, W, H);
  const o = id.data;
  const gray = new Float32Array(W * H);
  for (let i = 0, j = 0; j < gray.length; i += 4, j += 1) gray[j] = o[i] * 0.299 + o[i + 1] * 0.587 + o[i + 2] * 0.114;

  // Paper brightness per block: a high percentile, since print is dark.
  const B = Math.max(16, Math.round(Math.max(W, H) / 40));
  const bw = Math.ceil(W / B);
  const bh = Math.ceil(H / B);
  const bg = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by += 1) {
    for (let bx = 0; bx < bw; bx += 1) {
      const vals: number[] = [];
      for (let yy = by * B; yy < Math.min(H, (by + 1) * B); yy += 2) {
        for (let xx = bx * B; xx < Math.min(W, (bx + 1) * B); xx += 2) vals.push(gray[yy * W + xx]);
      }
      vals.sort((m, n) => m - n);
      bg[by * bw + bx] = vals.length ? vals[Math.floor(vals.length * 0.9)] : 255;
    }
  }
  // Smooth the map so block edges never show.
  const sm = new Float32Array(bg.length);
  for (let by = 0; by < bh; by += 1) {
    for (let bx = 0; bx < bw; bx += 1) {
      let sum = 0;
      let cnt = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = bx + dx;
          const ny = by + dy;
          if (nx >= 0 && ny >= 0 && nx < bw && ny < bh) {
            sum += bg[ny * bw + nx];
            cnt += 1;
          }
        }
      }
      sm[by * bw + bx] = Math.max(40, sum / cnt);
    }
  }
  const at = (x: number, y: number) => sm[Math.min(bh - 1, y) * bw + Math.min(bw - 1, x)];
  for (let yy = 0; yy < H; yy += 1) {
    const fy = Math.max(0, Math.min(bh - 1, yy / B - 0.5));
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    for (let xx = 0; xx < W; xx += 1) {
      const fx = Math.max(0, Math.min(bw - 1, xx / B - 0.5));
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
      const bot = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
      const back = top + (bot - top) * ty;
      let t = gray[yy * W + xx] / back;
      t = (t - 0.45) / (0.9 - 0.45);
      t = t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(t, 1.6);
      const v = Math.round(t * 255);
      const oi = (yy * W + xx) * 4;
      o[oi] = v;
      o[oi + 1] = v;
      o[oi + 2] = v;
    }
  }
  ctx.putImageData(id, 0, 0);
}
