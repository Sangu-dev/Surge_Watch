import net from 'net';
import tls from 'tls';

/**
 * SurgeWatch Production Email Service
 * 
 * Required Environment Variables for Production SMTP Delivery:
 * - SMTP_HOST: Hostname of SMTP server (e.g. smtp.sendgrid.net, email-smtp.ap-south-1.amazonaws.com)
 * - SMTP_PORT: Port number (587 for STARTTLS, 465 for SSL/TLS, 25 for plain)
 * - SMTP_USER: SMTP authentication username or API key
 * - SMTP_PASS: SMTP authentication password or secret key
 * - SMTP_FROM: Verified sender email address (e.g. no-reply@surgewatch.in)
 * 
 * Optional:
 * - SMTP_SECURE: Set to 'true' if connecting directly to port 465 via SSL/TLS
 * - APP_URL: Base URL of frontend for link generation (defaults to CLIENT_URL or http://localhost:5173)
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailResult {
  success: boolean;
  error?: string;
  simulated?: boolean;
}

/**
 * Returns list of exact environment variables required for production email dispatch
 */
export const REQUIRED_SMTP_ENV_VARS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
] as const;

/**
 * Verifies whether all required SMTP configuration variables are present
 */
export const isSmtpConfigured = (): boolean => {
  return REQUIRED_SMTP_ENV_VARS.every((v) => Boolean(process.env[v] && process.env[v]?.trim()));
};

/**
 * Low-level SMTP client using Node built-in net/tls
 */
const sendViaSmtpSocket = (options: EmailOptions): Promise<EmailResult> => {
  return new Promise((resolve) => {
    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    const from = process.env.SMTP_FROM!;
    const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

    let socket: net.Socket | tls.TLSSocket;
    let step = 0;
    let buffer = '';

    const cleanup = () => {
      try {
        if (!socket.destroyed) socket.destroy();
      } catch {}
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ success: false, error: 'SMTP connection timed out (15s).' });
    }, 15000);

    const onData = (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || ''; // keep incomplete line

      for (const line of lines) {
        if (!line.length) continue;
        const code = parseInt(line.substring(0, 3), 10);
        // Multiline response indicator: 4th char is '-'
        if (line[3] === '-') continue;

        switch (step) {
          case 0: // Greeting (220)
            if (code === 220) {
              step = 1;
              socket.write(`EHLO ${host}\r\n`);
            } else {
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: false, error: `SMTP Greeting failed: ${line}` });
            }
            break;

          case 1: // EHLO response (250)
            step = 2;
            socket.write('AUTH LOGIN\r\n');
            break;

          case 2: // AUTH LOGIN prompt for username (334)
            if (code === 334) {
              step = 3;
              socket.write(`${Buffer.from(user).toString('base64')}\r\n`);
            } else {
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: false, error: 'SMTP AUTH LOGIN rejected.' });
            }
            break;

          case 3: // Password prompt (334)
            if (code === 334) {
              step = 4;
              socket.write(`${Buffer.from(pass).toString('base64')}\r\n`);
            } else {
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: false, error: 'SMTP Username rejected.' });
            }
            break;

          case 4: // Auth success (235)
            if (code === 235) {
              step = 5;
              socket.write(`MAIL FROM:<${from}>\r\n`);
            } else {
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: false, error: 'SMTP Authentication failed: invalid credentials.' });
            }
            break;

          case 5: // MAIL FROM ok (250)
            if (code === 250) {
              step = 6;
              socket.write(`RCPT TO:<${options.to}>\r\n`);
            } else {
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: false, error: `SMTP MAIL FROM rejected: ${line}` });
            }
            break;

          case 6: // RCPT TO ok (250)
            if (code === 250) {
              step = 7;
              socket.write('DATA\r\n');
            } else {
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: false, error: `SMTP RCPT TO rejected for ${options.to}: ${line}` });
            }
            break;

          case 7: // DATA prompt (354)
            if (code === 354) {
              step = 8;
              const boundary = `----=_Part_${Date.now()}`;
              const message = [
                `From: ${from}`,
                `To: ${options.to}`,
                `Subject: ${options.subject}`,
                'MIME-Version: 1.0',
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset=utf-8',
                '',
                options.text,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=utf-8',
                '',
                options.html,
                '',
                `--${boundary}--`,
                '',
                '.\r\n',
              ].join('\r\n');
              socket.write(message);
            } else {
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: false, error: 'SMTP DATA command rejected.' });
            }
            break;

          case 8: // Message sent (250)
            if (code === 250) {
              step = 9;
              socket.write('QUIT\r\n');
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: true });
            } else {
              cleanup();
              clearTimeout(timeout);
              return resolve({ success: false, error: `SMTP Message delivery failed: ${line}` });
            }
            break;
        }
      }
    };

    const onError = (err: Error) => {
      cleanup();
      clearTimeout(timeout);
      resolve({ success: false, error: `SMTP socket error: ${err.message}` });
    };

    if (isSecure) {
      socket = tls.connect({ host, port, rejectUnauthorized: true }, () => {});
    } else {
      socket = net.connect({ host, port }, () => {});
    }

    socket.on('data', onData);
    socket.on('error', onError);
  });
};

