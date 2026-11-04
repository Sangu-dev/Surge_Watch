import { Request, Response, NextFunction } from 'express';

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

export const getTrustedOrigins = (): string[] => {
  const configuredProdOrigins = [
    process.env.CLIENT_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
  ].filter(Boolean) as string[];

  if (process.env.NODE_ENV === 'production') {
    return configuredProdOrigins;
  }
  return [...devOrigins, ...configuredProdOrigins];
};

/**
 * Validates origin against allowed origins list
 */
export const isTrustedOrigin = (origin: string): boolean => {
  const allowed = getTrustedOrigins();
  if (allowed.includes(origin)) return true;
  // In development/test, allow localhost origins on any port
  if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    return true;
  }
  return false;
};

/**
 * CSRF Defense Middleware for cookie-authenticated and state-changing endpoints
 * 
 * Verifies that:
 * 1. Sec-Fetch-Site is not 'cross-site'
 * 2. If an Origin header is provided, it must belong to explicitly trusted origins
 * 3. If a Referer header is provided, its origin must belong to explicitly trusted origins
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Safe HTTP read methods are exempt from CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const secFetchSite = req.headers['sec-fetch-site'];

  // Check 1: Explicit cross-site fetch indicator from modern browsers
  if (secFetchSite === 'cross-site') {
    res.status(403).json({
      success: false,
      error: 'Cross-Site Request Forgery (CSRF) blocked: Browser Sec-Fetch-Site indicates an untrusted cross-site request.',
    });
    return;
  }

  // Check 2: Origin header validation
  if (origin) {
    if (!isTrustedOrigin(origin)) {
      res.status(403).json({
        success: false,
        error: `Cross-Site Request Forgery (CSRF) blocked: Origin '${origin}' is not an authorized origin.`,
      });
      return;
    }
    return next();
  }

  // Check 3: Referer header fallback validation
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!isTrustedOrigin(refererOrigin)) {
        res.status(403).json({
          success: false,
          error: `Cross-Site Request Forgery (CSRF) blocked: Referer origin '${refererOrigin}' is not authorized.`,
        });
        return;
      }
      return next();
    } catch {
      res.status(403).json({
        success: false,
        error: 'Cross-Site Request Forgery (CSRF) blocked: Malformed Referer header.',
      });
      return;
    }
  }

  // If request has no Origin/Referer (e.g. CLI tools, automated integration tests, mobile clients):
  // Proceed safely
  next();
};

