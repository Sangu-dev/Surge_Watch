import { Request, Response, CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  signAccessToken,
  generateRandomToken,
  hashToken,
  TokenUserPayload,
} from '../utils/token.js';
import { getIO } from '../socket.js';
import { resolveCoordinatesForArea } from '../services/locationService.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

// Centralized cookie configuration options
export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
};

export const getClearRefreshTokenCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
  };
};

const PatientRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must have at least 2 characters').max(100),
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Password reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

const HospitalAccessSchema = z.object({
  hospitalName: z.string().min(3, 'Hospital name is required (minimum 3 characters)'),
  hospitalAddress: z.string().min(5, 'Hospital address is required (minimum 5 characters)'),
  area: z.string().min(2, 'Area is required'),
  officialEmail: z.string().email('Valid official institutional email is required').toLowerCase().trim(),
  emergencyPhone: z.string().min(6, 'Emergency triage phone is required'),
  regNumber: z.string().min(4, 'KPME Registration number is required'),
  applicantName: z.string().min(2, 'Applicant name is required'),
  applicantDesignation: z.string().min(2, 'Official designation is required'),
  latitude: z.number().or(z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)).optional(),
  longitude: z.number().or(z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)).optional(),
});

/**
 * Creates and persists a new refresh token family for a user session
 */
async function createSessionFamily(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ rawToken: string; family: string }> {
  const rawToken = generateRandomToken(48);
  const tokenHash = hashToken(rawToken);
  const family = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      family,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return { rawToken, family };
}

/**
 * 1. Patient Registration
 */
export const registerPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = PatientRegisterSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0].message });
      return;
    }

    const { fullName, email, password, phone } = parse.data;

    // Check if account already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }

    // Secure password hashing with 12 salt rounds
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: 'PATIENT', // Role is strictly enforced by server
        phone,
        isActive: true,
      },
    });

    // Create session family & tokens
    const { rawToken } = await createSessionFamily(newUser.id, req.ip, req.headers['user-agent']);

    const userPayload: TokenUserPayload = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
    };

    const accessToken = signAccessToken(userPayload, '7d');

    // Set Secure, HttpOnly, SameSite refresh token cookie
    res.cookie('refreshToken', rawToken, getRefreshTokenCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Patient account created successfully.',
      token: accessToken,
      accessToken,
      ...(process.env.NODE_ENV !== 'production' && { refreshToken: rawToken }),
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.fullName,
        phone: newUser.phone,
      },
    });
  } catch (error) {
    console.error('[Patient Register Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to create patient account.' });
  }
};

/**
 * 2. Patient Login
 */
export const loginPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = LoginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0].message });
      return;
    }

    const { email, password } = parse.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'This account has been deactivated. Please contact support.',
      });
      return;
    }

    // Strict bcrypt verification (NO demo or backdoor passwords)
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const { rawToken } = await createSessionFamily(user.id, req.ip, req.headers['user-agent']);

    const userPayload: TokenUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = signAccessToken(userPayload, '7d');

    // Set Secure, HttpOnly, SameSite refresh token cookie
    res.cookie('refreshToken', rawToken, getRefreshTokenCookieOptions());

    res.json({
      success: true,
      message: 'Sign in successful.',
      token: accessToken,
      accessToken,
      ...(process.env.NODE_ENV !== 'production' && { refreshToken: rawToken }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('[Patient Login Error]:', error);
    res.status(500).json({ success: false, error: 'Authentication failed.' });
  }
};

/**
 * 3. Administrator Login (Hospital & Master/Platform Administrators)
 */
export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = LoginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0].message });
      return;
    }

    const { email, password } = parse.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { isActive: true },
          include: { hospital: true },
        },
      },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid administrator email or password.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'This administrative account has been deactivated. Please contact platform operations.',
      });
      return;
    }

    // Enforce administrative role hierarchy
    const isAdminRole =
      user.role === 'HOSPITAL_ADMIN' ||
      user.role === 'PLATFORM_ADMIN' ||
      user.role === 'MASTER_ADMIN';

    if (!isAdminRole) {
      res.status(403).json({
        success: false,
        error: 'Access restricted: Please use the patient sign-in portal for patient accounts.',
      });
      return;
    }

    // Strict password check (No demo parameters or bypasses permitted)
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid administrator email or password.' });
      return;
    }

    let hospitalId: string | undefined;
    let hospitalName: string | undefined;

    if (user.role === 'HOSPITAL_ADMIN') {
      const activeMembership = user.memberships?.[0];
      if (!activeMembership || !activeMembership.hospitalId) {
        res.status(403).json({
          success: false,
          error: 'This administrator account is not assigned to any hospital facility.',
        });
        return;
      }
      hospitalId = activeMembership.hospitalId;
      hospitalName = activeMembership.hospital?.name;
    }

    const { rawToken } = await createSessionFamily(user.id, req.ip, req.headers['user-agent']);

    const userPayload: TokenUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      hospitalId,
      hospitalName,
    };

    const accessToken = signAccessToken(userPayload, '24h');

    // Set Secure, HttpOnly, SameSite refresh token cookie
    res.cookie('refreshToken', rawToken, getRefreshTokenCookieOptions());

    res.json({
      success: true,
      message: 'Administrator authentication successful.',
      token: accessToken,
      accessToken,
      ...(process.env.NODE_ENV !== 'production' && { refreshToken: rawToken }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        hospitalId,
        hospitalName,
      },
    });
  } catch (error) {
    console.error('[Admin Login Error]:', error);
    res.status(500).json({ success: false, error: 'Administrator authentication failed.' });
  }
};

