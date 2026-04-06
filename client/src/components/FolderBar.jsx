import React, { useEffect, useState, useCallback } from 'react';
import { getFolders, createFolder, deleteFolder } from '../api';

export default function FolderBar({ space, activeFolder, onFolderChange }) {
  const [folders, setFolders] = useState([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(() => getFolders(space).then(setFolders), [space]);
  useEffect(() => { load(); setAdding(false); setName(''); }, [load]);

  // Show folders at the current level
  const parentId = activeFolder?.parent_id ?? null;
  const visibleFolders = folders.filter(f => f.parent_id === parentId);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createFolder({ name: name.trim(), space, parent_id: activeFolder?.id ?? null });
    setName(''); setAdding(false); load();
  };

  const handleDelete = async (e, folder) => {
    e.stopPropagation();
    if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return;
    await deleteFolder(folder.id);
    if (activeFolder?.id === folder.id) onFolderChange(null);
    load();
  };

  // Build breadcrumb trail
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
      {/* Breadcrumb */}
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

      {/* Folder pills */}
      <div className="folderbar-folders">
        {visibleFolders.map(f => (
          <div
            key={f.id}
            className={`folder-pill ${activeFolder?.id === f.id ? 'folder-pill--active' : ''}`}
          >
            <button className="folder-pill-name" onClick={() => onFolderChange(f)}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 3.5C1 2.67 1.67 2 2.5 2H4l1 1.5h3.5C9.33 3.5 10 4.17 10 5v3c0 .83-.67 1.5-1.5 1.5h-7C.67 9.5 1 8.83 1 8V3.5z" stroke="currentColor" strokeWidth="1.1" fill="none"/>
              </svg>
              {f.name}
            </button>
            <button
              className="folder-pill-del"
              title="Delete folder"
              onClick={(e) => handleDelete(e, f)}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}

        {adding ? (
          <form className="folder-add-form" onSubmit={handleCreate}>
            <input
              autoFocus
              className="folder-add-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Folder name"
            />
            <button type="submit" className="folder-add-confirm">↵</button>
            <button type="button" className="folder-add-cancel" onClick={() => setAdding(false)}>✕</button>
          </form>
        ) : (
          <button className="folder-add-btn" onClick={() => setAdding(true)} title="New folder">
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
