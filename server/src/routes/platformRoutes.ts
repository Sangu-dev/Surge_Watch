import { Router } from 'express';
import {
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  getSystemFreshnessOverview,
  inviteHospitalAdmin,
  toggleUserStatus,
} from '../controllers/platformController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

const ALLOWED_ADMINS = ['PLATFORM_ADMIN', 'MASTER_ADMIN'];

// Platform Governance & Verification
router.get('/requests', requireAuth, requireRole(ALLOWED_ADMINS), listAccessRequests);
router.post('/requests/:id/approve', requireAuth, requireRole(ALLOWED_ADMINS), approveAccessRequest);
router.post('/requests/:id/reject', requireAuth, requireRole(ALLOWED_ADMINS), rejectAccessRequest);
router.get('/freshness', requireAuth, requireRole(ALLOWED_ADMINS), getSystemFreshnessOverview);

// Secure Hospital Administrator Provisioning
router.post('/hospitals/:hospitalId/invite-admin', requireAuth, requireRole(ALLOWED_ADMINS), inviteHospitalAdmin);

// User Account Status Management
router.patch('/users/:id/status', requireAuth, requireRole(ALLOWED_ADMINS), toggleUserStatus);

export default router;
