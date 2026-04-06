import React, { useEffect, useState } from 'react';
import { getFolders, createFolder, renameFolder, deleteFolder } from '../api';

function FolderTree({ folders, parentId = null, activeFolder, onFolderChange, depth = 0 }) {
  const children = folders.filter(f => f.parent_id === parentId);
  if (children.length === 0) return null;

  return (
    <ul className="folder-tree" style={{ paddingLeft: depth === 0 ? 0 : 16 }}>
      {children.map(folder => (
        <li key={folder.id}>
          <button
            className={`folder-item ${activeFolder?.id === folder.id ? 'active' : ''}`}
            onClick={() => onFolderChange(folder)}
          >
            <span className="folder-icon">📁</span>
            {folder.name}
          </button>
          <FolderTree
            folders={folders}
            parentId={folder.id}
            activeFolder={activeFolder}
            onFolderChange={onFolderChange}
            depth={depth + 1}
          />
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar({ spaces, activeSpace, activeFolder, onSpaceChange, onFolderChange }) {
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [parentForNew, setParentForNew] = useState(null);

  const load = () => getFolders(activeSpace).then(setFolders);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpace]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder({ name: newFolderName.trim(), space: activeSpace, parent_id: parentForNew });
    setNewFolderName('');
    setShowNewFolder(false);
    setParentForNew(null);
    load();
  };

  const handleDeleteFolder = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this folder and all its contents?')) return;
    await deleteFolder(id);
    if (activeFolder?.id === id) onFolderChange(null);
    load();
  };

  return (
    <aside className="wiki-sidebar">
      <nav className="space-nav">
        <p className="sidebar-section-label">Spaces</p>
        {spaces.map(space => (
          <button
            key={space}
            className={`space-btn ${activeSpace === space ? 'active' : ''}`}
            onClick={() => onSpaceChange(space)}
          >
            {spaceIcon(space)} {capitalize(space)}
          </button>
        ))}
      </nav>

      <div className="folder-nav">
        <div className="sidebar-section-header">
          <p className="sidebar-section-label">Folders</p>
          <button
            className="icon-btn"
            title="New folder"
            onClick={() => { setShowNewFolder(v => !v); setParentForNew(activeFolder?.id ?? null); }}
          >+</button>
        </div>

        <button
          className={`folder-item root-item ${!activeFolder ? 'active' : ''}`}
          onClick={() => onFolderChange(null)}
        >
          <span className="folder-icon">🏠</span> Root
        </button>

        <FolderTree
          folders={folders}
          parentId={null}
          activeFolder={activeFolder}
          onFolderChange={onFolderChange}
        />

        {showNewFolder && (
          <form className="new-folder-form" onSubmit={handleCreateFolder}>
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name…"
              className="wiki-input"
            />
            <div className="form-row">
              <button type="submit" className="btn btn-sm">Create</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowNewFolder(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function spaceIcon(s) {
  return { university: '🎓', private: '🔒', work: '💼' }[s] ?? '📂';
}
