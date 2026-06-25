// Notification Interface Templates Mappings
export interface WelcomeTemplateData {
  gymName: string;
  memberName: string;
  planName: string;
  totalAmount: number;
  amountPaid: number;
  remainingDue: number;
  startDate: string;
  expiryDate: string;
}


export interface ExpiryTemplateData {
  gymName: string;
  memberName: string;
  daysRemaining: number;
  expiryDate: string;
}

export interface RenewalTemplateData {
  memberName: string;
  planName: string;
  expiryDate: string;
}

export interface DueCollectionTemplateData {
  memberName: string;
  amount: number;
  remaining: number;
}

export interface INotificationProvider {
  sendWelcomeMessage(to: string, data: WelcomeTemplateData): Promise<{ success: boolean; url?: string; rawMessage: string }>;
  sendExpiryWarning(to: string, data: ExpiryTemplateData): Promise<{ success: boolean; url?: string; rawMessage: string }>;
  sendPostExpiryNotice(to: string, data: ExpiryTemplateData): Promise<{ success: boolean; url?: string; rawMessage: string }>;
  sendRenewalMessage(to: string, data: RenewalTemplateData): Promise<{ success: boolean; url?: string; rawMessage: string }>;
  sendDueCollectionMessage(to: string, data: DueCollectionTemplateData): Promise<{ success: boolean; url?: string; rawMessage: string }>;
}

// ----------------------------------------------------
// 1. WHATSAPP CLICK-TO-CHAT PROVIDER
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
    const formatDate = (dateStr: string) => {
      if (!dateStr || !dateStr.includes('-')) return dateStr;
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    };
    const formattedExpiry = formatDate(data.expiryDate);

    let rawMessage = `Hello ${data.memberName}\n\nWelcome to ${data.gymName}\n\nMembership Plan:\n${data.planName}\n\nTotal Plan Amount:\n₹${data.totalAmount}\n\nAmount Paid:\n₹${data.amountPaid}\n`;
    if (data.remainingDue > 0) {
      rawMessage += `\nRemaining Due:\n₹${data.remainingDue}\n`;
    }
    rawMessage += `\nExpiry Date:\n${formattedExpiry}\n\nThank you for joining us.`;

    return {
      success: true,
      url: this.buildUrl(to, rawMessage),
      rawMessage
    };
  }

  async sendExpiryWarning(to: string, data: ExpiryTemplateData) {
    const rawMessage = `Hello ${data.memberName}\n\nThis is a friendly reminder from ${data.gymName}. Your membership is expiring in ${data.daysRemaining} days (on ${data.expiryDate}). Please renew at the reception to continue training!\n\nThank you.`;
    return {
      success: true,
      url: this.buildUrl(to, rawMessage),
      rawMessage
    };
  }

  async sendPostExpiryNotice(to: string, data: ExpiryTemplateData) {
    const rawMessage = `Hello ${data.memberName}\n\nYour membership at ${data.gymName} has expired. Please contact the desk to renew your package.\n\nThank you.`;
    return {
      success: true,
      url: this.buildUrl(to, rawMessage),
      rawMessage
    };
  }

  async sendRenewalMessage(to: string, data: RenewalTemplateData) {
    const rawMessage = `Hello ${data.memberName}\n\nYour membership has been renewed.\n\nPlan:\n${data.planName}\n\nExpiry:\n${data.expiryDate}`;
    return {
      success: true,
      url: this.buildUrl(to, rawMessage),
      rawMessage
    };
  }

  async sendDueCollectionMessage(to: string, data: DueCollectionTemplateData) {
    const rawMessage = `Hello ${data.memberName}\n\nWe have received your payment of ₹${data.amount}.\n\nOutstanding balance:\n₹${data.remaining}\n\nThank you.`;
    return {
      success: true,
      url: this.buildUrl(to, rawMessage),
      rawMessage
    };
  }
}

export const notificationProvider: INotificationProvider = new WhatsAppClickToChatProvider();
