import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createFolder,
  createLink,
  createTask,
  deleteFile,
  deleteFolder,
  deleteLink,
  deleteTask,
  downloadUrl,
  getFiles,
  getFolders,
  getAllTasks,
  getLinks,
  getTasks,
  renameFolder,
  updateLink,
  updateTask,
  uploadFile,
} from '../api';

function formatSize(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function mimeIcon(m) {
  if (!m) return '📄';
  if (m.startsWith('image/')) return '🖼';
  if (m.startsWith('video/')) return '🎬';
  if (m.startsWith('audio/')) return '🎵';
  if (m.includes('pdf')) return '📕';
  if (m.includes('zip') || m.includes('tar')) return '🗜';
  if (m.includes('word')) return '📝';
  if (m.includes('sheet') || m.includes('excel')) return '📊';
  return '📄';
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function nextSunday() {
  const date = new Date();
  const daysUntilSunday = (7 - date.getDay()) % 7;
  date.setDate(date.getDate() + daysUntilSunday);
  return date.toLocaleDateString('en-CA');
}

function formatDueDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  });
}

function isOverdue(task) {
  return !task.completed && task.due_date < todayKey();
}

function FolderCard({ folder, allFolders, allLinks, allFiles, allTasks, onOpen, onRenamed, onDeleted }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);

  const childFolderCount = allFolders.filter(entry => entry.parent_id === folder.id).length;
  const linkCount = allLinks.filter(entry => entry.folder_id === folder.id).length;
  const fileCount = allFiles.filter(entry => entry.folder_id === folder.id).length;
  const taskCount = allTasks.filter(entry => entry.folder_id === folder.id).length;
  const itemCount = childFolderCount + linkCount + fileCount + taskCount;

  const submitRename = async (e) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== folder.name) await renameFolder(folder.id, trimmed);
    setRenaming(false);
    onRenamed();
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return;
    await deleteFolder(folder.id);
    onDeleted();
  };

  return (
    <div className="card card--folder" onClick={() => !renaming && onOpen(folder)}>
      <div className="card-top">
        <div className="card-folder-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M2 5.5C2 4.67 2.67 4 3.5 4H7l1.5 2H14.5C15.33 6 16 6.67 16 7.5V13.5C16 14.33 15.33 15 14.5 15H3.5C2.67 15 2 14.33 2 13.5V5.5z"
              fill="var(--accent)"
              fillOpacity=".15"
              stroke="var(--accent)"
              strokeWidth="1.2"
            />
          </svg>
        </div>
        <div className="card-controls" onClick={e => e.stopPropagation()}>
          <button className="card-btn" title="Rename" onClick={() => { setName(folder.name); setRenaming(true); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5l2 2-6 6H1.5V7.5l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="card-btn card-btn--danger" title="Delete" onClick={handleDelete}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card-body">
        {renaming ? (
          <form onSubmit={submitRename} onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              className="card-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setName(folder.name);
                  setRenaming(false);
                }
              }}
            />
          </form>
        ) : (
          <span className="card-title">{folder.name}</span>
        )}
        <p className="card-sub">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
      </div>

      <div className="card-footer">
        <span className="card-type card-type--folder">Folder</span>
        <span className="card-date">{new Date(folder.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

function LinkCard({ link, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: link.title, url: link.url, description: link.description ?? '' });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));

  let host = '';
  try {
    host = new URL(link.url).hostname.replace('www.', '');
  } catch {}

  const save = async (e) => {
    e.preventDefault();
    await updateLink(link.id, form);
    setEditing(false);
    onChanged();
  };

  if (editing) {
    return (
      <div className="card card--editing">
        <form className="card-edit-form" onSubmit={save}>
          <input className="card-input" value={form.title} onChange={set('title')} placeholder="Title" autoFocus />
          <input className="card-input" type="url" value={form.url} onChange={set('url')} placeholder="URL" />
          <input className="card-input" value={form.description} onChange={set('description')} placeholder="Note (optional)" />
          <div className="card-edit-actions">
            <button type="submit" className="btn-save">Save</button>
            <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-top">
        <div className="card-favicon-wrap">
          <img
            className="card-favicon"
            src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
            alt=""
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="card-favicon-fallback" style={{ display: 'none' }}>🔗</div>
        </div>
        <div className="card-controls">
          <button className="card-btn" title="Edit" onClick={() => setEditing(true)}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5l2 2-6 6H1.5V7.5l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="card-btn card-btn--danger"
            title="Delete"
            onClick={async () => {
              if (!confirm(`Delete "${link.title}"?`)) return;
              await deleteLink(link.id);
              onChanged();
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="card-body">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="card-title">{link.title}</a>
        <p className="card-sub">{host}</p>
        {link.description && <p className="card-note">{link.description}</p>}
      </div>
      <div className="card-footer">
        <span className="card-type card-type--link">Link</span>
        <span className="card-date">{new Date(link.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

function FileCard({ file, onChanged }) {
  return (
    <div className="card">
      <div className="card-top">
        <div className="card-file-icon">{mimeIcon(file.mime_type)}</div>
        <div className="card-controls">
          <button
            className="card-btn card-btn--danger"
            title="Delete"
            onClick={async () => {
              if (!confirm(`Delete "${file.original_name}"?`)) return;
              await deleteFile(file.id);
              onChanged();
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="card-body">
        <a href={downloadUrl(file.id)} download={file.original_name} className="card-title">{file.original_name}</a>
        <p className="card-sub">{formatSize(file.size)}</p>
      </div>
      <div className="card-footer">
        <span className="card-type card-type--file">File</span>
        <span className="card-date">{new Date(file.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

function TaskCard({ task, onChanged }) {
  const overdue = isOverdue(task);

  const handleToggle = async () => {
    await updateTask(task.id, {
      completed: !task.completed,
      completed_at: task.completed ? null : new Date().toISOString(),
    });
    onChanged();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    await deleteTask(task.id);
    onChanged();
  };

  return (
    <div className={`card task-card ${task.completed ? 'completed' : ''} ${overdue ? 'task-card--overdue' : ''}`}>
      <div className="card-top">
        <label className="task-card-toggle">
          <input className="task-checkbox" type="checkbox" checked={task.completed} onChange={handleToggle} />
          <span className="task-checkmark" />
        </label>
        <div className="card-controls">
          <button className="card-btn card-btn--danger" title="Delete" onClick={handleDelete}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card-body">
        <span className="card-title task-title">{task.title}</span>
        <div className="task-meta">
          <span className={`task-due ${overdue ? 'overdue' : ''}`}>{formatDueDate(task.due_date)}</span>
          <span className="card-sub">{task.completed ? 'Done' : 'Open'}</span>
        </div>
      </div>

      <div className="card-footer">
        <span className="card-type card-type--task">Task</span>
        <span className="card-date">{new Date(task.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

function AddLinkPanel({ space, folderId, onAdded, onClose }) {
  const [form, setForm] = useState({ title: '', url: '', description: '' });
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.url) return;
    await createLink({ ...form, space, folder_id: folderId });
    onAdded();
  };

  return (
    <div className="add-panel">
      <div className="add-panel-header">
        <span>New Link</span>
        <button className="add-panel-close" onClick={onClose}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <form className="add-panel-form" onSubmit={submit}>
        <input autoFocus className="panel-input" value={form.title} onChange={set('title')} placeholder="Title" />
        <input className="panel-input" type="url" value={form.url} onChange={set('url')} placeholder="https://…" />
        <input className="panel-input" value={form.description} onChange={set('description')} placeholder="Note (optional)" />
        <button type="submit" className="panel-submit">Add Link</button>
      </form>
    </div>
  );
}

function AddTaskPanel({ space, folderId, folderName, onAdded, onClose }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(nextSunday());

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask({ title: title.trim(), space, folder_id: folderId, due_date: dueDate });
    onAdded();
  };

  return (
    <div className="add-panel">
      <div className="add-panel-header">
        <span>New Task{folderName ? ` in "${folderName}"` : ''}</span>
        <button className="add-panel-close" onClick={onClose}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <form className="add-panel-form" onSubmit={submit}>
        <input autoFocus className="panel-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" />
        <input className="panel-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <button type="submit" className="panel-submit">Add Task</button>
      </form>
    </div>
  );
}

export default function SpaceView({ space, spaces, activeFolder, onFolderChange, onTasksChanged }) {
  const [folders, setFolders] = useState([]);
  const [links, setLinks] = useState([]);
  const [files, setFiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allSpaceTasks, setAllSpaceTasks] = useState([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef();

  const fid = activeFolder?.id ?? null;
  const spaceLabel = spaces.find(entry => entry.id === space)?.name ?? space;

  const load = useCallback(async () => {
    const [folderList, linkList, fileList, taskList, taskListAll] = await Promise.all([
      getFolders(space),
      getLinks(space, fid),
      getFiles(space, fid),
      getTasks(space, fid),
      getAllTasks(),
    ]);

    setFolders(folderList);
    setLinks(linkList);
    setFiles(fileList);
    setTasks(taskList);
    setAllSpaceTasks(taskListAll.filter(task => task.space === space));
  }, [space, fid]);

  useEffect(() => {
    load();
    setShowAddLink(false);
    setShowAddTask(false);
    setAddingFolder(false);
  }, [load]);

  const visibleFolders = folders.filter(folder => folder.parent_id === fid);
  const visibleTasks = tasks;

  const breadcrumb = [];
  if (activeFolder) {
    let current = activeFolder;
    while (current) {
      breadcrumb.unshift(current);
      current = folders.find(folder => folder.id === current.parent_id) ?? null;
    }
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder({ name: newFolderName.trim(), space, parent_id: fid });
    setNewFolderName('');
    setAddingFolder(false);
    load();
  };

  const refreshTasks = async () => {
    await load();
    onTasksChanged();
  };

  const doUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('space', space);
    if (fid !== null) formData.append('folder_id', fid);
    await uploadFile(formData);
    setUploading(false);
    load();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(doUpload);
  };

  const contentItems = [
    ...visibleTasks.map(task => ({ ...task, _type: 'task' })),
    ...links.map(link => ({ ...link, _type: 'link' })),
    ...files.map(file => ({ ...file, _type: 'file' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const title = activeFolder ? activeFolder.name : spaceLabel;
  const totalCount = visibleFolders.length + contentItems.length;
  return (
    <div
      className={`space-view ${dragging ? 'space-view--drag' : ''}`}
      onDragOver={e => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {breadcrumb.length > 0 && (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={() => onFolderChange(null)}>{spaceLabel}</button>
          {breadcrumb.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span className="breadcrumb-sep">›</span>
              <button
                className={`breadcrumb-item ${index === breadcrumb.length - 1 ? 'breadcrumb-item--active' : ''}`}
                onClick={() => onFolderChange(folder)}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="view-header">
        <div>
          <h1 className="view-title">{title}</h1>
          <p className="view-count">{totalCount} item{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="view-actions">
          <button className="action-btn" onClick={() => { setAddingFolder(value => !value); setShowAddLink(false); setShowAddTask(false); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            New folder
          </button>
          <button className="action-btn" onClick={() => { setShowAddLink(value => !value); setAddingFolder(false); setShowAddTask(false); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Add Link
          </button>
          <button className="action-btn action-btn--primary" onClick={() => { setShowAddTask(value => !value); setAddingFolder(false); setShowAddLink(false); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Add Task
          </button>
          <button className="action-btn" onClick={() => fileInput.current.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : (
              <>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 7.5V1.5M3 4l2.5-2.5L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 8.5v1a1 1 0 001 1h7a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Upload
              </>
            )}
          </button>
          <input ref={fileInput} type="file" multiple style={{ display: 'none' }} onChange={e => Array.from(e.target.files).forEach(doUpload)} />
        </div>
      </div>

      <div className="view-accent" style={{ background: 'var(--accent)' }} />

      {addingFolder && (
        <form className="add-panel" onSubmit={handleCreateFolder}>
          <div className="add-panel-header">
            <span>New Folder{activeFolder ? ` in "${activeFolder.name}"` : ''}</span>
            <button type="button" className="add-panel-close" onClick={() => setAddingFolder(false)}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="add-panel-form">
            <input autoFocus className="panel-input" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" />
            <button type="submit" className="panel-submit">Create</button>
          </div>
        </form>
      )}

      {showAddLink && (
        <AddLinkPanel
          space={space}
          folderId={fid}
          onAdded={() => {
            setShowAddLink(false);
            load();
          }}
          onClose={() => setShowAddLink(false)}
        />
      )}

      {showAddTask && (
        <AddTaskPanel
          space={space}
          folderId={fid}
          folderName={activeFolder?.name ?? null}
          onAdded={() => {
            setShowAddTask(false);
            refreshTasks();
          }}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {dragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 22V10M10 16l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 24v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p>Drop to upload</p>
          </div>
        </div>
      )}

      {totalCount === 0 && !dragging ? (
        <div className="empty">
          <div className="empty-icon">◻</div>
          <p className="empty-title">Nothing here yet</p>
          <p className="empty-sub">Add a task, add a link, upload a file, or create a folder</p>
        </div>
      ) : (
        <div className="card-grid">
          {visibleFolders.map(folder => (
            <FolderCard
              key={folder.id}
              folder={folder}
              allFolders={folders}
              allLinks={links}
              allFiles={files}
              allTasks={allSpaceTasks}
              onOpen={onFolderChange}
              onRenamed={load}
              onDeleted={() => {
                if (activeFolder?.id === folder.id) onFolderChange(null);
                load();
                onTasksChanged();
              }}
            />
          ))}
          {contentItems.map(item => {
            if (item._type === 'task') return <TaskCard key={`t-${item.id}`} task={item} onChanged={refreshTasks} />;
            if (item._type === 'link') return <LinkCard key={`l-${item.id}`} link={item} onChanged={load} />;
            return <FileCard key={`f-${item.id}`} file={item} onChanged={load} />;
          })}
        </div>
      )}
    </div>
  );
}
