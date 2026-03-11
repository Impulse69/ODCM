const express = require('express');
const router = express.Router();
const { login, signup, getProfile, updateProfile, updatePassword } = require('../Controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/signup', signup);
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);
router.patch('/password', authenticateToken, updatePassword);

module.exports = router;
