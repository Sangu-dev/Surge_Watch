import { Router } from 'express';
import {
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  getSystemFreshnessOverview,
} from '../controllers/platformController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

router.get('/requests', requireAuth, requireRole(['PLATFORM_ADMIN']), listAccessRequests);
router.post('/requests/:id/approve', requireAuth, requireRole(['PLATFORM_ADMIN']), approveAccessRequest);
router.post('/requests/:id/reject', requireAuth, requireRole(['PLATFORM_ADMIN']), rejectAccessRequest);
router.get('/freshness', requireAuth, requireRole(['PLATFORM_ADMIN']), getSystemFreshnessOverview);

export default router;
