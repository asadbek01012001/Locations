import { useEffect, useState } from 'react';

export default function NullGeoModal({ viloyat, onClose, onSelectRow }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/locations?viloyat=${encodeURIComponent(viloyat)}&noGeo=true&limit=10000`)
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [viloyat]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8000,
      background: 'rgba(15,23,42,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(3px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '92%', maxWidth: 900,
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
              Geo koordinatasi yo'q obyektlar
            </span>
            <span style={{
              marginLeft: 10, background: '#fef3c7', color: '#92400e',
              borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600,
            }}>
              {loading ? '...' : `${rows.length} ta`}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            width: 32, height: 32, borderRadius: 8, fontSize: 20,
            color: '#9ca3af', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280', fontSize: 14 }}>
              Yuklanmoqda...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#22c55e', fontSize: 14 }}>
              Barcha obyektlarning geo koordinatasi mavjud
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                  {['T/r', 'Tuman', 'MFY', 'Obyekt nomi'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontWeight: 600, color: '#374151', fontSize: 12,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      borderBottom: '1px solid #e5e7eb',
                    }}>{h}</th>
                  ))}
                  <th style={{
                    padding: '10px 14px', textAlign: 'center',
                    fontWeight: 600, color: '#374151', fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    borderBottom: '1px solid #e5e7eb',
                  }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} style={{
                    background: idx % 2 === 0 ? '#fff' : '#fafafa',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  >
                    <td style={{ padding: '9px 14px', color: '#6b7280', fontWeight: 600 }}>
                      {row.tr}
                    </td>
                    <td style={{ padding: '9px 14px', color: '#374151' }}>
                      {row.district || '—'}
                    </td>
                    <td style={{ padding: '9px 14px', color: '#374151' }}>
                      {row.mfy || '—'}
                    </td>
                    <td style={{ padding: '9px 14px', color: '#111827' }}>
                      {row.name || '—'}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => { onSelectRow(row); onClose(); }}
                        style={{
                          padding: '5px 12px', borderRadius: 6,
                          background: '#3b82f6', color: '#fff',
                          border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600,
                        }}
                      >
                        Tahrirlash
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
