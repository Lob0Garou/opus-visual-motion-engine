#!/usr/bin/env node
// score.mjs — compose an original score + sound effects for a composition, deterministically,
// from a cue sheet whose timestamps are the SAME numbers the render(t) timeline uses.
//
//   node score.mjs <composition.html | cues.json> [--out score.m4a] [--stems] [--lufs -14]
//
// The cue sheet is JSON, either a file or a <script type="application/json" id="score"> block
// inside the composition (single source of truth: picture and sound share one timeline):
//
//   { "duration": 15, "bpm": 120, "downbeat": 1.0, "seed": 7, "lufs": -14,
//     "sections": [ { "from": 0,   "to": 1,  "style": "intro",  "key": "A", "mode": "minor" },
//                   { "from": 1,   "to": 4.7,"style": "groove", "key": "A", "mode": "minor", "chords": ["i","VI","i","VII"] },
//                   { "from": 5,   "to": 7,  "style": "build",  "key": "A", "mode": "minor" },
//                   { "from": 7,   "to": 13, "style": "drive",  "key": "C", "mode": "major", "chords": ["I","IV","V"] },
//                   { "from": 13.5,"to": 15, "style": "resolve","key": "C", "mode": "major" } ],
//     "hits": [ { "t": 1.0, "sfx": "impact" }, { "t": 1.5, "sfx": "whoosh" }, { "t": 3.55, "sfx": "glitch", "dur": 0.5 } ] }
//
// styles: intro (clock ticks + drone + riser) · groove (4-on-floor, offbeat hats, claps on 2/4,
//   8th-note bass on chord roots, a chord stab per bar) · drive (groove, brighter, 16th hats, arp) ·
//   build (no kick: rising 16th arpeggio, drone, snare roll, riser into the next section) ·
//   resolve (kick + final chord pad + sub, rings out) · stutter (kick retrigger, for a tear/cut) · silence.
// sfx (t = the frame of the visual hit): impact · whoosh (peak on t) · whoosh-rev · riser (ends on t) ·
//   click · tick · pop · glitch · chime · ping · sparkle · ticks (count-up: {t, to, n}) · sub.
//
// Master: sidechain ducking, small reverb, K-weighted loudness normalised to --lufs (default -14),
// sample peak held under -1.5 dBFS. Output by extension: .m4a (AAC) · .mp3 · .wav. --stems also
// writes <out>.music.wav and <out>.sfx.wav. Levels are re-measured with ffmpeg after encoding.
// Exit 1 on clipping or if the cue sheet is invalid.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const src = args._[0] && path.resolve(args._[0]);
if (!src || !existsSync(src)) { console.error('usage: node score.mjs <composition.html | cues.json> [--out score.m4a] [--stems] [--lufs -14]'); process.exit(2); }
let cue;
try {
  const raw = readFileSync(src, 'utf8');
  if (/\.html?$/i.test(src)) {
    const html = raw.replace(/<!--[\s\S]*?-->/g, '');                  // a comment may mention the tag
    const m = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].find(x => /\bid=["']score["']/i.test(x[1]));
    if (!m) { console.error('no <script type="application/json" id="score"> block in ' + src); process.exit(1); }
    cue = JSON.parse(m[2]);
  } else cue = JSON.parse(raw);
} catch (e) { console.error('cue sheet is not valid JSON: ' + e.message); process.exit(1); }

const SR = 48000;
const DUR = Number(cue.duration);
if (!(DUR > 0)) { console.error('cue sheet needs "duration" (seconds)'); process.exit(1); }
const N = Math.ceil(DUR * SR);
const BPM = Number(cue.bpm || 120), BEAT = 60 / BPM;
const DOWN = Number(cue.downbeat ?? 0);
const TARGET = Number(args.lufs ?? cue.lufs ?? -14);
const out = path.resolve(args.out || src.replace(/\.(html?|json)$/i, '') + '.score.m4a');

// ---------------------------------------------------------------- deterministic noise
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(Number(cue.seed ?? 7));
const noise = (n) => { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = rnd() * 2 - 1; return b; };
const len = (d) => Math.max(1, Math.round(d * SR));

// ---------------------------------------------------------------- filters (RBJ biquads)
function coeffs(type, f, q = 0.707) {
  const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = al; b1 = 0; b2 = -al; }                                    // band-pass (0 dB peak)
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
/** filter in place; f may be a function of the sample index (swept filters, updated every 32 samples) */
function filt(buf, type, f, q) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, k = coeffs(type, typeof f === 'function' ? f(0) : f, q);
  for (let i = 0; i < buf.length; i++) {
    if (typeof f === 'function' && (i & 31) === 0) k = coeffs(type, f(i), q);
    const x = buf[i], y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; buf[i] = y;
  }
  return buf;
}
const lp = (b, f, q) => filt(b, 'lp', f, q), hp = (b, f, q) => filt(b, 'hp', f, q), bp = (b, f, q) => filt(b, 'bp', f, q);
const tanh = (b, g = 1) => { for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * g); return b; };

