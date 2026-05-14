import { useState, useRef } from 'react';
import CustomSelect from './CustomSelect';

export default function FilterBar({
  viloyat,
  tumanlar, selectedDistrict, onDistrictChange,
  mfylar,   selectedMfy,      onMfyChange,
  onViloyatChange,
  onShowNullGeo,
  onTrSearch,
}) {
  const [exporting, setExporting] = useState(false);
  const [trValue, setTrValue] = useState('');
  const trRef = useRef(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/locations/export?viloyat=${encodeURIComponent(viloyat)}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${viloyat}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export xatosi: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleTrKeyDown = (e) => {
    if (e.key === 'Enter') {
      const num = parseInt(trValue, 10);
      if (!isNaN(num) && num > 0) onTrSearch(num);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 12, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#fff',
      borderRadius: 12,
      padding: '8px 12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
      flexWrap: 'nowrap',
      maxWidth: '95vw',
    }}>
      {/* Viloyat badge */}
      <button
        onClick={onViloyatChange}
        title="Viloyatni o'zgartirish"
        style={{
          minWidth: 220, maxWidth: 340,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '8px 12px',
          background: '#1d4ed8', color: '#fff',
          border: '1.5px solid #1d4ed8', borderRadius: 9,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap', overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)', flexShrink: 0,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{viloyat}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M4 6l4 4 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <span style={{ color: '#e5e7eb', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>|</span>

      {/* Tuman */}
      <CustomSelect
        value={selectedDistrict}
        onChange={onDistrictChange}
        options={tumanlar}
        placeholder="— Barcha tumanlar —"
      />

      {/* MFY */}
      <CustomSelect
        value={selectedMfy}
        onChange={onMfyChange}
        options={mfylar}
        placeholder="— Barcha MFYlar —"
      />

      <span style={{ color: '#e5e7eb', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>|</span>

      {/* T/r qidiruv */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <input
          ref={trRef}
          type="number"
          value={trValue}
          onChange={e => setTrValue(e.target.value)}
          onKeyDown={handleTrKeyDown}
          placeholder="T/r..."
          min="1"
          style={{
            width: 90, padding: '8px 10px 8px 32px',
            border: '1.5px solid #e5e7eb', borderRadius: 9,
            fontSize: 14, outline: 'none',
            fontFamily: 'system-ui, sans-serif',
            color: '#111827',
            appearance: 'textfield',
          }}
          onFocus={e => e.target.style.borderColor = '#3b82f6'}
          onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
        />
        {/* Search icon */}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="6.5" cy="6.5" r="5" stroke="#9ca3af" strokeWidth="1.6"/>
          <path d="M10.5 10.5l3 3" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>

      <span style={{ color: '#e5e7eb', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>|</span>

      {/* Geo yo'q button */}
      <button
        onClick={onShowNullGeo}
        title="Geo koordinatasi yo'q obyektlar"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 13px',
          background: '#fff7ed', color: '#c2410c',
          border: '1.5px solid #fed7aa', borderRadius: 9,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='#ffedd5'; e.currentTarget.style.borderColor='#fb923c'; }}
        onMouseLeave={e => { e.currentTarget.style.background='#fff7ed'; e.currentTarget.style.borderColor='#fed7aa'; }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="#c2410c" strokeWidth="1.6"/>
          <path d="M8 4.5v4M8 10.5v1" stroke="#c2410c" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        Geo yo'q
      </button>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={exporting}
        title={`${viloyat} ma'lumotlarini Excel ga export qilish`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: exporting ? '#f0fdf4' : '#16a34a',
          color: exporting ? '#16a34a' : '#fff',
          border: exporting ? '1.5px solid #16a34a' : '1.5px solid #16a34a',
          borderRadius: 9, fontSize: 14, fontWeight: 600,
          cursor: exporting ? 'not-allowed' : 'pointer',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        }}
      >
        {exporting ? (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{ animation: 'spin 0.8s linear infinite' }}>
              <circle cx="8" cy="8" r="6" stroke="#16a34a" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10"/>
            </svg>
            Yuklanmoqda...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export Excel
          </>
        )}
      </button>
    </div>
  );
}