/**
 * 4. Refresh Token Rotation with Session-Family Tracking & Reuse Detection
 */
export const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Strictly accept refresh tokens exclusively from the HttpOnly cookie
    const rawToken = (req as any).cookies?.refreshToken;
    if (!rawToken || typeof rawToken !== 'string') {
      res.status(401).json({
        success: false,
        error: 'Refresh token cookie is missing or invalid. Please sign in.',
      });
      return;
    }

    const incomingHash = hashToken(rawToken);

    // Atomic transaction for rotation and reuse detection
    const result = await prisma.$transaction(async (tx) => {
      const existingToken = await tx.refreshToken.findUnique({
        where: { tokenHash: incomingHash },
        include: {
          user: {
            include: {
              memberships: {
                where: { isActive: true },
                include: { hospital: true },
              },
            },
          },
        },
      });

      if (!existingToken) {
        return { status: 401, error: 'Invalid refresh token.' };
      }

      // Check if token was already revoked or rotated (REUSE DETECTION)
      if (existingToken.revokedAt !== null || existingToken.replacedByTokenHash !== null) {
        // Invalidate the entire family chain immediately to mitigate token theft
        await tx.refreshToken.updateMany({
          where: { family: existingToken.family },
          data: {
            revokedAt: new Date(),
            revocationReason: 'REUSE_DETECTED',
          },
        });

        return {
          status: 401,
          error: 'Security alert: Refresh token reuse detected. All sessions in this chain have been revoked. Please sign in again.',
        };
      }

      // Check expiration
      if (existingToken.expiresAt < new Date()) {
        await tx.refreshToken.update({
          where: { id: existingToken.id },
          data: {
            revokedAt: new Date(),
            revocationReason: 'EXPIRED',
          },
        });
        return { status: 401, error: 'Refresh token has expired. Please sign in again.' };
      }

      // Verify user active state
      if (!existingToken.user || !existingToken.user.isActive) {
        return { status: 403, error: 'User account is deactivated or no longer exists.' };
      }

      // Generate replacement refresh token within the SAME session family
      const newRawToken = generateRandomToken(48);
      const newHash = hashToken(newRawToken);
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Invalidate current token and link successor hash
      await tx.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          revokedAt: new Date(),
          revocationReason: 'ROTATED',
          replacedByTokenHash: newHash,
        },
      });

      // Insert new token into same family
      await tx.refreshToken.create({
        data: {
          userId: existingToken.userId,
          tokenHash: newHash,
          family: existingToken.family,
          expiresAt: newExpiresAt,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      const user = existingToken.user;
      const hospitalId = user.memberships?.[0]?.hospitalId;
      const hospitalName = user.memberships?.[0]?.hospital?.name;

      const userPayload: TokenUserPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        hospitalId,
        hospitalName,
      };

      const newAccessToken = signAccessToken(
        userPayload,
        user.role === 'PATIENT' ? '7d' : '24h'
      );

      return {
        status: 200,
        accessToken: newAccessToken,
        refreshToken: newRawToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          hospitalId,
          hospitalName,
        },
      };
    });

    if (result.status !== 200) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    // Set rotated refresh token in Secure, HttpOnly cookie
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions());
    }

    res.json({
      success: true,
      token: result.accessToken,
      accessToken: result.accessToken,
      ...(process.env.NODE_ENV !== 'production' && { refreshToken: result.refreshToken }),
      user: result.user,
    });
  } catch (error) {
    console.error('[Refresh Token Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh token.' });
  }
};

