import React from 'react';

const SPACES = [
  { id: 'university', label: 'University' },
  { id: 'private',    label: 'Private'    },
  { id: 'work',       label: 'Work'       },
];

export default function TopNav({ activeSpace, onSpaceChange }) {
  return (
    <header className="topnav">
      <div className="topnav-logo">
        <div className="topnav-logo-mark">W</div>
        <span>Personal Wiki</span>
      </div>

      <nav className="topnav-spaces">
        {SPACES.map(s => (
          <button
            key={s.id}
            className={`space-tab ${activeSpace === s.id ? 'space-tab--active' : ''}`}
            onClick={() => onSpaceChange(s.id)}
          >
            <span className="space-tab-dot" data-space={s.id} />
            {s.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
