import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.Default.css';

import ViloyatModal        from './ViloyatModal';
import FilterBar           from './FilterBar';
import { regionPolygons }  from './data.ts';

// Kirill DB nomi → data.ts dagi inglizcha nom
const VILOYAT_MAP = {
  'Андижон вилояти':              'Andijon',
  'Бухоро вилояти':               'Buxoro',
  'Наманган вилояти':             'Namangan',
  'Фарғона вилояти':              "Farg'ona",
  'Жиззах вилояти':               'Jizzax',
  'Сирдарё вилояти':              'Sirdaryo',
  'Тошкент вилояти':              'Toshkent',
  'Қорақалпоғистон Республикаси': "Qoraqalpog'iston",
  'Навоий вилояти':               'Navoiy',
  'Самарқанд вилояти':            'Samarqand',
  'Хоразм вилояти':               'Xorazm',
  'Қашқадарё вилояти':            'Qashqadaryo',
  'Сурхондарё вилояти':           'Surxondaryo',
  'Тошкент шаҳар':                'Tashkent city',
};

// [lng, lat] → [lat, lng] va Leaflet Polygon uchun tayyorlash
function getPolygonPositions(viloyatName) {
  const engName = VILOYAT_MAP[viloyatName];
  if (!engName) return null;
  const feature = regionPolygons.features.find(f => f.name === engName);
  if (!feature) return null;
  return feature.coordinates.map(ring => ring.map(([lng, lat]) => [lat, lng]));
}

// Viloyat tanlanganida xarita shu viloyatga siljiydi
function FlyToRegion({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions?.length) return;
    const bounds = L.latLngBounds(positions.flat());
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [positions]);
  return null;
}

// --- Icons ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
});

const selectedIcon = new L.DivIcon({
  className: '',
  iconSize: [28, 44], iconAnchor: [14, 44],
  html: `<svg viewBox="0 0 28 44" xmlns="http://www.w3.org/2000/svg" width="28" height="44">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 30 14 30s14-19.5 14-30C28 6.3 21.7 0 14 0z"
      fill="#ef4444" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`,
});

const UZBEKISTAN_CENTER = [41.2995, 69.2401];

// --- Map event handlers ---
function MapEventHandler({ onBoundsChange, pickMode, onPick }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
    click:   (e) => pickMode && onPick(e.latlng),
  });
  useEffect(() => {
    map.getContainer().style.cursor = pickMode ? 'crosshair' : '';
    return () => { map.getContainer().style.cursor = ''; };
  }, [pickMode, map]);
  return null;
}

function InitialLoad({ onLoad }) {
  const map = useMapEvents({});
  useEffect(() => { onLoad(map.getBounds()); }, []);
  return null;
}

// --- Loader ---
function Loader() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 2000,
      background: 'rgba(255,255,255,0.5)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)', pointerEvents: 'none',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '4px solid #e5e7eb', borderTopColor: '#3b82f6',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ marginTop: 12, fontSize: 14, color: '#374151', fontWeight: 500 }}>
        Yuklanmoqda...
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// --- Edit Panel ---
function Panel({ formData, onChange, pickMode, setPickMode, onSave, onClose, saving }) {
  const field = (label, key, type = 'text', disabled = false) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: '#6b7280', marginBottom: 4,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{label}</label>
      <input
        type={type} step={type === 'number' ? 'any' : undefined}
        value={formData[key] ?? ''}
        onChange={e => !disabled && onChange(key, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        disabled={disabled}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1px solid #d1d5db', borderRadius: 8,
          padding: '9px 12px', fontSize: 14, outline: 'none',
          fontFamily: 'inherit',
          background: disabled ? '#f3f4f6' : 'white',
          color: disabled ? '#6b7280' : '#111827',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onFocus={disabled ? undefined : e => e.target.style.borderColor = '#3b82f6'}
        onBlur={disabled ? undefined : e  => e.target.style.borderColor = '#d1d5db'}
      />
    </div>
  );

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 380,
      zIndex: 1500, background: '#fff',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        padding: '16px 18px', borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
          Tahrirlash{' '}
          <span style={{ fontWeight: 400, fontSize: 12, color: '#9ca3af' }}>#{formData.id}</span>
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          width: 28, height: 28, borderRadius: 6, fontSize: 18,
          color: '#9ca3af', lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px' }}>
        {field('Viloyat',  'viloyat',  'text', true)}
        {field('Tuman',    'district', 'text', true)}
        {field('MFY',      'mfy',      'text', true)}
        {field('Nomi',     'name')}

        <div style={{ marginBottom: 14 }}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: '#6b7280', marginBottom: 4,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Koordinatalar</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['lat', 'lng'].map(k => (
              <input key={k} type="number" step="any" placeholder={k === 'lat' ? 'Latitude' : 'Longitude'}
                value={formData[k] ?? ''}
                onChange={e => onChange(k, parseFloat(e.target.value))}
                style={{
                  flex: 1, border: '1px solid #d1d5db', borderRadius: 8,
                  padding: '9px 10px', fontSize: 13, outline: 'none',
                  fontFamily: 'monospace',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e  => e.target.style.borderColor = '#d1d5db'}
              />
            ))}
          </div>
          <button onClick={() => setPickMode(p => !p)} style={{
            width: '100%', padding: '9px 0', borderRadius: 8,
            border: pickMode ? '2px solid #3b82f6' : '1px solid #d1d5db',
            background: pickMode ? '#eff6ff' : '#f9fafb',
            color: pickMode ? '#1d4ed8' : '#374151',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            {pickMode ? 'Xaritaga bosing...' : 'Xaritadan tanlash'}
          </button>
          {pickMode && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: '#eff6ff', borderRadius: 6,
              fontSize: 12, color: '#1d4ed8', lineHeight: 1.5,
            }}>
              Yangi joylashuv uchun xarita ustiga bosing.
              Markerni sudrab ham ko'chirish mumkin.
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 18px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
        <button onClick={onSave} disabled={saving} style={{
          flex: 1, padding: '10px 0', borderRadius: 8,
          background: saving ? '#93c5fd' : '#3b82f6',
          color: 'white', border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: 700, fontSize: 14,
        }}>
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
        <button onClick={onClose} style={{
          flex: 1, padding: '10px 0', borderRadius: 8,
          background: '#f3f4f6', color: '#374151',
          border: 'none', cursor: 'pointer', fontSize: 14,
        }}>
          Bekor qilish
        </button>
      </div>
    </div>
  );
}

// --- Toast notification ---
function Toast({ message }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: '#22c55e', color: 'white',
      padding: '12px 28px', borderRadius: 10,
      fontSize: 15, fontWeight: 600,
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      pointerEvents: 'none',
      animation: 'fadeInUp 0.25s ease',
    }}>
      {message}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

