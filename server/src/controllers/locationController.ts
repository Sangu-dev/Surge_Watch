import { Request, Response } from 'express';
import { reverseGeocodeCoordinates, resolveIpLocation } from '../services/locationService.js';

export const handleReverseGeocode = async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string || req.query.lon as string);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: 'Valid latitude and longitude coordinates are required.' });
      return;
    }

    const location = await reverseGeocodeCoordinates(lat, lng);
    res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ success: false, error: 'Failed to reverse geocode coordinates.' });
  }
};

export const handleIpLookup = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;
    const location = await resolveIpLocation(clientIp);
    res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('IP lookup error:', error);
    res.status(500).json({ success: false, error: 'Failed to lookup approximate IP location.' });
  }
};
