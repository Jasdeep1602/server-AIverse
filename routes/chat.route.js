const chatCtrl = require('../controllers/chat.controller');
const auth = require('../middleware/auth');

const router = require('express').Router();

router.post('/sessions', auth, chatCtrl.createSession);
router.get('/sessions/:userId', auth, chatCtrl.getSessions);
router.get('/session/:chatId', chatCtrl.getSingleSession);
router.post('/message', auth, chatCtrl.sendMessage);
router.get('/history/:chatId', auth, chatCtrl.getHistory);

module.exports = router;
