# Refactoring Opportunities — Personal Wiki

This document contains identified refactoring opportunities in the codebase. Each section includes the problem, location, and specific implementation guidance for an AI agent.

---

## 1. Extract `useClickOutside` Hook (Priority: Medium)

**Problem**: Three dropdown menus implement identical click-outside detection logic.

**Locations**:
- `client/src/components/TopNav.jsx` lines 19-22 (space menu)
- `client/src/components/TopNav.jsx` lines 78-81 (rename menu)
- `client/src/components/SyncSettings.jsx` lines 30-35

**Current Duplicated Pattern**:
```javascript
useEffect(() => {
  const onDocClick = (e) => {
    if (ref.current && !ref.current.contains(e.target)) setState(false);
  };
  document.addEventListener('mousedown', onDocClick);
  return () => document.removeEventListener('mousedown', onDocClick);
}, []);
```

**Implementation**:
1. Create `client/src/hooks/useClickOutside.js`:
```javascript
import { useEffect } from 'react';

export function useClickOutside(ref, onClickOutside) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClickOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClickOutside]);
}
```

2. Replace all three instances in TopNav.jsx and SyncSettings.jsx with the hook.

---

## 2. Fix API Error Handling Consistency (Priority: High)

**Problem**: `api.js` has inconsistent error handling. `requestJson` checks `response.ok` and throws, but `post`, `patch`, `del` shortcuts bypass it.

**Location**: `client/src/api.js` lines 1-13

**Current Code**:
```javascript
const requestJson = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status}`);
  return res.json();
};

export const get = (url) => fetch(url).then(r => r.json()); // Missing error check
export const post = (url, body) => requestJson('POST', url, body);
export const patch = (url, body) => requestJson('PATCH', url, body);
export const del = (url) => requestJson('DELETE', url); // Broken: doesn't exist
```

**Implementation**:
Fix the `del` function to actually delete, and ensure all functions use consistent error handling:
```javascript
export const del = (url) =>
  fetch(url, { method: 'DELETE' }).then(r => {
    if (!r.ok) throw new Error(`DELETE ${url}: ${r.status}`);
  });
```

---

## 3. Split SpaceView.jsx Monolith (Priority: High)

**Problem**: `SpaceView.jsx` is 610 lines handling folders, links, files, tasks, forms, upload, and breadcrumbs.

**Location**: `client/src/components/SpaceView.jsx`

**Current Structure**:
- Lines 1-100: Imports and state
- Lines 100-200: Folder card sub-component
- Lines 200-300: Link card sub-component
- Lines 300-400: File card sub-component
- Lines 400-500: Task card sub-component
- Lines 500-600: Add panels (link/task/folder forms)
- Lines 600+: Main render

**Implementation**:
Create `client/src/components/space-view/` directory with:
- `FolderCard.jsx` - Display folder with actions
- `LinkCard.jsx` - Display link with edit/delete
- `FileCard.jsx` - Display file with delete
- `TaskCard.jsx` - Display task with toggle/delete
- `AddLinkPanel.jsx` - Form to add new link
- `AddTaskPanel.jsx` - Form to add new task
- `Breadcrumb.jsx` - Navigation breadcrumb
- `index.jsx` - Main SpaceView component that composes the above

Each sub-component should receive only the props it needs. Keep data fetching in the main component, pass handlers down.

---

## 4. Extract Shared Task Toggle Logic (Priority: Low)

**Problem**: Task completion logic duplicated in two places.

**Locations**:
- `client/src/components/SpaceView.jsx` lines 255-260
- `client/src/components/TasksDashboard.jsx` lines 156-162

**Current Duplicated Code**:
```javascript
const completed = !task.completed;
const completed_at = completed ? new Date().toISOString() : null;
await updateTask(task.id, { completed, completed_at });
// ... refresh data
```

**Implementation**:
Options:
1. Add a `toggleTask(task)` helper in `client/src/api.js` that handles the timestamp logic
2. Or create `client/src/utils/taskUtils.js` with a `buildToggleUpdate(task)` function

---

## 5. Consolidate Database Migrations (Priority: Low)

**Problem**: `server/db.js` runs migrations with separate write calls.

**Location**: `server/db.js` lines 32-54

**Current Pattern**:
```javascript
if (!db.data.spaces) { db.data.spaces = []; await db.write(); }
if (!db.data.folders) { db.data.folders = []; await db.write(); }
// ... repeated for each collection
```

**Implementation**:
Move to a single `migrate()` function that:
1. Checks all required keys
2. Initializes missing ones
3. Writes once at the end

This reduces I/O and is cleaner.

---

## 6. Remove Unused CSS Legacy (Priority: Low)

**Problem**: Hardcoded space colors in CSS that are no longer used.

**Location**: `client/src/styles/wiki.css` lines 24-26

**Current Code**:
```css
[data-space="university"] { --accent: #818cf8; --accent-bg: rgba(129,140,248,0.07); }
[data-space="private"] { --accent: #34d399; --accent-bg: rgba(52,211,153,0.07); }
[data-space="work"] { --accent: #fbbf24; --accent-bg: rgba(251,191,36,0.07); }
```

**Implementation**: Delete these lines. Colors are now set dynamically via inline styles on the `.app` element.

---

## Recommended Implementation Order

1. **Fix API error handling** (#2) - Small change, prevents bugs
2. **Extract useClickOutside hook** (#1) - Improves maintainability
3. **Split SpaceView.jsx** (#3) - Significant improvement, but largest effort
4. **Consolidate migrations** (#5) - Nice cleanup
5. **Extract task toggle** (#4) - Small DRY improvement
6. **Remove unused CSS** (#6) - Cleanup

---

## Notes for AI Agent

- Follow existing code style in each file
- Do NOT introduce TypeScript
- Do NOT add new dependencies
- Keep all CSS in the single wiki.css file
- Run `cd client && npm run build` after changes
- Test manually before committing
