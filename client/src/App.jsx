import React, { useState, useEffect, useCallback } from 'react';
import TopNav from './components/TopNav';
import SpaceView from './components/SpaceView';
import TasksDashboard from './components/TasksDashboard';
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
  const [activeView, setActiveView] = useState('space');
  const [taskRefreshToken, setTaskRefreshToken] = useState(0);

  const loadSpaces = useCallback(() =>
    getSpaces().then(list => {
      setSpaces(list);
      setActiveSpace(prev => prev ?? list[0]?.id ?? null);
    }), []);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const handleSpaceChange = (id) => {
    setActiveSpace(id);
    setActiveFolder(null);
    setActiveView('space');
  };

  const handleTasksChanged = useCallback(() => {
    setTaskRefreshToken(token => token + 1);
  }, []);

  const activeSpaceData = spaces.find(s => s.id === activeSpace);
  const color = activeSpaceData?.color ?? '#818cf8';
  const cssVars = { '--accent': color, '--accent-bg': hexToRgba(color, 0.07) };

  if (!activeSpace) return <div className="app-loading">Loading…</div>;

  return (
    <div className="app" style={cssVars}>
      <TopNav
        spaces={spaces}
        activeView={activeView}
        activeSpace={activeSpace}
        onSpaceChange={handleSpaceChange}
        onViewChange={setActiveView}
        onSpacesChanged={loadSpaces}
        taskRefreshToken={taskRefreshToken}
      />
      <main className="main">
        {activeView === 'tasks' ? (
          <TasksDashboard
            spaces={spaces}
            taskRefreshToken={taskRefreshToken}
            onTasksChanged={handleTasksChanged}
          />
        ) : (
          <SpaceView
            space={activeSpace}
            spaces={spaces}
            activeFolder={activeFolder}
            onFolderChange={setActiveFolder}
            onTasksChanged={handleTasksChanged}
          />
        )}
      </main>
    </div>
  );
}