// ---------------------------------------------------------------- music theory
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const ROMAN = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
function chordMidis(sec, roman, octave = 4) {
  const root = NOTE[sec.key || 'C'] ?? 0, sc = MODES[sec.mode === 'major' ? 'major' : 'minor'];
  const d = ROMAN[String(roman || 'i').toLowerCase().replace(/[^iv]/g, '')] ?? 0;
  const deg = (k) => { const n = d + k; return 12 * octave + root + sc[n % 7] + 12 * Math.floor(n / 7); };
  return [deg(0), deg(2), deg(4)];
}
const scaleMidi = (sec, idx, octave) => { const root = NOTE[sec.key || 'C'] ?? 0, sc = MODES[sec.mode === 'major' ? 'major' : 'minor'];
  const pent = sec.mode === 'major' ? [0, 1, 2, 4, 5] : [0, 2, 3, 4, 6];                // pentatonic subset by scale degree
  const d = pent[((idx % 5) + 5) % 5] + 7 * Math.floor(idx / 5);
  return 12 * octave + root + sc[d % 7] + 12 * Math.floor(d / 7); };

// ---------------------------------------------------------------- instruments (mono voices)
function kick(punch = 1) {
  const n = len(0.45), b = new Float32Array(n); let ph = 0; const cl = hp(noise(n), 2000);
  for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (44 + 120 * Math.exp(-t / 0.032)) / SR;
    b[i] = Math.sin(ph) * Math.exp(-t / (0.22 * punch)) + cl[i] * Math.exp(-t / 0.0025) * 0.35; }
  return tanh(b, 1.6);
}
function clap() {
  const n = len(0.35), nz = bp(noise(n), 1700, 0.9), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; let e = 0;
    [[0, 0.012], [0.011, 0.012], [0.022, 0.11]].forEach(([o, d]) => { if (t >= o) e += Math.exp(-(t - o) / d); });
    b[i] = nz[i] * e * 1.4; }
  return b;
}
function hat(open) { const n = len(open ? 0.22 : 0.06), b = hp(noise(n), 7500);
  for (let i = 0; i < n; i++) b[i] *= Math.exp(-(i / SR) / (open ? 0.07 : 0.014)) * 0.5; return b; }
function tick(f = 3400) { const n = len(0.03), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.004) * 0.6; } return b; }
function saw(freqs, d, detune = 0.006) {
  const n = len(d), b = new Float32Array(n);
  for (const fr of freqs) for (const dt of [-detune, 0, detune]) { const inc = fr * (1 + dt) / SR; let ph = rnd();
    for (let i = 0; i < n; i++) { b[i] += 2 * ph - 1; ph += inc; if (ph >= 1) ph -= 1; } }
  const g = 1 / (3 * Math.max(1, freqs.length)); for (let i = 0; i < n; i++) b[i] *= g; return b;
}
function bass(f, d = 0.24) { const b = saw([f], d, 0.003), n = b.length;
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] = (b[i] + 0.6 * Math.sin(2 * Math.PI * f * t)) * Math.min(1, t / 0.004) * Math.exp(-t / 0.16); }
  return lp(b, 420); }
