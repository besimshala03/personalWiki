import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import SpaceView from './components/SpaceView';

export default function App() {
  const [activeSpace, setActiveSpace] = useState('university');
  const [activeFolder, setActiveFolder] = useState(null);

  return (
    <div className="wiki-layout">
      <header className="wiki-header">
        <div className="wiki-logo">
          <div className="wiki-logo-icon">W</div>
          Personal Wiki
        </div>
      </header>

      <div className="wiki-body">
        <Sidebar
          activeSpace={activeSpace}
          activeFolder={activeFolder}
          onSpaceChange={setActiveSpace}
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
