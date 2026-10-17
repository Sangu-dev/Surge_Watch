import { Router } from 'express';
import { updateHospitalResources, getHospitalAuditLogs } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole, requireHospitalOwnership } from '../middleware/rbacMiddleware.js';

const router = Router();

// Hospital Administrator updates their hospital's resources
router.put(
  '/hospitals/:hospitalId/resources',
  requireAuth,
  requireRole(['HOSPITAL_ADMIN', 'PLATFORM_ADMIN']),
  requireHospitalOwnership,
  updateHospitalResources
);

// Hospital Administrator fetches their hospital's audit log
router.get(
  '/hospitals/:hospitalId/audits',
  requireAuth,
  requireRole(['HOSPITAL_ADMIN', 'PLATFORM_ADMIN']),
  requireHospitalOwnership,
  getHospitalAuditLogs
);

export default router;
