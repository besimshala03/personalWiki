const BASE = '/api';
const json = (r) => r.json();
const post = (url, data) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json);
const patch = (url, data) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json);
const del = (url) => fetch(url, { method: 'DELETE' }).then(json);

// Spaces
export const getSpaces = () => fetch(`${BASE}/spaces`).then(json);
export const createSpace = (data) => post(`${BASE}/spaces`, data);
export const updateSpace = (id, data) => patch(`${BASE}/spaces/${id}`, data);
export const deleteSpace = (id) => del(`${BASE}/spaces/${id}`);

// Folders
export const getFolders = (space) => fetch(`${BASE}/folders/${space}`).then(json);
export const createFolder = (data) => post(`${BASE}/folders`, data);
export const renameFolder = (id, name) => patch(`${BASE}/folders/${id}`, { name });
export const deleteFolder = (id) => del(`${BASE}/folders/${id}`);

// Links
export const getLinks = (space, folder_id) => {
  const p = new URLSearchParams({ space });
  if (folder_id !== undefined) p.set('folder_id', folder_id ?? 'null');
  return fetch(`${BASE}/links?${p}`).then(json);
};
export const createLink = (data) => post(`${BASE}/links`, data);
export const updateLink = (id, data) => patch(`${BASE}/links/${id}`, data);
export const deleteLink = (id) => del(`${BASE}/links/${id}`);

// Files
export const getFiles = (space, folder_id) => {
  const p = new URLSearchParams({ space });
  if (folder_id !== undefined) p.set('folder_id', folder_id ?? 'null');
  return fetch(`${BASE}/files?${p}`).then(json);
};
export const uploadFile = (formData) => fetch(`${BASE}/files`, { method: 'POST', body: formData }).then(json);
export const deleteFile = (id) => del(`${BASE}/files/${id}`);
export const downloadUrl = (id) => `${BASE}/files/${id}/download`;
