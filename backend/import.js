require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function parseCoord(raw) {
  if (!raw) return null;
  const parts = String(raw).replace(',', ' ').trim().split(/\s+/);
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

async function main() {
  // Docker: /data/locations.xlsx, lokal: ../locations.xlsx
  const filePath = process.env.XLSX_PATH || path.join(__dirname, '..', 'locations.xlsx');
  console.log("Fayl o'qilmoqda:", filePath);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const DATA_START = 13;
  const BATCH_SIZE = 500;
  const SKIP_SECTIONS = ['УМУМИЙ ЖАМИ'];

  // Birinchi bo'lim sarlavsiz keladi — Farg'ona viloyati
  let lastViloyat  = 'Фарғона вилояти';
  let lastDistrict = null;
  let lastMfy      = null;

  const records = [];
  let skipped = 0;

  for (let i = DATA_START; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const first = row[0];

    // Bo'lim sarlavhasi (viloyat nomi)
    if (typeof first === 'string' && first.trim()) {
      const val = first.trim();
      if (!SKIP_SECTIONS.includes(val)) lastViloyat = val;
      continue;
    }

    if (typeof first !== 'number') continue;

    const district = row[1] ? String(row[1]).trim() : lastDistrict;
    const mfy      = row[2] ? String(row[2]).trim() : lastMfy;
    const name     = row[3] ? String(row[3]).trim() : null;
    const coord    = parseCoord(row[4]);

    if (district) lastDistrict = district;
    if (mfy)      lastMfy      = mfy;

    if (!coord) { skipped++; continue; }

    records.push({
      viloyat: lastViloyat,
      district,
      mfy,
      name,
      lat: coord.lat,
      lng: coord.lng,
    });
  }

  console.log(`O'qildi: ${records.length} ta yozuv (${skipped} ta o'tkazildi)`);
  console.log('DB ga yozilmoqda...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let inserted = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const values = batch.map((_, j) => {
        const b = j * 6;
        return `($${b+1},$${b+2},$${b+3},$${b+4},jsonb_build_object('lat',$${b+5}::float8,'lng',$${b+6}::float8))`;
      }).join(', ');

      const params = batch.flatMap(r => [r.viloyat, r.district, r.mfy, r.name, r.lat, r.lng]);

      await client.query(
        `INSERT INTO locations (viloyat, district, mfy, name, location) VALUES ${values}`,
        params
      );

      inserted += batch.length;
      process.stdout.write(`\r${inserted} / ${records.length}`);
    }

    await client.query('COMMIT');
    console.log(`\nMuvaffaqiyatli! ${inserted} ta yozuv saqlandi.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nXatolik, rollback:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
