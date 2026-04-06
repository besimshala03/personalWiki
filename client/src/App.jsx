import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import SpaceView from './components/SpaceView';

export default function App() {
  const [activeSpace, setActiveSpace] = useState('university');
  const [activeFolder, setActiveFolder] = useState(null);

  return (
    <div className="app" data-space={activeSpace}>
      <Sidebar
        activeSpace={activeSpace}
        activeFolder={activeFolder}
        onSpaceChange={(s) => { setActiveSpace(s); setActiveFolder(null); }}
        onFolderChange={setActiveFolder}
      />
      <main className="main">
        <SpaceView space={activeSpace} activeFolder={activeFolder} />
      </main>
    </div>
  );
}
