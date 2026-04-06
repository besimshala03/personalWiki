import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import SpaceView from './components/SpaceView';

const SPACES = ['university', 'private', 'work'];

export default function App() {
  const [activeSpace, setActiveSpace] = useState('university');
  const [activeFolder, setActiveFolder] = useState(null); // null = root of space

  const handleSpaceChange = (space) => {
    setActiveSpace(space);
    setActiveFolder(null);
  };

  return (
    <div className="wiki-layout">
      <header className="wiki-header">
        <div className="wiki-header-inner">
          <span className="wiki-logo">📚 Personal Wiki</span>
        </div>
      </header>

      <div className="wiki-body">
        <Sidebar
          spaces={SPACES}
          activeSpace={activeSpace}
          activeFolder={activeFolder}
          onSpaceChange={handleSpaceChange}
          onFolderChange={setActiveFolder}
        />
        <main className="wiki-content">
          <SpaceView
            space={activeSpace}
            activeFolder={activeFolder}
            onFolderChange={setActiveFolder}
          />
        </main>
      </div>
    </div>
  );
}
