#!/usr/bin/env bash
# Force Cursor to reload extensions from disk (fixes stale pre-vibe Spider Coach).
set -euo pipefail
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
CURSOR="/Applications/Cursor.app/Contents/Resources/app/bin/cursor"

echo "Quitting Cursor…"
osascript -e 'tell application "Cursor" to quit' 2>/dev/null || killall Cursor 2>/dev/null || true
sleep 3

echo "Starting Cursor with cursor_spider…"
open -a "Cursor" "$PROJECT"
sleep 2

if [[ -x "$CURSOR" ]]; then
  "$CURSOR" --list-extensions --show-versions 2>/dev/null | grep spider || true
fi

echo "Done. Open Output → Cursor Spider Coach — expect: --- Spider Coach v0.0.4 LOADED ---"
