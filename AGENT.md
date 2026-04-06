# AGENT.md — Personal Wiki

Contributor guide for AI agents working on this codebase.

---

## What this is

A personal wiki that runs locally on macOS, accessible at `http://localhost:3333`.
It organises bookmarked links and uploaded files into user-defined **spaces**
(e.g. University, Private, Work) and **folders** within those spaces.
The server auto-starts on login via a macOS LaunchAgent.

---

## Repository layout

```
wiki/
├── server/                  # Node.js + Express backend (ESM)
│   ├── index.js             # Entry point, mounts all routers
│   ├── db.js                # lowdb wrapper — all DB reads/writes go here
│   └── routes/
│       ├── spaces.js        # CRUD for spaces
│       ├── folders.js       # CRUD for folders
│       ├── links.js         # CRUD for links
│       └── files.js         # Upload / download / delete files
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx          # Root: loads spaces, owns activeSpace/activeFolder state
│   │   ├── api.js           # All fetch calls to /api — single source of truth
│   │   ├── components/
│   │   │   ├── TopNav.jsx   # Space tabs + space CRUD (create/rename/delete)
│   │   │   └── SpaceView.jsx # Card grid: folders, links, files; breadcrumb; add forms
│   │   └── styles/wiki.css  # Single CSS file — dark design system
│   └── vite.config.js       # Proxies /api → localhost:3333 in dev mode
├── Completed Features/      # Finished feature specs implemented by agents
├── uploads/                 # Uploaded files (gitignored)
├── wiki.json                # lowdb database file (gitignored)
├── com.besim.personalwiki.plist  # macOS LaunchAgent definition
└── install.sh               # One-shot installer: installs deps, builds, loads agent
```

> **Stale files**: `client/src/components/` still contains `AddLinkForm.jsx`,
> `FileList.jsx`, `FileUpload.jsx`, `LinkList.jsx`, `Sidebar.jsx`, and
> `FolderBar.jsx` — these are no longer imported anywhere and can be deleted.

Feature specs live at the repo root while they are being worked on. Once an agent
finishes implementing a feature, move its spec into `Completed Features/` so future
agents know it has already been delivered.

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 22 (ESM) | `"type": "module"` in server/package.json |
| Server | Express 4 | Thin router, no ORM |
| Database | lowdb 7 (JSON file) | No native compilation needed; `wiki.json` at repo root |
| File storage | Local `uploads/` directory | Metadata in `wiki.json`, binary on disk |
| Frontend | React 18 + Vite 5 | No component library — all CSS is hand-written |
| Styling | Single `wiki.css` | CSS custom properties for theming; no preprocessor |

---

## Data model (`wiki.json`)

```jsonc
{
  "spaces":  [{ "id": "university", "name": "University", "color": "#818cf8", "created_at": "…" }],
  "folders": [{ "id": 1, "name": "Lecture notes", "space": "university", "parent_id": null, "created_at": "…" }],
  "links":   [{ "id": 1, "title": "…", "url": "…", "description": "…", "space": "university", "folder_id": null, "created_at": "…" }],
  "files":   [{ "id": 1, "original_name": "…", "stored_name": "1234-5678.pdf", "mime_type": "…", "size": 12345, "space": "university", "folder_id": null, "created_at": "…" }],
  "_seq":    { "folders": 0, "links": 0, "files": 0, "spaces": 3 }
}
```

Key relationships:
- `folders.space` → `spaces.id` (string slug, not an integer FK)
- `folders.parent_id` → `folders.id` or `null` (root-level folder)
- `links.folder_id` / `files.folder_id` → `folders.id` or `null` (root of space)
- Deleting a space cascades to its folders, links, and files
- Deleting a folder cascades recursively to child folders, links, and files

All DB mutations live in `server/db.js`. Routes call those functions and never touch `db.data` directly.

---

## API reference

All routes are under `/api`. Server listens on port **3333**.

