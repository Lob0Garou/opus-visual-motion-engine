#!/usr/bin/env node
// export.mjs — render a seek(t) HTML composition to a video file, frame-exact.
//
//   node export.mjs <file.html> [--out out.mp4] [--fps 30] [--width W --height H]
//                   [--from 0] [--to DURATION] [--crf 18] [--audio track.mp3] [--frames-only]
//
// Output by extension: .mp4 (H.264, yuv420p, faststart) · .webm (VP9) · .gif (palette).
// Without ffmpeg on PATH (or with --frames-only) it writes a PNG sequence and prints the
// ffmpeg command to assemble it.
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPlaywright, parseArgs, resolveHtml, seekTo, LAUNCH } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const file = resolveHtml(args._[0]);
const out = path.resolve(args.out || file.replace(/\.html?$/i, '.mp4'));
const fps = Number(args.fps || 30);
const crf = String(args.crf || 18);
const ext = path.extname(out).toLowerCase();
const hasFfmpeg = !args['frames-only'] && spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch(LAUNCH);
let W = Number(args.width || 1920), H = Number(args.height || 1080);
let ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
let page = await ctx.newPage();
const url = pathToFileURL(file).href;
await page.goto(url, { waitUntil: 'networkidle' });
const st = await page.evaluate(() => { const s = document.querySelector('#stage'); return s ? [s.offsetWidth, s.offsetHeight] : null; });
if (st && !args.width && (st[0] !== W || st[1] !== H)) {
  await ctx.close(); [W, H] = st;
  ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page = await ctx.newPage(); await page.goto(url, { waitUntil: 'networkidle' });
}
await page.evaluate(() => document.fonts && document.fonts.ready);
const D = await page.evaluate(() => window.DURATION);
if (!(Number.isFinite(D) && D > 0) || !(await page.evaluate(() => typeof window.seek === 'function'))) {
  console.error('composition must expose window.DURATION (> 0) and window.seek(t)'); process.exit(2);
}
const from = Number(args.from || 0), to = Math.min(Number(args.to || D), D);
const total = Math.round((to - from) * fps) + 1;   // include the settled end frame
if (W % 2 || H % 2) console.warn(`warning: ${W}×${H} has an odd side; H.264 needs even dimensions`);

let ff = null, framesDir = null;
if (hasFfmpeg) {
  const input = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
  if (args.audio) input.push('-i', path.resolve(args.audio));
  const enc = ext === '.webm' ? ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-pix_fmt', 'yuv420p']
    : ext === '.gif' ? ['-vf', `fps=${Math.min(fps, 20)},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer`]
    : ['-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
  const audio = args.audio && ext !== '.gif' ? ['-c:a', ext === '.webm' ? 'libopus' : 'aac', '-shortest'] : [];
  ff = spawn('ffmpeg', [...input, ...enc, ...audio, out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', d => { err = (err + d).slice(-4000); });
  ff.on('close', code => { if (code) { console.error(err); process.exitCode = 1; } });
} else {
  framesDir = out.replace(/\.[^.]+$/, '') + '-frames';
  mkdirSync(framesDir, { recursive: true });
}

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = Math.min(from + i / fps, to);
  await seekTo(page, t);
  const buf = await page.screenshot({ type: 'png' });
  if (ff) { if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
  else writeFileSync(path.join(framesDir, `f_${String(i).padStart(5, '0')}.png`), buf);
  if (i % fps === 0) process.stdout.write(`\rframe ${i + 1}/${total}  t=${t.toFixed(2)}s`);
}
process.stdout.write(`\rframe ${total}/${total}  done in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
await browser.close();

if (ff) {
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  if (!process.exitCode) {
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,nb_frames', '-of', 'default=nw=1', out], { encoding: 'utf8' });
    console.log(`wrote ${out}\n${(probe.stdout || '').trim()}`);
  }
} else {
  console.log(`ffmpeg not used — wrote ${total} PNGs to ${framesDir}\nassemble with:\n  ffmpeg -framerate ${fps} -i "${path.join(framesDir, 'f_%05d.png')}" -c:v libx264 -crf ${crf} -pix_fmt yuv420p -movflags +faststart "${out}"`);
}
