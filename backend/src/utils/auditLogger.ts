import { Request } from 'express';
import { AuditLog } from '../models';

export async function logAudit(
  action: string,
  user: string,
  req: Request,
  options?: {
    oldValue?: string;
    newValue?: string;
    operator?: string;
    reason?: string;
  }
) {
  try {
    // Extract IP Address (handle proxy headers if present)
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    // Simple browser extraction
    let browser = 'Other';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edg')) browser = 'Edge';

    // Simple device extraction
    let device = 'Desktop';
    if (/Mobi|Android|iPhone/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/iPad|Tablet/i.test(userAgent)) {
      device = 'Tablet';
    }

    await AuditLog.create({
      action,
      user,
      ipAddress,
      timestamp: new Date(),
      oldValue: options?.oldValue || '',
      newValue: options?.newValue || '',
      operator: options?.operator || 'Admin',
      browser,
      device,
      ip: ipAddress,
      reason: options?.reason || ''
    });

    console.log(`[AUDIT LOGGED] Action: "${action}" | User: ${user} | IP: ${ipAddress}`);
  } catch (err) {
    console.error('[AUDIT LOGGER ERROR] Failed to record audit trail:', err);
  }
}
