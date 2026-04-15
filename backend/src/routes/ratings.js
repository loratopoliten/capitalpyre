const router = require('express').Router();
const c = require('../controllers/ratingsController');
const { authenticate } = require('../middleware/auth');

router.post('/',          authenticate, c.submitRating);
router.get('/:userId',    authenticate, c.getUserRatings);
module.exports = router;
