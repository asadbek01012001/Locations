const router = require('express').Router();
const {
  getLocations,
  getViloyatlar,
  getTumanlar,
  getMfylar,
  updateLocation,
  exportLocations,
} = require('../controllers/locationsController');

// Aniq routelar /:id dan OLDIN kelishi kerak
router.get('/viloyatlar', getViloyatlar);
router.get('/tumanlar',   getTumanlar);
router.get('/mfylar',     getMfylar);
router.get('/export',     exportLocations);

router.get('/',     getLocations);
router.put('/:id',  updateLocation);

module.exports = router;
