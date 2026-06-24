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

export const updateGymOwnerSchema = createGymOwnerSchema.partial().extend({
  password: z.string().min(6, 'Password must be at least 6 characters.').optional()
});

// 2. Member Registration/Update Schema
export const createMemberSchema = z.object({
  name: z.string().min(2, 'Member name must be at least 2 characters.'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits.'),
  email: z.string().email('Invalid email format.'),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, 'Date of Birth cannot be in the future.'),
  height: z.number().positive('Height must be positive.'),
  weight: z.number().positive('Weight must be positive.'),
  address: z.string().optional().or(z.literal('')),
  planId: z.string().min(10, 'Invalid membership plan ID referenced.'),
  membershipStart: z.string().min(8, 'Start date must be valid.'),
  amountPaid: z.number().nonnegative('Amount paid cannot be negative.'),
  emergencyContact: z.string().regex(/^\d{10}$/, 'Emergency contact must be exactly 10 digits.'),
  notes: z.string().optional().or(z.literal(''))
});

export const updateMemberSchema = createMemberSchema.partial();

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

export const updatePlanSchema = createPlanSchema.partial();

// 5. Trainer Schema
export const createTrainerSchema = z.object({
  name: z.string().min(2, 'Trainer name must be at least 2 characters.'),
  phone: z.string().min(10, 'Contact number must be at least 10 digits.'),
  specialization: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional()
});

export const updateTrainerSchema = createTrainerSchema.partial();

// 6. Lead CRM Schema
export const createLeadSchema = z.object({
  name: z.string().min(2, 'Lead name must be at least 2 characters.'),
  phone: z.string().min(10, 'Contact number must be at least 10 digits.'),
  city: z.string().min(2, 'City is required.'),
  interestedPlan: z.enum(['1_month', '3_month', '6_month', '12_month']).optional(),
  source: z.enum(['whatsapp', 'website', 'instagram', 'facebook', 'other']).optional(),
  status: z.enum(['new', 'contacted', 'negotiation', 'converted', 'lost']).optional()
});

export const updateLeadSchema = createLeadSchema.partial();

// 7. Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(1, 'Password is required.')
});

// 8. Gym Branding Settings Schema
export const updateBrandingSchema = z.object({
  logo: z.string().optional().or(z.literal('')),
  gymName: z.string().min(2, 'Gym name must be at least 2 characters.').optional(),
  address: z.string().min(5, 'Address details are too short.').optional(),
  contactNumber: z.string().min(10, 'Contact number must be at least 10 digits.').optional(),
  whatsAppNumber: z.string().min(10, 'WhatsApp number must be at least 10 digits.').optional()
});

// 9. Status & Renew Schemas
export const updateGymOwnerStatusSchema = z.object({
  status: z.enum(['active', 'expired', 'suspended'])
});

export const renewGymOwnerSubscriptionSchema = z.object({
  planType: z.enum(['1_month', '3_month', '6_month', '12_month']),
  amountPaid: z.number().nonnegative('Amount paid cannot be negative.')
});

// 10. Workout Schema
export const saveWorkoutSchema = z.object({
  instructions: z.string().optional().or(z.literal('')),
  exercises: z.array(z.object({
    day: z.string(),
    name: z.string(),
    sets: z.number().positive(),
    reps: z.string()
  })).optional()
});

// 11. Diet Schema
export const saveDietSchema = z.object({
  instructions: z.string().optional().or(z.literal('')),
  meals: z.array(z.object({
    time: z.string(),
    items: z.string(),
    calories: z.number().nonnegative()
  })).optional()
});

// 12. Attendance Check-In Schema
export const checkInSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required.')
});

// 13. Free Trial Onboarding Schema
export const freeTrialSchema = z.object({
  gymName: z.string().min(2, 'Gym name must be at least 2 characters.'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters.'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits.'),
  email: z.string().email('Invalid email address.'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character.'),
  confirmPassword: z.string().min(6, 'Confirm password is required.')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
