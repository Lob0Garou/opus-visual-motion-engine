#!/usr/bin/env node
// qa.mjs — automated render + critique evidence for a single-file HTML deliverable.
//
//   node qa.mjs <file.html> [--out <dir>] [--step 0.5] [--at 1.2,3.4] [--width W --height H] [--mode video|page]
//
// Moments: if the page exposes window.SCENES ({name:[start,end]} or [{name,start,end}]), each scene is
// also captured on entry, middle and end (moments.png); --at adds exact times (e.g. the signature moment).
// Mark deliberate layering with data-qa-allow-overlap on an ancestor (skips collision/over-graphics).
//
// Video mode (window.DURATION + window.seek present): captures a step grid via seek(t),
// checks determinism, frozen timeline, dead air, empty frames, unsettled end, text
// collisions, text over other graphics, clipping, contrast, min type size, reduced motion,
// console errors, forbidden APIs, AI-template tells. Writes frames/, contact-sheet.png,
// report.json, report.md. Page mode: desktop + mobile + dark screenshots and the same
// layout/contrast/template checks plus mobile horizontal overflow.
//
// Exit code: 0 = no FAIL, 1 = at least one FAIL, 2 = usage/setup error.
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPlaywright, parseArgs, resolveHtml, seekTo, settle, fmt, LAUNCH } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const file = resolveHtml(args._[0]);
const outDir = path.resolve(args.out || path.join(path.dirname(file), 'qa-' + path.basename(file, '.html')));
const STEP = Number(args.step || 0.5);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(path.join(outDir, 'frames'), { recursive: true });

const { chromium } = await loadPlaywright();
const browser = await chromium.launch(LAUNCH);
const url = pathToFileURL(file).href;
const src = readFileSync(file, 'utf8');

const findings = [];            // { level: FAIL|WARN|INFO, check, msg, at? }
const add = (level, check, msg, at) => findings.push({ level, check, msg, ...(at !== undefined ? { at } : {}) });

