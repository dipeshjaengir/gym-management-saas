import { Request, Response, NextFunction } from 'express';
import { ZodSchema, z } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Request payload validation failed.',
        errors: result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    req.body = result.data;
    next();
  };
};

// ----------------------------------------------------
// VALIDATION SCHEMAS FOR ALL CORE API WRITE PAYLOADS
// ----------------------------------------------------

// 1. Gym Owner Registration Schema
export const createGymOwnerSchema = z.object({
  gymName: z.string().min(2, 'Gym name must be at least 2 characters.'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters.'),
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits.'),
  address: z.string().min(5, 'Address details are too short.'),
  planType: z.enum(['1_month', '3_month', '6_month', '12_month']),
  amountPaid: z.number().nonnegative('Amount paid cannot be negative.')
});

// 2. Member Registration/Update Schema
export const createMemberSchema = z.object({
  name: z.string().min(2, 'Member name must be at least 2 characters.'),
  phone: z.string().min(10, 'Contact number must be at least 10 digits.'),
  email: z.string().email('Invalid email format.').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().min(8, 'DOB must be valid Date format.'),
  height: z.number().positive('Height must be positive.'),
  weight: z.number().positive('Weight must be positive.'),
  address: z.string().optional().or(z.literal('')),
  planId: z.string().min(10, 'Invalid membership plan ID referenced.'),
  membershipStart: z.string().min(8, 'Start date must be valid.'),
  amountPaid: z.number().nonnegative('Amount paid cannot be negative.'),
  emergencyContact: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal(''))
});

// 3. Payment Registration Schema
export const createPaymentSchema = z.object({
  memberId: z.string().min(10, 'Invalid member ID referenced.'),
  amount: z.number().positive('Payment amount must be greater than 0.'),
  paymentMethod: z.enum(['upi', 'cash', 'card', 'bank_transfer']),
  notes: z.string().optional().or(z.literal(''))
});

// 4. Membership Plan Schema
export const createPlanSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters.'),
  durationMonths: z.number().positive('Duration must be at least 1 month.'),
  price: z.number().positive('Price must be greater than 0.'),
  status: z.enum(['active', 'inactive']).optional()
});

// 5. Trainer Schema
export const createTrainerSchema = z.object({
  name: z.string().min(2, 'Trainer name must be at least 2 characters.'),
  phone: z.string().min(10, 'Contact number must be at least 10 digits.'),
  specialization: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional()
});

// 6. Lead CRM Schema
export const createLeadSchema = z.object({
  name: z.string().min(2, 'Lead name must be at least 2 characters.'),
  phone: z.string().min(10, 'Contact number must be at least 10 digits.'),
  city: z.string().min(2, 'City is required.'),
  interestedPlan: z.enum(['1_month', '3_month', '6_month', '12_month']),
  source: z.enum(['whatsapp', 'website', 'instagram', 'facebook', 'other']).optional(),
  status: z.enum(['new', 'contacted', 'negotiation', 'converted', 'lost']).optional()
});
