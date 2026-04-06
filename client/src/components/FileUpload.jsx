import React, { useState, useRef } from 'react';
import { uploadFile } from '../api';

export default function FileUpload({ space, folderId, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const doUpload = async (file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('space', space);
    if (folderId !== null) fd.append('folder_id', folderId);
    await uploadFile(fd);
    setUploading(false);
    onUploaded();
  };

  const onFiles = (files) => {
    Array.from(files).forEach(doUpload);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`drop-zone ${dragging ? 'drop-zone--active' : ''} ${uploading ? 'drop-zone--uploading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => onFiles(e.target.files)}
      />
      {uploading ? (
        <p>Uploading…</p>
      ) : (
        <p>{dragging ? 'Drop files here' : '⬆️ Click or drag files to upload'}</p>
      )}
    </div>
  );
}