// ---------------------------------------------------------------- static source scan
function staticScan(isVideo) {
  const code = src.replace(/<!--[\s\S]*?-->/g, '');
  if (isVideo) {
    if (/\bset(Timeout|Interval)\s*\(/.test(code))
      add('FAIL', 'forbidden-api', 'setTimeout/setInterval found — timeline state must derive from t only');
    if (/Math\.random\s*\(/.test(code))
      add('WARN', 'determinism', 'Math.random() found — use a seeded PRNG (mulberry32) for anything that reaches a frame');
    if (/Date\.now\s*\(|performance\.now\s*\(/.test(code) && !/requestAnimationFrame/.test(code))
      add('WARN', 'determinism', 'Date.now()/performance.now() used outside a playback clock');
  }
  if (/\b100vh\b/.test(code)) add('WARN', 'responsive', '100vh used — use height:100% on html/body (mobile toolbars)');
  if (/localStorage|sessionStorage|indexedDB/.test(code))
    add('WARN', 'state', 'browser storage used — must be try/catch wrapped and never hold timeline state');
  if (!/viewport-fit\s*=\s*cover/.test(code)) add('WARN', 'responsive', 'meta viewport lacks viewport-fit=cover');
  if (!/prefers-color-scheme\s*:\s*dark/.test(code)) add('WARN', 'tokens', 'no prefers-color-scheme: dark token layer');
  else if (!/data-theme/.test(code)) add('WARN', 'tokens', 'dark tokens lack the :root[data-theme] override layers');
  for (const m of code.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
    const u = m[1];
    if (/^https?:/.test(u) && !/@\d|\/\d+\.\d+(\.\d+)?\//.test(u))
      add('WARN', 'cdn', `external script not version-pinned: ${u}`);
  }
}

// ---------------------------------------------------------------- in-page probe
// Collects visible text runs (per line box) with style, plus template-tell stats.
function probePage() {
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const effOpacity = (el) => {
    let op = 1;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return 0;
      op *= parseFloat(s.opacity);
      const fo = a instanceof SVGElement ? parseFloat(s.fillOpacity || '1') : 1;
      if (a === el) op *= fo;
    }
    return op;
  };
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
  let i = 0;
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const txt = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,[data-qa-ignore]')) continue;
    const op = effOpacity(el);
    if (op < 0.1) continue;
    const s = getComputedStyle(el);
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter(r => r.width >= 2 && r.height >= 2)
      .map(r => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
    if (!rects.length) continue;
    const isSvg = el instanceof SVGElement;
    const color = parse(isSvg ? (s.fill && s.fill !== 'none' ? s.fill : s.color) : s.color);
    // SVG text font-size is in user units; convert with the element's screen CTM scale
    let size = parseFloat(s.fontSize);
    if (isSvg && el.getScreenCTM) { const m = el.getScreenCTM(); if (m) size *= Math.hypot(m.a, m.b); }
    texts.push({ id: i++, text: txt.slice(0, 48), rects, color, size, weight: s.fontWeight,
      family: s.fontFamily.split(',')[0].replace(/["']/g, '').trim(), op,
      upperTracked: s.textTransform === 'uppercase' && parseFloat(s.letterSpacing) >= 0.05 * parseFloat(s.fontSize),
      tag: el.tagName.toLowerCase(), inLink: !!el.closest('a,button'), allowOverlap: !!el.closest('[data-qa-allow-overlap]') });
  }
  // template tells
  const all = [...document.querySelectorAll('body *')];
  let gradients = 0; const radii = {}; const shadows = {};
  for (const el of all) {
    const s = getComputedStyle(el);
    if (s.display === 'none') continue;
    if (/gradient\(/.test(s.backgroundImage)) gradients++;
    const r = s.borderTopLeftRadius; if (r && r !== '0px') radii[r] = (radii[r] || 0) + 1;
    const sh = s.boxShadow; if (sh && sh !== 'none') shadows[sh] = (shadows[sh] || 0) + 1;
  }
  // stroke-dashoffset is a no-op without a dasharray (classic "line never draws" bug)
  const deadDash = [...document.querySelectorAll('svg *')].filter(e => {
    const s = getComputedStyle(e);
    const off = e.getAttribute('stroke-dashoffset') ?? e.style.strokeDashoffset;
    return off && off !== '0' && (s.strokeDasharray === 'none' || !s.strokeDasharray);
  }).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''));
  // first-choice font families that did not load (canvas width equals both generic fallbacks)
  const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|-apple-system|blinkmacsystemfont|emoji|math)$/i;
  const cv = document.createElement('canvas').getContext('2d');
  const wOf = (f) => { cv.font = '40px ' + f; return cv.measureText('Hamburgefonstiv 0123456789 WMwm').width; };
  const missingFonts = [...new Set(texts.map(t => t.family))].filter(f => f && !GENERIC.test(f) &&
    wOf(`"${f}", monospace`) === wOf('monospace') && wOf(`"${f}", serif`) === wOf('serif'));
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
  const htmlBg = parse(getComputedStyle(document.documentElement).backgroundColor);
  const stage = document.querySelector('#stage');
  return { texts, gradients, radii, shadows, bodyBg, htmlBg, deadDash, missingFonts,
    docW: document.documentElement.scrollWidth, vw: innerWidth,
    stage: stage ? { w: stage.offsetWidth, h: stage.offsetHeight } : null,
    wide: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 6).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : '')) };
}

// ---------------------------------------------------------------- pixel analysis page
// Runs in a blank page: decodes PNGs on canvas; computes coverage, diffs, contrast, clutter.
async function makeAnalyzer() {
  const page = await browser.newPage();
  await page.setContent('<canvas id=c></canvas>');
  return {
    page,
    async frameStats(b64, prevB64) {
      return page.evaluate(async ([b64, prevB64]) => {
        const load = (b) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b; });
        const W = 320, H = Math.round(320 * 9 / 16);
        const px = async (b) => { const img = await load(b); const c = document.createElement('canvas');
          const h = Math.round(W * img.height / img.width); c.width = W; c.height = h;
          const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, h); return x.getImageData(0, 0, W, h).data; };
        const a = await px(b64);
        // background = most common quantized color
        const hist = new Map();
        for (let i = 0; i < a.length; i += 4) { const k = (a[i] >> 3) << 10 | (a[i + 1] >> 3) << 5 | (a[i + 2] >> 3); hist.set(k, (hist.get(k) || 0) + 1); }
        let bk = 0, bc = -1; for (const [k, c] of hist) if (c > bc) { bc = c; bk = k; }
        const bg = [((bk >> 10) & 31) * 8 + 4, ((bk >> 5) & 31) * 8 + 4, (bk & 31) * 8 + 4];
        let ink = 0, n = a.length / 4;
        for (let i = 0; i < a.length; i += 4) {
          const d = Math.abs(a[i] - bg[0]) + Math.abs(a[i + 1] - bg[1]) + Math.abs(a[i + 2] - bg[2]);
          if (d > 36) ink++;
        }
        let diff = null;
        if (prevB64) { const b = await px(prevB64); let ch = 0;
          for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) ch++;
          diff = ch / n; }
        return { coverage: ink / n, diff, bg };
      }, [b64, prevB64 || null]);
    },
    async textChecks(b64, texts) {
      return page.evaluate(async ([b64, texts]) => {
        const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
        const lum = (r, g, b) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
          return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
        const ratio = (p, q) => { const A = lum(...p) + .05, B = lum(...q) + .05; return A > B ? A / B : B / A; };
        const out = [];
        for (const t of texts) {
          if (!t.color || t.op < 0.95) continue;
          // sample union of line rects
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          for (const r of t.rects) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
          x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
          x1 = Math.min(img.width, Math.ceil(x1)); y1 = Math.min(img.height, Math.ceil(y1));
          if (x1 - x0 < 2 || y1 - y0 < 2) continue;
          const d = x.getImageData(x0, y0, x1 - x0, y1 - y0).data;
          const tc = t.color;
          const far = (i) => Math.abs(d[i] - tc[0]) + Math.abs(d[i + 1] - tc[1]) + Math.abs(d[i + 2] - tc[2]) > 30;
          const hist = new Map();
          for (let i = 0; i < d.length; i += 4) if (far(i)) { const k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); hist.set(k, (hist.get(k) || 0) + 1); }
          if (!hist.size) continue;
          let bk = 0, bc = -1; for (const [k, v] of hist) if (v > bc) { bc = v; bk = k; }
          const bg = [((bk >> 10) & 31) * 8 + 4, ((bk >> 5) & 31) * 8 + 4, (bk & 31) * 8 + 4];
          const a = tc[3] ?? 1;
          const fg = [0, 1, 2].map(k => tc[k] * a + bg[k] * (1 - a));
          // clutter: pixels far from the bg→fg segment (anti-aliasing lies on the segment)
          let clutter = 0, n = d.length / 4;
          const sx = fg[0] - bg[0], sy = fg[1] - bg[1], sz = fg[2] - bg[2], L2 = sx * sx + sy * sy + sz * sz || 1;
          for (let i = 0; i < d.length; i += 4) {
            const px = d[i] - bg[0], py = d[i + 1] - bg[1], pz = d[i + 2] - bg[2];
            const u = Math.min(1, Math.max(0, (px * sx + py * sy + pz * sz) / L2));
            const ex = px - u * sx, ey = py - u * sy, ez = pz - u * sz;
            if (Math.sqrt(ex * ex + ey * ey + ez * ez) > 48) clutter++;
          }
          out.push({ id: t.id, contrast: ratio(fg, bg), clutter: clutter / n });
        }
        return out;
      }, [b64, texts]);
    },
    async contactSheet(frames, cols = 6) {
      return page.evaluate(async ([frames, cols]) => {
        const load = (b) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b; });
        const first = await load(frames[0].b64);
        const TW = 320, TH = Math.round(TW * first.height / first.width), G = 6, LBL = 22;
        const rows = Math.ceil(frames.length / cols);
        const c = document.createElement('canvas'); c.width = cols * (TW + G) + G; c.height = rows * (TH + LBL + G) + G;
        const x = c.getContext('2d'); x.fillStyle = '#202326'; x.fillRect(0, 0, c.width, c.height);
        for (let i = 0; i < frames.length; i++) {
          const img = await load(frames[i].b64);
          const cx = G + (i % cols) * (TW + G), cy = G + Math.floor(i / cols) * (TH + LBL + G);
          x.fillStyle = '#e8e6e1'; x.font = '600 14px system-ui, sans-serif'; x.fillText((frames[i].label ? frames[i].label + '  ' : '') + 't = ' + frames[i].t.toFixed(2) + 's', cx + 2, cy + 15);
          x.drawImage(img, cx, cy + LBL, TW, TH);
        }
        return c.toDataURL('image/png').split(',')[1];
      }, [frames, cols]);
    },
  };
}

