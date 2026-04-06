#!/usr/bin/env bash
set -e

WIKI_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_NAME="com.besim.personalwiki.plist"
OPEN_PLIST_NAME="com.besim.personalwiki.open.plist"
PLIST_SRC="$WIKI_DIR/$PLIST_NAME"
OPEN_PLIST_SRC="$WIKI_DIR/$OPEN_PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"
OPEN_PLIST_DEST="$HOME/Library/LaunchAgents/$OPEN_PLIST_NAME"

echo "==> Installing Personal Wiki from: $WIKI_DIR"

# 1. Install server dependencies
echo "==> Installing server dependencies..."
cd "$WIKI_DIR/server" && npm install

# 2. Build the React client
echo "==> Building client..."
cd "$WIKI_DIR/client" && npm install && npm run build

# 3. Patch the plist with the real path and node location
NODE_BIN="$(which node)"
sed "s|WIKI_PATH|$WIKI_DIR|g; s|/usr/local/bin/node|$NODE_BIN|g" \
  "$PLIST_SRC" > "$PLIST_DEST"
sed "s|WIKI_PATH|$WIKI_DIR|g" \
  "$OPEN_PLIST_SRC" > "$OPEN_PLIST_DEST"

# 4. Load the LaunchAgents
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl unload "$OPEN_PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"
launchctl load "$OPEN_PLIST_DEST"

echo ""
echo "==> Done! Personal Wiki is running at http://localhost:3333"
echo "    It will start automatically on every login and open in your default browser."
echo ""
echo "    To stop:    launchctl unload ~/Library/LaunchAgents/$PLIST_NAME"
echo "    To restart: launchctl unload ~/Library/LaunchAgents/$PLIST_NAME && launchctl load ~/Library/LaunchAgents/$PLIST_NAME"