function stab(freqs, d, cutoff = 2400, rel = 0.5) { const b = lp(saw(freqs, d), cutoff), n = b.length;
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] *= Math.min(1, t / 0.012) * (0.55 + 0.45 * Math.exp(-t / 0.25)) * Math.min(1, Math.max(0, (d - t) / rel)); }
  return b; }
function pluck(f, d = 0.2, bright = 2600) { const n = len(d), b = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += f / SR; b[i] = (ph % 1 < 0.5 ? 1 : -1) * Math.exp(-t / 0.07) * 0.5; }
  return lp(b, bright); }
function pad(freqs, d) { const b = lp(saw(freqs, d, 0.008), 2600), n = b.length;
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] *= Math.min(1, t / 0.02) * Math.exp(-t / (d * 0.55)); } return b; }
function drone(f, d) { const b = lp(saw([f], d, 0.004), 300), n = b.length;
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] *= Math.min(1, t / Math.min(0.4, d / 2)) * Math.min(1, (d - t) / 0.15); } return b; }
function riser(d, f0 = 300, f1 = 7000) { const n = len(d), b = noise(n);
  bp(b, (i) => f0 * Math.pow(f1 / f0, i / n), 1.2);
  for (let i = 0; i < n; i++) b[i] *= Math.pow(i / n, 2.2) * 0.9; return b; }
// ---- sfx
function impact() { const n = len(1.6), b = new Float32Array(n), nz = lp(noise(n), 900); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (30 + 70 * Math.exp(-t / 0.08)) / SR;
    b[i] = Math.sin(ph) * Math.exp(-t / 0.55) + nz[i] * Math.exp(-t / 0.18) * 0.6; }
  return tanh(b, 2.2); }
function sub() { const n = len(1.2), b = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (55 * Math.exp(-t / 0.6) + 28) / SR; b[i] = Math.sin(ph) * Math.exp(-t / 0.5) * Math.min(1, t / 0.005); }
  return b; }
/** whoosh: band-passed noise sweeping up then down; returns [buffer, index of the peak] */
function whoosh(d = 0.6) { const n = len(d), pk = Math.round(n * 0.7), b = noise(n);
  bp(b, (i) => i < pk ? 400 * Math.pow(9, i / pk) : 3600 * Math.pow(0.25, (i - pk) / (n - pk)), 0.9);
  for (let i = 0; i < n; i++) b[i] *= (i < pk ? Math.pow(i / pk, 2) : Math.pow(1 - (i - pk) / (n - pk), 1.4)) * 1.4;
  return [b, pk]; }
function click() { const n = len(0.04), b = hp(noise(n), 3000);
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] = b[i] * Math.exp(-t / 0.002) + Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t / 0.008) * 0.5; } return b; }
function pop() { const n = len(0.12), b = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (180 + 520 * Math.exp(-t / 0.018)) / SR; b[i] = Math.sin(ph) * Math.exp(-t / 0.04); } return b; }
function glitch(d = 0.5) { const n = len(d), b = new Float32Array(n), nz = noise(n); const hold = Math.round(SR / 1400);
  let v = 0; for (let i = 0; i < n; i++) { if (i % hold === 0) v = nz[i]; const seg = Math.floor(i / (SR * 0.035));
    const gate = mulberry32(seg * 13 + 5)() > 0.35 ? 1 : 0; const sq = (Math.floor(i / (SR / (300 + 900 * mulberry32(seg * 7 + 1)()))) % 2) ? 0.5 : -0.5;
    b[i] = (Math.round(v * 6) / 6 * 0.7 + sq * 0.4) * gate * Math.pow(1 - i / n, 0.6); }
  return hp(b, 180); }
