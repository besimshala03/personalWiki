import React, { useState, useRef, useEffect } from 'react';
import { createSpace, updateSpace, deleteSpace } from '../api';
import SyncSettings from './SyncSettings';

const PALETTE = ['#818cf8','#34d399','#fbbf24','#f87171','#60a5fa','#a78bfa','#fb923c','#38bdf8','#e879f9','#4ade80'];

function pickColor(spaces) {
  const used = spaces.map(s => s.color);
  return PALETTE.find(c => !used.includes(c)) ?? PALETTE[spaces.length % PALETTE.length];
}

// Small dropdown menu anchored to trigger
function SpaceMenu({ space, onClose, onRenamed, onDeleted }) {
  const ref = useRef();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(space.name);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const submitRename = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === space.name) { onClose(); return; }
    await updateSpace(space.id, { name: name.trim() });
    onRenamed(); onClose();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete space "${space.name}" and all its content?`)) return;
    await deleteSpace(space.id);
    onDeleted(); onClose();
  };

  return (
    <div className="space-menu" ref={ref}>
      {renaming ? (
        <form className="space-menu-rename" onSubmit={submitRename}>
          <input
            autoFocus
            className="space-menu-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          <button type="submit" className="space-menu-save">↵</button>
        </form>
      ) : (
        <>
          <button className="space-menu-item" onClick={() => setRenaming(true)}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Rename
          </button>
          <div className="space-menu-divider" />
          <button className="space-menu-item space-menu-item--danger" onClick={handleDelete}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 3h7M4 3V2h3v1M4.5 5v3M6.5 5v3M2.5 3l.5 6h5l.5-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Delete space
          </button>
        </>
      )}
    </div>
  );
}

// New space inline form
function NewSpaceForm({ spaces, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(() => pickColor(spaces));
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createSpace({ name: name.trim(), color });
    onCreated();
  };

  return (
    <div className="new-space-form" ref={ref}>
      <p className="new-space-label">New space</p>
      <form onSubmit={submit}>
        <div className="new-space-row">
          <div className="color-picker">
            {PALETTE.map(c => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${color === c ? 'color-swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <input
            autoFocus
            className="new-space-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Space name"
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          <button type="submit" className="new-space-submit">Create</button>
        </div>
      </form>
    </div>
  );
}

export default function TopNav({ spaces, activeSpace, onSpaceChange, onSpacesChanged }) {
  const [menuFor, setMenuFor] = useState(null); // space id
  const [showNew, setShowNew] = useState(false);
  const [showSync, setShowSync] = useState(false);

  return (
    <header className="topnav">
      <div className="topnav-logo">
        <div className="topnav-logo-mark">W</div>
        <span>Personal Wiki</span>
      </div>

      <nav className="topnav-spaces">
        {spaces.map(space => (
          <div key={space.id} className="space-tab-wrap">
            <button
              className={`space-tab ${activeSpace === space.id ? 'space-tab--active' : ''}`}
              onClick={() => onSpaceChange(space.id)}
            >
              <span className="space-tab-dot" style={{ background: space.color }} />
              {space.name}
            </button>
            <button
              className="space-tab-menu-btn"
              title="Space options"
              onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === space.id ? null : space.id); setShowNew(false); }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="2" cy="6" r="1" fill="currentColor"/>
                <circle cx="6" cy="6" r="1" fill="currentColor"/>
                <circle cx="10" cy="6" r="1" fill="currentColor"/>
              </svg>
            </button>
            {menuFor === space.id && (
              <SpaceMenu
                space={space}
                onClose={() => setMenuFor(null)}
                onRenamed={() => { onSpacesChanged(); }}
                onDeleted={() => {
                  onSpacesChanged();
                  if (activeSpace === space.id) onSpaceChange(spaces.find(s => s.id !== space.id)?.id ?? null);
                }}
              />
            )}
          </div>
        ))}

        <div className="new-space-wrap">
          <button
            className="new-space-btn"
            title="Add space"
            onClick={() => { setShowNew(v => !v); setMenuFor(null); }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
          {showNew && (
            <NewSpaceForm
              spaces={spaces}
              onCreated={() => { onSpacesChanged(); setShowNew(false); }}
              onClose={() => setShowNew(false)}
            />
          )}
        </div>
      </nav>

      <div className="topnav-actions">
        <div className="sync-settings-wrap">
          <button
            className={`sync-settings-trigger ${showSync ? 'sync-settings-trigger--active' : ''}`}
            onClick={() => { setShowSync(v => !v); setMenuFor(null); setShowNew(false); }}
          >
            Sync
          </button>
          {showSync && <SyncSettings spaces={spaces} onClose={() => setShowSync(false)} />}
        </div>
      </div>
    </header>
  );
}
