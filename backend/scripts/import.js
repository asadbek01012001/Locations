const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../db');

const XLSX_PATH = path.join(__dirname, '../../locations.xlsx');

// UZ koordinata oraligi
const LAT_MIN = 37, LAT_MAX = 43, LNG_MIN = 55, LNG_MAX = 75;

function fixCoord(n) {
  // 8+ raqamli son - nuqta o'tkazib yuborilgan
  if (n >= LAT_MIN * 1e6 && n <= LAT_MAX * 1e6) return n / 1e6;
  if (n >= LNG_MIN * 1e6 && n <= LNG_MAX * 1e6) return n / 1e6;
  return n;
}

function parseLatLng(raw) {
  if (!raw && raw !== 0) return { lat: null, lng: null };
  let str = String(raw).trim();
  if (!str) return { lat: null, lng: null };

  // Kirill З → 3
  str = str.replace(/З/g, '3').replace(/з/g, '3');
  // Ko'p nuqta → bitta: 40..524903 → 40.524903
  str = str.replace(/\.\.+/g, '.');
  // / → bo'shliq
  str = str.replace(/\//g, ' ');

  // Strategy: butun stringdan ikkita koordinatani ajratib olish.
  // Ko'p xil separator: vergul, bo'shliq, nuqta.
  // Nuqta decimal separator yoki lat/lng separator bo'lishi mumkin.

  // 1) Avval klassik formatlarni sinab ko'rish
  // "40.375248, 71.781475"  yoki  "40.375248 71.781475"
  let m = str.match(/^(\d+\.\d+)[,\s]+(\d+\.\d+)/);
  if (m) {
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX)
      return { lat, lng };
  }

  // 2) "40.393484.71.270468" - nuqta separator
  m = str.match(/^(\d+\.\d+)\.(\d+\.\d+)/);
  if (m) {
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX)
      return { lat, lng };
  }

  // 3) Vergul decimal separator: "40,375248, 71,781475" yoki "40,375248 71,781475"
  // Birinchi raqamda vergul bo'lsa, vergulni nuqtaga almashtirish
  const noCommaDecimal = str
    .replace(/(\d),(\d{5,})/g, '$1.$2')  // 70,871884 → 70.871884
    .replace(/(\d),\s*(\d{5,})/g, '$1.$2'); // 70, 711853 → 70.711853
  m = noCommaDecimal.match(/(\d+\.\d+)[,\s]+(\d+\.\d+)/);
  if (m) {
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX)
      return { lat, lng };
  }

  // 4) Ko'p nuqtali raqam: "40.840.275" → 40.840275
  const fixedDots = str.replace(/(\d+\.\d+)\.(\d+)/g, (_, a, b) => a + b);
  m = fixedDots.match(/(\d+\.\d+)[,\s]+(\d+\.\d+)/);
  if (m) {
    const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX)
      return { lat, lng };
  }

  // 5) Decimal yo'q (8 raqamli): "40382120, 70647019"
  m = str.match(/(\d{7,9})[,\s]+(\d{7,9})/);
  if (m) {
    const lat = fixCoord(parseInt(m[1])), lng = fixCoord(parseInt(m[2]));
    if (lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX)
      return { lat, lng };
  }
  // Faqat bitta decimal yo'q: "40382120, 70.647019"
  m = str.match(/(\d{7,9})[,\s]+(\d+\.\d+)/);
  if (m) {
    const lat = fixCoord(parseInt(m[1])), lng = parseFloat(m[2]);
    if (lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX)
      return { lat, lng };
  }
  m = str.match(/(\d+\.\d+)[,\s]+(\d{7,9})/);
  if (m) {
    const lat = parseFloat(m[1]), lng = fixCoord(parseInt(m[2]));
    if (lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX)
      return { lat, lng };
  }

  // Hech narsa topilmadi - NULL qaytarish
  return { lat: null, lng: null };
}

function intOrNull(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

const VILOYAT_KEYWORDS = ['вилояти', 'Республикаси', 'шаҳар', 'ЖАМИ'];
function isViloyatHeader(v) {
  return typeof v === 'string' && VILOYAT_KEYWORDS.some(k => v.includes(k));
}

async function importData() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(ws['!ref']);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE locations RESTART IDENTITY');

    let currentViloyat = null;
    let currentDistrict = null;
    let currentMfy = null;
    let totalInserted = 0;
    let nullGeo = 0;

    // 13-qatordan (0-indexed: 12) boshlaymiz
    for (let r = 12; r <= range.e.r; r++) {
      const get = (c) => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        return cell ? (cell.v !== undefined ? cell.v : '') : '';
      };

      const colA = get(0);

      // Viloyat header qatori
      if (isViloyatHeader(colA)) {
        if (!String(colA).includes('ЖАМИ')) {
          currentViloyat = String(colA).trim();
          currentDistrict = null;
          currentMfy = null;
        }
        continue;
      }

      // T/r raqam bo'lishi kerak
      const trNum = typeof colA === 'number' ? colA : parseInt(String(colA), 10);
      if (isNaN(trNum)) continue;

      if (!currentViloyat) continue;

      // District va MFY — bo'sh bo'lsa oldingi qiymat saqlanadi
      const districtRaw = get(1);
      const mfyRaw = get(2);
      if (districtRaw && String(districtRaw).trim()) {
        currentDistrict = String(districtRaw).trim();
      }
      if (mfyRaw && String(mfyRaw).trim()) {
        currentMfy = String(mfyRaw).trim();
      }

      const nameRaw = get(3);
      const geoRaw  = get(4);

      const { lat, lng } = parseLatLng(geoRaw);
      if (lat === null) nullGeo++;

      const cameraDirected = intOrNull(get(5));
      const cameraFace     = intOrNull(get(6));
      const cameraVehicle  = intOrNull(get(7));
      const cameraPtz      = intOrNull(get(8));
      const shkaf          = intOrNull(get(9));
      const poe4           = intOrNull(get(10));
      const poe8           = intOrNull(get(11));
      const kronshtein     = intOrNull(get(12));
      const electricMeter  = intOrNull(get(13));

      // Location NULL bo'lsa ham insert qilamiz
      const locationVal = (lat !== null && lng !== null)
        ? `jsonb_build_object('lat',${lat}::float8,'lng',${lng}::float8)`
        : 'NULL';

      await client.query(
        `INSERT INTO locations
           (viloyat, district, mfy, name, location, tr,
            camera_directed, camera_face, camera_vehicle, camera_ptz,
            shkaf, poe_4port, poe_8port, kronshtein, electric_meter)
         VALUES ($1,$2,$3,$4,
           ${locationVal},
           $5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          currentViloyat, currentDistrict, currentMfy,
          nameRaw ? String(nameRaw).trim() : null,
          trNum,
          cameraDirected, cameraFace, cameraVehicle, cameraPtz,
          shkaf, poe4, poe8, kronshtein, electricMeter,
        ]
      );
      totalInserted++;

      if (totalInserted % 2000 === 0) {
        process.stdout.write(`\r  ${totalInserted} qator kiritildi...`);
      }
    }

    await client.query('COMMIT');
    console.log(`\nImport yakunlandi: ${totalInserted} ta qator kiritildi.`);
    console.log(`  - Geo ma'lumoti yo'q (NULL location): ${nullGeo} ta`);
    console.log(`  - Geo to'liq: ${totalInserted - nullGeo} ta`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import xatosi:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

importData().catch(() => process.exit(1));
