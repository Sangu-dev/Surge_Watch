import { Router } from 'express';
import {
  registerPatient,
  loginPatient,
  loginAdmin,
  requestHospitalAccess,
  getMe,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register-patient', registerPatient);
router.post('/login-patient', loginPatient);
router.post('/login-admin', loginAdmin);
router.post('/request-hospital-access', requestHospitalAccess);
router.get('/me', requireAuth, getMe);

export default router;
