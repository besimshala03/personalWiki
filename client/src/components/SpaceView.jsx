import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getLinks, getFiles, createLink, uploadFile, deleteLink, deleteFile, updateLink, downloadUrl } from '../api';

const SPACE_LABELS = { university: 'University', private: 'Private', work: 'Work' };
const SPACE_ICONS  = { university: '🎓', private: '🔒', work: '💼' };

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz')) return '🗜';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊';
  return '📄';
}

// ── Add Link Form ──────────────────────────────────────
function AddLinkForm({ space, folderId, onAdded, onCancel }) {
  const [form, setForm] = useState({ title: '', url: '', description: '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.url) return;
    await createLink({ ...form, space, folder_id: folderId });
    onAdded();
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <span className="inline-form-title">Add Link</span>
      <div className="form-grid">
        <label className="wiki-label form-full">
          Title
          <input autoFocus className="wiki-input" value={form.title} onChange={set('title')} placeholder="e.g. GitHub" />
        </label>
        <label className="wiki-label form-full">
          URL
          <input className="wiki-input" type="url" value={form.url} onChange={set('url')} placeholder="https://…" />
        </label>
        <label className="wiki-label form-full">
          Note
          <input className="wiki-input" value={form.description} onChange={set('description')} placeholder="Optional description" />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-sm">Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Link Row ───────────────────────────────────────────
function LinkRow({ link, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: link.title, url: link.url, description: link.description ?? '' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    await updateLink(link.id, form);
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`Delete "${link.title}"?`)) return;
    await deleteLink(link.id);
    onChanged();
  };

  let hostname = '';
  try { hostname = new URL(link.url).hostname; } catch {}

  if (editing) {
    return (
      <li className="item-row">
        <form className="edit-form" onSubmit={save}>
          <div className="edit-form-row">
            <input className="wiki-input" value={form.title} onChange={set('title')} placeholder="Title" />
            <input className="wiki-input" type="url" value={form.url} onChange={set('url')} placeholder="URL" />
          </div>
          <input className="wiki-input" value={form.description} onChange={set('description')} placeholder="Note" />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-sm">Save</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="item-row">
      <div className="item-icon">
        <img
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
          alt=""
          width="14" height="14"
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>
      <div className="item-body">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="item-title">
          {link.title}
        </a>
        <span className="item-meta">
          {link.description ? `${link.description} · ` : ''}{hostname}
        </span>
      </div>
      <span className="item-type-badge badge-link">link</span>
      <div className="item-actions">
        <button className="icon-btn" title="Edit" onClick={() => setEditing(true)}>✎</button>
        <button className="icon-btn danger" title="Delete" onClick={remove}>✕</button>
      </div>
    </li>
  );
}

// ── File Row ───────────────────────────────────────────
function FileRow({ file, onChanged }) {
  const remove = async () => {
    if (!confirm(`Delete "${file.original_name}"?`)) return;
    await deleteFile(file.id);
    onChanged();
  };

  return (
    <li className="item-row">
      <div className="item-icon">{fileIcon(file.mime_type)}</div>
      <div className="item-body">
        <a href={downloadUrl(file.id)} download={file.original_name} className="item-title">
          {file.original_name}
        </a>
        <span className="item-meta">
          {formatSize(file.size)} · {new Date(file.created_at).toLocaleDateString()}
        </span>
      </div>
      <span className="item-type-badge badge-file">file</span>
      <div className="item-actions">
        <button className="icon-btn danger" title="Delete" onClick={remove}>✕</button>
      </div>
    </li>
  );
}

// ── Space View ─────────────────────────────────────────
export default function SpaceView({ space, activeFolder }) {
  const [links, setLinks] = useState([]);
  const [files, setFiles] = useState([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef();

  const folderId = activeFolder?.id ?? null;

  const load = useCallback(() => {
    getLinks(space, folderId).then(setLinks);
    getFiles(space, folderId).then(setFiles);
  }, [space, folderId]);

  useEffect(() => {
    load();
    setShowLinkForm(false);
  }, [load]);

  const doUpload = async (fileObj) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', fileObj);
    fd.append('space', space);
    if (folderId !== null) fd.append('folder_id', folderId);
    await uploadFile(fd);
    setUploading(false);
    load();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(doUpload);
  };

  // Merge + sort by created_at desc
  const allItems = [
    ...links.map(l => ({ ...l, _type: 'link' })),
    ...files.map(f => ({ ...f, _type: 'file' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const breadcrumb = activeFolder ? `${SPACE_LABELS[space]} / ${activeFolder.name}` : SPACE_LABELS[space];

  return (
    <div
      className="space-view"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
      onDrop={onDrop}
    >
      <div className="space-header">
        <div className="space-breadcrumb">
          <span>{SPACE_ICONS[space]}</span>
          <span>{breadcrumb}</span>
        </div>
        <h1 className="space-title">{activeFolder ? activeFolder.name : SPACE_LABELS[space]}</h1>
      </div>

      <div className="action-bar">
        <button className="btn btn-primary btn-sm" onClick={() => setShowLinkForm(v => !v)}>
          + Add Link
        </button>
        <button className="btn btn-sm" onClick={() => fileInput.current.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : '↑ Upload File'}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => Array.from(e.target.files).forEach(doUpload)}
        />
      </div>

      {showLinkForm && (
        <AddLinkForm
          space={space}
          folderId={folderId}
          onAdded={() => { setShowLinkForm(false); load(); }}
          onCancel={() => setShowLinkForm(false)}
        />
      )}

      {dragging && (
        <div className="drop-zone drop-zone--active">
          Drop files to upload
        </div>
      )}

      {allItems.length === 0 && !dragging ? (
        <div className="empty-state">
          <div className="empty-state-icon">◻</div>
          <p>Nothing here yet.</p>
          <p>Add a link or drop a file to get started.</p>
        </div>
      ) : (
        <ul className="item-list">
          {allItems.map(item =>
            item._type === 'link'
              ? <LinkRow key={`l-${item.id}`} link={item} onChanged={load} />
              : <FileRow key={`f-${item.id}`} file={item} onChanged={load} />
          )}
        </ul>
      )}
    </div>
  );
}
