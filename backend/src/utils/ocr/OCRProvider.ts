export interface OCRExtractedRow {
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  dob?: string;
  height?: number;
  weight?: number;
  address?: string;
  emergencyContact?: string;
  planName?: string;
  startDate?: string;
  expiryDate?: string;
  totalAmount?: number;
  amountPaid?: number;
  remainingDue?: number;
  paymentStatus?: string;
  notes?: string;
  status?: string;
  confidence: 'high' | 'review' | 'unable';
  confidenceFields?: Record<string, 'high' | 'review' | 'unable'>;
}

export interface OCRProvider {
  name: string;
  processImage(fileBuffer: Buffer, fileName: string): Promise<OCRExtractedRow[]>;
}
