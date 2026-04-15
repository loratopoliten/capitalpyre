const router = require('express').Router();
const c = require('../controllers/investorController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/me',                          authenticate, authorize('investor'), c.getMyProfile);
router.get('/:id',                         authenticate,                       c.getOne);
router.put('/me',                          authenticate, authorize('investor'), c.updateMyProfile);
router.get('/me/watchlist',                authenticate, authorize('investor'), c.getWatchlist);
router.post('/me/watchlist',               authenticate, authorize('investor'), c.addToWatchlist);
router.delete('/me/watchlist/:targetId',   authenticate, authorize('investor'), c.removeFromWatchlist);
module.exports = router;
