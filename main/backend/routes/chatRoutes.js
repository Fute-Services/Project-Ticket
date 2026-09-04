const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { listMessages, sendMessage, directory, resolveDmChannel } = require('../controllers/chatController');

router.get('/directory', auth, directory);
router.get('/dm/:otherUserId', auth, resolveDmChannel);
router.get('/:channelId/messages', auth, listMessages);
router.post('/:channelId/messages', auth, sendMessage);

module.exports = router;
