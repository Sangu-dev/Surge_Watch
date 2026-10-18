import { Router } from 'express';
import {
  dispatchAmbulance,
  releaseEmergencyDispatch,
  getEmergencyRequests,
  getAllAmbulances,
  getHospitalAmbulances,
  updateAmbulanceStatus,
} from '../controllers/emergencyController.js';

const router = Router();

// Ambulance Fleet Endpoints
router.get('/ambulances', getAllAmbulances);
router.get('/emergency/ambulances', getAllAmbulances);
router.get('/hospitals/:hospitalId/ambulances', getHospitalAmbulances);
router.patch('/admin/ambulances/:id/status', updateAmbulanceStatus);
router.patch('/emergency/ambulances/:id/status', updateAmbulanceStatus);

// Emergency SOS Workflow Endpoints
router.post('/emergency/dispatch', dispatchAmbulance);
router.post('/emergency/:id/release', releaseEmergencyDispatch);
router.post('/emergency/release', releaseEmergencyDispatch);
router.get('/emergency/requests', getEmergencyRequests);

export default router;
