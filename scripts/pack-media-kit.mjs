#!/usr/bin/env node
/**
 * Zip the media/ release package for press & partners.
 * Usage: node scripts/pack-media-kit.mjs
 */
import { createWriteStream, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const mediaDir = join(root, 'media');
const out = join(root, 'IronHaven_v1.0.0_MediaKit.zip');

if (!existsSync(mediaDir)) {
  console.error('media/ folder not found');
  process.exit(1);
}

// Prefer PowerShell Compress-Archive on Windows; zip elsewhere.
const isWin = process.platform === 'win32';
try {
  if (isWin) {
    execSync(
      `powershell -NoProfile -Command "if (Test-Path '${out}') { Remove-Item '${out}' -Force }; Compress-Archive -Path '${mediaDir}\\*' -DestinationPath '${out}' -Force"`,
      { stdio: 'inherit' },
    );
  } else {
    execSync(`cd "${mediaDir}" && zip -r "${out}" .`, { stdio: 'inherit' });
  }
  console.log(`Packed: ${out}`);
} catch (e) {
  console.error('Failed to pack media kit:', e.message);
  process.exit(1);
}
