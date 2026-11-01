import { Router } from 'express';
import {
  searchHospitals,
  getNearbyHospitals,
  getHospitalById,
  getApprovedLocations
} from '../controllers/hospitalController.js';
import { getHospitalAmbulances } from '../controllers/emergencyController.js';

const router = Router();

router.get('/approved-locations', getApprovedLocations);
router.get('/locations', getApprovedLocations);
router.get('/', searchHospitals);
router.get('/nearby', getNearbyHospitals);
router.get('/search', searchHospitals);
router.get('/:id', getHospitalById);
router.get('/:hospitalId/ambulances', getHospitalAmbulances);

export default router;
