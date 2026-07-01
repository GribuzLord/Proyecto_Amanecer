const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;
