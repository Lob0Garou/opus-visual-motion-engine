#!/usr/bin/env node
// audio-data.mjs — turn a music/voice file into frame-exact data a render(t) composition can read,
// and check its levels before anyone listens.
//
//   node audio-data.mjs <audio> [--fps 30] [--out audio-data.js] [--inject composition.html]
//                       [--bpm 120] [--offset 0]
//
// Writes `window.AUDIO = { fps, duration, offset, bpm, beats[], onsets[], rms[], low[], peakDb, lufs }`:
//   rms[i]  loudness of video frame i, 0..1 (normalized to the loudest frame)
//   low[i]  same for the <150 Hz band (kick / bass hits)
//   onsets  seconds where energy jumps (hits, syllables, notes)
//   beats   an evenly spaced beat grid (estimated tempo, phase-aligned to the onsets)
// --inject writes the data into <script id="audio-data"> inside the HTML (single-file delivery).
// --offset shifts every time by N seconds (the audio starts N s into the video).
// Needs ffmpeg on PATH. Exit 1 when the audio clips.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const src = args._[0] && path.resolve(args._[0]);
if (!src || !existsSync(src)) { console.error('usage: node audio-data.mjs <audio> [--fps 30] [--out audio-data.js] [--inject file.html]'); process.exit(2); }
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) { console.error('ffmpeg not found on PATH'); process.exit(2); }
const FPS = Number(args.fps || 30), SR = 22050, OFFSET = Number(args.offset || 0);

/** decode to mono float32 PCM, optionally through an ffmpeg filter */
function pcm(filter) {
  const a = ['-v', 'error', '-i', src, '-ac', '1', '-ar', String(SR)];
  if (filter) a.push('-af', filter);
  a.push('-f', 'f32le', '-');
  const r = spawnSync('ffmpeg', a, { maxBuffer: 1 << 30 });
  if (r.status !== 0) { console.error(String(r.stderr)); process.exit(2); }
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
}
const full = pcm(null);
const low = pcm('lowpass=f=150,lowpass=f=150');
const duration = full.length / SR;

