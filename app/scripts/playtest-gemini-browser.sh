#!/bin/bash
# Launch Gemini CLI to playtest the game in a browser via Playwright
# Usage: ./scripts/playtest-gemini-browser.sh

cd /Users/annhoward/src/city_builder/app

PROMPT=$(cat scripts/playtest-gemini-browser.md)

echo "=== Launching Gemini Browser Playtest ==="
echo "Gemini will start the dev server, open a browser, and play the game."
echo ""

gemini -p "$PROMPT"
