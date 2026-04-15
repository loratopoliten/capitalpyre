const router = require('express').Router();
const c = require('../controllers/messagesController');
const { authenticate } = require('../middleware/auth');

router.get('/:threadId', authenticate, c.getThread);
router.post('/',         authenticate, c.sendMessage);
module.exports = router;
