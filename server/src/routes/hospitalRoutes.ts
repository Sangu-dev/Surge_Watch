import { Router } from 'express';
import { searchHospitals, getNearbyHospitals, getHospitalById } from '../controllers/hospitalController.js';

const router = Router();

router.get('/nearby', getNearbyHospitals);
router.get('/search', searchHospitals);
router.get('/:id', getHospitalById);

export default router;
