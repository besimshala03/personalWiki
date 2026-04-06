import React, { useState, useEffect, useCallback } from 'react';
import TopNav from './components/TopNav';
import FolderBar from './components/FolderBar';
import SpaceView from './components/SpaceView';
import { getSpaces } from './api';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function App() {
  const [spaces, setSpaces] = useState([]);
  const [activeSpace, setActiveSpace] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);

  const loadSpaces = useCallback(() =>
    getSpaces().then(list => {
      setSpaces(list);
      setActiveSpace(prev => prev ?? list[0]?.id ?? null);
    }), []);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const handleSpaceChange = (id) => { setActiveSpace(id); setActiveFolder(null); };

  const activeSpaceData = spaces.find(s => s.id === activeSpace);
  const color = activeSpaceData?.color ?? '#818cf8';
  const cssVars = { '--accent': color, '--accent-bg': hexToRgba(color, 0.07) };

  if (!activeSpace) return <div className="app-loading">Loading…</div>;

  return (
    <div className="app" style={cssVars}>
      <TopNav
        spaces={spaces}
        activeSpace={activeSpace}
        onSpaceChange={handleSpaceChange}
        onSpacesChanged={loadSpaces}
      />
      <FolderBar
        space={activeSpace}
        activeFolder={activeFolder}
        onFolderChange={setActiveFolder}
      />
      <main className="main">
        <SpaceView space={activeSpace} activeFolder={activeFolder} />
      </main>
    </div>
  );
}
