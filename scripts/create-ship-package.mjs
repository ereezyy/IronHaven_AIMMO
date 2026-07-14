#!/usr/bin/env node
/**
 * Create the IronHaven shipping package.
 * Includes: dist/, launchers, .env.example, README, SHIPPING_AUDIT, media/
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkg = 'IronHaven_v1.0.0';
const pkgDir = join(root, pkg);

// Clean and create package dir
if (existsSync(pkgDir)) rmSync(pkgDir, { recursive: true, force: true });
mkdirSync(pkgDir, { recursive: true });

console.log(`Building package: ${pkg}...`);

// Copy dist
cpSync(join(root, 'dist'), join(pkgDir, 'dist'), { recursive: true });

// Copy launchers
['IronHaven_Launcher.bat', 'IronHaven_Launcher.sh'].forEach((f) => {
  if (existsSync(join(root, f))) cpSync(join(root, f), join(pkgDir, f));
});

// Copy docs
['README.md', 'SHIPPING_AUDIT.md', 'SHIP.md', '.env.example', 'LICENSE'].forEach(
  (f) => {
    if (existsSync(join(root, f))) cpSync(join(root, f), join(pkgDir, f));
  },
);

// Create package README
writeFileSync(
  join(pkgDir, 'START_HERE.md'),
  `# IronHaven AIMMO v1.0.0 🏙️

## Quick Start

### Windows
Double-click **IronHaven_Launcher.bat**

### Linux / macOS
\`\`\`bash
chmod +x IronHaven_Launcher.sh
./IronHaven_Launcher.sh
\`\`\`

### Manual
\`\`\`bash
npm install
npm run dev
\`\`\`

Opens at http://localhost:5173

## Requirements
- Node.js 18+
- Modern browser with WebGL 2.0

## What's Inside
- Full 3D cyberpunk MMORPG
- AI-powered NPCs (optional — bring your own xAI/HuggingFace key)
- 190 passing tests, clean TypeScript
- Offline mode (no backend required)

## Live Demo
https://ironhaven-aimmo.vercel.app
`,
);

// Zip
const out = join(root, `${pkg}.zip`);
const isWin = process.platform === 'win32';
if (isWin) {
  execSync(
    `powershell -NoProfile -Command "if (Test-Path '${out}') { Remove-Item '${out}' -Force }; Compress-Archive -Path '${pkgDir}' -DestinationPath '${out}' -Force"`,
    { stdio: 'inherit' },
  );
} else {
  execSync(`cd "${root}" && zip -r "${out}" "${pkg}"`, { stdio: 'inherit' });
}

// Cleanup
rmSync(pkgDir, { recursive: true, force: true });

console.log(`\n✅ Package created: ${out}`);