function bell(f, d = 1.8) { const n = len(d), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR, e = Math.exp(-t / (d / 3));
    b[i] = Math.sin(2 * Math.PI * f * t + 2.2 * e * Math.sin(2 * Math.PI * f * 3.5 * t)) * e * 0.5; } return b; }
function ping() { const n = len(0.7), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 1760 * t) + 0.3 * Math.sin(2 * Math.PI * 3520 * t)) * Math.exp(-t / 0.14) * 0.5; } return b; }

// ---------------------------------------------------------------- buses
const music = [new Float32Array(N), new Float32Array(N)];
const fx = [new Float32Array(N), new Float32Array(N)];
const verbSend = [new Float32Array(N), new Float32Array(N)];
const duck = new Float32Array(N).fill(1);
function put(bus, sig, t0, gain = 1, pan = 0, send = 0) {
  const i0 = Math.round(t0 * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let k = 0; k < sig.length; k++) { const i = i0 + k; if (i < 0) continue; if (i >= N) break;
    bus[0][i] += sig[k] * gl * Math.SQRT2; bus[1][i] += sig[k] * gr * Math.SQRT2;
    if (send) { verbSend[0][i] += sig[k] * gl * send; verbSend[1][i] += sig[k] * gr * send; } }
}
function kickAt(t, g = 1, punch = 1) {
  put(music, kick(punch), t, g * 0.9);
  const i0 = Math.round(t * SR), L = len(0.22);
  for (let k = 0; k < L && i0 + k < N; k++) if (i0 + k >= 0) duck[i0 + k] = Math.min(duck[i0 + k], 1 - 0.7 * Math.exp(-k / (0.06 * SR)));
}
const beatsIn = (a, b, sub = 1) => { const out = []; const st = BEAT / sub;
  const k0 = Math.ceil((a - DOWN) / st - 1e-6), k1 = Math.floor((b - DOWN) / st - 1e-6);
  for (let k = k0; k <= k1; k++) { const t = DOWN + k * st; if (t >= a - 1e-6 && t < b - 1e-6) out.push({ t, k }); } return out; };
const md = (k, m) => ((k % m) + m) % m;
const barOf = (t) => Math.floor((t - DOWN) / (4 * BEAT) + 1e-6);

