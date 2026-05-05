const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { findByEmail, findById, createUser, updateUser, changePassword, setOtp, clearOtp } = require('../Models/User');
const { sendHubtelSms, getConfigFromDb, createSmtpTransport } = require('./SmsController');

if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set in environment. Server cannot start securely.');
  process.exit(1);
}

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'This account is inactive. Please contact your administrator.' });
    }

    const { password: _, ...safeUser } = user;
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, initials: user.initials, is_active: user.is_active },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function signup(req, res) {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const existing = await findByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await createUser({ email: email.toLowerCase(), password, name: username, role: 'Admin' });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, initials: user.initials, is_active: user.is_active },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.status(201).json({ success: true, user, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getProfile(req, res) {
  try {
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'This account is inactive. Please contact your administrator.' });
    }
    const { password: _, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });

    // Check if email is taken by another user
    const existing = await findByEmail(email.toLowerCase());
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const user = await updateUser(req.user.id, { name, email: email.toLowerCase(), phone: phone || null });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await findById(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await changePassword(req.user.id, hashed);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Forgot Password: send OTP via SMS (or email fallback) ─────────────────

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '***';
  return '***' + phone.slice(-3);
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return local[0] + '***@' + domain;
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await findByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ success: true, message: 'If that account exists, an OTP has been sent.' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await setOtp(user.id, otp, expiresAt);

    const cfg = await getConfigFromDb();

    if (user.phone && cfg.client_id && cfg.client_secret) {
      // Send via SMS
      const message = `Your ODCMS password reset code is ${otp}. Valid for 10 minutes.`;
      const result = await sendHubtelSms({
        clientId: cfg.client_id,
        clientSecret: cfg.client_secret,
        senderId: cfg.sender_id || 'ODG',
        to: user.phone,
        message,
      });
      if (result.success) {
        return res.json({ success: true, method: 'sms', contact: maskPhone(user.phone), message: 'OTP sent via SMS.' });
      }
      // SMS failed — fall through to email
      console.error('[Forgot Password] SMS failed:', result.message);
    }

    // Fallback: send via email
    if (cfg.smtp_host && cfg.smtp_user && cfg.smtp_pass) {
      try {
        const transport = createSmtpTransport(cfg);
        await transport.sendMail({
          from: cfg.smtp_user,
          to: user.email,
          subject: 'ODCMS Password Reset Code',
          text: `Your password reset code is ${otp}. It is valid for 10 minutes.`,
          html: `<p>Your password reset code is <strong>${otp}</strong>.</p><p>It is valid for 10 minutes.</p>`,
        });
        return res.json({ success: true, method: 'email', contact: maskEmail(user.email), message: 'OTP sent via email.' });
      } catch (emailErr) {
        console.error('[Forgot Password] Email failed:', emailErr.message);
      }
    }

    // Neither SMS nor email worked
    return res.status(503).json({ success: false, message: 'Unable to send verification code. Please ensure your account has a phone number, or contact your administrator to configure SMS/email services.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const user = await findByEmail(email.toLowerCase());
    if (!user || !user.otp_code) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      await clearOtp(user.id);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Issue a short-lived reset token
    const resetToken = jwt.sign({ id: user.id, purpose: 'password-reset' }, JWT_SECRET, { expiresIn: '10m' });
    res.json({ success: true, resetToken });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token. Please start over.' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await changePassword(decoded.id, hashed);
    await clearOtp(decoded.id);

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { login, signup, getProfile, updateProfile, updatePassword, forgotPassword, verifyOtp, resetPassword };
