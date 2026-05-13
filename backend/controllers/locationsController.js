const pool = require('../db');
const XLSX = require('xlsx');

// GET /api/locations
const getLocations = async (req, res) => {
  try {
    const {
      minLat, maxLat, minLng, maxLng,
      limit = 2000, offset = 0,
      viloyat, district, mfy,
    } = req.query;

    const conditions = [];
    const params = [];
    let i = 1;

    if (viloyat)  { conditions.push(`viloyat = $${i++}`);  params.push(viloyat); }
    if (district) { conditions.push(`district = $${i++}`); params.push(district); }
    if (mfy)      { conditions.push(`mfy = $${i++}`);      params.push(mfy); }

    if (minLat && maxLat && minLng && maxLng) {
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
        (location->>'lng')::float8 AS lng
      FROM locations
      ${where}
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
    const { lat, lng, viloyat, district, mfy, name } = req.body;

    const updates = [];
    const params = [];
    let i = 1;

    if (lat !== undefined && lng !== undefined) {
      updates.push(`location = jsonb_build_object('lat',$${i}::float8,'lng',$${i + 1}::float8)`);
      params.push(lat, lng);
      i += 2;
    }
    if (viloyat  !== undefined) { updates.push(`viloyat = $${i++}`);  params.push(viloyat); }
    if (district !== undefined) { updates.push(`district = $${i++}`); params.push(district); }
    if (mfy      !== undefined) { updates.push(`mfy = $${i++}`);      params.push(mfy); }
    if (name     !== undefined) { updates.push(`name = $${i++}`);     params.push(name); }

    if (updates.length === 0)
      return res.status(400).json({ error: "O'zgartirish uchun maydon berilmadi" });

    params.push(id);
    const result = await pool.query(
      `UPDATE locations SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, viloyat, district, mfy, name,
         (location->>'lat')::float8 AS lat,
         (location->>'lng')::float8 AS lng`,
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
      `SELECT district, mfy, name,
         (location->>'lat')::float8 AS lat,
         (location->>'lng')::float8 AS lng
       FROM locations
       WHERE viloyat = $1
       ORDER BY district, mfy, id`,
      [viloyat]
    );

    const rows = result.rows;

    // Excel uchun ma'lumotlarni tayyorlash (originalga o'xshash format)
    const aoa = [];

    // Sarlavha
    aoa.push([viloyat]);
    aoa.push([]);
    aoa.push(['T/r', 'Shahar va tuman nomi', 'MFY nomi', 'Obyekt nomi va yuridik manzili', 'Geolokatsiyasi']);

    // Viloyat bo'lim satri
    aoa.push([viloyat]);

    // Ma'lumot satrlari — district/mfy faqat o'zgarganda ko'rsatiladi (original kabi)
    let prevDistrict = null;
    let prevMfy      = null;

    rows.forEach((row, i) => {
      const showDistrict = row.district !== prevDistrict;
      const showMfy      = showDistrict || row.mfy !== prevMfy;

      aoa.push([
        i + 1,
        showDistrict ? row.district : null,
        showMfy      ? row.mfy      : null,
        row.name     || '',
        row.lat != null && row.lng != null ? `${row.lat}, ${row.lng}` : '',
      ]);

      prevDistrict = row.district;
      prevMfy      = row.mfy;
    });

    // Workbook yaratish
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Ustun kengliklarini sozlash
    ws['!cols'] = [
      { wch: 6  },  // T/r
      { wch: 22 },  // District
      { wch: 22 },  // MFY
      { wch: 50 },  // Nomi
      { wch: 24 },  // Geolokatsiya
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Locations');

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
