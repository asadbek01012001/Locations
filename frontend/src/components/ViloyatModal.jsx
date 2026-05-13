import { useEffect, useState } from 'react';

export default function ViloyatModal({ onSelect }) {
  const [viloyatlar, setViloyatlar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/locations/viloyatlar')
      .then(r => r.json())
      .then(data => { setViloyatlar(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(15,23,42,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '32px 28px',
        width: '90%', maxWidth: 640,
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
      }}>
        <h2 style={{
          margin: '0 0 6px',
          fontSize: 20, fontWeight: 700, color: '#111827',
          fontFamily: 'system-ui, sans-serif',
        }}>
          Viloyatni tanlang
        </h2>
        <p style={{
          margin: '0 0 24px',
          fontSize: 13, color: '#6b7280',
          fontFamily: 'system-ui, sans-serif',
        }}>
          Davom etish uchun viloyat tanlanishi shart
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280', fontSize: 14 }}>
            Yuklanmoqda...
          </div>
        ) : (
          <div style={{
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10,
          }}>
            {viloyatlar.map(v => (
              <button
                key={v}
                onClick={() => onSelect(v)}
                style={{
                  padding: '14px 12px',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  background: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#1f2937',
                  textAlign: 'left',
                  lineHeight: 1.4,
                  fontFamily: 'system-ui, sans-serif',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#eff6ff';
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.color = '#1d4ed8';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#1f2937';
                }}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
