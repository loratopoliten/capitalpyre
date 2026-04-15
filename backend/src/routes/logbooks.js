const router = require('express').Router();
const c = require('../controllers/logbooksController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',            authenticate,                                   c.getLogbooks);
router.post('/',           authenticate, authorize('entrepreneur','sme'),  c.submitLogbook);
router.post('/:id/review', authenticate, authorize('investor','admin'),    c.reviewLogbook);
module.exports = router;
