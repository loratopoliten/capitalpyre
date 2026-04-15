const router = require('express').Router();
const c = require('../controllers/crsController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/compute',    authenticate, authorize('entrepreneur','sme','admin'), c.compute);
router.get('/me',          authenticate, authorize('entrepreneur','sme'),         c.getMyCRS);
router.get('/benchmarks',  authenticate, authorize('entrepreneur','sme','admin'), c.getBenchmarks);
module.exports = router;
