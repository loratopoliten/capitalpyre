const router = require('express').Router();
const c = require('../controllers/dealsController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/',                    authenticate, c.getMyDeals);
router.get('/:id',                 authenticate, c.getOne);
router.patch('/:id/stage',         authenticate, c.advanceStage);
router.patch('/:id/close-inactive',authenticate, c.closeInactive);
router.post('/:id/documents',      authenticate, upload.single('document'), c.uploadDocument);
module.exports = router;
