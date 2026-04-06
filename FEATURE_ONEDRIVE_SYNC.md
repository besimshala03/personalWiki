# Feature: GoodNotes → OneDrive → Wiki Sync

## Overview

GoodNotes on iPad auto-backs up notes as PDFs to OneDrive. OneDrive Desktop on Mac
syncs those files locally. This feature adds a file watcher to the wiki server that
detects new/updated PDFs in the local OneDrive folder and automatically imports them
into the correct wiki folder.

**Direction:** One-way, OneDrive → wiki only. No changes are written back to OneDrive.

---

## Prerequisites (user must do these manually before this feature works)

1. **GoodNotes on iPad**: Settings → Cloud & Backup → Auto Backup → enable, choose OneDrive, format = PDF
2. **OneDrive Desktop App on Mac**: installed and signed in with the same Microsoft account
3. GoodNotes should create a folder called `GoodNotes` inside the OneDrive root

After setup, the local sync path will be something like:
```
~/OneDrive/GoodNotes/
└── University/
    └── ss26/
        └── Software Engineering/
              lecture_01.pdf
              lecture_02.pdf
```

The exact root path can vary. Common locations:
- `~/OneDrive/GoodNotes/`
- `~/OneDrive - Personal/GoodNotes/`

The feature should auto-detect which one exists, or fall back to a configurable path.

---

## What to build

### 1. Config (`wiki.json` — new top-level key)

Add a `sync` key to the lowdb database schema:

```jsonc
{
  "sync": {
    "enabled": false,
    "onedrive_path": "",          // absolute path to local OneDrive GoodNotes folder
    "space": "university",        // which wiki space to import into
    "last_run": null              // ISO timestamp of last successful scan
  }
}
```

Do not hardcode the OneDrive path — it must be configurable.

### 2. Sync engine (`server/sync.js`)

A new module, imported and started by `server/index.js`.

Responsibilities:
- On server start, if `sync.enabled` is true, start watching `sync.onedrive_path`
- Use `chokidar` (add as dependency) to watch for `add` and `change` events on `*.pdf` files
- For each detected PDF, resolve the wiki folder it belongs to and import it

**Folder resolution logic:**

The OneDrive path structure mirrors GoodNotes notebook structure. Map it to wiki folders:

```
<onedrive_path>/<any depth of subfolders>/<file>.pdf
                └────── path segments ──────┘
```

1. Take the path segments between `onedrive_path` and the filename
2. Starting from the configured `space`, walk down the wiki folder tree matching by name (case-insensitive, trimmed)
3. If a matching folder exists, import the file there
4. If no match is found, import to the root of the space (do not create folders automatically)

Example with `onedrive_path = ~/OneDrive/GoodNotes` and `space = university`:
```
~/OneDrive/GoodNotes/ss26/Software Engineering/lecture_01.pdf
                     └──┘  └─────────────────┘
                      ↓            ↓
                  folder "ss26" → subfolder "Software Engineering" → import here
```

**Duplicate detection:**

Before importing, check if a file with the same `original_name` already exists in the
target folder. If it does:
- Compare file size or mtime
- If different → delete the old record (and its stored file) and re-import the new version
- If same → skip

**Import:**

Use the existing file storage logic from `server/routes/files.js` (multer + db insert).
Do not duplicate this logic — extract it into a shared helper in `server/db.js` or a
new `server/fileStore.js` so both the route and the sync engine can call it.

```js
// pseudo-code
async function importFile(absolutePath, spaceId, folderId) {
  const content = await fs.readFile(absolutePath);
  const storedName = `${Date.now()}-${uuid()}.pdf`;
  await fs.copyFile(absolutePath, path.join(UPLOADS_DIR, storedName));
  await db.insertFile({
    original_name: path.basename(absolutePath),
    stored_name: storedName,
    mime_type: 'application/pdf',
    size: content.length,
    space: spaceId,
    folder_id: folderId,
  });
}
```

### 3. API routes (`server/routes/sync.js`)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/api/sync/status` | — | Returns `sync` config + watcher running state |
| POST | `/api/sync/config` | `{ enabled, onedrive_path, space }` | Save config, restart watcher |
| POST | `/api/sync/run` | — | Trigger a manual full scan immediately |

Mount in `server/index.js`:
```js
import syncRouter from './routes/sync.js';
app.use('/api/sync', syncRouter);
```

### 4. UI (`client/src/components/SyncSettings.jsx`)

A settings panel, accessible from a small **"Sync"** button in `TopNav.jsx` (next to
the space tabs, far right).

The panel should show:
- Toggle: Sync enabled / disabled
- Text input: OneDrive GoodNotes folder path (with a placeholder showing the two common paths)
- Dropdown: target space (populated from existing spaces)
- Status line: "Last synced: 3 minutes ago" or "Never"
- Button: "Run now" (calls `POST /api/sync/run`)
- Read-only log: last 10 sync events (files imported, skipped, errors)

Keep the UI minimal. Use existing CSS variables from `wiki.css`. No new dependencies
on the frontend.

### 5. Sync log

Store the last 50 sync events in memory (not in `wiki.json`). Each event:
```jsonc
{ "ts": "2026-04-06T12:00:00Z", "file": "lecture_01.pdf", "folder": "Software Engineering", "action": "imported" }
// action: "imported" | "updated" | "skipped" | "error"
```

Expose via `GET /api/sync/status` in a `log` array.

---

## Dependencies to add

Only in `server/package.json`:
```
chokidar ^3.x
```

No frontend dependencies needed.

---

## Files to create / modify

| File | Action |
|---|---|
| `server/sync.js` | Create — watcher + scan logic |
| `server/routes/sync.js` | Create — API routes |
| `server/db.js` | Modify — add `sync` config read/write + extract file insert helper |
| `server/routes/files.js` | Modify — use shared insert helper |
| `server/index.js` | Modify — import sync module, mount sync router |
| `client/src/components/SyncSettings.jsx` | Create — settings panel |
| `client/src/components/TopNav.jsx` | Modify — add Sync button |
| `client/src/api.js` | Modify — add sync API calls |
| `client/src/styles/wiki.css` | Modify — add styles for sync panel |

---

## Constraints (from AGENT.md — do not violate)

- No TypeScript, no CSS modules, no Tailwind — plain JS/JSX and `wiki.css`
- No packages requiring `node-gyp` (no native compilation)
- No new hardcoded colours — use CSS custom properties
- After frontend changes: run `cd client && npm run build`
- Reload LaunchAgent after build:
  ```bash
  launchctl unload ~/Library/LaunchAgents/com.besim.personalwiki.plist
  launchctl load  ~/Library/LaunchAgents/com.besim.personalwiki.plist
  ```

---

## Current wiki data (as of writing)

Spaces: `university` (#818cf8), `private` (#34d399)

University folders:
```
ss26/
├── Sponsorship-linked marketing (online-course)
├── Business Process Technologies
├── Software Engineering
├── corporate finance
└── Seminar: Large Language Models
ws26/27/
```

The OneDrive folder names must match these names (case-insensitive) for auto-routing to work.
GoodNotes notebook names should mirror the wiki folder names for best results.

---

## Testing

No automated test suite exists. Verify manually:

1. Drop a PDF into a subfolder of `onedrive_path` that matches a wiki folder name
2. Wait up to 2 seconds for chokidar to fire
3. Confirm the file appears in the wiki UI under the correct folder
4. Drop the same PDF again (same name, different content) — confirm it replaces the old one
5. Drop a PDF with no matching folder — confirm it lands at space root
6. Disable sync in UI — confirm watcher stops and new files are ignored
