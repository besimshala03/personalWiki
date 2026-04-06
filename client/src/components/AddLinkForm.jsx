import React, { useState } from 'react';
import { createLink } from '../api';

export default function AddLinkForm({ space, folderId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', description: '' });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.url) { setError('Title and URL are required.'); return; }
    setError('');
    await createLink({ ...form, space, folder_id: folderId });
    setForm({ title: '', url: '', description: '' });
    setOpen(false);
    onAdded();
  };

  if (!open) {
    return (
      <div className="add-action-bar">
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Add Link</button>
      </div>
    );
  }

  return (
    <form className="wiki-form" onSubmit={handleSubmit}>
      <h3 className="form-title">Add Link</h3>
      {error && <p className="form-error">{error}</p>}
      <label className="wiki-label">
        Title *
        <input className="wiki-input" value={form.title} onChange={set('title')} placeholder="e.g. Google Scholar" autoFocus />
      </label>
      <label className="wiki-label">
        URL *
        <input className="wiki-input" value={form.url} onChange={set('url')} placeholder="https://…" type="url" />
      </label>
      <label className="wiki-label">
        Description
        <input className="wiki-input" value={form.description} onChange={set('description')} placeholder="Optional note" />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Save</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