### Spaces
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/api/spaces` | — | List all spaces |
| POST | `/api/spaces` | `{ name, color }` | Create space |
| PATCH | `/api/spaces/:id` | `{ name?, color? }` | Rename / recolor |
| DELETE | `/api/spaces/:id` | — | Delete space + cascade |

### Folders
| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/api/folders/:space` | — | All folders for a space |
| POST | `/api/folders` | `{ name, space, parent_id? }` | Create folder |
| PATCH | `/api/folders/:id` | `{ name }` | Rename |
| DELETE | `/api/folders/:id` | — | Delete + cascade |

### Links
| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/api/links` | `?space=&folder_id=` | Links for space+folder (`folder_id=null` = root) |
| POST | `/api/links` | `{ title, url, description?, space, folder_id? }` | Create |
| PATCH | `/api/links/:id` | `{ title, url, description? }` | Update |
| DELETE | `/api/links/:id` | — | Delete |

### Files
| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/api/files` | `?space=&folder_id=` | Files for space+folder |
| POST | `/api/files` | `multipart/form-data: file, space, folder_id?` | Upload (max 100 MB) |
| GET | `/api/files/:id/download` | — | Download file |
| DELETE | `/api/files/:id` | — | Delete record + disk file |

---

## Frontend state

`App.jsx` owns two pieces of global state passed as props:

- `activeSpace` — string ID of the currently selected space
- `activeFolder` — folder object `{ id, name, parent_id, … }` or `null` (space root)

`SpaceView.jsx` fetches data based on these two values and re-fetches after every mutation.

---

## Design system (CSS)

All styles are in `client/src/styles/wiki.css`. Key variables:

```css
--bg, --s1 … --s4        /* background layers, darkest → lightest */
--border, --border2       /* border colours */
--t1 … --t4              /* text colours, brightest → dimmest */
--accent                  /* set dynamically per-space via inline style on .app */
--accent-bg               /* transparent tint of --accent */
--r, --r-sm               /* border radii */
--font                    /* system font stack */
```

The active space color is injected by `App.jsx` as CSS custom properties on the
root `.app` element:

```jsx
const cssVars = { '--accent': space.color, '--accent-bg': hexToRgba(space.color, 0.07) };
<div className="app" style={cssVars}>
```

Do **not** add new hardcoded colour values. Use the existing variable tokens.

---

## Development workflow

```bash
# Terminal 1 — backend with auto-restart
cd server && npm run dev

# Terminal 2 — frontend with HMR (proxies /api → :3333)
cd client && npm run dev
# open http://localhost:5173

# After making frontend changes that need to go to production:
cd client && npm run build
# Then restart the LaunchAgent or the server process to serve the new dist/
```

The Vite dev server proxies `/api/*` to `http://localhost:3333` (see `vite.config.js`),
so both servers must be running during development.

---

## Adding a feature — checklist

1. **Backend**: add/update functions in `server/db.js`, then expose via a route in `server/routes/`.
2. **API client**: add the fetch call to `client/src/api.js`.
3. **Frontend**: consume from a component. Prefer editing `SpaceView.jsx` or `TopNav.jsx`; avoid creating new components unless the feature is clearly isolated.
4. **Styles**: add rules to `wiki.css` using existing variables. No inline styles except for dynamic CSS custom properties.
5. **Build**: run `cd client && npm run build` before committing.
6. **Restart**: reload the LaunchAgent to serve the new build:
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.besim.personalwiki.plist
   launchctl load  ~/Library/LaunchAgents/com.besim.personalwiki.plist
   ```
7. **Commit**: one logical commit per feature with a clear message.

---

## Known constraints

- **No native compilation**: `better-sqlite3` was replaced with `lowdb` because Xcode CLT is not installed. Do not introduce packages that require `node-gyp`.
- **No TypeScript**: the project is plain JS/JSX. Do not add a TS config.
- **No test suite**: there are no automated tests. Verify changes manually via the browser and `curl`.
- **Single CSS file**: do not introduce CSS modules, Tailwind, or any CSS-in-JS. Keep everything in `wiki.css`.
- **Port 3333**: hardcoded in `server/index.js` and the LaunchAgent plist. Change both if you need to change the port.
- **Uploads cap**: multer is configured to reject files larger than 100 MB (`server/routes/files.js`).
