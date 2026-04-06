import React, { useEffect, useState, useCallback } from 'react';
import { getFolders, createFolder, deleteFolder } from '../api';

const SPACES = ['university', 'private', 'work'];

function FolderTree({ folders, parentId = null, activeFolder, onFolderChange, depth = 0 }) {
  const children = folders.filter(f => f.parent_id === parentId);
  if (children.length === 0) return null;

  return (
    <ul className="folder-tree">
      {children.map(folder => (
        <li key={folder.id}>
          <button
            className={`folder-item ${activeFolder?.id === folder.id ? 'active' : ''}`}
            style={{ paddingLeft: 16 + depth * 14 }}
            onClick={() => onFolderChange(folder)}
          >
            <span className="folder-icon">📁</span>
            <span className="folder-name">{folder.name}</span>
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

function SpaceSection({ space, activeSpace, activeFolder, onSpaceChange, onFolderChange }) {
  const isActive = activeSpace === space;
  const [folders, setFolders] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => getFolders(space).then(setFolders), [space]);

  useEffect(() => { load(); }, [load]);

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createFolder({ name: newName.trim(), space, parent_id: null });
    setNewName('');
    setShowInput(false);
    load();
  };

  const handleSpaceClick = () => {
    onSpaceChange(space);
    onFolderChange(null);
  };

  return (
    <div className={`space-section ${isActive ? 'space-section--active' : ''}`}>
      {/* Space row */}
      <div className="space-row">
        <button
          className={`space-btn ${isActive && !activeFolder ? 'active' : isActive ? 'space-btn--open' : ''}`}
          onClick={handleSpaceClick}
        >
          <span>{spaceIcon(space)}</span>
          <span>{capitalize(space)}</span>
        </button>
        <button
          className="add-folder-btn"
          title={`New folder in ${capitalize(space)}`}
          onClick={(e) => {
            e.stopPropagation();
            if (activeSpace !== space) {
              onSpaceChange(space);
              onFolderChange(null);
            }
            setShowInput(v => !v);
            setNewName('');
          }}
        >
          +
        </button>
      </div>

      {/* Folders nested inside space */}
      {isActive && (
        <div className="space-folders">
          <FolderTree
            folders={folders}
            parentId={null}
            activeFolder={activeFolder}
            onFolderChange={(folder) => {
              onSpaceChange(space);
              onFolderChange(folder);
            }}
          />

          {showInput && (
            <form className="new-folder-form" onSubmit={handleAddFolder}>
              <input
                autoFocus
                className="wiki-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Folder name…"
              />
              <div className="form-row">
                <button type="submit" className="btn btn-sm btn-primary">Create</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowInput(false)}>Cancel</button>
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
    <aside className="wiki-sidebar">
      <p className="sidebar-section-label">Spaces</p>
      {SPACES.map(space => (
        <SpaceSection
          key={space}
          space={space}
          activeSpace={activeSpace}
          activeFolder={activeFolder}
          onSpaceChange={onSpaceChange}
          onFolderChange={onFolderChange}
        />
      ))}
    </aside>
  );
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function spaceIcon(s) {
  return { university: '🎓', private: '🔒', work: '💼' }[s] ?? '📂';
}
