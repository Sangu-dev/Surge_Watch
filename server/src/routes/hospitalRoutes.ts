import { Router } from 'express';
import { searchHospitals, getNearbyHospitals, getHospitalById } from '../controllers/hospitalController.js';
import { getHospitalAmbulances } from '../controllers/emergencyController.js';

const router = Router();

router.get('/', searchHospitals);
router.get('/nearby', getNearbyHospitals);
router.get('/search', searchHospitals);
router.get('/:id', getHospitalById);
router.get('/:hospitalId/ambulances', getHospitalAmbulances);

export default router;