/**
 * Universal email dispatcher
 */
export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isSmtpConfigured()) {
    if (isProduction) {
      // In production, log warning WITHOUT printing tokens or sensitive payloads
      console.warn(`[EmailService] Cannot dispatch email to ${options.to}: SMTP credentials are not configured.`);
      return {
        success: false,
        error: 'SMTP service is not configured. Email delivery unavailable in production.',
      };
    } else {
      // Development/test fallback simulation
      return {
        success: true,
        simulated: true,
      };
    }
  }

  // Real SMTP delivery
  try {
    return await sendViaSmtpSocket(options);
  } catch (err: any) {
    console.error('[EmailService] SMTP delivery exception:', isProduction ? err.message : err);
    return {
      success: false,
      error: 'SMTP communication error during message transmission.',
    };
  }
};

/**
 * Specialized helper: Password Reset Email
 */
export const sendPasswordResetEmail = async (params: {
  to: string;
  fullName: string;
  resetToken: string;
  resetUrl: string;
}): Promise<EmailResult> => {
  const subject = 'SurgeWatch – Password Reset Instructions';
  const text = `Hello ${params.fullName},\n\nA password reset was requested for your SurgeWatch account. Click or copy the following link to reset your password (valid for 1 hour):\n\n${params.resetUrl}\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a;">SurgeWatch Emergency Care Platform</h2>
      <p>Hello <strong>${params.fullName}</strong>,</p>
      <p>A request was received to reset the password for your account.</p>
      <div style="margin: 24px 0;">
        <a href="${params.resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">This link will expire in 1 hour. If you did not initiate this request, no action is required.</p>
    </div>
  `;

  return sendEmail({ to: params.to, subject, text, html });
};

/**
 * Specialized helper: Hospital Administrator Invitation Email
 */
export const sendHospitalInvitationEmail = async (params: {
  to: string;
  fullName: string;
  hospitalName: string;
  invitationToken: string;
  inviteUrl: string;
}): Promise<EmailResult> => {
  const subject = `SurgeWatch – Institutional Invitation: ${params.hospitalName}`;
  const text = `Hello ${params.fullName},\n\nYou have been provisioned as an institutional administrator for ${params.hospitalName} on SurgeWatch.\n\nPlease activate your account and set your secure password within 7 days using the link below:\n\n${params.inviteUrl}\n\nWelcome to SurgeWatch.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a;">SurgeWatch Emergency Care Network</h2>
      <p>Hello <strong>${params.fullName}</strong>,</p>
      <p>You have been designated as a verified institutional administrator for <strong>${params.hospitalName}</strong>.</p>
      <p>Please activate your credentials and initialize your password to begin reporting capacity and managing casualty readiness:</p>
      <div style="margin: 24px 0;">
        <a href="${params.inviteUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activate Administrator Account</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">This invitation token remains valid for 7 days. If you were invited in error, contact state emergency operations.</p>
    </div>
  `;

  return sendEmail({ to: params.to, subject, text, html });
};

