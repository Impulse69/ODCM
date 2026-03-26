const express = require('express');
const router = express.Router();
const { login, signup, getProfile, updateProfile, updatePassword, forgotPassword, verifyOtp, resetPassword } = require('../Controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/signup', signup);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);
router.patch('/password', authenticateToken, updatePassword);

module.exports = router;
