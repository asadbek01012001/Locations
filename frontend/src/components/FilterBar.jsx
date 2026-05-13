import { useState } from 'react';
import CustomSelect from './CustomSelect';

export default function FilterBar({
  viloyat,
  tumanlar, selectedDistrict, onDistrictChange,
  mfylar,   selectedMfy,      onMfyChange,
  onViloyatChange,
}) {
  const [exporting, setExporting] = useState(false);

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
      maxWidth: '90vw',
    }}>
      {/* Viloyat badge */}
      <button
        onClick={onViloyatChange}
        title="Viloyatni o'zgartirish"
        style={{
          minWidth: 260, maxWidth: 380,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '8px 12px',
          background: '#1d4ed8',
          color: '#fff',
          border: '1.5px solid #1d4ed8',
          borderRadius: 9,
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          flexShrink: 0,
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
          borderRadius: 9,
          fontSize: 15,
          fontWeight: 600,
          cursor: exporting ? 'not-allowed' : 'pointer',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          transition: 'all 0.15s',
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
