import React, { useEffect, useState, useCallback } from 'react';
import { getFolders, createFolder, renameFolder, deleteFolder } from '../api';

function FolderPill({ folder, isActive, onSelect, onRenamed, onDeleted }) {
  const [mode, setMode] = useState('view'); // 'view' | 'rename'
  const [name, setName] = useState(folder.name);

  const submitRename = async (e) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== folder.name) {
      await renameFolder(folder.id, trimmed);
      onRenamed();
    }
    setMode('view');
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return;
    await deleteFolder(folder.id);
    onDeleted();
  };

  if (mode === 'rename') {
    return (
      <div className={`folder-pill folder-pill--editing ${isActive ? 'folder-pill--active' : ''}`}>
        <form onSubmit={submitRename} className="folder-rename-form">
          <input
            autoFocus
            className="folder-rename-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={e => { if (e.key === 'Escape') { setName(folder.name); setMode('view'); } }}
          />
        </form>
      </div>
    );
  }

  return (
    <div className={`folder-pill ${isActive ? 'folder-pill--active' : ''}`}>
      <button className="folder-pill-name" onClick={() => onSelect(folder)}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1 3.5C1 2.67 1.67 2 2.5 2H4l1 1.5h3.5C9.33 3.5 10 4.17 10 5v3c0 .83-.67 1.5-1.5 1.5h-7C.67 9.5 1 8.83 1 8V3.5z" stroke="currentColor" strokeWidth="1.1"/>
        </svg>
        {folder.name}
      </button>
      <div className="folder-pill-actions">
        <button
          className="folder-pill-action"
          title="Rename"
          onClick={(e) => { e.stopPropagation(); setName(folder.name); setMode('rename'); }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M6.5 1l1.5 1.5-5 5H1.5V6L6.5 1z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="folder-pill-action folder-pill-action--danger" title="Delete" onClick={handleDelete}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function FolderBar({ space, activeFolder, onFolderChange }) {
  const [folders, setFolders] = useState([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(() => getFolders(space).then(setFolders), [space]);
  useEffect(() => { load(); setAdding(false); setName(''); }, [load]);

  const parentId = activeFolder?.parent_id ?? null;
  const visibleFolders = folders.filter(f => f.parent_id === parentId);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createFolder({ name: name.trim(), space, parent_id: activeFolder?.id ?? null });
    setName(''); setAdding(false); load();
  };

  // Breadcrumb trail
  const breadcrumb = [];
  if (activeFolder) {
    let cur = activeFolder;
    while (cur) {
      breadcrumb.unshift(cur);
      cur = folders.find(f => f.id === cur.parent_id) ?? null;
    }
  }

  return (
    <div className="folderbar">
      <div className="folderbar-crumb">
        <button
          className={`crumb-item ${!activeFolder ? 'crumb-item--active' : ''}`}
          onClick={() => onFolderChange(null)}
        >
          All
        </button>
        {breadcrumb.map((f, i) => (
          <React.Fragment key={f.id}>
            <span className="crumb-sep">/</span>
            <button
              className={`crumb-item ${i === breadcrumb.length - 1 ? 'crumb-item--active' : ''}`}
              onClick={() => onFolderChange(f)}
            >
              {f.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="folderbar-folders">
        {visibleFolders.map(f => (
          <FolderPill
            key={f.id}
            folder={f}
            isActive={activeFolder?.id === f.id}
            onSelect={onFolderChange}
            onRenamed={load}
            onDeleted={() => { if (activeFolder?.id === f.id) onFolderChange(null); load(); }}
          />
        ))}

        {adding ? (
          <form className="folder-add-form" onSubmit={handleCreate}>
            <input
              autoFocus
              className="folder-add-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={e => e.key === 'Escape' && setAdding(false)}
            />
            <button type="submit" className="folder-add-confirm">↵</button>
            <button type="button" className="folder-add-cancel" onClick={() => setAdding(false)}>✕</button>
          </form>
        ) : (
          <button className="folder-add-btn" onClick={() => setAdding(true)}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            New folder
          </button>
        )}
      </div>
    </div>
  );
}
