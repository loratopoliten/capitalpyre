const router = require('express').Router();
const c    = require('../controllers/adminController');
const smeC = require('../controllers/smeController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/users',                    authenticate, authorize('admin'), c.listUsers);
router.patch('/users/:id/verify',       authenticate, authorize('admin'), c.verifyUser);
router.patch('/users/:id/toggle-active',authenticate, authorize('admin'), c.toggleActive);
router.get('/sme/pending',              authenticate, authorize('admin'), c.pendingSMEs);
router.patch('/sme/:id/approve',        authenticate, authorize('admin'), smeC.adminApprove);
router.get('/analytics',                authenticate, authorize('admin'), c.analytics);
router.get('/audit-logs',               authenticate, authorize('admin'), c.auditLogs);
router.post('/force-match',             authenticate, authorize('admin'), c.forceMatch);
router.patch('/spotlight/:type/:id',    authenticate, authorize('admin'), c.toggleSpotlight);
module.exports = router;
