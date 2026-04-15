const router = require('express').Router();
const c = require('../controllers/smeController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/',                    authenticate, authorize('investor','admin'),  c.search);
router.get('/me',                  authenticate, authorize('sme'),               c.getMyProfile);
router.get('/:id',                 authenticate,                                 c.getOne);
router.put('/me',                  authenticate, authorize('sme'),               c.updateMyProfile);
router.post('/me/documents',       authenticate, authorize('sme'), upload.single('financial_doc'), c.uploadDocument);
router.patch('/admin/:id/approve', authenticate, authorize('admin'),             c.adminApprove);
module.exports = router;
