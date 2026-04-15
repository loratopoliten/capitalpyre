const router = require('express').Router();
const c = require('../controllers/bondsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',               authenticate, authorize('investor','admin'), c.list);
router.get('/:id',            authenticate, authorize('investor','admin'), c.getOne);
router.post('/',              authenticate, authorize('admin'),            c.create);
router.patch('/:id/bse-list', authenticate, authorize('admin'),           c.markBseListed);
module.exports = router;
