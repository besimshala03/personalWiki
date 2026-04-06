import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getLinks, getFiles, createLink, uploadFile, deleteLink, deleteFile, updateLink, downloadUrl } from '../api';

const META = {
  university: { label: 'University', color: '#818cf8' },
  private:    { label: 'Private',    color: '#34d399' },
  work:       { label: 'Work',       color: '#fbbf24' },
};

function formatSize(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
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

// ── Link Card ─────────────────────────────────────────
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

  const remove = async () => {
    if (!confirm(`Delete "${link.title}"?`)) return;
    await deleteLink(link.id); onChanged();
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
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
          />
          <div className="card-favicon-fallback" style={{display:'none'}}>🔗</div>
        </div>
        <div className="card-controls">
          <button className="card-btn" onClick={() => setEditing(true)} title="Edit">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="card-btn card-btn--danger" onClick={remove} title="Delete">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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

// ── File Card ─────────────────────────────────────────
function FileCard({ file, onChanged }) {
  const remove = async () => {
    if (!confirm(`Delete "${file.original_name}"?`)) return;
    await deleteFile(file.id); onChanged();
  };

  return (
    <div className="card">
      <div className="card-top">
        <div className="card-file-icon">{mimeIcon(file.mime_type)}</div>
        <div className="card-controls">
          <button className="card-btn card-btn--danger" onClick={remove} title="Delete">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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

// ── Add Link modal-style inline ────────────────────────
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2l-10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
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
export default function SpaceView({ space, activeFolder }) {
  const [links, setLinks] = useState([]);
  const [files, setFiles] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef();

  const fid = activeFolder?.id ?? null;
  const meta = META[space];

  const load = useCallback(() => {
    getLinks(space, fid).then(setLinks);
    getFiles(space, fid).then(setFiles);
  }, [space, fid]);

  useEffect(() => { load(); setShowAdd(false); }, [load]);

  const doUpload = async (f) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', f);
    fd.append('space', space);
    if (fid !== null) fd.append('folder_id', fid);
    await uploadFile(fd);
    setUploading(false);
    load();
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    Array.from(e.dataTransfer.files).forEach(doUpload);
  };

  const allItems = [
    ...links.map(l => ({ ...l, _type: 'link' })),
    ...files.map(f => ({ ...f, _type: 'file' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const title = activeFolder ? activeFolder.name : meta.label;

  return (
    <div
      className={`space-view ${dragging ? 'space-view--drag' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
      onDrop={onDrop}
    >
      {/* ── Header ── */}
      <div className="view-header">
        <div className="view-header-top">
          <h1 className="view-title">{title}</h1>
          <p className="view-count">{allItems.length} item{allItems.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="view-actions">
          <button className="action-btn action-btn--primary" onClick={() => setShowAdd(v => !v)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Link
          </button>
          <button className="action-btn" onClick={() => fileInput.current.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 8V2M3 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 9v1a1 1 0 001 1h8a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Upload
              </>
            )}
          </button>
          <input ref={fileInput} type="file" multiple style={{ display: 'none' }}
            onChange={e => Array.from(e.target.files).forEach(doUpload)} />
        </div>
      </div>

      {/* ── Accent line ── */}
      <div className="view-accent" style={{ background: meta.color }} />

      {/* ── Add Link panel ── */}
      {showAdd && (
        <AddLinkPanel
          space={space} folderId={fid}
          onAdded={() => { setShowAdd(false); load(); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* ── Drag overlay ── */}
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

      {/* ── Card grid ── */}
      {allItems.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">◻</div>
          <p className="empty-title">Nothing here yet</p>
          <p className="empty-sub">Add a link or drop a file to get started</p>
        </div>
      ) : (
        <div className="card-grid">
          {allItems.map(item =>
            item._type === 'link'
              ? <LinkCard key={`l-${item.id}`} link={item} onChanged={load} />
              : <FileCard key={`f-${item.id}`} file={item} onChanged={load} />
          )}
        </div>
      )}
    </div>
  );
}