// ---------------------------------------------------------------- arrangement from sections
const secs = (cue.sections || []).slice().sort((a, b) => a.from - b.from);
for (const s of secs) {
  const a = Math.max(0, s.from), b = Math.min(DUR, s.to), style = s.style || 'groove';
  const root = (NOTE[s.key || 'A'] ?? 9);
  if (style === 'silence') continue;
  if (style === 'intro') {
    for (const { t, k } of beatsIn(a, b, 4)) put(music, tick(md(k, 4) === 0 ? 3400 : 2600), t, md(k, 4) === 0 ? 0.55 : 0.3, md(k, 2) ? 0.3 : -0.3);
    put(music, drone(hz(12 * 3 + root - 12), b - a), a, 0.5);
    put(music, riser(Math.max(0.3, b - a - 0.05), 200, 5000), a + 0.05, 0.3, 0, 0.3);
  }
  if (style === 'groove' || style === 'drive') {
    const bright = style === 'drive';
    for (const { t } of beatsIn(a, b)) kickAt(t);
    for (const { t, k } of beatsIn(a, b, 4)) {
      if (md(k, 4) === 2) put(music, hat(false), t, 0.55, 0.25);
      else if (bright && md(k, 4) === 3) put(music, hat(false), t, 0.2, -0.25);
      if (md(k, 16) === 10) put(music, hat(true), t, 0.3, 0.3);
    }
    for (const { t, k } of beatsIn(a, b)) if (md(k, 2) === 1) put(music, clap(), t, bright ? 0.65 : 0.55, 0, 0.25);
    const chords = s.chords && s.chords.length ? s.chords : [s.mode === 'major' ? 'I' : 'i'];
    const bars = new Set(); for (const { t } of beatsIn(a, b)) bars.add(barOf(t));
    const firstBar = Math.min(...bars);
    for (const bar of bars) {
      const ch = chordMidis(s, chords[md(bar - firstBar, chords.length)], 4);
      const t0 = Math.max(a, DOWN + bar * 4 * BEAT), t1 = Math.min(b, DOWN + (bar + 1) * 4 * BEAT);
      if (t1 - t0 > 0.1) put(music, stab(ch.map(hz), Math.min(t1 - t0, 4 * BEAT - 0.05), bright ? 3200 : 1900), t0, bright ? 0.26 : 0.22, 0, 0.35);
      const rootMidi = 12 * 2 + (ch[0] % 12);
      for (const { t, k } of beatsIn(t0, t1, 2)) if (md(k, 2) === 0 || md(k, 8) === 7) put(music, bass(hz(rootMidi)), t, 0.6);
    }
    if (bright) for (const { t, k } of beatsIn(a, b, 4)) if (md(barOf(t), 2) === 1) put(music, pluck(hz(scaleMidi(s, md(k, 8), 6)), 0.16, 3600), t, 0.1, (md(k, 2) ? 0.4 : -0.4), 0.4);
  }
  if (style === 'build') {
    const steps = beatsIn(a, b, 4);
    steps.forEach(({ t }, i) => put(music, pluck(hz(scaleMidi(s, i * 2, 4 + (i > steps.length * 0.6 ? 1 : 0))), 0.2, 1200 + 3000 * i / steps.length), t, 0.2 + 0.1 * i / steps.length, (i % 2 ? 0.35 : -0.35), 0.3));
    put(music, drone(hz(12 * 3 + root - 12), b - a), a, 0.45);
    put(music, riser(Math.max(0.3, (b - a) / 2), 400, 9000), a + (b - a) / 2, 0.5, 0, 0.3);
    const roll = beatsIn(Math.max(a, b - 2 * BEAT), b, 8);
    roll.forEach(({ t }, i) => put(music, clap(), t, 0.12 + 0.5 * i / roll.length));
  }
  if (style === 'stutter') { const n = Math.max(2, Math.round((b - a) / 0.056)); for (let k = 0; k < n; k++) put(music, kick(0.3).subarray(0, len(0.12)), a + k * (b - a) / n, 0.45 + 0.4 * k / n); }
  if (style === 'resolve') {
    const ch = chordMidis(s, s.mode === 'major' ? 'I' : 'i', 4);
    const voicing = [ch[0] - 12, ch[2] - 12, ch[0], ch[1], ch[2], ch[0] + 12];
    kickAt(a, 1.1, 1.6);
    put(music, pad(voicing.map(hz), Math.max(0.5, DUR - a)), a, 0.34, 0, 0.5);
    put(music, bass(hz(12 * 2 + (ch[0] % 12)), 1.2), a, 0.9);
  }
}