// ---------- levels (true channel peak comes from the original, not the mono downmix) ----------
const vol = spawnSync('ffmpeg', ['-v', 'info', '-i', src, '-af', 'ebur128=peak=sample', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const log = vol.stderr || '';
const lufs = Number((log.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
const peakDb = Number((log.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/g) || []).pop()?.match(/-?[\d.]+|-inf/)[0]);
let clipped = 0; for (const v of full) if (Math.abs(v) >= 0.999) clipped++;

// ---------- per-frame energy ----------
const perFrame = SR / FPS, frames = Math.ceil(full.length / perFrame);
const frameRms = (buf) => { const out = new Float64Array(frames);
  for (let f = 0; f < frames; f++) { let s = 0, n = 0; const a = Math.floor(f * perFrame), b = Math.min(buf.length, Math.floor((f + 1) * perFrame));
    for (let i = a; i < b; i++) { s += buf[i] * buf[i]; n++; } out[f] = n ? Math.sqrt(s / n) : 0; } return out; };
const norm = (arr) => { let m = 0; for (const v of arr) m = Math.max(m, v); return Array.from(arr, v => +(m ? v / m : 0).toFixed(3)); };
const rms = norm(frameRms(full)), lowE = norm(frameRms(low));

// ---------- onsets: positive jumps of log energy on a 10 ms hop, adaptive threshold ----------
const HOP = Math.round(SR * 0.01), W = HOP * 2, nh = Math.floor((full.length - W) / HOP);
const env = new Float64Array(nh);
for (let h = 0; h < nh; h++) { let s = 0; for (let i = h * HOP; i < h * HOP + W; i++) s += full[i] * full[i]; env[h] = Math.log10(1e-9 + s / W); }
const flux = new Float64Array(nh);
for (let h = 1; h < nh; h++) flux[h] = Math.max(0, env[h] - env[h - 1]);
const onsets = []; const win = 50;                                    // ±0.5 s local statistics
for (let h = 1; h < nh - 1; h++) {
  let s = 0, s2 = 0, n = 0;
  for (let k = Math.max(0, h - win); k < Math.min(nh, h + win); k++) { s += flux[k]; s2 += flux[k] * flux[k]; n++; }
  const mean = s / n, sd = Math.sqrt(Math.max(0, s2 / n - mean * mean));
  const loud = env[h] > Math.log10(1e-6);                            // ignore near-silence
  if (loud && flux[h] > mean + 1.5 * sd && flux[h] > 0.15 && flux[h] >= flux[h - 1] && flux[h] >= flux[h + 1]) {
    const t = (h * HOP + W) / SR;                                   // the jump completes at the window's end
    if (!onsets.length || t - onsets[onsets.length - 1] >= 0.09) onsets.push(+t.toFixed(3));
  }
}

// ---------- tempo: autocorrelation of the onset envelope, 70–180 BPM, folded to that range ----------
let bpm = Number(args.bpm || 0), phase = 0;
if (!bpm && onsets.length >= 8) {
  let best = 0, bestLag = 0;
  for (let lag = Math.round(60 / 180 * 100); lag <= Math.round(60 / 70 * 100); lag++) {
    let s = 0; for (let h = 0; h + lag < nh; h++) s += flux[h] * flux[h + lag];
    if (s > best) { best = s; bestLag = lag; }
  }
  // refine to sub-hop precision with the median inter-onset interval near the lag
  const ioi = []; for (let i = 1; i < onsets.length; i++) { const d = onsets[i] - onsets[i - 1]; const k = Math.round(d / (bestLag / 100)); if (k >= 1 && k <= 4) ioi.push(d / k); }
  ioi.sort((a, b) => a - b);
  const period = ioi.length ? ioi[Math.floor(ioi.length / 2)] : bestLag / 100;
  bpm = 60 / period;
}
const beats = [];
if (bpm) {
  const period = 60 / bpm;
  // phase = the offset that puts most onsets on the grid
  let bestScore = -1;
  for (let p = 0; p < period; p += 0.005) {
    let sc = 0; for (const o of onsets) { const d = Math.abs(((o - p) / period) - Math.round((o - p) / period)) * period; if (d < 0.035) sc++; }
    if (sc > bestScore) { bestScore = sc; phase = p; }
  }
  // refine phase + period by least squares over onsets that sit on the grid (removes tempo drift)
  let per = period;
  for (let it = 0; it < 3; it++) {
    const pts = [];
    for (const o of onsets) { const k = Math.round((o - phase) / per); if (Math.abs(o - (phase + k * per)) < 0.04) pts.push([k, o]); }
    if (pts.length < 4) break;
    const n = pts.length, sk = pts.reduce((a, p) => a + p[0], 0), so = pts.reduce((a, p) => a + p[1], 0);
    const skk = pts.reduce((a, p) => a + p[0] * p[0], 0), sko = pts.reduce((a, p) => a + p[0] * p[1], 0);
    const den = n * skk - sk * sk; if (!den) break;
    per = (n * sko - sk * so) / den; phase = (so - per * sk) / n;
  }
  bpm = 60 / per;
  const period2 = per;
  while (phase - period2 > -0.02) phase -= period2;                   // extend the grid back to the start
  for (let k = 0; phase + k * period2 < duration; k++) if (phase + k * period2 >= 0) beats.push(+(phase + k * period2).toFixed(3));
}

// ---------- write ----------
const shift = (a) => a.map(t => +(t + OFFSET).toFixed(3));
const data = { fps: FPS, duration: +duration.toFixed(3), offset: OFFSET, bpm: bpm ? +bpm.toFixed(2) : null,
  beats: shift(beats), onsets: shift(onsets), rms, low: lowE, peakDb, lufs };
const js = 'window.AUDIO = ' + JSON.stringify(data) + ';\n';
if (args.inject) {
  const html = path.resolve(args.inject);
  let s = readFileSync(html, 'utf8');
  const tag = `<script id="audio-data">\n${js}</script>`;
  if (/<script id="audio-data">[\s\S]*?<\/script>/.test(s)) s = s.replace(/<script id="audio-data">[\s\S]*?<\/script>/, tag);
  else if (/<script>\s*\n?"use strict";/.test(s)) s = s.replace(/<script>(\s*\n?"use strict";)/, `${tag}\n<script>$1`);
  else s = s.replace(/<\/head>/i, `${tag}\n</head>`);
  writeFileSync(html, s);
  console.log(`injected window.AUDIO into ${html}`);
} else {
  const out = path.resolve(args.out || 'audio-data.js');
  writeFileSync(out, js);
  console.log(`wrote ${out}`);
}

// ---------- report ----------
const warn = [];
if (clipped) warn.push(`FAIL ${clipped} clipped samples — lower the gain and export the audio again`);
if (Number.isFinite(peakDb) && peakDb > -1) warn.push(`WARN sample peak ${peakDb} dBFS (> -1 dBFS): lossy encoding (AAC) will clip; leave 1 dB headroom`);
if (Number.isFinite(lufs) && (lufs > -12 || lufs < -18)) warn.push(`INFO integrated loudness ${lufs} LUFS (social/video platforms normalize to about -14 LUFS)`);
if (!onsets.length) warn.push('WARN no onsets found — drive visuals from rms/low instead of hits');
console.log(`duration ${duration.toFixed(2)}s · ${frames} frames @ ${FPS} fps · bpm ${bpm ? bpm.toFixed(1) : 'n/a'} · ${onsets.length} onsets · ${beats.length} beats · peak ${peakDb} dBFS · ${lufs} LUFS`);
for (const w of warn) console.log(w);
process.exit(clipped ? 1 : 0);
