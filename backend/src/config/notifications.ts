// Notification Interface Templates Mappings
export interface WelcomeTemplateData {
  gymName: string;
  memberName: string;
  planName: string;
  amountPaid: number;
  startDate: string;
  expiryDate: string;
}

export interface ExpiryTemplateData {
  gymName: string;
  memberName: string;
  daysRemaining: number;
  expiryDate: string;
}

export interface INotificationProvider {
  sendWelcomeMessage(to: string, data: WelcomeTemplateData): Promise<{ success: boolean; url?: string; rawMessage: string }>;
  sendExpiryWarning(to: string, data: ExpiryTemplateData): Promise<{ success: boolean; url?: string; rawMessage: string }>;
  sendPostExpiryNotice(to: string, data: ExpiryTemplateData): Promise<{ success: boolean; url?: string; rawMessage: string }>;
}

// ----------------------------------------------------
// 1. WHATSAPP CLICK-TO-CHAT PROVIDER (CURRENT IMPLEMENTATION)
// ----------------------------------------------------
export class WhatsAppClickToChatProvider implements INotificationProvider {
  private formatPhone(phone: string): string {
    // Add default Indian country code +91 if missing
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10) {
      return `91${clean}`;
    }
    return clean;
  }

  private buildUrl(phone: string, text: string): string {
    return `https://wa.me/${this.formatPhone(phone)}?text=${encodeURIComponent(text)}`;
  }

  async sendWelcomeMessage(to: string, data: WelcomeTemplateData) {
    const rawMessage = `Welcome to ${data.gymName}.\nYour membership has been activated.\n\nPlan: ${data.planName}\nAmount Paid: ₹${data.amountPaid}\nStart Date: ${data.startDate}\nExpiry Date: ${data.expiryDate}`;
    return {
      success: true,
      url: this.buildUrl(to, rawMessage),
      rawMessage
    };
  }

  async sendExpiryWarning(to: string, data: ExpiryTemplateData) {
    const rawMessage = `Hi ${data.memberName}, this is a friendly reminder from ${data.gymName}. Your gym membership is expiring in ${data.daysRemaining} days (on ${data.expiryDate}). Please renew at the reception to continue training!`;
    return {
      success: true,
      url: this.buildUrl(to, rawMessage),
      rawMessage
    };
  }

  async sendPostExpiryNotice(to: string, data: ExpiryTemplateData) {
    const rawMessage = `Dear ${data.memberName}, your gym membership at ${data.gymName} expired on ${data.expiryDate}. Please contact the gym desk to renew your package. Thank you!`;
    return {
      success: true,
      url: this.buildUrl(to, rawMessage),
      rawMessage
    };
  }
}

// ----------------------------------------------------
// FUTURE PROVIDER PLACEHOLDERS (e.g. WATI, Twilio, Gupshup)
// ----------------------------------------------------
/*
export class WatiProvider implements INotificationProvider {
  async sendWelcomeMessage(to: string, data: WelcomeTemplateData) {
    // Call WATI API endpoint
    return { success: true, rawMessage: 'Sent via WATI' };
  }
  ...
}
*/

// Export active notification provider mapping
export const notificationProvider: INotificationProvider = new WhatsAppClickToChatProvider();