/**
 * 5. Logout & Session Revocation
 */
export const logoutHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Strictly read token from HttpOnly cookie
    const rawToken = (req as any).cookies?.refreshToken;
    if (rawToken && typeof rawToken === 'string') {
      const incomingHash = hashToken(rawToken);
      const token = await prisma.refreshToken.findUnique({
        where: { tokenHash: incomingHash },
      });

      if (token) {
        // Revoke the entire family
        await prisma.refreshToken.updateMany({
          where: { family: token.family },
          data: {
            revokedAt: new Date(),
            revocationReason: 'USER_LOGOUT',
          },
        });
      }
    }

    // Always clear the HttpOnly refresh token cookie on logout with matching options
    res.clearCookie('refreshToken', getClearRefreshTokenCookieOptions());

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('[Logout Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to complete logout.' });
  }
};

/**
 * 6. Forgot Password (Generates one-time crypto reset token with 1-hour expiration)
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = ForgotPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0].message });
      return;
    }

    const { email } = parse.data;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Uniform response to prevent email enumeration
    const genericSuccessMsg =
      'If an account with that email exists, password reset instructions have been dispatched.';

    if (!user || !user.isActive) {
      res.json({ success: true, message: genericSuccessMsg });
      return;
    }

    // Invalidate previous unredeemed PASSWORD_RESET tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, purpose: 'PASSWORD_RESET', usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate new 32-byte crypto token
    const rawResetToken = generateRandomToken(32);
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        purpose: 'PASSWORD_RESET',
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const clientBaseUrl = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const resetUrl = `${clientBaseUrl}/admin/auth?token=${rawResetToken}&mode=reset`;

    // Attempt email dispatch (never throws; does not leak account existence)
    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetToken: rawResetToken,
      resetUrl,
    });

    const responsePayload: any = {
      success: true,
      message: genericSuccessMsg,
    };

    // In production, never leak raw tokens in API responses or logs
    if (!isProduction) {
      responsePayload.resetToken = rawResetToken;
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to process password reset request.' });
  }
};

/**
 * 7. Reset Password (Redeems one-time PASSWORD_RESET token and updates passwordHash)
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = ResetPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0].message });
      return;
    }

    const { token: rawToken, newPassword } = parse.data;
    const tokenHash = hashToken(rawToken);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt !== null) {
      res.status(400).json({
        success: false,
        error: 'Invalid or already used password reset token.',
      });
      return;
    }

    if (resetRecord.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        error: 'Password reset token has expired. Please request a new one.',
      });
      return;
    }

    // Token-purpose enforcement: strictly require PASSWORD_RESET
    if (resetRecord.purpose !== 'PASSWORD_RESET') {
      res.status(400).json({
        success: false,
        error: 'Invalid token purpose: this token cannot be used for password reset.',
      });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    // Atomically update password, mark token redeemed, and revoke all active refresh tokens
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Revoke all existing sessions for this user on password reset
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revocationReason: 'PASSWORD_RESET',
        },
      });
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
};

/**
 * 8. Hospital Administrator Account Activation (Redeems HOSPITAL_INVITATION token)
 */
export const activateHospitalAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = ResetPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0].message });
      return;
    }

    const { token: rawToken, newPassword } = parse.data;
    const tokenHash = hashToken(rawToken);

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt !== null) {
      res.status(400).json({
        success: false,
        error: 'Invalid or already used activation token.',
      });
      return;
    }

    if (tokenRecord.expiresAt < new Date()) {
      res.status(400).json({
        success: false,
        error: 'Activation token has expired. Please contact platform operations.',
      });
      return;
    }

    // Token-purpose enforcement: strictly require HOSPITAL_INVITATION
    if (tokenRecord.purpose !== 'HOSPITAL_INVITATION') {
      res.status(400).json({
        success: false,
        error: 'Invalid token purpose: this token cannot be used for hospital activation.',
      });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash: newHash, isActive: true },
      });

      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      // Revoke any previous sessions
      await tx.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: 'ACCOUNT_ACTIVATED' },
      });
    });

    res.json({
      success: true,
      message: 'Hospital administrator account successfully activated. You can now sign in.',
    });
  } catch (error) {
    console.error('[Activate Admin Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to activate hospital administrator.' });
  }
};

