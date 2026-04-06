# Feature: Weekly Task Tracking

## Overview

Add a lightweight task tracking system to the wiki. Tasks are created inside folders
(e.g. a course folder like "Software Engineering") and have a weekly deadline that
defaults to the upcoming Sunday. A dedicated dashboard tab provides an overview of
all tasks across all spaces, grouped by due date and completion status.

---

## User-facing behaviour

### Inside a folder (SpaceView)

- A new "Add task" input appears in the folder view alongside the existing add-link
  and upload-file controls
- Tasks are displayed as cards with a checkbox, title, due date, and delete button
- Checking the checkbox marks the task completed (strikethrough, dimmed)
- Completed tasks remain visible until their due date passes, then they can be
  dismissed or are hidden automatically (see "Completed task visibility" below)
- Due date defaults to the upcoming Sunday (calculated client-side); user can
  optionally pick a different date via a date input

### Dashboard tab

- A new tab labelled "Tasks" appears in TopNav alongside the space tabs
- The dashboard shows all tasks across all spaces, grouped into sections:
  - **Überfällig** — incomplete tasks whose due_date < today (red highlight)
  - **Diese Woche** — due_date is within the current Mon–Sun week
  - **Nächste Woche** — due_date is next Mon–Sun week
  - **Später** — everything beyond next week
- Within each section, tasks are grouped by space + folder name
- Each task row shows: checkbox, title, folder breadcrumb, due date, days remaining
- Checking a task on the dashboard also marks it complete everywhere
- Completed tasks are shown collapsed under a "X erledigt" toggle per section

### Completed task visibility

- Completed tasks are not deleted automatically
- They are hidden from the "Diese Woche" section after their due date passes
- They remain accessible via the folder view indefinitely (dimmed)
- A "Erledigte anzeigen" toggle in the folder view shows/hides them

---

## Data model

Add a `tasks` array to `wiki.json` (managed via `server/db.js`):

```jsonc
{
  "tasks": [
    {
      "id": 1,
      "title": "Übungsblatt 3 abgeben",
      "space": "university",
      "folder_id": 7,           // null = root of space
      "due_date": "2026-04-13", // ISO date string, always a Sunday by default
      "completed": false,
      "completed_at": null,     // ISO timestamp or null
      "created_at": "2026-04-06T12:00:00.000Z"
    }
  ]
}
```

Add `"tasks": 0` to the `_seq` counter object.

---

## API routes (`server/routes/tasks.js`)

| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/api/tasks` | `?space=&folder_id=` | Tasks for a space+folder (`folder_id=null` = root) |
| GET | `/api/tasks/all` | — | All tasks across all spaces (for dashboard) |
| POST | `/api/tasks` | `{ title, space, folder_id?, due_date }` | Create task |
| PATCH | `/api/tasks/:id` | `{ title?, due_date?, completed? }` | Update / check off |
| DELETE | `/api/tasks/:id` | — | Delete task |

Mount in `server/index.js`:
```js
import tasksRouter from './routes/tasks.js';
app.use('/api/tasks', tasksRouter);
```

All DB mutations must go through `server/db.js` — routes must not touch `db.data` directly.

---

## DB functions to add in `server/db.js`

```js
getTasks(space, folderId)       // used by GET /api/tasks
getAllTasks()                    // used by GET /api/tasks/all
insertTask({ title, space, folder_id, due_date })
updateTask(id, fields)          // partial update
deleteTask(id)
```

Cascade: when a folder is deleted, delete all tasks with that `folder_id`.
When a space is deleted, delete all tasks with that `space`.
Update the existing `deleteFolder` and `deleteSpace` functions in `db.js` accordingly.

---

## Frontend

### `client/src/api.js` — add these calls

```js
export const getTasks = (space, folderId) => ...
export const getAllTasks = () => ...
export const createTask = (data) => ...
export const updateTask = (id, data) => ...
export const deleteTask = (id) => ...
```

### `client/src/components/TaskDashboard.jsx` (new file)

- Fetches all tasks via `getAllTasks()` on mount and after every mutation
- Groups and renders tasks as described in "Dashboard tab" above
- Uses a `<input type="checkbox">` for completion toggle
- Shows folder breadcrumb as `Space › Folder` using space name + folder name
  (resolve names from props passed down from App.jsx)
- "Überfällig" tasks get a red left border using `--accent` override or a dedicated
  CSS class `.task-overdue`

### `client/src/components/SpaceView.jsx` — modifications

- After the existing add-link form, add an "Add task" inline form:
  - Text input for title (required)
  - Date input for due_date (default = next Sunday, `type="date"`)
  - Submit button
- Render tasks as cards in the card grid, visually distinct from links and files:
  - Checkbox on the left
  - Title (strikethrough + dimmed if completed)
  - Due date chip (red if overdue)
  - Delete button (×)
- Fetch tasks alongside links and files; re-fetch after every mutation

### `client/src/components/TopNav.jsx` — modifications

- Add a "Tasks" tab after the space tabs (always visible, not a space)
- Clicking it sets a new `activeView = 'tasks'` state in `App.jsx`
- Show a small badge with the count of incomplete overdue tasks if > 0

### `client/src/App.jsx` — modifications

- Add `activeView` state: `'space'` (default) or `'tasks'`
- When `activeView === 'tasks'`, render `<TaskDashboard />` instead of `<SpaceView />`
- Pass `spaces` and `folders` as props to `TaskDashboard` for breadcrumb resolution

---

## Helper: next Sunday calculation (client-side utility)

Add to `client/src/utils.js` (create if it doesn't exist):

```js
export function nextSunday() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun, 1 = Mon, …
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}
```

---

## CSS additions (`client/src/styles/wiki.css`)

Add styles for:
- `.task-card` — card variant for tasks (same base as `.card` but with checkbox layout)
- `.task-card.completed .task-title` — `text-decoration: line-through; opacity: 0.45`
- `.task-due` — small date chip, uses `--t3` color
- `.task-due.overdue` — red tint, use a semi-transparent red (do not hardcode hex, use `rgba`)
- `.task-section` — dashboard section heading
- `.task-row` — single task row in the dashboard
- `.task-badge` — small red circle badge on the Tasks tab

Do not hardcode colour values. Use existing CSS custom properties where possible.

---

## Files to create / modify

| File | Action |
|---|---|
| `server/routes/tasks.js` | Create — CRUD routes |
| `server/db.js` | Modify — add task functions, update cascade deletes |
| `server/index.js` | Modify — mount tasks router |
| `client/src/api.js` | Modify — add task API calls |
| `client/src/components/TaskDashboard.jsx` | Create — dashboard view |
| `client/src/components/SpaceView.jsx` | Modify — add task cards + add-task form |
| `client/src/components/TopNav.jsx` | Modify — add Tasks tab + badge |
| `client/src/App.jsx` | Modify — add activeView state |
| `client/src/utils.js` | Create — nextSunday helper |
| `client/src/styles/wiki.css` | Modify — task styles |

---

## Constraints (from AGENT.md — do not violate)

- No TypeScript, no CSS modules, no Tailwind — plain JS/JSX and `wiki.css`
- No packages requiring `node-gyp`
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

University folders (space = "university"):
```
id=3  ss26/                                    parent_id=null
id=4  ws26/27/                                 parent_id=null
id=5  Sponsorship-linked marketing             parent_id=3
id=6  Business Process Technologies            parent_id=3
id=7  Software Engineering                     parent_id=3
id=8  corporate finance                        parent_id=3
id=9  Seminar: Large Language Models           parent_id=3
```

---

## Testing

No automated test suite. Verify manually:

1. Open a course folder → add a task → confirm it appears as a card with checkbox
2. Check the checkbox → confirm strikethrough and `completed_at` is set
3. Open Tasks dashboard → confirm task appears under "Diese Woche"
4. Create a task with a past due_date → confirm it appears under "Überfällig" in red
5. Delete a folder → confirm its tasks are gone from the dashboard
6. "Erledigte anzeigen" toggle in folder view shows/hides completed tasks
7. Badge on Tasks tab shows count of overdue incomplete tasks
