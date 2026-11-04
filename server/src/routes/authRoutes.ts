import { Router } from 'express';
import {
  registerPatient,
  loginPatient,
  loginAdmin,
  refreshTokenHandler,
  logoutHandler,
  forgotPassword,
  resetPassword,
  activateHospitalAdmin,
  requestHospitalAccess,
  getMe,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  authRateLimiter,
  passwordResetRateLimiter,
} from '../middleware/rateLimitMiddleware.js';
import { csrfProtection } from '../middleware/csrfMiddleware.js';

const router = Router();

// Apply CSRF defense on state-changing authentication operations
router.use(csrfProtection);

// Public Authentication Endpoints (Rate Limited)
router.post('/register-patient', authRateLimiter, registerPatient);
router.post('/login-patient', authRateLimiter, loginPatient);
router.post('/login-admin', authRateLimiter, loginAdmin);
router.post('/refresh-token', authRateLimiter, refreshTokenHandler);
router.post('/logout', logoutHandler);

// Password Recovery & Activation Endpoints (Rate Limited)
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, resetPassword);
router.post('/activate-hospital-admin', passwordResetRateLimiter, activateHospitalAdmin);

// Institutional Access Application
router.post('/request-hospital-access', requestHospitalAccess);

// Authenticated Session Profile
router.get('/me', requireAuth, getMe);

export default router;
