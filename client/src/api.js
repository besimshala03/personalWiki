const BASE = '/api';

// Folders
export const getFolders = (space) => fetch(`${BASE}/folders/${space}`).then(r => r.json());
export const createFolder = (data) => fetch(`${BASE}/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
export const renameFolder = (id, name) => fetch(`${BASE}/folders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json());
export const deleteFolder = (id) => fetch(`${BASE}/folders/${id}`, { method: 'DELETE' }).then(r => r.json());

// Links
export const getLinks = (space, folder_id) => {
  const params = new URLSearchParams({ space });
  if (folder_id !== undefined) params.set('folder_id', folder_id ?? 'null');
  return fetch(`${BASE}/links?${params}`).then(r => r.json());
};
export const createLink = (data) => fetch(`${BASE}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
export const updateLink = (id, data) => fetch(`${BASE}/links/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
export const deleteLink = (id) => fetch(`${BASE}/links/${id}`, { method: 'DELETE' }).then(r => r.json());

// Files
export const getFiles = (space, folder_id) => {
  const params = new URLSearchParams({ space });
  if (folder_id !== undefined) params.set('folder_id', folder_id ?? 'null');
  return fetch(`${BASE}/files?${params}`).then(r => r.json());
};
export const uploadFile = (formData) => fetch(`${BASE}/files`, { method: 'POST', body: formData }).then(r => r.json());
export const deleteFile = (id) => fetch(`${BASE}/files/${id}`, { method: 'DELETE' }).then(r => r.json());
export const downloadUrl = (id) => `${BASE}/files/${id}/download`;
