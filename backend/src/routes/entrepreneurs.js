const router = require('express').Router();
const c = require('../controllers/entrepreneurController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/',              authenticate, authorize('investor','admin'), c.search);
router.get('/me',            authenticate, authorize('entrepreneur'),     c.getMyProfile);
router.get('/:id',           authenticate,                               c.getOne);
router.put('/me',            authenticate, authorize('entrepreneur'), upload.single('pitch_deck'), c.updateMyProfile);
router.patch('/me/publish',  authenticate, authorize('entrepreneur'),     c.togglePublish);
module.exports = router;
