import React, { useState } from 'react';
import TopNav from './components/TopNav';
import FolderBar from './components/FolderBar';
import SpaceView from './components/SpaceView';

export default function App() {
  const [activeSpace, setActiveSpace] = useState('university');
  const [activeFolder, setActiveFolder] = useState(null);

  const handleSpaceChange = (space) => {
    setActiveSpace(space);
    setActiveFolder(null);
  };

  return (
    <div className="app" data-space={activeSpace}>
      <TopNav activeSpace={activeSpace} onSpaceChange={handleSpaceChange} />
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
