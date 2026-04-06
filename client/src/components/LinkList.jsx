import React, { useState } from 'react';
import { deleteLink, updateLink } from '../api';

function LinkRow({ link, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: link.title, url: link.url, description: link.description ?? '' });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    await updateLink(link.id, form);
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`Delete "${link.title}"?`)) return;
    await deleteLink(link.id);
    onChanged();
  };

  if (editing) {
    return (
      <li className="link-row link-row--editing">
        <form onSubmit={save} className="link-edit-form">
          <input className="wiki-input" value={form.title} onChange={set('title')} placeholder="Title" />
          <input className="wiki-input" value={form.url} onChange={set('url')} placeholder="URL" type="url" />
          <input className="wiki-input" value={form.description} onChange={set('description')} placeholder="Description" />
          <div className="form-actions">
            <button type="submit" className="btn btn-sm btn-primary">Save</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="link-row">
      <div className="link-main">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-title">
          <img
            className="favicon"
            src={`https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=16`}
            alt=""
            onError={e => { e.target.style.display = 'none'; }}
          />
          {link.title}
        </a>
        {link.description && <span className="link-description"> — {link.description}</span>}
        <span className="link-url">{link.url}</span>
      </div>
      <div className="link-actions">
        <button className="icon-btn" title="Edit" onClick={() => setEditing(true)}>✏️</button>
        <button className="icon-btn" title="Delete" onClick={remove}>🗑️</button>
      </div>
    </li>
  );
}

export default function LinkList({ links, onChanged }) {
  if (links.length === 0) {
    return <p className="empty-state">No links yet. Add your first link above.</p>;
  }

  return (
    <ul className="link-list">
      {links.map(link => (
        <LinkRow key={link.id} link={link} onChanged={onChanged} />
      ))}
    </ul>
  );
}
