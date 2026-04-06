import React, { useEffect, useState, useCallback } from 'react';
import { getFolders, createFolder } from '../api';

const SPACES = [
  { id: 'university', label: 'University', icon: '◆' },
  { id: 'private',    label: 'Private',    icon: '◆' },
  { id: 'work',       label: 'Work',       icon: '◆' },
];

function FolderTree({ folders, parentId = null, space, activeFolder, onFolderChange, depth = 0 }) {
  const children = folders.filter(f => f.parent_id === parentId);
  if (!children.length) return null;

  return (
    <ul className="folder-list">
      {children.map(f => (
        <li key={f.id}>
          <button
            className={`folder-btn ${activeFolder?.id === f.id ? 'folder-btn--active' : ''}`}
            style={{ paddingLeft: 28 + depth * 12 }}
            onClick={() => onFolderChange(f)}
          >
            <svg className="folder-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {f.name}
          </button>
          <FolderTree folders={folders} parentId={f.id} space={space}
            activeFolder={activeFolder} onFolderChange={onFolderChange} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

function SpaceItem({ space, activeSpace, activeFolder, onSpaceChange, onFolderChange }) {
  const isOpen = activeSpace === space.id;
  const [folders, setFolders] = useState([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(() => getFolders(space.id).then(setFolders), [space.id]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createFolder({ name: name.trim(), space: space.id, parent_id: null });
    setName(''); setAdding(false); load();
  };

  return (
    <div className={`space-item ${isOpen ? 'space-item--open' : ''}`}>
      <div className="space-item-row">
        <button
          className={`space-btn ${isOpen && !activeFolder ? 'space-btn--active' : isOpen ? 'space-btn--open' : ''}`}
          onClick={() => { onSpaceChange(space.id); onFolderChange(null); }}
        >
          <span className="space-dot" data-space={space.id} />
          {space.label}
        </button>
        <button
          className="new-folder-btn"
          title="New folder"
          onClick={() => { if (!isOpen) { onSpaceChange(space.id); onFolderChange(null); } setAdding(v => !v); setName(''); }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="space-children">
          <FolderTree
            folders={folders} parentId={null} space={space.id}
            activeFolder={activeFolder}
            onFolderChange={(f) => { onSpaceChange(space.id); onFolderChange(f); }}
          />
          {adding && (
            <form className="folder-add-form" onSubmit={submit}>
              <input autoFocus className="folder-add-input" value={name}
                onChange={e => setName(e.target.value)} placeholder="Folder name" />
              <div className="folder-add-actions">
                <button type="submit" className="btn-create">Create</button>
                <button type="button" className="btn-cancel" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ activeSpace, activeFolder, onSpaceChange, onFolderChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">W</div>
        <span>Personal Wiki</span>
      </div>

      <nav className="sidebar-nav">
        <p className="sidebar-section">Spaces</p>
        {SPACES.map(space => (
          <SpaceItem key={space.id} space={space}
            activeSpace={activeSpace} activeFolder={activeFolder}
            onSpaceChange={onSpaceChange} onFolderChange={onFolderChange}
          />
        ))}
      </nav>
    </aside>
  );
}