// --- Main ---
export default function Map() {
  const savedViloyat = localStorage.getItem('selectedViloyat');

  // UI state
  const [viloyat,          setViloyat]         = useState(savedViloyat || null);
  const [showViloyatModal, setShowViloyatModal] = useState(!savedViloyat);
  const [tumanlar,         setTumanlar]         = useState([]);
  const [mfylar,           setMfylar]           = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMfy,      setSelectedMfy]      = useState('');
  const [locations,        setLocations]        = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [selected,         setSelected]         = useState(null);
  const [formData,         setFormData]         = useState(null);
  const [pickMode,         setPickMode]         = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [toast,            setToast]            = useState(null);

  // Ref lar — closure muammosini oldini oladi
  const boundsRef   = useRef(null);
  const debounceRef = useRef(null);
  const abortRef    = useRef(null);
  const filtersRef  = useRef({ viloyat: savedViloyat || null, district: '', mfy: '' });

  // fetchLocations faqat ref lardan o'qiydi — hech qachon qayta yaratilmaydi
  const fetchLocations = useCallback(async () => {
    const { viloyat, district, mfy } = filtersRef.current;
    const bounds = boundsRef.current;
    if (!viloyat || !bounds) return;

    // Oldingi so'rovni bekor qilish
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const params = new URLSearchParams({
        minLat: sw.lat, maxLat: ne.lat,
        minLng: sw.lng, maxLng: ne.lng,
        limit: 3000,
        viloyat,
        ...(district && { district }),
        ...(mfy      && { mfy }),
      });
      const res = await fetch(`/api/locations?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(await res.text());
      setLocations(await res.json());
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Fetch xatosi:', err);
    } finally {
      setLoading(false);
    }
  }, []); // bo'sh deps — hech qachon qayta yaratilmaydi

  // triggerFetch ham barqaror — debounce bilan bir marta chaqiradi
  const triggerFetch = useCallback((delay = 400) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchLocations, delay);
  }, [fetchLocations]);

  // handleBoundsChange ham barqaror — MapEventHandler qayta render bo'lmaydi
  const handleBoundsChange = useCallback((bounds) => {
    boundsRef.current = bounds;
    triggerFetch();
  }, [triggerFetch]);

  // Viloyat tanlanganda tumanlarni yuklash
  useEffect(() => {
    if (!viloyat) return;
    fetch(`/api/locations/tumanlar?viloyat=${encodeURIComponent(viloyat)}`)
      .then(r => r.json())
      .then(setTumanlar)
      .catch(console.error);
  }, [viloyat]);

  // Tuman tanlanganda MFYlarni yuklash
  useEffect(() => {
    if (!viloyat || !selectedDistrict) { setMfylar([]); return; }
    fetch(`/api/locations/mfylar?viloyat=${encodeURIComponent(viloyat)}&district=${encodeURIComponent(selectedDistrict)}`)
      .then(r => r.json())
      .then(setMfylar)
      .catch(console.error);
  }, [selectedDistrict, viloyat]);

  // Viloyat modal
  const handleViloyatSelect = useCallback((v) => {
    localStorage.setItem('selectedViloyat', v);
    filtersRef.current = { viloyat: v, district: '', mfy: '' };
    setViloyat(v);
    setSelectedDistrict('');
    setSelectedMfy('');
    setMfylar([]);
    setShowViloyatModal(false);
    setLocations([]);
    // FlyToRegion moveend triggerFetch ni chaqiradi.
    // Polygon topilmasa (fallback) shu yerdan chaqiriladi.
    triggerFetch(600);
  }, [triggerFetch]);

  // Tuman o'zgarganda
  const handleDistrictChange = useCallback((val) => {
    filtersRef.current = { ...filtersRef.current, district: val, mfy: '' };
    setSelectedDistrict(val);
    setSelectedMfy('');
    triggerFetch();
  }, [triggerFetch]);

  // MFY o'zgarganda
  const handleMfyChange = useCallback((val) => {
    filtersRef.current = { ...filtersRef.current, mfy: val };
    setSelectedMfy(val);
    triggerFetch();
  }, [triggerFetch]);

  // Polygon — faqat viloyat o'zgarganda qayta hisoblanadi
  const polygonPositions = useMemo(() => (
    viloyat ? getPolygonPositions(viloyat) : null
  ), [viloyat]);

  // Marker actions
  const handleMarkerClick     = useCallback((loc) => { setSelected(loc); setFormData({ ...loc }); setPickMode(false); }, []);
  const handleFieldChange     = useCallback((key, val) => setFormData(p => ({ ...p, [key]: val })), []);
  const handlePick            = useCallback((latlng) => { setFormData(p => ({ ...p, lat: latlng.lat, lng: latlng.lng })); setPickMode(false); }, []);
  const handleSelectedDragEnd = useCallback((e) => { const { lat, lng } = e.target.getLatLng(); setFormData(p => ({ ...p, lat, lng })); }, []);
  const handleClose           = useCallback(() => { setSelected(null); setFormData(null); setPickMode(false); }, []);

  const handleSave = useCallback(async () => {
    if (!selected || !formData) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/locations/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
      setSelected(updated);
      setFormData({ ...updated });
      setToast('Muvaffaqiyatli saqlandi');
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      alert('Saqlashda xatolik: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [selected, formData]);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      {toast && <Toast message={toast} />}

      {/* Viloyat tanlash modali */}
      {showViloyatModal && <ViloyatModal onSelect={handleViloyatSelect} />}

      {loading && <Loader />}

      {/* Marker soni */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
        background: 'white', padding: '5px 12px', borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 13, color: '#374151',
        pointerEvents: 'none',
      }}>
        {locations.length} ta object
      </div>

      <MapContainer center={UZBEKISTAN_CENTER} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <InitialLoad onLoad={handleBoundsChange} />
        <MapEventHandler onBoundsChange={handleBoundsChange} pickMode={pickMode} onPick={handlePick} />

        {/* Tanlangan viloyat chegarasi — polygonPositions faqat viloyat o'zgarganda yangilanadi */}
        {polygonPositions && (
          <>
            <FlyToRegion positions={polygonPositions} />
            <Polygon
              positions={polygonPositions}
              pathOptions={{ color: '#2563eb', weight: 2.5, fillColor: '#3b82f6', fillOpacity: 0.07 }}
            />
          </>
        )}

        {selected && formData && (
          <Marker
            position={[formData.lat, formData.lng]}
            icon={selectedIcon}
            draggable={true}
            zIndexOffset={1000}
            eventHandlers={{ dragend: handleSelectedDragEnd }}
          />
        )}

        <MarkerClusterGroup chunkedLoading maxClusterRadius={60} showCoverageOnHover={false}>
          {locations.filter(loc => loc.id !== selected?.id).map(loc => (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              eventHandlers={{ click: () => handleMarkerClick(loc) }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Filter bar — viloyat tanlangandan keyin ko'rinadi */}
      {viloyat && (
        <FilterBar
          viloyat={viloyat}
          tumanlar={tumanlar}
          selectedDistrict={selectedDistrict}
          onDistrictChange={handleDistrictChange}
          mfylar={mfylar}
          selectedMfy={selectedMfy}
          onMfyChange={handleMfyChange}
          onViloyatChange={() => setShowViloyatModal(true)}
        />
      )}

      {selected && formData && (
        <Panel
          formData={formData}
          onChange={handleFieldChange}
          pickMode={pickMode}
          setPickMode={setPickMode}
          onSave={handleSave}
          onClose={handleClose}
          saving={saving}
        />
      )}
    </div>
  );
}
