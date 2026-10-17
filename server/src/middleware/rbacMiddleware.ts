import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Current role (${req.user.role}) lacks permissions for this endpoint.`,
      });
      return;
    }

    next();
  };
};

/**
 * Ensures a hospital administrator can only access and update the specific hospital
 * they are authorized to manage.
 */
export const requireHospitalOwnership = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  // Platform Admins have super-user review privileges
  if (req.user.role === 'PLATFORM_ADMIN') {
    next();
    return;
  }

  const requestedHospitalId = req.params.hospitalId || req.body.hospitalId || req.query.hospitalId;

  if (req.user.role === 'HOSPITAL_ADMIN') {
    if (!req.user.hospitalId || req.user.hospitalId !== requestedHospitalId) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: You are only authorized to manage records for your assigned hospital.',
      });
      return;
    }
  }

  next();
};
