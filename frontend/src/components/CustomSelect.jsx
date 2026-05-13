import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o === value);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 260, maxWidth: 380 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '8px 12px',
          background: '#fff',
          border: open ? '1.5px solid #3b82f6' : '1.5px solid #e5e7eb',
          borderRadius: 9,
          fontSize: 15,
          color: selected ? '#111827' : '#9ca3af',
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.12)' : '0 1px 4px rgba(0,0,0,0.07)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected || placeholder}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff',
          border: '1.5px solid #e5e7eb',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 5000,
          maxHeight: 260,
          overflowY: 'auto',
          padding: '4px',
        }}>
          {/* Barcha (reset) */}
          <Option
            label={placeholder}
            active={!value}
            muted
            onClick={() => { onChange(''); setOpen(false); }}
          />

          {options.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
              Ma'lumot yo'q
            </div>
          ) : (
            options.map(opt => (
              <Option
                key={opt}
                label={opt}
                active={opt === value}
                onClick={() => { onChange(opt); setOpen(false); }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Option({ label, active, muted, onClick }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '9px 12px',
        borderRadius: 7,
        fontSize: 15,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: active ? '#eff6ff' : hover ? '#f9fafb' : 'transparent',
        color: muted && !active ? '#9ca3af' : active ? '#1d4ed8' : '#111827',
        fontWeight: active ? 600 : 400,
        fontFamily: 'system-ui, sans-serif',
        transition: 'background 0.1s',
      }}
    >
      <span>{label}</span>
      {active && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8l4 4 6-7" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}
