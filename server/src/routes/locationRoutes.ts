import { Router } from 'express';
import { handleReverseGeocode, handleIpLookup } from '../controllers/locationController.js';

const router = Router();

router.get('/reverse-geocode', handleReverseGeocode);
router.get('/ip-lookup', handleIpLookup);

export default router;
