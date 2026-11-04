import { Router } from 'express';
import { handleReverseGeocode, handleIpLookup, handleGeocodeArea } from '../controllers/locationController.js';

const router = Router();

router.get('/geocode', handleGeocodeArea);
router.get('/reverse-geocode', handleReverseGeocode);
router.get('/ip-lookup', handleIpLookup);

export default router;
