# Feature: Weekly Task Tracking

## Overview

Add a lightweight task tracking system to the wiki. Tasks are a new content type,
similar to folders, links, and files, and can be created explicitly inside any
space or folder. A dedicated dashboard tab provides an overview of all tasks across
all spaces, grouped by due date and completion status.

Important clarification:
- Folders themselves do not become tasks
- A folder can contain tasks, just like it can contain links and files
- The dashboard concept stays the same: it shows all tasks across the wiki

---

## User-facing behaviour

### Creating tasks

- Users can create tasks explicitly, just like they can create folders, add links,
  or upload files
- Task creation is available in the current space/folder view
- A task belongs to a space and optionally to a folder
- Due date defaults to the upcoming Sunday
- User can optionally pick a different due date during creation

### Inside a folder or space root (`SpaceView`)

- A new "Add task" control appears alongside the existing create-folder, add-link,
  and upload-file controls
- Tasks are displayed as their own cards in the grid, visually distinct from folders,
  links, and files
- Each task card shows:
  - checkbox
  - title
  - due date
  - delete button
- Checking the checkbox marks the task completed (strikethrough, dimmed)
- Completed tasks remain visible in the folder view
- A "Erledigte anzeigen" toggle in the folder view shows/hides completed tasks

### Dashboard tab

- A new tab labelled "Tasks" appears in TopNav alongside the space tabs
- The dashboard shows all tasks across all spaces, grouped into sections:
  - **Überfällig** — incomplete tasks whose due_date < today
  - **Diese Woche** — due_date is within the current Mon–Sun week
  - **Nächste Woche** — due_date is next Mon–Sun week
  - **Später** — everything beyond next week
- Within each section, tasks are grouped by space + folder name
- Each task row shows:
  - checkbox
  - title
  - folder breadcrumb
  - due date
  - days remaining
- Checking a task on the dashboard also marks it complete everywhere
- Completed tasks are shown collapsed under a "X erledigt" toggle per section

### Completed task visibility

- Completed tasks are not deleted automatically
- They are hidden from the main incomplete dashboard groups once completed
- They remain accessible in the folder view when "Erledigte anzeigen" is enabled
- They remain accessible in the dashboard via the collapsed completed section

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
      "due_date": "2026-04-13", // ISO date string, defaults to upcoming Sunday
      "completed": false,
      "completed_at": null,     // ISO timestamp or null
      "created_at": "2026-04-06T12:00:00.000Z"
    }
  ]
}
```

Add `"tasks": 0` to the `_seq` counter object.

Tasks are their own records. They are not derived from folders, and no folder-level
"mark as task" concept should exist.

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

All DB mutations must go through `server/db.js` — routes must not touch `db.data`
directly.

---

## DB functions to add in `server/db.js`

```js
getTasks(space, folderId)       // used by GET /api/tasks
getAllTasks()                   // used by GET /api/tasks/all
insertTask({ title, space, folder_id, due_date })
updateTask(id, fields)          // partial update
deleteTask(id)
```

Cascade:
- when a folder is deleted, delete all tasks with that `folder_id`
- when a space is deleted, delete all tasks with that `space`

Update the existing `deleteFolder` and `deleteSpace` functions in `db.js`
accordingly.

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
- Uses an `<input type="checkbox">` for completion toggle
- Shows folder breadcrumb as `Space › Folder` using space name + folder name
  (resolve names from props passed down from App.jsx)
- Overdue tasks get a dedicated visual treatment

### `client/src/components/SpaceView.jsx` — modifications

- Add an "Add task" inline form near the existing create actions:
  - text input for title (required)
  - date input for due_date (default = next Sunday, `type="date"`)
  - submit button
- Render tasks as cards in the card grid, visually distinct from folders, links,
  and files
- Fetch tasks alongside links and files; re-fetch after every mutation
- Add a toggle to show/hide completed tasks in the current view

### `client/src/components/TopNav.jsx` — modifications

- Add a "Tasks" tab after the space tabs
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
- `.task-card` — card variant for tasks
- `.task-card.completed .task-title` — `text-decoration: line-through; opacity: 0.45`
- `.task-due` — small date chip
- `.task-due.overdue` — overdue visual state
- `.task-section` — dashboard section heading
- `.task-row` — single task row in the dashboard
- `.task-badge` — small badge on the Tasks tab

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

1. Open a course folder and add a task
2. Confirm it appears as a task card with checkbox and due date
3. Check the checkbox and confirm it becomes completed
4. Open the Tasks dashboard and confirm the task appears in the correct section
5. Create a task with a past due_date and confirm it appears under "Überfällig"
6. Delete a folder and confirm its tasks are gone from the dashboard
7. Use "Erledigte anzeigen" in folder view and confirm completed tasks can be toggled
8. Confirm the Tasks tab badge shows the count of incomplete overdue tasks