// ---------------------------------------------------------------- sfx hits
const known = new Set(['impact', 'whoosh', 'whoosh-rev', 'riser', 'click', 'tick', 'pop', 'glitch', 'chime', 'ping', 'sparkle', 'ticks', 'sub']);
let bad = 0;
for (const h of cue.hits || []) {
  const t = Number(h.t), g = Number(h.gain ?? 1), pan = Number(h.pan ?? 0);
  if (!Number.isFinite(t) || !known.has(h.sfx)) { console.error(`invalid hit ${JSON.stringify(h)} (sfx: ${[...known].join(', ')})`); bad++; continue; }
  switch (h.sfx) {
    case 'impact': put(fx, impact(), t, 0.75 * g, pan, 0.2); break;
    case 'sub': put(fx, sub(), t, 0.8 * g, pan); break;
    case 'whoosh': { const [b, pk] = whoosh(h.dur || 0.6); put(fx, b, t - pk / SR, 0.5 * g, pan, 0.25); break; }
    case 'whoosh-rev': { const [b] = whoosh(h.dur || 0.6); const r = b.slice().reverse(); put(fx, r, t - r.length / SR, 0.45 * g, pan, 0.2); break; }
    case 'riser': { const d = h.dur || 1; put(fx, riser(d, 400, 9000), t - d, 0.5 * g, pan, 0.3); break; }
    case 'click': put(fx, click(), t, 0.45 * g, pan); break;
    case 'tick': put(fx, tick(h.freq || 2800), t, 0.4 * g, pan); break;
    case 'pop': put(fx, pop(), t, 0.5 * g, pan, 0.15); break;
    case 'glitch': put(fx, glitch(h.dur || 0.5), t, 0.4 * g, pan); break;
    case 'ping': put(fx, ping(), t, 0.35 * g, pan, 0.3); break;
    case 'chime': [0, 4, 7].forEach((iv, i) => put(fx, bell(hz(72 + iv + (h.transpose || 0))), t + i * 0.045, 0.22 * g, (i - 1) * 0.3, 0.4)); break;
    case 'sparkle': for (let i = 0; i < 8; i++) put(fx, pluck(hz(84 + [0, 2, 4, 7, 9, 12, 14, 16][i]), 0.12, 6000), t + i * 0.035, 0.16 * g, (i % 2 ? 0.5 : -0.5), 0.4); break;
    case 'ticks': { const n = h.n || 12, to = Number(h.to ?? t + 1);
      for (let k = 0; k < n; k++) put(fx, tick(2200 + 1400 * k / n), t + (to - t) * (1 - Math.pow(1 - k / n, 2.2)), 0.28 * g, pan); break; }
  }
}
if (bad) process.exit(1);

// ---------------------------------------------------------------- reverb (Schroeder/Freeverb-lite)
function reverb(inp, seedOff) {
  const o = new Float32Array(N), combs = [1557, 1617, 1491, 1422, 1277, 1356].map(d => Math.round((d + seedOff) * SR / 44100));
  for (const d of combs) { const buf = new Float32Array(d); let idx = 0, lpz = 0;
    for (let i = 0; i < N; i++) { const y = buf[idx]; lpz = y * 0.6 + lpz * 0.4; buf[idx] = inp[i] + lpz * 0.8; o[i] += y / combs.length; idx = (idx + 1) % d; } }
  for (const d of [556, 441].map(x => Math.round((x + seedOff) * SR / 44100))) { const buf = new Float32Array(d); let idx = 0;
    for (let i = 0; i < N; i++) { const bo = buf[idx], x = o[i]; o[i] = -x + bo; buf[idx] = x + bo * 0.5; idx = (idx + 1) % d; } }
  return o;
}
const wet = [reverb(verbSend[0], 0), reverb(verbSend[1], 23)];

