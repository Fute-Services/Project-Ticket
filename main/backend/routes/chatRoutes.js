const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const validateFields = require('../middleware/validateFields');
const { listMessages, sendMessage, directory, resolveDmChannel } = require('../controllers/chatController');

router.get('/directory', auth, directory);
router.get('/dm/:otherUserId', auth, resolveDmChannel);
router.get('/:channelId/messages', auth, listMessages);
router.post('/:channelId/messages', auth, validateFields({ text: 4000 }), sendMessage);

module.exports = router;
