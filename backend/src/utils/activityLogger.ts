import { MemberActivity, Notification } from '../models';

export async function logMemberActivity(
  gymOwnerId: any,
  memberId: any,
  activityType: 'registration' | 'payment_initial' | 'payment_partial' | 'payment_due_collection' | 'plan_renewal' | 'plan_upgrade' | 'plan_downgrade' | 'refund' | 'correction' | 'void' | 'workout_updated' | 'diet_updated' | 'check_in' | 'check_out',
  title: string,
  operator: string,
  remarks: string,
  extra?: {
    receiptNumber?: string;
    transactionId?: any;
    oldAmount?: number;
    newAmount?: number;
    remainingDue?: number;
    paymentMethod?: string;
    originalPrice?: number;
    discount?: number;
    finalPayable?: number;
    previousOutstanding?: number;
    currentOutstanding?: number;
    totalOutstanding?: number;
  }
) {
  try {
    const now = new Date();
    await MemberActivity.create({
      gymOwnerId,
      memberId,
      activityType,
      title,
      date: now,
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      operator: operator || 'Admin',
      remarks: remarks || '',
      ...extra
    });
    console.log(`[ACTIVITY LOGGED] Member ID: ${memberId} | Action: ${activityType}`);
  } catch (err) {
    console.error('[ACTIVITY LOGGER ERROR] Failed to log member activity:', err);
  }
}

export async function createNotification(
  gymOwnerId: any,
  title: string,
  message: string,
  category: 'registration' | 'payment' | 'due_collection' | 'attendance' | 'renewal' | 'trial' | 'suspension' | 'expiry'
) {
  try {
    await Notification.create({
      gymOwnerId,
      title,
      message,
      category,
      isRead: false,
      isDismissed: false
    });
    console.log(`[NOTIFICATION CREATED] Category: ${category} | Title: ${title}`);
  } catch (err) {
    console.error('[NOTIFICATION UTILITY ERROR] Failed to create notification:', err);
  }
}
