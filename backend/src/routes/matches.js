const router = require('express').Router();
const c = require('../controllers/matchesController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/suggestions', authenticate, authorize('entrepreneur','sme'), c.getSuggestions);
router.get('/preview',     authenticate, authorize('entrepreneur','sme'), c.getPreview);
router.get('/',            authenticate,                                   c.getMyMatches);
router.post('/',           authenticate, authorize('investor'),            c.requestMatch);
router.patch('/:id/respond', authenticate, authorize('entrepreneur','sme'), c.respondToMatch);
module.exports = router;
