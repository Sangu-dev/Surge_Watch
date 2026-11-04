import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';
import { prisma } from '../prisma.js';

/**
 * Checks that the authenticated user possesses one of the allowed roles.
 * Treats MASTER_ADMIN and PLATFORM_ADMIN as equivalent super-admin roles for backward compatibility.
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication required.',
      });
      return;
    }

    const currentRole = req.user.role;

    // Check if role directly matches or aliases
    const isAllowed =
      allowedRoles.includes(currentRole) ||
      (allowedRoles.includes('MASTER_ADMIN') && currentRole === 'PLATFORM_ADMIN') ||
      (allowedRoles.includes('PLATFORM_ADMIN') && currentRole === 'MASTER_ADMIN');

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Current role (${currentRole}) lacks permissions for this endpoint.`,
      });
      return;
    }

    next();
  };
};

/**
 * Ensures a hospital administrator can only access and update the specific hospital
 * they are authorized to manage.
 * Verifies active database HospitalMembership records directly, preventing cross-hospital tampering.
 * Master / Platform Admins have super-user privileges across all facilities.
 */
export const requireHospitalOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  // Master / Platform Admins have system-wide privileges
  if (req.user.role === 'PLATFORM_ADMIN' || req.user.role === 'MASTER_ADMIN') {
    next();
    return;
  }

  // Any other role MUST be HOSPITAL_ADMIN with verified active membership
  if (req.user.role !== 'HOSPITAL_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Hospital administrative access required.',
    });
    return;
  }

  const requestedHospitalId = String(req.params.hospitalId || req.body?.hospitalId || req.query?.hospitalId || '');

  if (!requestedHospitalId) {
    res.status(400).json({ success: false, error: 'Hospital identifier is required.' });
    return;
  }

  // Direct database validation: verify active membership
  const membership = await prisma.hospitalMembership.findFirst({
    where: {
      userId: req.user.id,
      hospitalId: requestedHospitalId,
      isActive: true,
    },
  });

  if (!membership) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: You are only authorized to manage records for your assigned hospital.',
    });
    return;
  }

  next();
};