// ---------------------------------------------------------------- mix + master
const fadeLen = Math.min(len(0.7), N);
const mix = [new Float32Array(N), new Float32Array(N)];
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
  const f = i > N - fadeLen ? Math.pow((N - i) / fadeLen, 1.5) : 1;
  music[c][i] = (music[c][i] * duck[i] + wet[c][i] * 0.9) * f;
  fx[c][i] *= f;
  mix[c][i] = music[c][i] + fx[c][i];
}
/** BS.1770 integrated loudness (K-weighting, 400 ms blocks, absolute + relative gates) */
function lufs(ch) {
  const kw = ch.map(x => { const y = Float64Array.from(x);
    const stage = (b, a) => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < y.length; i++) { const xi = y[i], yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = xi; y2 = y1; y1 = yi; y[i] = yi; } };
    stage([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]);
    stage([1, -2, 1], [1, -1.99004745483398, 0.99007225036621]); return y; });
  const B = len(0.4), H = len(0.1), ms = [];
  for (let s = 0; s + B <= N; s += H) { let z = 0; for (const y of kw) { let a = 0; for (let i = s; i < s + B; i++) a += y[i] * y[i]; z += a / B; } ms.push(z); }
  const L = (z) => -0.691 + 10 * Math.log10(z + 1e-12);
  const abs = ms.filter(z => L(z) > -70); if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((p, q) => p + q, 0) / abs.length) - 10;
  const g = abs.filter(z => L(z) > rel); return L(g.reduce((p, q) => p + q, 0) / g.length);
}
const before = lufs(mix);
let gain = Math.pow(10, (TARGET - before) / 20);
// soft limiter: peaks above the ceiling are compressed with a 5 ms release (sample-accurate, lookahead-free)
const CEIL = Math.pow(10, -1.5 / 20);
const apply = (bufs) => bufs.forEach(b => { for (let i = 0; i < N; i++) b[i] *= gain; });
apply(mix); apply(music); apply(fx);
let env = 1; const rel = Math.exp(-1 / (0.005 * SR));
for (let i = 0; i < N; i++) {
  const pk = Math.max(Math.abs(mix[0][i]), Math.abs(mix[1][i]));
  const need = pk > CEIL ? CEIL / pk : 1;
  env = need < env ? need : 1 - (1 - env) * rel;
  for (let c = 0; c < 2; c++) { mix[c][i] *= env; music[c][i] *= env; fx[c][i] *= env; }
}

// ---------------------------------------------------------------- write
function wav(file, ch) {
  const n = ch[0].length, data = Buffer.alloc(44 + n * 4);
  data.write('RIFF', 0); data.writeUInt32LE(36 + n * 4, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(ch[c][i] * 32767))), 44 + i * 4 + c * 2);
  writeFileSync(file, data);
}
let clipped = 0; for (const b of mix) for (const v of b) if (Math.abs(v) >= 0.999) clipped++;
const ext = path.extname(out).toLowerCase();
const tmp = ext === '.wav' ? out : out + '.tmp.wav';
wav(tmp, mix);
if (args.stems) { const base = out.replace(/\.[^.]+$/, ''); wav(base + '.music.wav', music); wav(base + '.sfx.wav', fx); }
if (ext !== '.wav') {
  const enc = ext === '.mp3' ? ['-codec:a', 'libmp3lame', '-b:a', '256k'] : ['-c:a', 'aac', '-b:a', '256k'];
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, ...enc, out]);
  if (r.status !== 0) { console.error('ffmpeg encode failed (the WAV is kept at ' + tmp + '):\n' + String(r.stderr)); process.exit(1); }
  try { unlinkSync(tmp); } catch { /* keep */ }
}
// re-measure what was actually written
const m = spawnSync('ffmpeg', ['-v', 'info', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const log = m.stderr || '';
const I = Number((log.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
const TP = Number((log.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/g) || []).pop()?.match(/-?[\d.]+|-inf/)[0]);
console.log(`wrote ${out}  ${DUR}s @ ${SR} Hz stereo · ${BPM} BPM · ${secs.length} sections · ${(cue.hits || []).length} hits`);
console.log(`loudness ${Number.isFinite(I) ? I.toFixed(1) : '?'} LUFS (target ${TARGET}) · true peak ${Number.isFinite(TP) ? TP.toFixed(1) : '?'} dBTP${args.stems ? ' · stems written' : ''}`);
if (clipped) console.log(`FAIL ${clipped} clipped samples`);
if (Number.isFinite(TP) && TP > -1) console.log('WARN true peak above -1 dBTP: lower --lufs by 1–2 dB');
if (Number.isFinite(I) && Math.abs(I - TARGET) > 1.5) console.log(`WARN loudness ${I.toFixed(1)} LUFS is off target ${TARGET} — the limiter is working hard; thin the arrangement or lower the target`);
process.exit(clipped ? 1 : 0);
