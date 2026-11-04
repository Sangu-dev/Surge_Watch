import { Request, Response } from 'express';
import { reverseGeocodeCoordinates, resolveIpLocation, resolveCoordinatesForArea } from '../services/locationService.js';

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

export const handleGeocodeArea = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string) || (req.query.query as string) || (req.query.area as string);
    if (!q || !q.trim()) {
      res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
      return;
    }

    const coords = await resolveCoordinatesForArea(q.trim());
    res.json({
      success: true,
      data: {
        query: q.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ success: false, error: 'Failed to geocode query.' });
  }
};