// ---------------------------------------------------------------- shared text-level rules
const seenMsg = new Set();
const once = (level, check, msg, at) => { const k = check + '|' + msg; if (seenMsg.has(k)) return; seenMsg.add(k); add(level, check, msg, at); };
const rectsOverlap = (A, B) => {
  let best = 0;
  for (const a of A) for (const b of B) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (w > 0 && h > 0) best = Math.max(best, (w * h) / Math.min(a.w * a.h, b.w * b.h));
  }
  return best;
};
function layoutRules(probe, checks, at, ctx) {
  const T = probe.texts;
  const byId = new Map(T.map(t => [t.id, t]));
  // collisions
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    if (T[i].allowOverlap || T[j].allowOverlap) continue;
    if (T[i].op >= 0.3 && T[j].op >= 0.3 && rectsOverlap(T[i].rects, T[j].rects) > 0.2)
      once('FAIL', 'text-collision', `"${T[i].text}" overlaps "${T[j].text}"`, at);
  }
  // clipping
  for (const t of T) for (const r of t.rects) {
    if (r.x < -4 || r.y < -4 || r.x + r.w > ctx.W + 4 || (ctx.clipY && r.y + r.h > ctx.H + 4)) {
      once('FAIL', 'clipped', `"${t.text}" extends outside the frame`, at); break;
    }
  }
  for (const f of probe.missingFonts || [])
    once('WARN', 'font', `font-family "${f}" did not load — text renders in a fallback, so widths and the pre-render math are off (check the font URL / @font-face)`);
  for (const d of probe.deadDash || [])
    once('FAIL', 'dead-dash', `${d} animates stroke-dashoffset but has no stroke-dasharray — the line is drawn in full, the draw-on never happens`, at);
  // min size
  for (const t of T) if (t.size < ctx.minSize)
    once('WARN', 'type-size', `"${t.text}" is ${t.size.toFixed(1)}px (< ${ctx.minSize}px readable floor for this frame)`, at);
  // contrast + clutter from pixels
  for (const c of checks) {
    const t = byId.get(c.id); if (!t) continue;
    const large = t.size >= 24 || (t.size >= 18.66 && Number(t.weight) >= 700);
    const need = large ? 3 : 4.5;
    if (c.contrast < need)
      once(c.contrast < need - 1.5 ? 'FAIL' : 'WARN', 'contrast', `"${t.text}" contrast ${c.contrast.toFixed(2)}:1 (need ${need}:1)${ctx.tag || ''}`, at);
    if (c.clutter > 0.14 && !t.allowOverlap)
      once('WARN', 'text-over-graphics', `"${t.text}" sits on other graphics (${Math.round(c.clutter * 100)}% foreign pixels)${ctx.tag || ''}`, at);
  }
}
function templateRules(probe) {
  const T = probe.texts;
  const fams = {}; for (const t of T) fams[t.family] = (fams[t.family] || 0) + 1;
  const top = Object.entries(fams).sort((a, b) => b[1] - a[1])[0];
  if (top && /^inter$/i.test(top[0]) && top[1] / T.length > 0.5) once('WARN', 'ai-tell', 'Inter is the dominant family — choose type for this subject');
  const up = T.filter(t => t.upperTracked).length;
  if (up >= 2) once('WARN', 'ai-tell', `${up} tracked ALL-CAPS labels (eyebrow tell)`);
  if (probe.gradients > 1) once('WARN', 'ai-tell', `${probe.gradients} gradient backgrounds — gradients only for a continuous physical property`);
  const arrows = T.filter(t => t.inLink && /→\s*$/.test(t.text)).length;
  if (arrows) once('WARN', 'ai-tell', `"→" appended to ${arrows} link/button label(s)`);
  const dots = T.filter(t => / · /.test(t.text)).length;
  if (dots >= 3) once('WARN', 'ai-tell', `${dots} middle-dot meta strings`);
  const radiusTotal = Object.values(probe.radii).reduce((a, b) => a + b, 0);
  const topR = Object.entries(probe.radii).sort((a, b) => b[1] - a[1])[0];
  if (radiusTotal >= 6 && topR && topR[1] / radiusTotal >= 0.9) once('WARN', 'ai-tell', `uniform border-radius ${topR[0]} on ${topR[1]} elements — use radius tokens by hierarchy`);
  const topS = Object.entries(probe.shadows).sort((a, b) => b[1] - a[1])[0];
  if (topS && topS[1] >= 6) once('WARN', 'ai-tell', `identical box-shadow on ${topS[1]} elements (SaaS-card kit)`);
  const bg = probe.bodyBg && probe.bodyBg[3] > 0 ? probe.bodyBg : probe.htmlBg;
  const near = (c, h, tol) => c && Math.abs(c[0] - h[0]) + Math.abs(c[1] - h[1]) + Math.abs(c[2] - h[2]) < tol;
  if (near(bg, [0xF4, 0xF1, 0xEA], 30) && T.some(t => near(t.color, [0xD9, 0x77, 0x57], 60)))
    once('WARN', 'ai-tell', 'cream #F4F1EA-ish surface + terracotta #D97757-ish accent (cluster 1)');
}

