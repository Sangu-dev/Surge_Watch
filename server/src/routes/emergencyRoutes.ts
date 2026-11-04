import { Router } from 'express';
import {
  dispatchAmbulance,
  releaseEmergencyDispatch,
  getEmergencyRequests,
  getAllAmbulances,
  getHospitalAmbulances,
  updateAmbulanceStatus,
} from '../controllers/emergencyController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

const ALLOWED_ADMINS = ['HOSPITAL_ADMIN', 'PLATFORM_ADMIN', 'MASTER_ADMIN'];

// Ambulance Fleet Discovery (Public View)
router.get('/ambulances', getAllAmbulances);
router.get('/emergency/ambulances', getAllAmbulances);
router.get('/hospitals/:hospitalId/ambulances', getHospitalAmbulances);

// Protected Fleet Management Endpoints
router.patch('/admin/ambulances/:id/status', requireAuth, requireRole(ALLOWED_ADMINS), updateAmbulanceStatus);
router.patch('/emergency/ambulances/:id/status', requireAuth, requireRole(ALLOWED_ADMINS), updateAmbulanceStatus);

// Emergency SOS Workflow Endpoints
router.post('/emergency/dispatch', dispatchAmbulance);
router.post('/emergency/:id/release', requireAuth, requireRole(ALLOWED_ADMINS), releaseEmergencyDispatch);
router.post('/emergency/release', requireAuth, requireRole(ALLOWED_ADMINS), releaseEmergencyDispatch);
router.get('/emergency/requests', requireAuth, requireRole(ALLOWED_ADMINS), getEmergencyRequests);

export default router;
