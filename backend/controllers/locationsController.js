const pool = require('../db');
const XLSX = require('xlsx');

const ALL_EXTRA_COLS = `
  tr,
  camera_directed, camera_face, camera_vehicle, camera_ptz,
  shkaf, poe_4port, poe_8port, kronshtein, electric_meter
`;

// GET /api/locations
const getLocations = async (req, res) => {
  try {
    const {
      minLat, maxLat, minLng, maxLng,
      limit = 2000, offset = 0,
      viloyat, district, mfy, tr, noGeo,
    } = req.query;

    const conditions = [];
    const params = [];
    let i = 1;

    if (viloyat)  { conditions.push(`viloyat = $${i++}`);  params.push(viloyat); }
    if (district) { conditions.push(`district = $${i++}`); params.push(district); }
    if (mfy)      { conditions.push(`mfy = $${i++}`);      params.push(mfy); }
    if (tr)       { conditions.push(`tr = $${i++}`);        params.push(parseInt(tr, 10)); }

    if (noGeo === 'true') {
      conditions.push(`location IS NULL`);
    } else if (minLat && maxLat && minLng && maxLng) {
      conditions.push(`(location->>'lat')::float8 BETWEEN $${i} AND $${i + 1}`);
      conditions.push(`(location->>'lng')::float8 BETWEEN $${i + 2} AND $${i + 3}`);
      params.push(minLat, maxLat, minLng, maxLng);
      i += 4;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const query = `
      SELECT id, viloyat, district, mfy, name,
        (location->>'lat')::float8 AS lat,
        (location->>'lng')::float8 AS lng,
        ${ALL_EXTRA_COLS}
      FROM locations
      ${where}
      ORDER BY tr
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getLocations error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/locations/viloyatlar
const getViloyatlar = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT viloyat FROM locations
       WHERE viloyat IS NOT NULL ORDER BY viloyat`
    );
    res.json(result.rows.map(r => r.viloyat));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/locations/tumanlar?viloyat=X
const getTumanlar = async (req, res) => {
  try {
    const { viloyat } = req.query;
    if (!viloyat) return res.status(400).json({ error: 'viloyat parametri kerak' });

    const result = await pool.query(
      `SELECT DISTINCT district FROM locations
       WHERE viloyat = $1 AND district IS NOT NULL ORDER BY district`,
      [viloyat]
    );
    res.json(result.rows.map(r => r.district));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/locations/mfylar?viloyat=X&district=Y
const getMfylar = async (req, res) => {
  try {
    const { viloyat, district } = req.query;
    if (!viloyat) return res.status(400).json({ error: 'viloyat parametri kerak' });

    let query, params;
    if (district) {
      query  = `SELECT DISTINCT mfy FROM locations WHERE viloyat=$1 AND district=$2 AND mfy IS NOT NULL ORDER BY mfy`;
      params = [viloyat, district];
    } else {
      query  = `SELECT DISTINCT mfy FROM locations WHERE viloyat=$1 AND mfy IS NOT NULL ORDER BY mfy`;
      params = [viloyat];
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map(r => r.mfy));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/locations/:id
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lat, lng, viloyat, district, mfy, name,
      camera_directed, camera_face, camera_vehicle, camera_ptz,
      shkaf, poe_4port, poe_8port, kronshtein, electric_meter,
    } = req.body;

    const updates = [];
    const params = [];
    let i = 1;

    if (lat !== undefined && lng !== undefined) {
      updates.push(`location = jsonb_build_object('lat',$${i}::float8,'lng',$${i + 1}::float8)`);
      params.push(lat, lng);
      i += 2;
    }
    if (viloyat          !== undefined) { updates.push(`viloyat = $${i++}`);          params.push(viloyat); }
    if (district         !== undefined) { updates.push(`district = $${i++}`);         params.push(district); }
    if (mfy              !== undefined) { updates.push(`mfy = $${i++}`);              params.push(mfy); }
    if (name             !== undefined) { updates.push(`name = $${i++}`);             params.push(name); }
    if (camera_directed  !== undefined) { updates.push(`camera_directed = $${i++}`);  params.push(camera_directed); }
    if (camera_face      !== undefined) { updates.push(`camera_face = $${i++}`);      params.push(camera_face); }
    if (camera_vehicle   !== undefined) { updates.push(`camera_vehicle = $${i++}`);   params.push(camera_vehicle); }
    if (camera_ptz       !== undefined) { updates.push(`camera_ptz = $${i++}`);       params.push(camera_ptz); }
    if (shkaf            !== undefined) { updates.push(`shkaf = $${i++}`);            params.push(shkaf); }
    if (poe_4port        !== undefined) { updates.push(`poe_4port = $${i++}`);        params.push(poe_4port); }
    if (poe_8port        !== undefined) { updates.push(`poe_8port = $${i++}`);        params.push(poe_8port); }
    if (kronshtein       !== undefined) { updates.push(`kronshtein = $${i++}`);       params.push(kronshtein); }
    if (electric_meter   !== undefined) { updates.push(`electric_meter = $${i++}`);   params.push(electric_meter); }

    if (updates.length === 0)
      return res.status(400).json({ error: "O'zgartirish uchun maydon berilmadi" });

    params.push(id);
    const result = await pool.query(
      `UPDATE locations SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, viloyat, district, mfy, name,
         (location->>'lat')::float8 AS lat,
         (location->>'lng')::float8 AS lng,
         ${ALL_EXTRA_COLS}`,
      params
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Location topilmadi' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateLocation error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/locations/export?viloyat=X
const exportLocations = async (req, res) => {
  try {
    const { viloyat } = req.query;
    if (!viloyat) return res.status(400).json({ error: 'viloyat parametri kerak' });

    const result = await pool.query(
      `SELECT district, mfy, name, tr,
         (location->>'lat')::float8 AS lat,
         (location->>'lng')::float8 AS lng,
         camera_directed, camera_face, camera_vehicle, camera_ptz,
         shkaf, poe_4port, poe_8port, kronshtein, electric_meter
       FROM locations
       WHERE viloyat = $1
       ORDER BY tr, district, mfy, id`,
      [viloyat]
    );

    const rows = result.rows;

    const aoa = [];

    // 1-2 qator: bo'sh
    aoa.push([]);
    aoa.push(['', '"КЕЛИШИЛГАН"', '', '', '', '', '', '', '"ТАСДИҚЛАЙМАН"']);
    aoa.push(['', 'ИИВ "Хавфсиз шаҳар" тизимлари', '', '', '', '', '', '', 'Ички ишлар вазирлиги Ҳуқуқбузарликларнинг']);
    aoa.push([]);
    aoa.push([]);
    aoa.push(['', '______________   У.К. Куланов', '', '', '', '', '', '', '________________  Ш.У. Уралов']);
    aoa.push(['', '  "______" _______________ 202', '', '', '', '', '', '', '  "____"________________ 2026 й.']);
    aoa.push([]);
    // 9-qator: sarlavha
    aoa.push([`2026-2027 йилларда ${viloyat}да "Хавфсиз шаҳар" тизими доирасида ўрнатиладиган ускуналар рўйхати`]);
    aoa.push([]);
    // 11-qator: ustun sarlavhalari (birinchi qator)
    aoa.push([
      'Т/р',
      'Шаҳар ва \nтуман номи',
      'МФЙ номи',
      'Объект номи ва юридик манзили',
      'Геолокацияси',
      'Интеллектуал видеокузатув камераси',
      '', '', '',
      'Шкаф (уличный)',
      'PoE коммутатор \n4 порт',
      'PoE коммутатор \n8 порт',
      'Кронштейн',
      'Электр \nҳисоблагич',
    ]);
    // 12-qator: kamera turlari
    aoa.push([
      '', '', '', '', '',
      'Йўналтирилган камера',
      'Юздан таниб олувчи камера',
      'Автотранспорт воситаси давлат рақами',
      'Айланма PTZ камера',
      '', '', '', '', '',
    ]);
    // Viloyat header qatori
    aoa.push([viloyat]);

    let prevDistrict = null;
    let prevMfy      = null;

    rows.forEach(row => {
      const showDistrict = row.district !== prevDistrict;
      const showMfy      = showDistrict || row.mfy !== prevMfy;

      aoa.push([
        row.tr,
        showDistrict ? (row.district || '') : null,
        showMfy      ? (row.mfy      || '') : null,
        row.name     || '',
        row.lat != null && row.lng != null ? `${row.lat}, ${row.lng}` : '',
        row.camera_directed  || null,
        row.camera_face      || null,
        row.camera_vehicle   || null,
        row.camera_ptz       || null,
        row.shkaf            || null,
        row.poe_4port        || null,
        row.poe_8port        || null,
        row.kronshtein       || null,
        row.electric_meter   || null,
      ]);

      prevDistrict = row.district;
      prevMfy      = row.mfy;
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 6  },  // T/r
      { wch: 22 },  // District
      { wch: 22 },  // MFY
      { wch: 50 },  // Nomi
      { wch: 24 },  // Geolokatsiya
      { wch: 12 },  // camera_directed
      { wch: 12 },  // camera_face
      { wch: 14 },  // camera_vehicle
      { wch: 12 },  // camera_ptz
      { wch: 10 },  // shkaf
      { wch: 10 },  // poe_4port
      { wch: 10 },  // poe_8port
      { wch: 10 },  // kronshtein
      { wch: 10 },  // electric_meter
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'УМУМИЙ');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `${viloyat}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (err) {
    console.error('exportLocations error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getLocations, getViloyatlar, getTumanlar, getMfylar, updateLocation, exportLocations };