// ---------------------------------------------------------------- run
const errors = [];
async function openPage(opts) {
  const ctx = await browser.newContext({ deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push({ level: 'FAIL', msg: 'page error: ' + e.message }));
  page.on('console', m => { if (m.type() === 'error') errors.push({ level: 'WARN', msg: 'console error: ' + m.text().slice(0, 200) }); });
  page.on('requestfailed', r => errors.push({ level: 'WARN', msg: 'request failed: ' + r.url().slice(0, 120) }));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await settle(page);
  return { ctx, page };
}

let W = Number(args.width || 1920), H = Number(args.height || 1080);
let { ctx, page } = await openPage({ viewport: { width: W, height: H } });
const hasVideo = await page.evaluate(() => typeof window.seek === 'function' && Number.isFinite(window.DURATION) && window.DURATION > 0);
const mode = args.mode || (hasVideo ? 'video' : 'page');
staticScan(mode === 'video');
const analyzer = await makeAnalyzer();
const report = { file, mode, outDir, frames: [] };

if (mode === 'video') {
  if (!hasVideo) { add('FAIL', 'contract', 'window.DURATION (number > 0) and window.seek(t) are required'); }
  else {
    // match viewport to the logical stage so capture is 1:1
    const st = await page.evaluate(() => { const s = document.querySelector('#stage'); return s ? [s.offsetWidth, s.offsetHeight] : null; });
    if (!st) add('WARN', 'contract', 'no #stage element — frames depend on the viewport size');
    else if (!args.width && (st[0] !== W || st[1] !== H)) {
      await ctx.close(); W = st[0]; H = st[1];
      ({ ctx, page } = await openPage({ viewport: { width: W, height: H } }));
    }
    const D = await page.evaluate(() => window.DURATION);
    report.duration = D; report.size = [W, H];
    const times = []; for (let t = 0; t < D - 1e-9; t += STEP) times.push(+t.toFixed(4)); times.push(D);
    const shots = [];
    let prev = null; const minSize = Math.round(H / 60);
    for (const t of times) {
      await seekTo(page, t);
      const buf = await page.screenshot();
      const b64 = buf.toString('base64');
      writeFileSync(path.join(outDir, 'frames', `t_${fmt(t)}.png`), buf);
      const probe = await page.evaluate(probePage);
      const stats = await analyzer.frameStats(b64, prev);
      const checks = await analyzer.textChecks(b64, probe.texts);
      layoutRules(probe, checks, t, { W, H, minSize, clipY: true });
      if (t === D / 2 || Math.abs(t - D / 2) < STEP / 2) templateRules(probe);
      report.frames.push({ t, coverage: +stats.coverage.toFixed(4), diff: stats.diff == null ? null : +stats.diff.toFixed(4), texts: probe.texts.length });
      shots.push({ t, b64 });
      prev = b64;
    }
    // frozen / dead air / empty / settle
    const F = report.frames;
    const moving = F.filter(f => f.diff != null && f.diff > 0.0005).length;
    if (D >= 2 && moving < 2) add('FAIL', 'frozen', `timeline frozen: only ${moving} of ${F.length - 1} steps change the frame — check seek()/render(t) units (seconds vs 0..1)`);
    let run = 0, worst = 0, worstAt = 0;
    for (const f of F) { if (f.diff != null && f.diff <= 0.0005) { run += STEP; if (run > worst) { worst = run; worstAt = f.t; } } else run = 0; }
    if (worst >= 0.6 * D && D >= 2) add('FAIL', 'frozen', `${worst.toFixed(1)}s of ${D}s show no change (ending t=${worstAt.toFixed(2)}s) — timeline frozen: check render(t) clamps seconds, not 0..1`);
    else if (worst > Math.max(2.5, 0.35 * D)) add('WARN', 'dead-air', `${worst.toFixed(1)}s without visible change ending at t=${worstAt.toFixed(2)}s — intended hold? (a hold needs a reason in the scene card)`);
    // near-empty spans ≥0.5s (a shorter clean dip between scenes is a legitimate cut)
    const spans = []; let cur = null;
    for (const f of F) {
      const e = f.t >= 0.5 && f.t <= D - 0.5 && f.coverage < 0.004;
      if (e) { if (!cur) spans.push(cur = [f.t, f.t]); else cur[1] = f.t; } else cur = null;
    }
    const long = spans.filter(([a, b]) => b - a + STEP >= 0.5);
    if (long.length) add('WARN', 'empty-frame', `near-empty frame span(s) at t=${long.map(([a, b]) => a === b ? a : a + '–' + b).join(', ')}s — scene gap or missing ENTER`);
    if (F[0].coverage < 0.004) add('INFO', 'poster', 't=0 is blank — players/thumbnails often show frame 0; consider a composed first frame');
    const low = F.filter(f => f.t >= 0.5 && f.coverage >= 0.004 && f.coverage < 0.015).map(f => f.t);
    if (low.length > F.length * 0.4) add('WARN', 'sparse', `${low.length}/${F.length} frames under 1.5% ink — the subject is too small/thin to read in a video frame; scale it up or add mass`);
    // end settled
    await seekTo(page, Math.max(0, D - 0.1)); const e1 = (await page.screenshot()).toString('base64');
    await seekTo(page, D); const e2 = (await page.screenshot()).toString('base64');
    const endDiff = (await analyzer.frameStats(e2, e1)).diff;
    if (endDiff > 0.002) add('WARN', 'unsettled-end', `last 0.1s still moving (${(endDiff * 100).toFixed(2)}% pixels) — end on a settled frame`);
    // determinism: revisit samples out of order
    const sample = [0.8, 0.3, 0.55].map(p => shots[Math.min(shots.length - 1, Math.round(p * (shots.length - 1)))]);
    for (const s of sample) {
      await seekTo(page, s.t);
      const again = (await page.screenshot()).toString('base64');
      const d = (await analyzer.frameStats(again, s.b64)).diff;
      if (d > 0.001) add('FAIL', 'determinism', `seek(${s.t}) differs on revisit (${(d * 100).toFixed(2)}% pixels) — state leaks between frames or a clock overrides seek()`, s.t);
    }
    // clamping
    await seekTo(page, -1); const c0 = (await page.screenshot()).toString('base64');
    if ((await analyzer.frameStats(c0, shots[0].b64)).diff > 0.001) add('WARN', 'contract', 'seek(-1) ≠ seek(0) — clamp t inside seek()');
    await seekTo(page, D + 5); const c1 = (await page.screenshot()).toString('base64');
    if ((await analyzer.frameStats(c1, shots[shots.length - 1].b64)).diff > 0.001) add('WARN', 'contract', 'seek(D+5) ≠ seek(D) — clamp t inside seek()');
    // moments: scene entry / middle / end from window.SCENES, plus --at times
    const moments = await page.evaluate(() => {
      const S = window.SCENES, out = [];
      if (S && typeof S === 'object') {
        const list = Array.isArray(S) ? S.map(s => [s.name, s.start, s.end]) : Object.entries(S).map(([k, v]) => [k, v[0], v[1]]);
        for (const [n, a, b] of list) if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
          out.push({ t: a + Math.min(0.3, (b - a) / 4), label: n + ' in' }, { t: (a + b) / 2, label: n + ' mid' }, { t: Math.max(a, b - 0.1), label: n + ' end' });
        }
      }
      return out;
    });
    if (args.at) for (const x of String(args.at).split(',').map(Number).filter(Number.isFinite)) moments.push({ t: x, label: 'at' });
    const seenT = new Set(); const mshots = [];
    for (const m of moments) {
      const t = +Math.min(Math.max(m.t, 0), D).toFixed(3); if (seenT.has(t)) continue; seenT.add(t);
      await seekTo(page, t);
      const buf = await page.screenshot(); const b64 = buf.toString('base64');
      writeFileSync(path.join(outDir, 'frames', `m_${fmt(t)}_${m.label.replace(/[^a-z0-9]+/gi, '-')}.png`), buf);
      const probe = await page.evaluate(probePage);
      layoutRules(probe, await analyzer.textChecks(b64, probe.texts), t, { W, H, minSize, clipY: true });
      mshots.push({ t, b64, label: m.label });
    }
    report.moments = mshots.map(m => ({ t: m.t, label: m.label }));
    if (mshots.length) writeFileSync(path.join(outDir, 'moments.png'), Buffer.from(await analyzer.contactSheet(mshots, mshots.length > 12 ? 6 : 4), 'base64'));
    else add('INFO', 'moments', 'no window.SCENES and no --at: only the uniform grid was captured (expose SCENES to get per-scene frames)');
    const sheet = await analyzer.contactSheet(shots, shots.length > 24 ? 8 : 6);
    writeFileSync(path.join(outDir, 'contact-sheet.png'), Buffer.from(sheet, 'base64'));
    for (const p of [0, .25, .5, .75, 1]) {
      const s = shots.reduce((a, b) => Math.abs(b.t - p * D) < Math.abs(a.t - p * D) ? b : a);
      writeFileSync(path.join(outDir, `key_${String(p * 100).padStart(3, '0')}.png`), Buffer.from(s.b64, 'base64'));
    }
  }
} else {
  // page mode: desktop, mobile, dark
  const targets = [
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { name: 'desktop-dark', viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
  ];
  await ctx.close();
  let lightBg = null;
  for (const tg of targets) {
    const { name, ...opts } = tg;
    const o = await openPage(opts);
    const probe = await o.page.evaluate(probePage);
    const buf = await o.page.screenshot({ fullPage: true });
    writeFileSync(path.join(outDir, `${name}.png`), buf);
    const b64 = buf.toString('base64');
    const checks = await analyzer.textChecks(b64, probe.texts);
    layoutRules(probe, checks, undefined, { W: tg.viewport.width, H: 1e9, minSize: name === 'mobile' ? 12 : 12, clipY: false, tag: ` [${name}]` });
    if (name === 'desktop') { templateRules(probe); lightBg = (await analyzer.frameStats(b64)).bg; }
    // mobile Chromium zooms the layout viewport out to fit overflowing content, so compare
    // against the nominal device width, not innerWidth
    const nominal = tg.viewport.width;
    if (name === 'mobile' && probe.docW > nominal + 1) {
      const wide = await o.page.evaluate((w) => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > w + 1)
        .slice(0, 6).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '')), nominal);
      add('FAIL', 'overflow', `horizontal scroll on mobile: layout ${probe.docW}px > device ${nominal}px (wide: ${wide.join(', ')})`);
    }
    if (name === 'desktop-dark') {
      const darkBg = (await analyzer.frameStats(b64)).bg;
      if (lightBg && Math.abs(darkBg[0] - lightBg[0]) + Math.abs(darkBg[1] - lightBg[1]) + Math.abs(darkBg[2] - lightBg[2]) < 24)
        add('WARN', 'tokens', 'dark color scheme renders the same surface as light — dark tokens missing or not applied');
    }
    report.frames.push({ name, texts: probe.texts.length });
    await o.ctx.close();
  }
}

