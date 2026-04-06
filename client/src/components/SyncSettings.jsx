import React, { useEffect, useRef, useState } from 'react';
import { getSyncStatus, runSyncNow, saveSyncConfig } from '../api';

function formatRelativeTime(value) {
  if (!value) return 'Never';

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

export default function SyncSettings({ spaces, onClose }) {
  const ref = useRef();
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ enabled: false, onedrive_path: '', space: spaces[0]?.id ?? '' });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextStatus = await getSyncStatus();
        if (cancelled) return;
        setStatus(nextStatus);
        setForm({
          enabled: nextStatus.enabled,
          onedrive_path: nextStatus.onedrive_path ?? '',
          space: nextStatus.space ?? spaces[0]?.id ?? '',
        });
        setError('');
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };

    load();
    const interval = setInterval(load, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [spaces]);

  const setField = (key) => (event) => {
    const value = key === 'enabled' ? event.target.checked : event.target.value;
    setForm(current => ({ ...current, [key]: value }));
  };

  const refreshStatus = async () => {
    const nextStatus = await getSyncStatus();
    setStatus(nextStatus);
    setForm({
      enabled: nextStatus.enabled,
      onedrive_path: nextStatus.onedrive_path ?? '',
      space: nextStatus.space ?? spaces[0]?.id ?? '',
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const nextStatus = await saveSyncConfig(form);
      setStatus(nextStatus);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const nextStatus = await runSyncNow();
      setStatus(nextStatus);
      setError('');
    } catch (err) {
      setError(err.message);
      await refreshStatus().catch(() => {});
    } finally {
      setRunning(false);
    }
  };

  const log = status?.log?.slice(0, 10) ?? [];

  return (
    <div className="sync-settings" ref={ref}>
      <div className="sync-settings-header">
        <div>
          <h2 className="sync-settings-title">OneDrive Sync</h2>
          <p className="sync-settings-subtitle">Import GoodNotes PDFs into a wiki space.</p>
        </div>
        <button className="sync-settings-close" onClick={onClose} aria-label="Close sync settings">
          ×
        </button>
      </div>

      <form className="sync-settings-form" onSubmit={handleSave}>
        <label className="sync-settings-toggle">
          <input type="checkbox" checked={form.enabled} onChange={setField('enabled')} />
          <span>Sync enabled</span>
        </label>

        <label className="sync-settings-field">
          <span>OneDrive GoodNotes folder</span>
          <input
            className="sync-settings-input"
            value={form.onedrive_path}
            onChange={setField('onedrive_path')}
            placeholder="~/OneDrive/GoodNotes or ~/OneDrive - Personal/GoodNotes"
          />
        </label>

        <label className="sync-settings-field">
          <span>Target space</span>
          <select className="sync-settings-select" value={form.space} onChange={setField('space')}>
            {spaces.map(space => (
              <option key={space.id} value={space.id}>{space.name}</option>
            ))}
          </select>
        </label>

        <div className="sync-settings-status">
          <span>Last synced: {formatRelativeTime(status?.last_run)}</span>
          <span>{status?.watcher_running ? 'Watcher running' : 'Watcher stopped'}</span>
        </div>

        {status?.effective_path && (
          <p className="sync-settings-path">
            Using: {status.effective_path}{status.auto_detected ? ' (auto-detected)' : ''}
          </p>
        )}

        {error && <p className="sync-settings-error">{error}</p>}

        <div className="sync-settings-actions">
          <button type="submit" className="sync-settings-save" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="sync-settings-run" onClick={handleRunNow} disabled={running}>
            {running ? 'Running…' : 'Run now'}
          </button>
        </div>
      </form>

      <div className="sync-settings-log">
        <div className="sync-settings-log-header">
          <span>Recent events</span>
          <span>{log.length}/10 shown</span>
        </div>

        {log.length ? (
          <div className="sync-settings-log-list">
            {log.map((entry, index) => (
              <div className="sync-settings-log-item" key={`${entry.ts}-${entry.file}-${index}`}>
                <span className={`sync-log-badge sync-log-badge--${entry.action}`}>{entry.action}</span>
                <div className="sync-settings-log-copy">
                  <strong>{entry.file || 'System'}</strong>
                  <span>{entry.folder}</span>
                  {entry.error ? <em>{entry.error}</em> : null}
                </div>
                <time>{formatRelativeTime(entry.ts)}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="sync-settings-empty">No sync events yet.</p>
        )}
      </div>
    </div>
  );
}
