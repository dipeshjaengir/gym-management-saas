import { Request } from 'express';
import { AuditLog } from '../models';

export async function logAudit(action: string, user: string, req: Request) {
  try {
    // Extract IP Address (handle proxy headers if present)
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    await AuditLog.create({
      action,
      user,
      ipAddress,
      timestamp: new Date()
    });

    console.log(`[AUDIT LOGGED] Action: "${action}" | User: ${user} | IP: ${ipAddress}`);
  } catch (err) {
    console.error('[AUDIT LOGGER ERROR] Failed to record audit trail:', err);
  }
}