// reduced motion: infinite CSS loops must stop
{
  const o = await openPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const loops = await o.page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).length);
  if (loops) add('WARN', 'reduced-motion', `${loops} infinite animation(s) still running under prefers-reduced-motion: reduce`);
  await o.ctx.close();
}

for (const e of errors) once(e.level, 'runtime', e.msg);
await browser.close();

// ---------------------------------------------------------------- report
const order = { FAIL: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) => order[a.level] - order[b.level]);
const n = (l) => findings.filter(f => f.level === l).length;
report.summary = { fail: n('FAIL'), warn: n('WARN'), info: n('INFO'), verdict: n('FAIL') ? 'FAIL' : (n('WARN') ? 'PASS_WITH_WARNINGS' : 'PASS') };
report.findings = findings;
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
const md = [
  `# QA report — ${path.basename(file)}`,
  ``,
  `mode: **${mode}**${report.duration ? ` · duration ${report.duration}s · stage ${report.size.join('×')} · step ${STEP}s` : ''}`,
  `verdict: **${report.summary.verdict}** (${report.summary.fail} FAIL · ${report.summary.warn} WARN · ${report.summary.info} INFO)`,
  ``,
  ...(findings.length ? findings.map(f => `- **${f.level}** \`${f.check}\` ${f.msg}${f.at !== undefined ? ` (t=${f.at}s)` : ''}`) : ['- no findings']),
  ``,
  mode === 'video'
    ? `Evidence: \`contact-sheet.png\` (every ${STEP}s)${report.moments && report.moments.length ? ', `moments.png` (' + report.moments.length + ' scene/--at frames)' : ''}, \`key_000..100.png\`, \`frames/\`. If your model reads images, open contact-sheet.png and run the Critique Pass on it; otherwise use the per-frame table in report.json (coverage = ink share, diff = change vs previous step).`
    : `Evidence: \`desktop.png\`, \`mobile.png\`, \`desktop-dark.png\` (full page).`,
  ``,
];
writeFileSync(path.join(outDir, 'report.md'), md.join('\n'));
console.log(md.join('\n'));
console.log(`\nreport: ${path.join(outDir, 'report.md')}`);
process.exit(report.summary.fail ? 1 : 0);
