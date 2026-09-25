// Shared helpers for qa.mjs / export.mjs.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Resolve playwright from the skill's own node_modules, then from cwd. */
export async function loadPlaywright() {
  const tries = [HERE, process.cwd()];
  for (const base of tries) {
    try {
      const req = createRequire(path.join(base, 'noop.js'));
      const p = req.resolve('playwright');
      const mod = await import(pathToFileURL(p).href);
      return mod.chromium ? mod : mod.default;
    } catch { /* next */ }
  }
  console.error(
    'playwright not found. Install once:\n' +
    `  cd "${HERE}" && npm install && npx playwright install chromium`
  );
  process.exit(2);
}

/** Minimal argv parser: positional + --key value / --flag. */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) out[k] = true;
      else { out[k] = n; i++; }
    } else out._.push(a);
  }
  return out;
}

export function resolveHtml(p) {
  if (!p) { console.error('usage: node <script> <file.html> [options]'); process.exit(2); }
  const abs = path.resolve(p);
  if (!existsSync(abs)) { console.error('file not found: ' + abs); process.exit(2); }
  return abs;
}

/** Wait two animation frames so the last seek() is painted. */
export async function settle(page) {
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Seek and paint. Returns false if seek is missing. */
export async function seekTo(page, t) {
  const ok = await page.evaluate(async (t) => {
    if (typeof window.seek !== 'function') return false;
    await window.seek(t);
    return true;
  }, t);
  await settle(page);
  return ok;
}

/** Grayscale text AA: LCD subpixel fringes pollute pixel checks and look wrong in video. */
export const LAUNCH = { args: ['--disable-lcd-text', '--font-render-hinting=none'] };

export const fmt = (t) => t.toFixed(2).padStart(6, '0');
