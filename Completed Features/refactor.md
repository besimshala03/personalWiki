# Refactor Plan

Identified cleanup and refactoring opportunities across the codebase, grouped by priority.

---

## High Priority — Delete Dead Code

### 1. Six stale component files
Never imported anywhere. Safe to delete outright.

- `client/src/components/AddLinkForm.jsx`
- `client/src/components/LinkList.jsx`
- `client/src/components/FileUpload.jsx`
- `client/src/components/FileList.jsx`
- `client/src/components/Sidebar.jsx`
- `client/src/components/FolderBar.jsx`

### 2. `createFile` in `server/db.js` (lines 169–183)
Near-duplicate of `insertFileRecord` (lines 185–208) — only difference is `insertFileRecord` accepts an extra `source_mtime` field. Nothing in the codebase imports `createFile`. Delete it.

### 3. `visibleTasks` alias in `SpaceView.jsx` (line 413)
```js
const visibleTasks = tasks; // pointless alias
```
Used on line 456 as the source for `contentItems`. Replace with `tasks` directly and remove the alias.

---

## Medium Priority — Extract Shared Utilities

### 4. `todayKey()` duplicated in three files
Identical function copy-pasted into:
- `client/src/components/SpaceView.jsx:41`
- `client/src/components/TopNav.jsx:121`
- `client/src/components/TasksDashboard.jsx:4`

Extract to `client/src/utils.js` and import from there.

### 5. `formatDueDate` / `dateLabel` are the same function
`SpaceView.jsx:52` and `TasksDashboard.jsx:23` both define:
```js
new Date(`${value}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
```
under different names. Extract to `client/src/utils.js` under one name and import in both components.

### 6. `folder_id` query param parsing duplicated across three routes
`server/routes/links.js:9`, `server/routes/files.js:19`, and `server/routes/tasks.js:9` all contain:
```js
const fid = folder_id === undefined || folder_id === 'null' ? null : parseInt(folder_id);
```
Extract to a helper in `server/utils.js`:
```js
export function parseFolderId(value) {
  return value === undefined || value === 'null' ? null : parseInt(value, 10);
}
```

### 7. Repeated URL-params pattern in `client/src/api.js`
`getLinks`, `getFiles`, and `getTasks` all build query params identically:
```js
const p = new URLSearchParams({ space });
if (folder_id !== undefined) p.set('folder_id', folder_id ?? 'null');
return fetch(`${BASE}/...?${p}`).then(json);
```
Extract a helper inside `api.js`:
```js
function spaceParams(space, folder_id) {
  const p = new URLSearchParams({ space });
  if (folder_id !== undefined) p.set('folder_id', folder_id ?? 'null');
  return p;
}
```

---

## Low Priority — Polish and Consistency

### 8. Inconsistent error handling in `client/src/api.js`
`post`, `patch`, and `del` use `.then(r => r.json())` with no HTTP error check — server errors are silently swallowed. `requestJson` (used only for sync calls) handles errors properly. Apply the same pattern to the other helpers or replace them all with `requestJson`.

### 9. `parseInt` called without radix in two route files
`server/routes/folders.js:18,23` and `server/routes/links.js:21,26` call `parseInt(id)` without a radix. `tasks.js` consistently uses `parseInt(id, 10)`. Standardise to always pass `10`.

### 10. One-time migration blocks running on every startup (`server/db.js:32–54`)
Four sequential `if (!db.data.X)` guards patch old DB schemas at every server start. These exist to handle DBs created before certain fields were added. If the DB is already current they're dead weight. Consider collapsing them into a single versioned migration or removing them once confirmed all installs are up to date.

### 11. `SpaceView` calls `getAllTasks()` to count folder item badges
`SpaceView.jsx:395` fetches all tasks across every space, then filters to the active space on line 402, just to populate the item count on `FolderCard`. A minor server-side addition — supporting `GET /api/tasks?space=X` without requiring `folder_id` — would scope the fetch to the active space only. Small API change, cleaner data fetching.
