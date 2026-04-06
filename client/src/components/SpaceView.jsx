import React, { useEffect, useState, useCallback } from 'react';
import LinkList from './LinkList';
import FileList from './FileList';
import AddLinkForm from './AddLinkForm';
import FileUpload from './FileUpload';
import { getLinks, getFiles } from '../api';

export default function SpaceView({ space, activeFolder, onFolderChange }) {
  const [links, setLinks] = useState([]);
  const [files, setFiles] = useState([]);
  const [tab, setTab] = useState('links');

  const folderId = activeFolder?.id ?? null;

  const load = useCallback(() => {
    getLinks(space, folderId).then(setLinks);
    getFiles(space, folderId).then(setFiles);
  }, [space, folderId]);

  useEffect(() => { load(); }, [load]);

  const locationLabel = activeFolder ? `📁 ${activeFolder.name}` : `🏠 Root`;

  return (
    <article className="space-view">
      <div className="space-view-header">
        <div>
          <h1 className="space-title">{spaceTitle(space)}</h1>
          <p className="space-location">{locationLabel}</p>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'links' ? 'active' : ''}`} onClick={() => setTab('links')}>
          Links <span className="badge">{links.length}</span>
        </button>
        <button className={`tab-btn ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>
          Files <span className="badge">{files.length}</span>
        </button>
      </div>

      {tab === 'links' && (
        <>
          <AddLinkForm space={space} folderId={folderId} onAdded={load} />
          <LinkList links={links} onChanged={load} />
        </>
      )}

      {tab === 'files' && (
        <>
          <FileUpload space={space} folderId={folderId} onUploaded={load} />
          <FileList files={files} onChanged={load} />
        </>
      )}
    </article>
  );
}

function spaceTitle(space) {
  return { university: '🎓 University', private: '🔒 Private', work: '💼 Work' }[space] ?? space;
}