/**
 * 8. Authenticated Profile & Session Validation
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        memberships: {
          where: { isActive: true },
          include: { hospital: true },
        },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User account has been deactivated or no longer exists.',
      });
      return;
    }

    const activeMembership = user.memberships?.[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        hospitalId: activeMembership?.hospitalId,
        hospitalName: activeMembership?.hospital?.name,
      },
    });
  } catch (error) {
    console.error('[GetMe Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile.' });
  }
};

/**
 * 9. Institutional KPME Hospital Access Request
 */
export const requestHospitalAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = HospitalAccessSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0].message });
      return;
    }

    const {
      hospitalName,
      hospitalAddress,
      area,
      officialEmail,
      emergencyPhone,
      regNumber,
      applicantName,
      applicantDesignation,
      latitude: inputLat,
      longitude: inputLng,
    } = parse.data;

    let resolvedCoords = { latitude: 12.9716, longitude: 77.5946 };
    if (inputLat !== undefined && inputLng !== undefined && !isNaN(inputLat) && !isNaN(inputLng)) {
      resolvedCoords = { latitude: inputLat, longitude: inputLng };
    } else {
      resolvedCoords = await resolveCoordinatesForArea(area, hospitalAddress);
    }

    let user = await prisma.user.findUnique({
      where: { email: officialEmail },
    });

    if (!user) {
      // Secure random placeholder hash; applicant sets their real password on approval/invite
      const randomPassword = generateRandomToken(16);
      const defaultHash = await bcrypt.hash(randomPassword, 12);
      user = await prisma.user.create({
        data: {
          email: officialEmail,
          passwordHash: defaultHash,
          fullName: applicantName,
          role: 'HOSPITAL_ADMIN',
          phone: emergencyPhone,
          isActive: true,
        },
      });
    }

    const slugBase = hospitalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let hospital = await prisma.hospital.findFirst({
      where: {
        OR: [
          { slug: slugBase },
          { officialEmail },
        ],
      },
    });

    if (!hospital) {
      hospital = await prisma.hospital.create({
        data: {
          name: hospitalName,
          slug: `${slugBase}-${Date.now().toString(36)}`,
          address: hospitalAddress,
          area,
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
          latitude: resolvedCoords.latitude,
          longitude: resolvedCoords.longitude,
          emergencyContactPhone: emergencyPhone,
          officialEmail,
          emergencyServices: JSON.stringify(['24/7 Emergency Casualty', 'Trauma Resuscitation Bays', 'Critical Care ICU']),
          verificationStatus: 'PENDING',
          operatingStatus: 'OPERATIONAL',
          dataProvenance: 'MANUAL',
        },
      });
    }

    const application = await prisma.hospitalAccessRequest.create({
      data: {
        userId: user.id,
        hospitalId: hospital.id,
        hospitalName,
        hospitalAddress,
        area,
        pincode: '560001',
        contactPhone: emergencyPhone,
        officialEmail,
        hospitalRegNumber: regNumber,
        status: 'PENDING',
        reviewNotes: `Applicant: ${applicantName} (${applicantDesignation})`,
      },
      include: {
        user: { select: { fullName: true, email: true } },
        hospital: true,
      },
    });

    try {
      const io = getIO();
      if (io) {
        io.emit('new_hospital_registration', {
          id: application.id,
          hospitalName: application.hospitalName,
          hospitalAddress: application.hospitalAddress,
          area: application.area,
          contactPhone: application.contactPhone,
          officialEmail: application.officialEmail,
          hospitalRegNumber: application.hospitalRegNumber,
          applicantName,
          applicantDesignation,
          status: application.status,
          submittedAt: application.createdAt,
        });
      }
    } catch (socketErr) {
      console.warn('[Socket.IO] Failed to emit new_hospital_registration:', socketErr);
    }

    res.status(201).json({
      success: true,
      message: 'Hospital registration successfully submitted and queued for Platform Admin verification.',
      applicationId: application.id,
      data: application,
    });
  } catch (error) {
    console.error('[Request Hospital Access Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to process hospital access request.' });
  }
};
