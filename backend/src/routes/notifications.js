const router = require('express').Router();
const c = require('../controllers/notificationsController');
const { authenticate } = require('../middleware/auth');

router.get('/',              authenticate, c.getMyNotifications);
router.patch('/read-all',    authenticate, c.markAllRead);
router.patch('/:id/read',    authenticate, c.markRead);
module.exports = router;
