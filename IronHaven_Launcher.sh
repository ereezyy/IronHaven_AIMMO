#!/usr/bin/env bash
# IronHaven AIMMO — Linux/macOS Launcher
# ./IronHaven_Launcher.sh — or double-click in your file manager.

set -e

RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${RED}  ╔══════════════════════════════════════════════╗"
echo -e "  ║    ██╗██████╗  ██████╗ ███╗   ██╗          ║"
echo -e "  ║    ██║██╔══██╗██╔═══██╗████╗  ██║          ║"
echo -e "  ║    ██║██████╔╝██║   ██║██╔██╗ ██║          ║"
echo -e "  ║    ██║██╔══██╗██║   ██║██║╚██╗██║          ║"
echo -e "  ║    ██║██║  ██║╚██████╔╝██║ ╚████║          ║"
echo -e "  ║    ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝          ║${NC}"
echo -e "  ║                                              ║"
echo -e "  ║       ${CYAN}H A V E N   v1.0.0${NC}                     ║"
echo -e "  ║       ${CYAN}AI-Powered Cyberpunk MMORPG${NC}              ║"
echo -e "  ║                                              ║"
echo -e "  ╚══════════════════════════════════════════════╝"
echo ""

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  [!] Node.js not found. Install from https://nodejs.org (v18+)"
    exit 1
fi

# Install deps if missing
if [ ! -d "node_modules" ]; then
    echo "  [*] First run — installing dependencies..."
    npm install --prefer-offline
fi

# Build if missing
if [ ! -d "dist" ]; then
    echo "  [*] Building for production..."
    npm run build
fi

echo ""
echo "  [✓] Server: http://localhost:5173"
echo "  [✓] Press Ctrl+C to stop."
echo ""

# Auto-open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173 &>/dev/null &
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

npx vite --host --port 5173
