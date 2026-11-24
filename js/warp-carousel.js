(() => {
  'use strict';

  const CW = 256;
  const CH = 320;
  const CR = 12;
  const FOCAL = 734.103;
  const G = {
    qA: 0.46401,
    XLA: 165.774,
    zA: 35.354,
    psiA: 1.44638,
    a1: 1.31454,
    a2: 1.10948,
    qB: 0.74999,
    XB: 204.525,
    ZB: 355.405,
    bB: 0.69311,
    bE: 0.04614,
    vC: 203.134,
    aC: 229.260,
    kB: 0.01087,
    bP: 0.99129,
    qPR: 1.01828,
    bPL: 1.00920,
    qPL: 1.07139,
  };

  function poseAt(q0) {
    let q = q0;
    if (Math.abs(q) < 1) q -= G.kB * Math.sin(Math.PI * q) ** 2;
    const s = q < 0 ? -1 : 1;
    const a = Math.abs(q);
    const half = CW / 2;
    if (a <= G.qA) {
      const t = a / G.qA;
      const xl = -half + (G.XLA + half) * Math.pow(t, G.a1);
      const zl = G.zA * t ** 4;
      const psi = G.psiA * Math.pow(t, G.a2);
      return [s * (xl + half * Math.cos(psi)), zl + half * Math.sin(psi), s * psi];
    }
    const dXL = ((G.XLA + half) * G.a1) / G.qA;
    const dZL = (G.zA * 4) / G.qA;
    const dps = (G.psiA * G.a2) / G.qA;
    let Hx, Hz;
    if (a <= G.qB) {
      const L = G.qB - G.qA;
      const t = (a - G.qA) / L;
      const hx = G.XLA + CW * Math.cos(G.psiA);
      const hz = G.zA + CW * Math.sin(G.psiA);
      const dhx = dXL - CW * Math.sin(G.psiA) * dps;
      const dhz = dZL + CW * Math.cos(G.psiA) * dps;
      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
      const h10 = t ** 3 - 2 * t ** 2 + t;
      const h01 = -2 * t ** 3 + 3 * t ** 2;
      const h11 = t ** 3 - t ** 2;
      Hx = h00 * hx + h10 * L * dhx * G.bB + h01 * G.XB + h11 * L * G.vC * G.bE;
      Hz = h00 * hz + h10 * L * dhz * G.bB + h01 * G.ZB;
    } else {
      const d = a - G.qB;
      Hx = G.XB + G.vC * d + G.aC * d * d;
      Hz = G.ZB;
    }
    const qP = s < 0 ? G.qPL : G.qPR;
    const bP = s < 0 ? G.bPL : G.bP;
    const LP = qP - G.qA;
    const tp = Math.min(1, (a - G.qA) / LP);
    const psi = (2 * tp ** 3 - 3 * tp ** 2 + 1) * G.psiA + (tp ** 3 - 2 * tp ** 2 + tp) * LP * dps * bP + (-2 * tp ** 3 + 3 * tp ** 2) * Math.PI;
    return [s * (Hx - half * Math.cos(psi)), Hz - half * Math.sin(psi), s * psi];
  }

  const TK = [0, 3, 6, 8, 10, 11, 12, 13, 14, 16, 18, 21, 25, 30, 36, 45, 55, 70, 88, 110];
  const TB = [0, 0.02175, 0.12069, 0.22549, 0.35493, 0.43254, 0.51436, 0.5952, 0.6751, 0.83199, 0.9709, 1.12669, 1.27958, 1.40975, 1.53561, 1.68385, 1.79183, 1.89191, 1.95233, 2];
  const DRIFT = 0.06511;
  const REST_PHASE = 81.828;
  const STEP_FRAMES = 110;

  const SLOPES = (() => {
    const n = TK.length;
    const h = TK.slice(1).map((x, i) => x - TK[i]);
    const dl = h.map((hi, i) => (TB[i + 1] - TB[i]) / hi);
    const d = new Array(n).fill(0);
    for (let k = 1; k < n - 1; k++) {
      if (dl[k - 1] * dl[k] <= 0) d[k] = 0;
      else {
        const w1 = 2 * h[k] + h[k - 1];
        const w2 = h[k] + 2 * h[k - 1];
        d[k] = (w1 + w2) / (w1 / dl[k - 1] + w2 / dl[k]);
      }
    }
    const v = (dl[0] + dl[n - 2]) / 2;
    d[0] = v;
    d[n - 1] = v;
    return d;
  })();

  function spin(frames) {
    if (frames <= 0) return 0;
    if (frames >= STEP_FRAMES) return 1;
    let i = 0;
    while (i < TK.length - 2 && frames > TK[i + 1]) i++;
    const h = TK[i + 1] - TK[i];
    const t = (frames - TK[i]) / h;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    return (h00 * TB[i] + h10 * h * SLOPES[i] + h01 * TB[i + 1] + h11 * h * SLOPES[i + 1]) / 2;
  }

  function spinN(frames, n) {
    if (n <= STEP_FRAMES + 0.5) return spin((frames * STEP_FRAMES) / Math.max(1, n));
    const knee = 80;
    if (frames <= knee) return spin(frames);
    return spin(knee + ((frames - knee) * (STEP_FRAMES - knee)) / (n - knee));
  }

  const LEAD = (STEP_FRAMES - REST_PHASE) / 30;

  function autoplayProgress(t, start, step, interval) {
    if (t < LEAD) return start - step + DRIFT + step * spin(REST_PHASE + t * 30);
    const k = Math.floor((t - LEAD) / interval);
    const tau = (t - LEAD - k * interval) * 30;
    return start + k * step + DRIFT + step * spinN(tau, interval * 30);
  }

  function parseColor(c, fallback = [0, 0, 0]) {
    const s = (c || '').trim();
    let m = /^#([0-9a-f]{3,8})$/i.exec(s);
    if (m) {
      let h = m[1];
      if (h.length <= 4) h = h.split('').map(x => x + x).join('');
      const n = parseInt(h.slice(0, 6), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    m = /^rgba?\(([^)]+)\)$/i.exec(s);
    if (m) {
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(x => parseFloat(x));
      return [p[0] || 0, p[1] || 0, p[2] || 0];
    }
    return fallback;
  }

  function rgba(c, a) {
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
  }

  function bspline(t, out) {
    const it = 1 - t;
    out[0] = (it * it * it) / 6;
    out[1] = (3 * t * t * t - 6 * t * t + 4) / 6;
    out[2] = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6;
    out[3] = (t * t * t) / 6;
  }

  function meshGrid(mesh) {
    const fallback = ['#1d1d3a', '#3b2f8f', '#2a6fd6', '#0d0d24'];
    const src = mesh && mesh.length ? mesh : fallback;
    const cols = src.map(c => parseColor(c));
    const out = [];
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < 6; i++) {
        if (cols.length === 42) out.push(cols[j * 6 + i]);
        else {
          const k = Math.min(cols.length - 1, Math.round(((j * 6 + i) / 41) * (cols.length - 1)));
          out.push(cols[k]);
        }
      }
    }
    return out;
  }

  function paintMesh(ctx, w, h, mesh) {
    const grid = meshGrid(mesh);
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const wx = new Float32Array(w * 4);
    const ix = new Int32Array(w * 4);
    const tmp = [0, 0, 0, 0];
    for (let x = 0; x < w; x++) {
      const u = ((x + 0.5) / w) * 5;
      const i = Math.floor(u);
      bspline(u - i, tmp);
      for (let k = 0; k < 4; k++) {
        wx[x * 4 + k] = tmp[k];
        ix[x * 4 + k] = Math.min(5, Math.max(0, i - 1 + k));
      }
    }
    const row = new Float32Array(6 * 3);
    let seed = 1234567;
    for (let y = 0; y < h; y++) {
      const v = ((y + 0.5) / h) * 6;
      const j = Math.floor(v);
      bspline(v - j, tmp);
      row.fill(0);
      for (let k = 0; k < 4; k++) {
        const jj = Math.min(6, Math.max(0, j - 1 + k));
        const wy = tmp[k];
        for (let i = 0; i < 6; i++) {
          const c = grid[jj * 6 + i];
          row[i * 3] += c[0] * wy;
          row[i * 3 + 1] += c[1] * wy;
          row[i * 3 + 2] += c[2] * wy;
        }
      }
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = 0; k < 4; k++) {
          const wgt = wx[x * 4 + k];
          const i3 = ix[x * 4 + k] * 3;
          r += row[i3] * wgt;
          g += row[i3 + 1] * wgt;
          b += row[i3 + 2] * wgt;
        }
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const n = (seed / 0x7fffffff - 0.5) * 1.6;
        const o = (y * w + x) * 4;
        d[o] = r + n;
        d[o + 1] = g + n;
        d[o + 2] = b + n;
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function fontStr(weight, px, family) {
    return `${weight} ${px}px ${family}`;
  }

  function sizeForCap(ctx, weight, family, cap, sample = '0') {
    ctx.font = fontStr(weight, 100, family);
    const m = ctx.measureText(sample);
    const asc = m.actualBoundingBoxAscent || 71;
    return (cap / asc) * 100;
  }

  function paintCard(cv, card, family) {
    const w = cv.width;
    const h = cv.height;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const k = w / CW;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    paintMesh(ctx, w, h, card.mesh);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.textBaseline = 'alphabetic';
    const white = [255, 255, 255];
    const accent = parseColor(card.accent || '#ffffff');

    // Title and footer
    const small = sizeForCap(ctx, 500, family, 8.5, 'H');
    ctx.font = fontStr(500, small, family);
    ctx.fillStyle = rgba(white, 0.95);
    const lines = (card.title || '').split('\n');
    lines.slice(0, 2).forEach((ln, i) => ctx.fillText(ln, 18, 38 + i * 15));
    if (card.footer) {
      ctx.fillStyle = rgba(white, 0.88);
      ctx.font = fontStr(400, small * 0.92, family);
      ctx.fillText(card.footer, 18, 295);
    }

    // Numeral
    const big = sizeForCap(ctx, 300, family, 46);
    const unitPx = big * 0.35;
    ctx.font = fontStr(300, big, family);
    const value = card.value || '';
    const vw = ctx.measureText(value).width;
    ctx.font = fontStr(300, unitPx, family);
    const uw = card.unit ? ctx.measureText(card.unit).width + 4 : 0;
    const detail = card.detail || 'none';
    const centre = detail === 'wave' ? 112 : detail === 'cross' ? 106 : 127;
    const x0 = centre - (vw + uw) / 2 + (detail === 'cross' ? uw / 2 : 0);
    const n0 = parseColor((card.numeral && card.numeral[0]) || '#ffffff');
    const n1 = parseColor((card.numeral && card.numeral[1]) || '#ffffff');
    const grad = ctx.createLinearGradient(x0, 0, x0 + vw, 0);
    grad.addColorStop(0, rgba(n0, 1));
    grad.addColorStop(1, rgba(n1, 1));

    // Detail under numeral
    if (detail === 'ring') {
      const cx0 = 126;
      const cy0 = 156;
      for (let i = 0; i < 132; i++) {
        const a = (i / 132) * Math.PI * 2 - Math.PI / 2;
        const seedLen = 0.5 + 0.5 * Math.sin(i * 12.9898) * Math.sin(i * 4.1414 + 1.3);
        const top = 0.5 + 0.5 * Math.cos(a + Math.PI / 2);
        const len = 4 + 4.5 * Math.abs(seedLen) + 2 * top;
        const fade = 0.22 + 0.5 * top * top;
        ctx.strokeStyle = rgba(accent, fade);
        ctx.lineWidth = 1.0 + 0.7 * top;
        const r1 = 68;
        ctx.beginPath();
        ctx.moveTo(cx0 + Math.cos(a) * r1, cy0 + Math.sin(a) * r1);
        ctx.lineTo(cx0 + Math.cos(a) * (r1 + len), cy0 + Math.sin(a) * (r1 + len));
        ctx.stroke();
      }
    } else if (detail === 'slider') {
      const xa = 24;
      const xb = 232;
      const y = 197.5;
      const kx = xa + (xb - xa) * 0.45;
      const lg = ctx.createLinearGradient(xa, 0, xb, 0);
      lg.addColorStop(0, rgba(accent, 0.15));
      lg.addColorStop(0.45, rgba(accent, 0.85));
      lg.addColorStop(1, rgba(accent, 0.35));
      ctx.fillStyle = lg;
      ctx.fillRect(xa, y - 0.6, xb - xa, 1.2);
      ctx.save();
      ctx.shadowColor = rgba(accent, 0.95);
      ctx.shadowBlur = 9 * k;
      ctx.fillStyle = rgba(white, 1);
      ctx.beginPath();
      ctx.arc(kx, y, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const lab = card.labels || [];
      const lpx = sizeForCap(ctx, 400, family, 5.2, 'H');
      ctx.font = fontStr(400, lpx, family);
      ctx.fillStyle = rgba(white, 0.6);
      if (lab[0]) ctx.fillText(lab[0], 14, 208);
      if (lab[1]) {
        ctx.textAlign = 'right';
        ctx.fillText(lab[1], 230, 208);
        ctx.textAlign = 'left';
      }
    } else if (detail === 'wave') {
      ctx.fillStyle = 'rgba(20, 0, 8, 0.32)';
      ctx.beginPath();
      ctx.arc(27, 157, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(white, 0.75);
      ctx.lineWidth = 0.9;
      const plus = (px, py, r) => {
        ctx.beginPath();
        ctx.moveTo(px - r, py);
        ctx.lineTo(px + r, py);
        ctx.moveTo(px, py - r);
        ctx.lineTo(px, py + r);
        ctx.stroke();
      };
      plus(27, 157, 3);
      plus(199, 157, 3);
      for (let i = 0; i < 56; i++) {
        const x = 43 + i * 3;
        const r1 = Math.abs(Math.sin(i * 1.7 + 0.4) * Math.cos(i * 0.53));
        const hh = 1.5 + 6.5 * r1;
        const mark = i === 23;
        ctx.fillStyle = mark ? rgba(accent, 0.95) : rgba(white, 0.3);
        ctx.fillRect(x, 204 - (mark ? 8 : hh), mark ? 1.4 : 0.9, mark ? 16 : hh * 2);
      }
    } else if (detail === 'cross') {
      ctx.fillStyle = rgba(white, 0.28);
      ctx.fillRect(105.5, 66, 0.8, 182);
      ctx.fillRect(12, 156.5, 186, 0.8);
      ctx.font = fontStr(300, big * 0.72, family);
      ctx.fillStyle = rgba(white, 0.07);
      ctx.textAlign = 'center';
      ctx.fillText('02', 106, 122);
      ctx.textAlign = 'left';
    }

    ctx.save();
    ctx.shadowColor = rgba(n1, 0.35);
    ctx.shadowBlur = 10 * k;
    ctx.font = fontStr(300, big, family);
    ctx.fillStyle = grad;
    ctx.fillText(value, x0, 186);
    if (card.unit) {
      ctx.font = fontStr(300, unitPx, family);
      ctx.fillStyle = rgba(n1, 1);
      ctx.fillText(card.unit, x0 + vw + 4, 186 - 46 + unitPx * 0.72);
    }
    ctx.restore();
  }

  function glowShape(pose) {
    const [px, pz, ps] = pose;
    const c = Math.cos(ps);
    const sn = Math.sin(ps);
    if (c <= 0.02) return [0, 1, 0];
    const A = px;
    const B = FOCAL + pz;
    const tNear = B - 0.5 * CW * Math.abs(sn);
    let m = 0, mx = 0, mxx = 0;
    for (let u = -360; u <= 360; u += 3) {
      const h = Math.exp(-((Math.abs(u - 9) / 138) ** 4));
      if (h < 0.003) continue;
      const k = u / 1.8 / FOCAL;
      const den = sn * k - c;
      if (Math.abs(den) < 1e-4) continue;
      const s = (A - B * k) / den;
      const t = B + s * sn;
      if (t < 4) continue;
      if ((u / 1.8 / FOCAL) * t * sn - t * c >= 0) continue;
      const dsdk = (B * c - A * sn) / (den * den);
      const soft = Math.min(Math.abs(dsdk / FOCAL) * 2.2, 40) + 0.5;
      const cov = Math.max(0, Math.min(1, (CW * 0.5 - Math.abs(s)) / soft + 0.5));
      if (cov <= 0) continue;
      const near = Math.min(1, FOCAL / t);
      const rel = Math.exp(-((Math.max(t - tNear, 0) / 36) ** 1.5));
      const w = cov * near * near * rel * c * h;
      m += w;
      mx += w * u;
      mxx += w * u * u;
    }
    if (m < 0.5) return [0, 1, 0];
    const mu = mx / m;
    const sd = Math.sqrt(Math.max(1, mxx / m - mu * mu));
    const r = Math.max(6, sd / 0.581);
    return [mu, r, (m * 3) / (1.813 * r)];
  }

  const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform vec2 uRes;
uniform float uUnit;
uniform vec4 uPose[8];
uniform vec3 uGlowCol[8];
uniform vec3 uGlowShape[8];
uniform vec3 uBg;
uniform float uWarp;
uniform float uMix;
out vec4 outColor;

const float F = ${FOCAL.toFixed(2)};
const float CW = ${CW.toFixed(1)};
const float CH = ${CH.toFixed(1)};
const float CR = ${CR.toFixed(1)};

float lensH(float a){
  if (a <= 232.0) return a;
  float k[9] = float[9](232.0, 238.0, 245.0, 253.0, 262.0, 275.0, 295.0, 325.0, 360.0);
  float d[9] = float[9](1.1759, 1.0671, 1.0156, 1.0965, 0.6487, 0.2700, -0.1991, -0.4782, -0.0318);
  float s = 232.0;
  for (int i = 0; i < 8; i++){
    if (a <= k[i]) break;
    float x = min(a, k[i+1]);
    float t = (x - k[i]) / (k[i+1] - k[i]);
    s += (x - k[i]) * mix(1.0, mix(d[i], d[i+1], t * 0.5), uWarp);
  }
  if (a > 360.0) s += (a - 360.0) * mix(1.0, d[8], uWarp);
  return s;
}
float lensS(float a){
  float t = clamp((a - 262.0) / 93.0, 0.0, 2.0);
  return 1.0 + uWarp * (0.42 * pow(t, 1.5) + 0.045 * smoothstep(320.0, 360.0, a));
}

float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

vec4 shadeCard(vec4 pose, vec2 ps, float fx, float fy, out float depth){
  depth = 1e9;
  if (pose.w < 0.0) return vec4(0.0);
  float k = ps.x / F;
  float c = cos(pose.z), sn = sin(pose.z);
  float den = sn * k - c;
  if (abs(den) < 1e-5) return vec4(0.0);
  float A = pose.x, B = F + pose.y;
  float s = (A - B * k) / den;
  float t = B + s * sn;
  if (t < 4.0) return vec4(0.0);
  float y = t * ps.y / F;
  float dsdk = (B * c - A * sn) / (den * den);
  float fs = min(abs(dsdk / F) * fx, 48.0);
  float fyc = min(t / F * fy, 48.0);
  vec2 p = vec2(s, y);
  float d = sdRound(p, vec2(CW, CH) * 0.5, CR);
  vec2 q = abs(p) - vec2(CW, CH) * 0.5 + CR;
  vec2 n = q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  if (q.x > 0.0 && q.y > 0.0) n = normalize(q);
  float fp = length(vec2(fs * n.x, fyc * n.y)) + 1e-4;
  if (d > fp) return vec4(0.0);
  float cov = clamp(0.5 - d / fp, 0.0, 1.0);
  if (cov <= 0.0) return vec4(0.0);
  vec2 uv = vec2(s / CW + 0.5, 0.5 - y / CH);
  vec4 tex = textureGrad(uTex, vec3(uv, pose.w), vec2(fs / CW, 0.0), vec2(0.0, fyc / CH));
  depth = t;
  return vec4(tex.rgb, 1.0) * cov;
}

vec4 scene(vec2 ps, float fx, float fy, int base){
  vec4 col[4];
  float dep[4];
  for (int i = 0; i < 4; i++) col[i] = shadeCard(uPose[base + i], ps, fx, fy, dep[i]);
  for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
      if (j < 3 - i && dep[j] > dep[j+1]) {
        float td = dep[j]; dep[j] = dep[j+1]; dep[j+1] = td;
        vec4 tc = col[j]; col[j] = col[j+1]; col[j+1] = tc;
      }
    }
  }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 4; i++) acc += (1.0 - acc.a) * col[i];
  return acc;
}

vec4 glowAt(vec2 pu, float halfH, int base){
  vec4 sum = vec4(0.0);
  float gH = min(halfH, 288.0);
  float dy = min(abs((gH - 11.0) - pu.y), abs(pu.y + (gH - 12.0)));
  if (dy > 40.0) return sum;
  for (int i = 0; i < 4; i++){
    vec3 sh = uGlowShape[base + i];
    if (sh.z <= 0.0) continue;
    float E = exp(-pow(abs(pu.x - sh.x) / sh.y, 4.0));
    if (E < 0.002) continue;
    float v = exp(-pow(dy / (18.5 * (0.45 + 0.55 * sqrt(E))), 3.0));
    float w = sh.z * E * v;
    sum += vec4(uGlowCol[base + i] * w, w);
  }
  return sum;
}

vec3 stage(vec2 pu, float halfH, int base){
  vec4 g = glowAt(pu, halfH, base);
  if (g.a <= 0.0) return uBg;
  float I = clamp(g.a, 0.0, 1.0);
  vec3 drop = uBg - g.rgb / g.a;
  return uBg - drop * pow(vec3(I), vec3(0.8, 1.6, 1.0));
}

vec3 render(vec2 pu, float halfH, int base){
  float au = min(abs(pu.x), 360.0);
  float px = 1.0 / uUnit;
  vec3 bg = stage(pu, halfH, base);
  if (au < 236.0 || uWarp <= 0.0) {
    vec4 c = scene(pu, px, px, base);
    return c.rgb + (1.0 - c.a) * bg;
  }
  float e = 0.064 * uWarp * smoothstep(275.0, 360.0, au);
  float S0 = lensS(au);
  float sg = pu.x < 0.0 ? -1.0 : 1.0;
  float blur = 1.0 + 30.0 * pow(smoothstep(240.0, 340.0, au), 1.5) * uWarp;
  float fyb = 1.0 + 15.0 * smoothstep(280.0, 352.0, au) * uWarp;
  float gain = 1.0 + 0.17 * smoothstep(285.0, 350.0, au) * uWarp;
  vec3 acc;
  for (int ch = 0; ch < 3; ch++){
    float off = uWarp * (ch == 0 ? -20.92 : (ch == 1 ? 0.0 : 11.91));
    float h = lensH(au) + off * smoothstep(289.8, 344.9, au);
    float h0 = lensH(au - 0.5) + off * smoothstep(289.8, 344.9, au - 0.5);
    float h1 = lensH(au + 0.5) + off * smoothstep(289.8, 344.9, au + 0.5);
    float fx = px * max(abs(h1 - h0), 0.02) * blur;
    float S = S0 * (ch == 0 ? 1.0 + e : (ch == 1 ? 1.0 : 1.0 - e));
    vec4 c = scene(vec2(sg * h, pu.y / S), fx, px / S * fyb, base);
    c.rgb = min(c.rgb * gain, vec3(c.a));
    acc[ch] = (c.rgb + (1.0 - c.a) * bg)[ch];
  }
  return acc;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 pu = (fc - 0.5 * uRes) / uUnit;
  float halfH = 0.5 * uRes.y / uUnit;
  vec3 col = render(pu, halfH, 0);
  if (uMix > 0.0) col = mix(col, render(pu, halfH, 4), uMix);
  outColor = vec4(col, 1.0);
}`;

  function createGL(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    const loc = {};
    ['uTex', 'uRes', 'uUnit', 'uPose', 'uGlowCol', 'uGlowShape', 'uBg', 'uWarp', 'uMix'].forEach(n => {
      loc[n] = gl.getUniformLocation(prog, n);
    });
    return { gl, prog, tex, loc, layers: 0, texW: 0 };
  }

  function uploadCards(st, canvases) {
    const { gl, tex } = st;
    const w = canvases[0].width;
    const h = canvases[0].height;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, w, h, canvases.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    canvases.forEach((cv, i) => {
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, w, h, 1, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    });
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    st.layers = canvases.length;
    st.texW = w;
  }

  function drawFallback(ctx, w, h, unit, poses, canvases, bg, glows) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const gH = Math.min(h / 2 / unit, 288);
    for (const p of poses) {
      if (p.layer < 0) continue;
      const [mu, r, amp] = glowShape(p.pose);
      const a = Math.min(1, amp) * 0.9;
      if (a < 0.01) continue;
      const rx = r * 1.35 * unit;
      const col = glows[p.layer] || [127, 208, 240];
      const rgb = `${col[0]}, ${col[1]}, ${col[2]}`;
      for (const yy of [h / 2 - (gH - 11) * unit, h / 2 + (gH - 12) * unit]) {
        ctx.save();
        ctx.translate(w / 2 + mu * unit, yy);
        ctx.scale(1, (20 * unit) / rx);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        rg.addColorStop(0, `rgba(${rgb}, ${a})`);
        rg.addColorStop(0.55, `rgba(${rgb}, ${a * 0.55})`);
        rg.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
      }
    }
    const proj = (X, Zb, Y) => {
      const D = FOCAL + Zb;
      return [w / 2 + ((X * FOCAL) / D) * unit, h / 2 - ((Y * FOCAL) / D) * unit];
    };
    const items = poses.filter(p => p.layer >= 0).map(p => ({ ...p, depth: p.pose[1] })).sort((a, b) => b.depth - a.depth);
    for (const it of items) {
      const cv = canvases[it.layer];
      if (!cv) continue;
      const [cx, zb] = it.pose;
      const pt = proj(cx, zb, 0);
      const s = FOCAL / (FOCAL + zb) * unit;
      ctx.save();
      ctx.translate(pt[0], pt[1]);
      ctx.scale(s, s);
      ctx.drawImage(cv, -CW / 2, -CH / 2, CW, CH);
      ctx.restore();
    }
  }

  const mod = (a, n) => ((a % n) + n) % n;

  // 4 Catalyst OS Cards
  const PATH_CARDS = [
    {
      id: 'path-efp',
      code: 'efp',
      badge: '01 / Хочу попробовать',
      title: 'Единый файл\nправды',
      value: '0',
      unit: '₽',
      footer: 'Демо бесплатно · Telegram-бот',
      detail: 'slider',
      labels: ['Контекст', 'Результат'],
      numeral: ['#3ad2ff', '#8cf6ff'],
      accent: '#7fe8ff',
      glow: '#1b4dff',
      gradientFrom: '#00c6ff',
      gradientTo: '#0072ff',
      mesh: ["#021b36", "#022246", "#022852", "#031e3f", "#031934", "#021831", "#022345", "#020e1e", "#01040f", "#000416", "#020b31", "#021c57", "#01172f", "#01010c", "#03001d", "#0a0f4c", "#112383", "#0b36af", "#021142", "#050b47", "#0c2e8f", "#165bd4", "#1675fd", "#167bff", "#03288e", "#0438af", "#0d66e7", "#107eec", "#30afff", "#71dcff", "#0356e8", "#0259ec", "#0945b0", "#001a49", "#3f7c9d", "#d4ffff", "#0365ff", "#0256ea", "#052a87", "#00001f", "#1f4c7b", "#9ee7ff"],
      heading: 'Единый файл правды',
      tag: '0 ₽ · демо бесплатно',
      desc: 'Один файл о компании, нейросеть отвечает по твоим правилам.',
      features: [
        'Короткий файл о компании в формате .MD за один вечер',
        'Нейросеть отвечает строго по вашим правилам без галлюцинаций',
        'Готовая структура под любую LLM (ChatGPT, Claude, DeepSeek)',
        'Мгновенное получение через Telegram-бота'
      ],
      btnText: 'Забрать демо · 0 ₽',
      btnHref: 'https://t.me/denis_pleada_bot?start=efp_site',
      btnTarget: '_blank',
      note: 'Откроется Telegram, бот проверит подписку на канал и пришлёт файл.'
    },
    {
      id: 'path-efp-full',
      code: 'efp-full',
      badge: '02 / Хочу файл целиком',
      title: 'Полная версия\nЕФП навсегда',
      value: '990',
      unit: '₽',
      footer: 'CEO-агент, отделы, журнал',
      detail: 'cross',
      labels: ['Файл .MD', 'Вход', 'Итог'],
      numeral: ['#e2a6ff', '#fff6ff'],
      accent: '#d9a8ff',
      glow: '#8b42ef',
      gradientFrom: '#a955ff',
      gradientTo: '#ea51ff',
      mesh: ["#4c2d5f", "#3b2245", "#3e285b", "#33204f", "#381844", "#572571", "#644096", "#4f3688", "#8358f6", "#8d54f3", "#5e20ac", "#6e24b7", "#482e6d", "#261b48", "#825bf6", "#d48cff", "#d07bff", "#b359ff", "#2d1837", "#140a1b", "#2c1d66", "#3a2383", "#693bca", "#8b42ef", "#411c5b", "#300753", "#3b006e", "#500f79", "#7e31c1", "#9541f3", "#44245a", "#3f0c69", "#6f15b9", "#d17cff", "#e2a3ff", "#a668ff", "#4b2f60", "#4d2172", "#6819aa", "#9b48dc", "#965dc9", "#7745c4"],
      heading: 'Полная версия ЕФП',
      tag: '990 ₽ · один раз',
      desc: 'CEO-агент, отделы, системный журнал и готовый контекст компании навсегда.',
      features: [
        'Полная архитектура Единого файла правды под ключ',
        'CEO-агент, специализированные отделы и системный журнал',
        'Файлы остаются в компании навсегда, без ежемесячных оплат',
        'Методичка и видео-разбор по внедрению в рабочий процесс'
      ],
      btnText: 'Подробнее о файле',
      btnHref: 'https://catalystos.ru/efp',
      btnTarget: '_blank',
      note: 'Остаётся в компании навсегда. Готовая архитектура под любую LLM.'
    },
    {
      id: 'path-os',
      code: 'os',
      badge: '03 / Хочу готовое',
      title: 'Catalyst OS\nЭкраны & MCP',
      value: '9 900',
      unit: '₽/мес',
      footer: 'Скиллы под твою задачу',
      detail: 'ring',
      numeral: ['#7497ff', '#d4e2ff'],
      accent: '#1b4dff',
      glow: '#1b4dff',
      gradientFrom: '#2F80ED',
      gradientTo: '#56CCF2',
      mesh: ["#07162c", "#0b254a", "#0e3466", "#14488a", "#1b5bb5", "#2472e3", "#041021", "#081d3b", "#0d2d58", "#12417d", "#1858a7", "#2172d8", "#020a16", "#05142a", "#092243", "#0e3466", "#13498f", "#1b62be", "#01060e", "#030c1b", "#061730", "#0a254b", "#0f376d", "#154d97", "#000308", "#020814", "#041124", "#071c3a", "#0b2955", "#103a77", "#000104", "#01040b", "#020917", "#041227", "#071c3b", "#0a2855", "#000002", "#000206", "#01050e", "#020b1b", "#04132a", "#061c3d"],
      heading: 'Catalyst OS',
      tag: '9 900 ₽ / месяц',
      desc: 'Готовые экраны и скиллы по MCP, решение на твоих корпоративных данных.',
      features: [
        '1 200+ готовых корпоративных наработок и экранов',
        '370+ навыков и 100+ ИИ-сотрудников под реальные задачи',
        'Подключение по MCP к Cursor, Claude Code, Codex за 2 минуты',
        'Решения строятся прямо на ваших реальных данных компании'
      ],
      btnText: 'Как это работает',
      btnHref: 'https://catalystos.ru/os',
      btnTarget: '_self',
      note: 'Уже работаешь в Cursor, Claude Code или Codex? Этот путь для тебя.'
    },
    {
      id: 'path-kurs',
      code: 'kurs',
      badge: '04 / Хочу научиться с Денисом',
      title: 'Курс Дениса\n«От чата к агенту»',
      value: '29 900',
      unit: '₽',
      footer: 'Доведёшь 1 работу до результата',
      detail: 'wave',
      numeral: ['#38ef7d', '#11998e'],
      accent: '#10b981',
      glow: '#059669',
      gradientFrom: '#10b981',
      gradientTo: '#059669',
      mesh: ["#022c22", "#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#012018", "#033b2c", "#044e39", "#066349", "#057a5b", "#0d9488", "#00140f", "#02261c", "#033426", "#044533", "#055942", "#0f766e", "#000b08", "#011610", "#022017", "#032b1f", "#04392a", "#0d5c56", "#000504", "#000c09", "#01120c", "#021a12", "#032419", "#0a433f", "#000202", "#000604", "#000b08", "#010f0b", "#02150f", "#072e2b", "#000101", "#000302", "#000504", "#000806", "#010b09", "#041b19"],
      heading: 'Курс «От чата к агенту»',
      tag: '29 900 ₽ за курс',
      desc: 'Доведёшь одну конкретную работу компании до проверенного измеримого результата.',
      features: [
        'Личное обучение и сопровождение от Дениса Леушина',
        'Доведёшь одну конкретную задачу компании до измеримого результата',
        'В подарок: полная версия ЕФП навсегда + 1 месяц Catalyst OS',
        '12 месяцев доступа к закрытому комьюнити и разборам проектов'
      ],
      btnText: 'Программа курса',
      btnHref: 'https://catalystos.ru/kurs',
      btnTarget: '_self',
      note: 'Хочешь научиться с Денисом — выбирай свою задачу и проходи путь вместе с ним.'
    }
  ];

  function initWarpCarousel() {
    const wrap = document.getElementById('warpContainer');
    const canvas = document.getElementById('warpCanvas');
    if (!wrap || !canvas) return;

    const cards = PATH_CARDS;
    const N = cards.length;
    let current = 0;
    let gls = createGL(canvas);
    let ctx2d = gls ? null : canvas.getContext('2d');
    let cardCanvases = [];
    let texW = 0;
    let raf = 0;
    const font = '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    const getBg = () => {
      const isDark = document.documentElement.dataset.theme === 'dark';
      try {
        const raw = window.getComputedStyle(document.body).backgroundColor;
        const c = parseColor(raw);
        if (c && c.length === 3) return c;
      } catch (_) {}
      return isDark ? [16, 18, 23] : [245, 245, 242];
    };

    const glowCols = cards.map(c => parseColor(c.glow || '#7fd0f0'));

    const paintAll = w => {
      cardCanvases = cards.map(card => {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = Math.round((w * CH) / CW);
        paintCard(cv, card, font);
        return cv;
      });
      texW = w;
      if (gls) uploadCards(gls, cardCanvases);
    };

    const getUnitCss = r => {
      const w = r.width;
      const h = r.height;
      if (w >= 1400) {
        return Math.min(1.55, Math.max(1.3, h / 390));
      } else if (w >= 1024) {
        return Math.min(1.42, Math.max(1.18, Math.min(w / 880, h / 390)));
      } else if (w >= 640) {
        return Math.min(1.15, Math.max(0.98, Math.min(w / 680, h / 390)));
      } else {
        return Math.min(0.92, Math.max(0.76, (w - 24) / 320));
      }
    };

    let W = 0, H = 0, unit = 1;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(2, Math.round(r.width * dpr));
      H = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      const unitCss = getUnitCss(r);
      unit = unitCss * dpr;
      const want = Math.min(1024, Math.max(256, Math.round(CW * unit * 1.25)));
      if (want !== texW) paintAll(want);
    };

    const live = {
      P: 0,
      from: 0,
      to: 0,
      t0: 0,
      n: STEP_FRAMES,
      v: 0,
      mode: 'rest',
      nextAuto: performance.now() / 1000 + 4,
      autoPending: false,
      fadeFrom: 0,
      fadeT0: 0,
      dragX: 0,
      dragP: 0,
      downX: 0,
      moved: false,
      lastT: 0,
      visible: true
    };

    // Modal DOM elements
    const modalEl = document.getElementById('warpCardModal');
    const modalCloseBtn = document.getElementById('warpModalClose');
    const modalBadge = document.getElementById('warpModalBadge');
    const modalTitle = document.getElementById('warpModalTitle');
    const modalPrice = document.getElementById('warpModalPrice');
    const modalDesc = document.getElementById('warpModalDesc');
    const modalFeatures = document.getElementById('warpModalFeatures');
    const modalBtn = document.getElementById('warpModalBtn');
    const modalBtnText = document.getElementById('warpModalBtnText');
    const modalNote = document.getElementById('warpModalNote');
    const stageHintBtn = document.getElementById('warpStageHint');

    function openCardModal(idx) {
      const card = cards[mod(idx, N)];
      if (!modalEl || !card) return;

      if (modalBadge) modalBadge.textContent = card.badge;
      if (modalTitle) modalTitle.textContent = card.heading;
      if (modalPrice) modalPrice.textContent = card.tag;
      if (modalDesc) modalDesc.textContent = card.desc;
      if (modalNote) modalNote.textContent = card.note;

      if (modalBtn) {
        modalBtn.href = card.btnHref;
        modalBtn.target = card.btnTarget;
        modalBtn.style.setProperty('--btn-grad-from', card.gradientTo || '#0072ff');
        modalBtn.style.setProperty('--btn-grad-to', card.gradientFrom || '#00c6ff');
      }
      if (modalBtnText) modalBtnText.textContent = card.btnText;

      if (modalFeatures) {
        modalFeatures.innerHTML = (card.features || []).map(f => `
          <li>
            <span class="warp-feature-icon" style="color: ${card.accent || '#10b981'}" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 8.5l3.5 3.5 6.5-7"/>
              </svg>
            </span>
            <span>${f}</span>
          </li>
        `).join('');
      }

      modalEl.style.setProperty('--modal-accent', card.accent || '#10b981');
      modalEl.style.setProperty('--modal-glow', card.glow || '#1b4dff');
      modalEl.classList.add('active');
      modalEl.setAttribute('aria-hidden', 'false');
      document.body.classList.add('warp-modal-open');

      // Pause auto-rotation while modal is open
      live.nextAuto = performance.now() / 1000 + 3600;
    }

    function closeCardModal() {
      if (!modalEl) return;
      modalEl.classList.remove('active');
      modalEl.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('warp-modal-open');
      live.nextAuto = performance.now() / 1000 + 4;
      kick();
    }

    function updateDock(idx) {
      const activeCard = cards[mod(idx, N)];
      if (stageHintBtn) {
        const textSpan = stageHintBtn.querySelector('.warp-hint-text');
        if (textSpan) {
          textSpan.textContent = `Подробнее о «${activeCard.heading}»`;
        }
      }
    }

    function setCardIndex(targetIndex) {
      const now = performance.now() / 1000;
      const currentFront = mod(Math.round(live.P), N);
      let delta = targetIndex - currentFront;
      if (Math.abs(delta) > N / 2) delta -= Math.sign(delta) * N;
      current = mod(targetIndex, N);
      live.from = live.P;
      live.to = Math.round(live.P) + delta;
      live.t0 = now;
      live.n = 35; // brisk 1.1s turn
      live.mode = 'spin';
      live.nextAuto = now + 5.5;
      updateDock(current);
      kick();
    }

    const poseSet = P => {
      const ids = Array.from({ length: N }, (_, c) => ({ c, q: mod(c - P + N / 2, N) - N / 2 }))
        .sort((a, b) => Math.abs(a.q) - Math.abs(b.q))
        .slice(0, 4);
      return ids.map(({ c, q }) => (Math.abs(q) > 2.05 ? { pose: [0, 0, 0], layer: -1 } : { pose: poseAt(q), layer: c }));
    };

    const progressAt = now => {
      if (live.mode === 'spin') {
        const f = (now - live.t0) * 30;
        live.P = live.from + (live.to - live.from) * spinN(f, live.n);
        if (f >= live.n) live.mode = 'rest';
      } else if (live.mode === 'spring') {
        const dt = Math.min(0.034, Math.max(0, now - live.lastT));
        live.lastT = now;
        const sub = 4;
        for (let i = 0; i < sub; i++) {
          const acc = -60 * (live.P - live.to) - 13 * live.v;
          live.v += (acc * dt) / sub;
          live.P += (live.v * dt) / sub;
        }
        if (Math.abs(live.P - live.to) < 4e-4 && Math.abs(live.v) < 3e-3) {
          live.P = live.to;
          live.v = 0;
          live.mode = 'rest';
        }
      }
      return { P: live.P, Pb: 0, mix: 0 };
    };

    const poseArr = new Float32Array(32);
    const glowArr = new Float32Array(24);
    const shapeArr = new Float32Array(24);

    const fill = (set, off) => {
      set.forEach((s, i) => {
        const j = off + i;
        poseArr[j * 4] = s.pose[0];
        poseArr[j * 4 + 1] = s.pose[1];
        poseArr[j * 4 + 2] = s.pose[2];
        poseArr[j * 4 + 3] = s.layer;
        const gc = s.layer >= 0 ? glowCols[s.layer] : [255, 255, 255];
        glowArr[j * 3] = gc[0] / 255;
        glowArr[j * 3 + 1] = gc[1] / 255;
        glowArr[j * 3 + 2] = gc[2] / 255;
        const gs = s.layer >= 0 ? glowShape(s.pose) : [0, 1, 0];
        shapeArr[j * 3] = gs[0];
        shapeArr[j * 3 + 1] = gs[1];
        shapeArr[j * 3 + 2] = gs[2];
      });
    };

    const draw = now => {
      const { P, Pb, mix } = progressAt(now);
      const setA = poseSet(P);
      const bg = getBg();
      if (gls) {
        const { gl, prog, loc } = gls;
        gl.viewport(0, 0, W, H);
        gl.useProgram(prog);
        fill(setA, 0);
        if (mix > 0) fill(poseSet(Pb), 4);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, gls.tex);
        gl.uniform1i(loc.uTex, 0);
        gl.uniform2f(loc.uRes, W, H);
        gl.uniform1f(loc.uUnit, unit);
        gl.uniform4fv(loc.uPose, poseArr);
        gl.uniform3fv(loc.uGlowCol, glowArr);
        gl.uniform3fv(loc.uGlowShape, shapeArr);
        gl.uniform3f(loc.uBg, bg[0] / 255, bg[1] / 255, bg[2] / 255);
        gl.uniform1f(loc.uWarp, 0.85);
        gl.uniform1f(loc.uMix, mix);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (ctx2d) {
        const css = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
        drawFallback(ctx2d, W, H, unit, setA, cardCanvases, css, glowCols);
      }
    };

    const loop = () => {
      raf = 0;
      if (!live.visible) return;
      const now = performance.now() / 1000;
      if (live.mode !== 'drag' && live.mode !== 'spring' && now >= live.nextAuto) {
        live.nextAuto = now + 4.2;
        current = mod(current + 1, N);
        setCardIndex(current);
      }
      draw(now);
      if (live.mode !== 'rest' || true) {
        raf = requestAnimationFrame(loop);
      }
    };

    const kick = () => {
      if (!raf && live.visible) raf = requestAnimationFrame(loop);
    };

    // Interaction handlers
    wrap.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      wrap.setPointerCapture?.(e.pointerId);
      live.mode = 'drag';
      live.dragX = e.clientX;
      live.downX = e.clientX;
      live.dragP = live.P;
      live.v = 0;
      live.moved = false;
      live.lastT = performance.now() / 1000;
      kick();
    });

    wrap.addEventListener('pointermove', e => {
      if (live.mode === 'drag') {
        const r = wrap.getBoundingClientRect();
        const unitCss = getUnitCss(r);
        const now = performance.now() / 1000;
        const P = live.dragP - (e.clientX - live.dragX) / (unitCss * 280);
        const dt = Math.max(1 / 240, now - live.lastT);
        live.v = 0.6 * live.v + 0.4 * ((P - live.P) / dt);
        live.P = P;
        live.lastT = now;
        if (Math.abs(e.clientX - live.downX) > 6) live.moved = true;
        draw(now);
      } else {
        const r = wrap.getBoundingClientRect();
        const unitCss = getUnitCss(r);
        const u = (e.clientX - r.left - r.width / 2) / (unitCss * 180);
        if (Math.abs(u) <= 0.8) {
          wrap.style.cursor = 'pointer';
          wrap.title = 'Нажмите, чтобы открыть подробности';
        } else {
          wrap.style.cursor = 'grab';
          wrap.removeAttribute('title');
        }
      }
    });

    wrap.addEventListener('pointerup', e => {
      if (live.mode !== 'drag') return;
      const now = performance.now() / 1000;
      live.nextAuto = now + 5;
      if (!live.moved) {
        live.mode = 'rest';
        const r = wrap.getBoundingClientRect();
        const unitCss = getUnitCss(r);
        const u = (e.clientX - r.left - r.width / 2) / (unitCss * 180);
        if (Math.abs(u) <= 0.8) {
          // Click on front card -> open full detail modal
          openCardModal(current);
        } else if (u > 0.8) {
          setCardIndex(current + 1);
        } else if (u < -0.8) {
          setCardIndex(current - 1);
        }
        return;
      }
      if (now - live.lastT > 0.08) live.v = 0;
      const target = Math.round(live.P + live.v * 0.16);
      live.to = target;
      live.mode = 'spring';
      live.lastT = now;
      current = mod(target, N);
      updateDock(current);
      kick();
    });

    wrap.addEventListener('pointercancel', () => {
      live.mode = 'rest';
    });

    // Theme observer to re-render background immediately
    const themeObs = new MutationObserver(() => {
      draw(performance.now() / 1000);
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Modal & hint controls
    if (stageHintBtn) stageHintBtn.addEventListener('click', () => openCardModal(current));
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeCardModal);
    if (modalEl) {
      modalEl.addEventListener('click', e => {
        if (e.target === modalEl || e.target.classList.contains('warp-modal-container')) {
          closeCardModal();
        }
      });
    }
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalEl && modalEl.classList.contains('active')) {
        closeCardModal();
      }
    });

    // Navigation buttons (prev/next)
    const prevBtn = document.getElementById('warpPrevBtn');
    const nextBtn = document.getElementById('warpNextBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => setCardIndex(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => setCardIndex(current + 1));

    // Intersection observer
    const io = new IntersectionObserver(ents => {
      live.visible = ents.some(e => e.isIntersecting);
      if (live.visible) kick();
    });
    io.observe(wrap);

    window.addEventListener('resize', () => {
      resize();
      draw(performance.now() / 1000);
    });

    // Initial setup
    resize();
    updateDock(0);
    kick();

    // Global hook for chooser & external links
    window.warpCarousel = {
      setIndex: setCardIndex,
      next: () => setCardIndex(current + 1),
      prev: () => setCardIndex(current - 1),
      openModal: openCardModal,
      closeModal: closeCardModal,
      getIndex: () => current
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWarpCarousel);
  } else {
    initWarpCarousel();
  }
})();
