import React from 'react';
import { deleteFile, downloadUrl } from '../api';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz')) return '🗜️';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊';
  return '📄';
}

export default function FileList({ files, onChanged }) {
  if (files.length === 0) {
    return <p className="empty-state">No files yet. Upload a file above.</p>;
  }

  const remove = async (file) => {
    if (!confirm(`Delete "${file.original_name}"?`)) return;
    await deleteFile(file.id);
    onChanged();
  };

  return (
    <ul className="file-list">
      {files.map(file => (
        <li key={file.id} className="file-row">
          <span className="file-icon">{fileIcon(file.mime_type)}</span>
          <div className="file-info">
            <a
              href={downloadUrl(file.id)}
              className="file-name"
              download={file.original_name}
            >
              {file.original_name}
            </a>
            <span className="file-meta">{formatSize(file.size)} · {new Date(file.created_at).toLocaleDateString()}</span>
          </div>
          <button className="icon-btn" title="Delete" onClick={() => remove(file)}>🗑️</button>
        </li>
      ))}
    </ul>
  );
}
