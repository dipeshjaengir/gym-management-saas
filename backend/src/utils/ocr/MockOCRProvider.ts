import { OCRProvider, OCRExtractedRow } from './OCRProvider';

export class MockOCRProvider implements OCRProvider {
  name = 'MockOCRProvider';

  async processImage(fileBuffer: Buffer, fileName: string): Promise<OCRExtractedRow[]> {
    // Return sample rows simulating a real register scan extraction with different confidence levels
    // Row 1: High Confidence
    // Row 2: Needs Review
    // Row 3: Unable to Read
    return [
      {
        name: 'Rohan Sharma',
        phone: '9876543211',
        email: 'rohan@example.com',
        gender: 'male',
        dob: '1995-05-15',
        height: 178,
        weight: 74,
        address: 'Malviya Nagar, Jaipur',
        emergencyContact: '9116012345',
        planName: 'Standard Monthly',
        startDate: '2026-06-01',
        expiryDate: '2026-07-01',
        totalAmount: 1500,
        amountPaid: 1500,
        remainingDue: 0,
        paymentStatus: 'paid',
        notes: 'No medical issues',
        status: 'active',
        confidence: 'high',
        confidenceFields: {
          name: 'high',
          phone: 'high',
          email: 'high',
          gender: 'high',
          dob: 'high',
          planName: 'high'
        }
      },
      {
        name: 'Priyah Patel',
        phone: '998877665', // 9 digits (invalid phone triggers 'review')
        email: 'priya@gmail.com',
        gender: '', // Empty, needs user mapping/entry
        dob: '1998-12-20',
        height: 165,
        weight: 58,
        address: 'Vaishali Nagar, Jaipur',
        emergencyContact: '',
        planName: 'Premium Annual',
        startDate: '2026-01-10',
        expiryDate: '', // Empty, needs user entry
        totalAmount: 12000,
        amountPaid: 10000,
        remainingDue: 2000,
        paymentStatus: 'partial',
        notes: 'Knee injury history',
        status: 'active',
        confidence: 'review',
        confidenceFields: {
          name: 'high',
          phone: 'review',
          gender: 'unable',
          expiryDate: 'unable',
          totalAmount: 'high',
          remainingDue: 'high'
        }
      },
      {
        name: '', // Empty name (unable to read)
        phone: '9999888877',
        email: '',
        gender: 'female',
        dob: '', // Empty DOB (unable to read)
        height: 160,
        weight: 52,
        address: 'C-Scheme, Jaipur',
        emergencyContact: '',
        planName: '', // Empty planName
        startDate: '',
        expiryDate: '',
        totalAmount: 0,
        amountPaid: 0,
        remainingDue: 0,
        paymentStatus: 'unpaid',
        notes: '',
        status: 'active',
        confidence: 'unable',
        confidenceFields: {
          name: 'unable',
          phone: 'high',
          dob: 'unable',
          planName: 'unable',
          startDate: 'unable',
          expiryDate: 'unable'
        }
      }
    ];
  }
}
