import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  getLinks, getFiles, getFiles as _gf,
  createLink, uploadFile,
  deleteLink, deleteFile, updateLink, downloadUrl,
  getFolders, createFolder, renameFolder, deleteFolder,
} from '../api';

const META = {
  university: { label: 'University' },
  private:    { label: 'Private'    },
  work:       { label: 'Work'       },
};

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

// ── Folder Card ────────────────────────────────────────
function FolderCard({ folder, allFolders, allLinks, allFiles, onOpen, onRenamed, onDeleted }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);

  const childFolderCount = allFolders.filter(f => f.parent_id === folder.id).length;
  const linkCount  = allLinks.filter(l => l.folder_id === folder.id).length;
  const fileCount  = allFiles.filter(f => f.folder_id === folder.id).length;
  const itemCount  = childFolderCount + linkCount + fileCount;

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
            <path d="M2 5.5C2 4.67 2.67 4 3.5 4H7l1.5 2H14.5C15.33 6 16 6.67 16 7.5V13.5C16 14.33 15.33 15 14.5 15H3.5C2.67 15 2 14.33 2 13.5V5.5z"
              fill="var(--accent)" fillOpacity=".15" stroke="var(--accent)" strokeWidth="1.2"/>
          </svg>
        </div>
        <div className="card-controls" onClick={e => e.stopPropagation()}>
          <button className="card-btn" title="Rename" onClick={() => { setName(folder.name); setRenaming(true); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5l2 2-6 6H1.5V7.5l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="card-btn card-btn--danger" title="Delete" onClick={handleDelete}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
              onKeyDown={e => { if (e.key === 'Escape') { setName(folder.name); setRenaming(false); } }}
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

// ── Link Card ──────────────────────────────────────────
function LinkCard({ link, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: link.title, url: link.url, description: link.description ?? '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  let host = '';
  try { host = new URL(link.url).hostname.replace('www.', ''); } catch {}

  const save = async (e) => {
    e.preventDefault();
    await updateLink(link.id, form);
    setEditing(false); onChanged();
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
          <img className="card-favicon"
            src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt=""
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          <div className="card-favicon-fallback" style={{ display: 'none' }}>🔗</div>
        </div>
        <div className="card-controls">
          <button className="card-btn" title="Edit" onClick={() => setEditing(true)}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5l2 2-6 6H1.5V7.5l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="card-btn card-btn--danger" title="Delete" onClick={async () => { if (!confirm(`Delete "${link.title}"?`)) return; await deleteLink(link.id); onChanged(); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="card-body">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="card-title" onClick={e => e.stopPropagation()}>{link.title}</a>
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

// ── File Card ──────────────────────────────────────────
function FileCard({ file, onChanged }) {
  return (
    <div className="card">
      <div className="card-top">
        <div className="card-file-icon">{mimeIcon(file.mime_type)}</div>
        <div className="card-controls">
          <button className="card-btn card-btn--danger" title="Delete"
            onClick={async () => { if (!confirm(`Delete "${file.original_name}"?`)) return; await deleteFile(file.id); onChanged(); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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

// ── Add Link Panel ─────────────────────────────────────
function AddLinkPanel({ space, folderId, onAdded, onClose }) {
  const [form, setForm] = useState({ title: '', url: '', description: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

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
            <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
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

// ── Space View ─────────────────────────────────────────
export default function SpaceView({ space, activeFolder, onFolderChange }) {
  const [folders, setFolders]   = useState([]);
  const [links, setLinks]       = useState([]);
  const [files, setFiles]       = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const fileInput = useRef();

  const fid = activeFolder?.id ?? null;
  const spaceLabel = META[space]?.label ?? space;

  const load = useCallback(() => {
    getFolders(space).then(setFolders);
    getLinks(space, fid).then(setLinks);
    getFiles(space, fid).then(setFiles);
  }, [space, fid]);

  useEffect(() => { load(); setShowAdd(false); setAddingFolder(false); }, [load]);

  // Folders visible at this level
  const visibleFolders = folders.filter(f => f.parent_id === fid);

  // Breadcrumb
  const breadcrumb = [];
  if (activeFolder) {
    let cur = activeFolder;
    while (cur) {
      breadcrumb.unshift(cur);
      cur = folders.find(f => f.id === cur.parent_id) ?? null;
    }
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder({ name: newFolderName.trim(), space, parent_id: fid });
    setNewFolderName(''); setAddingFolder(false); load();
  };

  const doUpload = async (f) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', f); fd.append('space', space);
    if (fid !== null) fd.append('folder_id', fid);
    await uploadFile(fd);
    setUploading(false); load();
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    Array.from(e.dataTransfer.files).forEach(doUpload);
  };

  const contentItems = [
    ...links.map(l => ({ ...l, _type: 'link' })),
    ...files.map(f => ({ ...f, _type: 'file' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const title = activeFolder ? activeFolder.name : spaceLabel;
  const totalCount = visibleFolders.length + contentItems.length;

  return (
    <div
      className={`space-view ${dragging ? 'space-view--drag' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
      onDrop={onDrop}
    >
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={() => onFolderChange(null)}>{spaceLabel}</button>
          {breadcrumb.map((f, i) => (
            <React.Fragment key={f.id}>
              <span className="breadcrumb-sep">›</span>
              <button
                className={`breadcrumb-item ${i === breadcrumb.length - 1 ? 'breadcrumb-item--active' : ''}`}
                onClick={() => onFolderChange(f)}
              >{f.name}</button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="view-header">
        <div>
          <h1 className="view-title">{title}</h1>
          <p className="view-count">{totalCount} item{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="view-actions">
          <button className="action-btn" onClick={() => { setAddingFolder(v => !v); setShowAdd(false); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
            New folder
          </button>
          <button className="action-btn action-btn--primary" onClick={() => { setShowAdd(v => !v); setAddingFolder(false); }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
            Add Link
          </button>
          <button className="action-btn" onClick={() => fileInput.current.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : (
              <>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 7.5V1.5M3 4l2.5-2.5L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 8.5v1a1 1 0 001 1h7a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Upload
              </>
            )}
          </button>
          <input ref={fileInput} type="file" multiple style={{ display: 'none' }}
            onChange={e => Array.from(e.target.files).forEach(doUpload)} />
        </div>
      </div>

      <div className="view-accent" style={{ background: 'var(--accent)' }} />

      {/* New folder inline form */}
      {addingFolder && (
        <form className="add-panel" onSubmit={handleCreateFolder}>
          <div className="add-panel-header">
            <span>New Folder{activeFolder ? ` in "${activeFolder.name}"` : ''}</span>
            <button type="button" className="add-panel-close" onClick={() => setAddingFolder(false)}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="add-panel-form">
            <input autoFocus className="panel-input" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" />
            <button type="submit" className="panel-submit">Create</button>
          </div>
        </form>
      )}

      {/* Add link panel */}
      {showAdd && (
        <AddLinkPanel
          space={space} folderId={fid}
          onAdded={() => { setShowAdd(false); load(); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Drag overlay */}
      {dragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 22V10M10 16l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 24v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>Drop to upload</p>
          </div>
        </div>
      )}

      {/* Grid */}
      {totalCount === 0 && !dragging ? (
        <div className="empty">
          <div className="empty-icon">◻</div>
          <p className="empty-title">Nothing here yet</p>
          <p className="empty-sub">Add a link, upload a file, or create a folder</p>
        </div>
      ) : (
        <div className="card-grid">
          {visibleFolders.map(f => (
            <FolderCard
              key={f.id}
              folder={f}
              allFolders={folders}
              allLinks={links}
              allFiles={files}
              onOpen={onFolderChange}
              onRenamed={load}
              onDeleted={() => { if (activeFolder?.id === f.id) onFolderChange(null); load(); }}
            />
          ))}
          {contentItems.map(item =>
            item._type === 'link'
              ? <LinkCard key={`l-${item.id}`} link={item} onChanged={load} />
              : <FileCard key={`f-${item.id}`} file={item} onChanged={load} />
          )}
        </div>
      )}
    </div>
  );
}
